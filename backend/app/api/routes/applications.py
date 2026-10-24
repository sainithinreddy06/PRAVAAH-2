import json
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import ensure_region_access, get_current_user
from app.db.session import get_db
from app.models.application import Application
from app.models.audit_event import AuditEvent
from app.models.institution import Institution
from app.models.user import User
from app.schemas.application import (
    ApplicationCreate,
    ApplicationResponse,
    ApplicationTransitionRequest,
)

router = APIRouter(prefix='/applications', tags=['applications'])

_ALLOWED_TRANSITIONS = {
    'draft': {'submitted'},
    'submitted': {'under_review'},
    'under_review': {'changes_requested', 'approved', 'rejected'},
    'changes_requested': {'submitted'},
    'approved': set(),
    'rejected': set(),
}
_REVIEW_ROLES = {'regional_officer', 'platform_admin'}
_SUBMIT_ROLES = {'applicant', 'institution_admin', 'regional_officer', 'platform_admin'}


def _get_application_or_404(db: Session, application_id: int) -> tuple[Application, Institution]:
    result = db.execute(
        select(Application, Institution)
        .join(Institution, Application.institution_id == Institution.id)
        .where(Application.id == application_id)
    ).first()
    if result is None:
        raise HTTPException(status_code=404, detail='Application not found')
    return result[0], result[1]


def _check_visibility(actor: User, application: Application, institution: Institution) -> None:
    ensure_region_access(actor, institution.region_code)
    if actor.role == 'applicant' and application.submitted_by_user_id != actor.id:
        raise HTTPException(status_code=403, detail='You cannot access this application')


def _record_event(
    db: Session,
    actor: User,
    application: Application,
    action: str,
    reason: str | None,
    details: dict[str, object],
) -> None:
    db.add(
        AuditEvent(
            actor_user_id=actor.id,
            entity_type='application',
            entity_id=str(application.id),
            action=action,
            reason=reason,
            details_json=json.dumps(details, sort_keys=True),
        )
    )


@router.post('', response_model=ApplicationResponse, status_code=status.HTTP_201_CREATED)
def create_application(
    payload: ApplicationCreate,
    actor: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Application:
    if actor.role not in _SUBMIT_ROLES:
        raise HTTPException(status_code=403, detail='Your role cannot create applications')

    institution = db.get(Institution, payload.institution_id)
    if institution is None:
        raise HTTPException(status_code=404, detail='Institution not found')
    ensure_region_access(actor, institution.region_code)

    existing = db.scalar(
        select(Application).where(Application.reference_code == payload.reference_code)
    )
    if existing is not None:
        raise HTTPException(status_code=409, detail='Application reference already exists')

    application = Application(
        reference_code=payload.reference_code,
        institution_id=institution.id,
        submitted_by_user_id=actor.id,
        workflow_stage='draft',
        status='draft',
    )
    db.add(application)
    db.flush()
    _record_event(
        db,
        actor,
        application,
        'application.created',
        'Application created',
        {'status': 'draft', 'institution_id': institution.id},
    )
    db.commit()
    db.refresh(application)
    return application


@router.get('', response_model=list[ApplicationResponse])
def list_applications(
    status_filter: str | None = Query(default=None, alias='status'),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    actor: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[Application]:
    query = select(Application).join(
        Institution, Application.institution_id == Institution.id
    )
    if actor.role == 'applicant':
        query = query.where(Application.submitted_by_user_id == actor.id)
    elif actor.role != 'platform_admin':
        if not actor.region_code:
            raise HTTPException(status_code=403, detail='Your account has no assigned region')
        query = query.where(Institution.region_code == actor.region_code)

    if status_filter is not None:
        if status_filter not in _ALLOWED_TRANSITIONS:
            raise HTTPException(status_code=422, detail='Unknown application status')
        query = query.where(Application.status == status_filter)

    query = query.order_by(Application.created_at.desc(), Application.id.desc())
    return list(db.scalars(query.offset(offset).limit(limit)).all())


@router.get('/{application_id}', response_model=ApplicationResponse)
def get_application(
    application_id: int,
    actor: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Application:
    application, institution = _get_application_or_404(db, application_id)
    _check_visibility(actor, application, institution)
    return application


@router.post('/{application_id}/transitions', response_model=ApplicationResponse)
def transition_application(
    application_id: int,
    payload: ApplicationTransitionRequest,
    actor: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Application:
    application, institution = _get_application_or_404(db, application_id)
    _check_visibility(actor, application, institution)

    target = payload.target_status
    if target not in _ALLOWED_TRANSITIONS.get(application.status, set()):
        raise HTTPException(
            status_code=409,
            detail=f'Cannot transition application from {application.status} to {target}',
        )

    if target == 'submitted':
        if actor.role not in _SUBMIT_ROLES:
            raise HTTPException(status_code=403, detail='Your role cannot submit applications')
    elif target in {'under_review', 'changes_requested', 'approved', 'rejected'}:
        if actor.role not in _REVIEW_ROLES:
            raise HTTPException(status_code=403, detail='Only authorized officers can review applications')

    previous = application.status
    application.status = target
    application.workflow_stage = target
    _record_event(
        db,
        actor,
        application,
        'application.status_changed',
        payload.reason.strip(),
        {'from': previous, 'to': target, 'request_id': str(uuid4())},
    )
    db.commit()
    db.refresh(application)
    return application
