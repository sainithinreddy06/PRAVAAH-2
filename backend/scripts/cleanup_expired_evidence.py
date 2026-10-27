"""Dry-run-first cleanup of evidence beyond the configured retention window."""
import argparse
import json
from datetime import UTC, datetime, timedelta
from sqlalchemy import select
from app.core.config import settings
from app.db.session import SessionLocal
from app.models.audit_event import AuditEvent
from app.models.evidence import Evidence
from app.services.evidence_storage import get_evidence_storage

def run_cleanup(*, execute: bool = False, limit: int = 100, now: datetime | None = None) -> dict[str, int]:
    if limit < 1:
        raise ValueError('Batch limit must be positive')
    cutoff = (now or datetime.now(UTC)) - timedelta(days=settings.evidence_retention_days)
    counts = {'eligible': 0, 'deleted': 0, 'failed': 0}
    with SessionLocal() as db:
        rows = list(db.scalars(select(Evidence).where(
            Evidence.created_at < cutoff, Evidence.review_status != 'expired'
        ).order_by(Evidence.created_at, Evidence.id).limit(limit)).all())
        counts['eligible'] = len(rows)
        if not execute:
            return counts
        storage = get_evidence_storage()
        for evidence in rows:
            try:
                storage.delete(evidence.storage_key)
                evidence.review_status = 'expired'
                db.add(AuditEvent(actor_user_id=None, entity_type='evidence',
                    entity_id=str(evidence.id), action='evidence.retention_deleted',
                    reason='Evidence exceeded configured retention period',
                    details_json=json.dumps({'application_id': evidence.application_id,
                        'retention_days': settings.evidence_retention_days,
                        'sha256_digest': evidence.sha256_digest}, sort_keys=True)))
                db.commit()
                counts['deleted'] += 1
            except Exception:
                db.rollback()
                counts['failed'] += 1
    return counts

def main() -> None:
    parser = argparse.ArgumentParser(description='Evidence retention cleanup (dry-run by default).')
    parser.add_argument('--execute', action='store_true', help='perform storage deletion')
    parser.add_argument('--limit', type=int, default=100, help='maximum records per run')
    args = parser.parse_args()
    print(json.dumps(run_cleanup(execute=args.execute, limit=args.limit), sort_keys=True))

if __name__ == '__main__':
    main()
