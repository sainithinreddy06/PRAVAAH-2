import hashlib
import hmac
import json
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import String, and_, cast, exists, func, or_, select
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.core.config import settings
from app.db.session import get_db
from app.models.application import Application
from app.models.audit_event import AuditChainState, AuditEvent
from app.models.evidence import Evidence
from app.models.evc_assessment import EvcAssessment
from app.models.institution import Institution
from app.models.obligation import Obligation
from app.models.undertaking import Undertaking
from app.models.user import User
from app.services.audit_chain import verify_audit_chain
from app.schemas.operations import AuditEventResponse, OperationalMetricsResponse

router = APIRouter(tags=['audit and operational intelligence'])
_AUDIT_ROLES = ('regional_officer', 'platform_admin')


@router.get('/audit/verify-chain', response_model=dict[str, int | bool | None])
def verify_audit_event_chain(
    actor: User = Depends(require_roles('platform_admin')),
    db: Session = Depends(get_db),
) -> dict[str, int | bool | None]:
    """Verify the integrity of the complete audit chain; platform-admin only."""
    return verify_audit_chain(db)


@router.get('/audit/checkpoint', response_model=dict[str, int | str])
def create_audit_checkpoint(
    actor: User = Depends(require_roles('platform_admin')),
    db: Session = Depends(get_db),
) -> dict[str, int | str]:
    """Return a signed audit-chain checkpoint for storage outside this database."""
    secret = settings.audit_checkpoint_secret
    if len(secret) < 32:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail='Audit checkpoint signing is not configured',
        )
    state = db.get(AuditChainState, 1)
    event_count = int(db.scalar(select(func.count(AuditEvent.id))) or 0)
    head_hash = state.head_hash if state is not None else '0' * 64
    generated_at = datetime.now(UTC).isoformat()
    payload = json.dumps(
        {'event_count': event_count, 'generated_at': generated_at, 'head_hash': head_hash},
        sort_keys=True,
        separators=(',', ':'),
    )
    signature = hmac.new(secret.encode('utf-8'), payload.encode('utf-8'), hashlib.sha256).hexdigest()
    return {
        'event_count': event_count,
        'head_hash': head_hash,
        'generated_at': generated_at,
        'signature_algorithm': 'HMAC-SHA256',
        'signature': signature,
    }


@router.get('/audit/events', response_model=list[AuditEventResponse])
def list_audit_events(
    entity_type: str | None = Query(default=None, min_length=1, max_length=80),
    entity_id: str | None = Query(default=None, min_length=1, max_length=100),
    action: str | None = Query(default=None, min_length=1, max_length=100),
    actor_user_id: int | None = Query(default=None, gt=0),
    since: datetime | None = None,
    until: datetime | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    actor: User = Depends(require_roles(*_AUDIT_ROLES)),
    db: Session = Depends(get_db),
) -> list[AuditEvent]:
    if since is not None and until is not None and since > until:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail='since must be earlier than or equal to until',
        )

    query = select(AuditEvent)
    if entity_type:
        query = query.where(AuditEvent.entity_type == entity_type)
    if entity_id:
        query = query.where(AuditEvent.entity_id == entity_id)
    if action:
        query = query.where(AuditEvent.action == action)
    if actor_user_id is not None:
        query = query.where(AuditEvent.actor_user_id == actor_user_id)
    if since is not None:
        query = query.where(AuditEvent.created_at >= since)
    if until is not None:
        query = query.where(AuditEvent.created_at <= until)

    if actor.role != 'platform_admin':
        region = actor.region_code
        if not region:
            return []
        in_region_application = exists(
            select(1)
            .select_from(Application)
            .join(Institution, Application.institution_id == Institution.id)
            .where(
                cast(Application.id, String) == AuditEvent.entity_id,
                Institution.region_code == region,
            )
        )
        in_region_evidence = exists(
            select(1)
            .select_from(Evidence)
            .join(Application, Evidence.application_id == Application.id)
            .join(Institution, Application.institution_id == Institution.id)
            .where(
                cast(Evidence.id, String) == AuditEvent.entity_id,
                Institution.region_code == region,
            )
        )
        in_region_obligation = exists(
            select(1)
            .select_from(Obligation)
            .join(Application, Obligation.application_id == Application.id)
            .join(Institution, Application.institution_id == Institution.id)
            .where(
                cast(Obligation.id, String) == AuditEvent.entity_id,
                Institution.region_code == region,
            )
        )
        in_region_undertaking = exists(
            select(1)
            .select_from(Undertaking)
            .join(Application, Undertaking.application_id == Application.id)
            .join(Institution, Application.institution_id == Institution.id)
            .where(
                cast(Undertaking.id, String) == AuditEvent.entity_id,
                Institution.region_code == region,
            )
        )
        in_region_evc_assessment = exists(
            select(1)
            .select_from(EvcAssessment)
            .join(Application, EvcAssessment.application_id == Application.id)
            .join(Institution, Application.institution_id == Institution.id)
            .where(
                cast(EvcAssessment.id, String) == AuditEvent.entity_id,
                Institution.region_code == region,
            )
        )
        query = query.where(
            or_(
                and_(AuditEvent.entity_type == 'application', in_region_application),
                and_(AuditEvent.entity_type == 'evidence', in_region_evidence),
                and_(AuditEvent.entity_type == 'obligation', in_region_obligation),
                and_(AuditEvent.entity_type == 'undertaking', in_region_undertaking),
                and_(AuditEvent.entity_type == 'evc_assessment', in_region_evc_assessment),
            )
        )

    query = query.order_by(AuditEvent.created_at.desc(), AuditEvent.id.desc()).offset(offset).limit(limit)
    return list(db.scalars(query).all())


