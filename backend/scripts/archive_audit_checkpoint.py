"""Export a signed audit checkpoint to an S3 bucket with Object Lock."""
import hashlib
import hmac
import json
from datetime import UTC, datetime, timedelta
from uuid import uuid4

import boto3
from sqlalchemy import func, select

from app.core.config import settings
from app.db.session import SessionLocal
from app.models.audit_event import AuditChainState, AuditEvent


def signed_checkpoint(event_count: int, head_hash: str, generated_at: datetime, secret: str) -> dict[str, int | str]:
    timestamp = generated_at.astimezone(UTC).isoformat()
    payload = json.dumps({'event_count': event_count, 'generated_at': timestamp, 'head_hash': head_hash},
                         sort_keys=True, separators=(',', ':'))
    signature = hmac.new(secret.encode('utf-8'), payload.encode('utf-8'), hashlib.sha256).hexdigest()
    return {'event_count': event_count, 'head_hash': head_hash, 'generated_at': timestamp,
            'signature_algorithm': 'HMAC-SHA256', 'signature': signature}


def archive_checkpoint() -> str:
    if len(settings.audit_checkpoint_secret) < 32:
        raise RuntimeError('Audit checkpoint signing secret is not configured')
    if not settings.audit_archive_s3_bucket:
        raise RuntimeError('Audit archive bucket is not configured')
    generated_at = datetime.now(UTC)
    with SessionLocal() as db:
        state = db.scalar(select(AuditChainState).where(AuditChainState.id == 1).with_for_update())
        event_count = int(db.scalar(select(func.count(AuditEvent.id))) or 0)
        head_hash = state.head_hash if state is not None else '0' * 64
        checkpoint = signed_checkpoint(event_count, head_hash, generated_at, settings.audit_checkpoint_secret)

    client = boto3.client('s3', region_name=settings.audit_archive_s3_region or None,
                          endpoint_url=settings.audit_archive_s3_endpoint_url or None)
    key_prefix = settings.audit_archive_s3_prefix.strip('/')
    key = '/'.join(part for part in [key_prefix, generated_at.strftime('%Y/%m/%d'),
                                      f'{generated_at.strftime("%H%M%S")}-{uuid4().hex}.json'] if part)
    client.put_object(
        Bucket=settings.audit_archive_s3_bucket,
        Key=key,
        Body=json.dumps(checkpoint, sort_keys=True, separators=(',', ':')).encode('utf-8'),
        ContentType='application/json',
        ServerSideEncryption='AES256',
        ObjectLockMode='COMPLIANCE',
        ObjectLockRetainUntilDate=generated_at + timedelta(days=settings.audit_archive_retention_days),
    )
    return key


if __name__ == '__main__':
    print(archive_checkpoint())
