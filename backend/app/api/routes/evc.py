import json
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import ensure_region_access, get_current_user, require_roles
from app.db.session import get_db
from app.models.application import Application
from app.models.audit_event import AuditEvent
from app.models.evidence import Evidence
from app.models.evc_assessment import EvcAssessment
from app.models.institution import Institution
from app.models.obligation import Obligation
from app.models.undertaking import Undertaking
from app.models.user import User
from app.schemas.evc import (
    EvcAssessmentCreate,
    EvcAssessmentResponse,
    UndertakingCreate,
    UndertakingResponse,
    UndertakingReview,
)

router = APIRouter(tags=['EVC and undertakings'])
_REVIEW_ROLES = ('regional_officer', 'platform_admin')


def _application_access(db: Session, application_id: int, actor: User) -> Application:
    result = db.execute(
        select(Application, Institution)
        .join(Institution, Application.institution_id == Institution.id)
        .where(Application.id == application_id)
    ).first()
    if result is None:
        raise HTTPException(status_code=404, detail='Application not found')
    application, institution = result
    ensure_region_access(actor, institution.region_code)
    if actor.role == 'applicant' and application.submitted_by_user_id != actor.id:
        raise HTTPException(status_code=403, detail='You cannot access this application')
    return application


def _undertaking_access(db: Session, undertaking: Undertaking, actor: User) -> None:
    _application_access(db, undertaking.application_id, actor)


def _audit(db: Session, actor: User, entity_type: str, entity_id: int, action: str, details: dict[str, object]) -> None:
    db.add(AuditEvent(
        actor_user_id=actor.id,
        entity_type=entity_type,
        entity_id=str(entity_id),
        action=action,
        reason=action.replace('.', ' '),
        details_json=json.dumps(details, sort_keys=True),
    ))