def _count_by(db: Session, model: type, column: object) -> dict[str, int]:
    return {
        str(key): int(count)
        for key, count in db.execute(
            select(column, func.count()).select_from(model).group_by(column)
        ).all()
    }


@router.get('/operations/metrics', response_model=OperationalMetricsResponse)
def operational_metrics(
    actor: User = Depends(require_roles(*_AUDIT_ROLES)),
    db: Session = Depends(get_db),
) -> OperationalMetricsResponse:
    app_rows = list(db.execute(
        select(Application.status, func.count())
        .join(Institution, Application.institution_id == Institution.id)
        .group_by(Application.status)
    ).all())
    if actor.role == 'platform_admin':
        applications_by_status = {str(k): int(v) for k, v in app_rows}
        evidence_query = select(Evidence.review_status, func.count()).group_by(Evidence.review_status)
        obligations_query = select(Obligation.status, func.count()).group_by(Obligation.status)
        undertakings_query = select(Undertaking.status, func.count()).group_by(Undertaking.status)
        total_applications = db.scalar(select(func.count(Application.id))) or 0
        total_evidence = db.scalar(select(func.count(Evidence.id))) or 0
        total_obligations = db.scalar(select(func.count(Obligation.id))) or 0
        total_undertakings = db.scalar(select(func.count(Undertaking.id))) or 0
        overdue_query = select(func.count(Obligation.id)).where(
            Obligation.status.in_(['open', 'in_progress']),
            Obligation.due_at < datetime.now(UTC),
        )
    else:
        region = actor.region_code
        app_ids = select(Application.id).join(Institution, Application.institution_id == Institution.id).where(Institution.region_code == region)
        applications_by_status = {
            str(k): int(v) for k, v in db.execute(
                select(Application.status, func.count())
                .join(Institution, Application.institution_id == Institution.id)
                .where(Institution.region_code == region)
                .group_by(Application.status)
            ).all()
        }
        total_applications = db.scalar(select(func.count(Application.id)).where(Application.id.in_(app_ids))) or 0
        total_evidence = db.scalar(select(func.count(Evidence.id)).where(Evidence.application_id.in_(app_ids))) or 0
        total_obligations = db.scalar(select(func.count(Obligation.id)).where(Obligation.application_id.in_(app_ids))) or 0
        total_undertakings = db.scalar(select(func.count(Undertaking.id)).where(Undertaking.application_id.in_(app_ids))) or 0
        evidence_query = select(Evidence.review_status, func.count()).where(Evidence.application_id.in_(app_ids)).group_by(Evidence.review_status)
        obligations_query = select(Obligation.status, func.count()).where(Obligation.application_id.in_(app_ids)).group_by(Obligation.status)
        undertakings_query = select(Undertaking.status, func.count()).where(Undertaking.application_id.in_(app_ids)).group_by(Undertaking.status)
        overdue_query = select(func.count(Obligation.id)).where(
            Obligation.application_id.in_(app_ids),
            Obligation.status.in_(['open', 'in_progress']),
            Obligation.due_at < datetime.now(UTC),
        )
    evidence_by_status = {str(k): int(v) for k, v in db.execute(evidence_query).all()}
    obligations_by_status = {str(k): int(v) for k, v in db.execute(obligations_query).all()}
    undertakings_by_status = {str(k): int(v) for k, v in db.execute(undertakings_query).all()}
    return OperationalMetricsResponse(
        applications_total=int(total_applications),
        applications_by_status=applications_by_status,
        evidence_total=int(total_evidence),
        evidence_by_review_status=evidence_by_status,
        obligations_total=int(total_obligations),
        obligations_by_status=obligations_by_status,
        undertakings_total=int(total_undertakings),
        undertakings_by_status=undertakings_by_status,
        overdue_obligations=int(db.scalar(overdue_query) or 0),
    )