@router.post('/undertakings', response_model=UndertakingResponse, status_code=status.HTTP_201_CREATED)
def create_undertaking(
    payload: UndertakingCreate,
    actor: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Undertaking:
    if actor.role not in {'applicant', 'institution_admin', 'regional_officer', 'platform_admin'}:
        raise HTTPException(status_code=403, detail='Your role cannot create undertakings')
    application = _application_access(db, payload.application_id, actor)
    if application.status not in {'draft', 'changes_requested'}:
        raise HTTPException(status_code=409, detail='Undertakings can only be added to draft or changes-requested applications')
    undertaking = Undertaking(
        application_id=application.id,
        created_by_user_id=actor.id,
        undertaking_type=payload.undertaking_type,
        statement=payload.statement,
        status='draft',
        version=1,
    )
    db.add(undertaking)
    db.flush()
    _audit(db, actor, 'undertaking', undertaking.id, 'undertaking.created', {'application_id': application.id, 'version': 1})
    db.commit()
    db.refresh(undertaking)
    return undertaking


@router.get('/applications/{application_id}/undertakings', response_model=list[UndertakingResponse])
def list_undertakings(
    application_id: int,
    actor: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[Undertaking]:
    _application_access(db, application_id, actor)
    return list(db.scalars(
        select(Undertaking).where(Undertaking.application_id == application_id).order_by(Undertaking.version.desc(), Undertaking.id.desc())
    ).all())


@router.post('/undertakings/{undertaking_id}/submit', response_model=UndertakingResponse)
def submit_undertaking(
    undertaking_id: int,
    actor: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Undertaking:
    undertaking = db.get(Undertaking, undertaking_id)
    if undertaking is None:
        raise HTTPException(status_code=404, detail='Undertaking not found')
    _undertaking_access(db, undertaking, actor)
    if actor.id != undertaking.created_by_user_id and actor.role not in {'institution_admin', 'regional_officer', 'platform_admin'}:
        raise HTTPException(status_code=403, detail='You cannot submit this undertaking')
    if undertaking.status not in {'draft', 'changes_requested'}:
        raise HTTPException(status_code=409, detail='Only draft or returned undertakings can be submitted')
    undertaking.status = 'submitted'
    undertaking.submitted_at = datetime.now(UTC)
    _audit(db, actor, 'undertaking', undertaking.id, 'undertaking.submitted', {'version': undertaking.version})
    db.commit()
    db.refresh(undertaking)
    return undertaking


@router.post('/undertakings/{undertaking_id}/review', response_model=UndertakingResponse)
def review_undertaking(
    undertaking_id: int,
    payload: UndertakingReview,
    actor: User = Depends(require_roles(*_REVIEW_ROLES)),
    db: Session = Depends(get_db),
) -> Undertaking:
    undertaking = db.get(Undertaking, undertaking_id)
    if undertaking is None:
        raise HTTPException(status_code=404, detail='Undertaking not found')
    _undertaking_access(db, undertaking, actor)
    if undertaking.status != 'submitted':
        raise HTTPException(status_code=409, detail='Only submitted undertakings can be reviewed')
    undertaking.status = payload.decision
    undertaking.reviewer_notes = payload.reviewer_notes
    undertaking.reviewed_by_user_id = actor.id
    undertaking.reviewed_at = datetime.now(UTC)
    _audit(db, actor, 'undertaking', undertaking.id, 'undertaking.reviewed', {'decision': payload.decision})
    db.commit()
    db.refresh(undertaking)
    return undertaking


@router.post('/evc/assessments', response_model=EvcAssessmentResponse, status_code=status.HTTP_201_CREATED)
def create_evc_assessment(
    payload: EvcAssessmentCreate,
    actor: User = Depends(require_roles(*_REVIEW_ROLES)),
    db: Session = Depends(get_db),
) -> EvcAssessment:
    application = _application_access(db, payload.application_id, actor)
    evidence_counts = dict(db.execute(
        select(Evidence.review_status, func.count(Evidence.id))
        .where(Evidence.application_id == application.id)
        .group_by(Evidence.review_status)
    ).all())
    evidence_total = sum(evidence_counts.values())
    evidence_accepted = evidence_counts.get('accepted', 0)
    evidence_pending = evidence_counts.get('pending', 0)
    evidence_rejected = evidence_counts.get('rejected', 0)
    open_obligations = db.scalar(
        select(func.count(Obligation.id)).where(
            Obligation.application_id == application.id,
            Obligation.status.in_(['open', 'in_progress']),
        )
    ) or 0
    undertaking_count = db.scalar(
        select(func.count(Undertaking.id)).where(
            Undertaking.application_id == application.id,
            Undertaking.status != 'accepted',
        )
    ) or 0

    if evidence_rejected:
        outcome = 'needs_attention'
    elif evidence_pending or open_obligations or undertaking_count:
        outcome = 'incomplete'
    elif evidence_total == 0:
        outcome = 'insufficient_evidence'
    else:
        outcome = 'ready_for_officer_review'

    assessment = EvcAssessment(
        application_id=application.id,
        assessed_by_user_id=actor.id,
        evidence_total=evidence_total,
        evidence_accepted=evidence_accepted,
        evidence_pending=evidence_pending,
        evidence_rejected=evidence_rejected,
        open_obligations=open_obligations,
        undertaking_count=undertaking_count,
        outcome=outcome,
        notes=payload.notes,
    )
    db.add(assessment)
    db.flush()
    _audit(db, actor, 'evc_assessment', assessment.id, 'evc.assessment_created', {
        'application_id': application.id,
        'outcome': outcome,
        'evidence_total': evidence_total,
        'open_obligations': open_obligations,
        'unaccepted_undertakings': undertaking_count,
    })
    db.commit()
    db.refresh(assessment)
    return assessment


@router.get('/applications/{application_id}/evc-assessments', response_model=list[EvcAssessmentResponse])
def list_evc_assessments(
    application_id: int,
    actor: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[EvcAssessment]:
    _application_access(db, application_id, actor)
    return list(db.scalars(
        select(EvcAssessment).where(EvcAssessment.application_id == application_id).order_by(EvcAssessment.created_at.desc(), EvcAssessment.id.desc())
    ).all())
