import json
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import ensure_region_access, get_current_user, require_roles
from app.db.session import get_db
from app.models.application import Application
from app.models.audit_event import AuditEvent
from app.models.institution import Institution
from app.models.notification import Notification
from app.models.policy import Policy
from app.models.obligation import Obligation
from app.models.user import User
from app.schemas.obligation import (
    NotificationResponse,
    ObligationCreate,
    ObligationResponse,
    ObligationUpdate,
)

router = APIRouter(tags=['obligations and notifications'])
_MANAGER_ROLES = ('regional_officer', 'platform_admin', 'institution_admin')


def _check_obligation_access(db: Session, obligation: Obligation, actor: User) -> None:
    if obligation.application_id is None:
        if actor.role != 'platform_admin':
            raise HTTPException(status_code=403, detail='Only platform admins can access global obligations')
        return
    row = db.execute(
        select(Application, Institution)
        .join(Institution, Application.institution_id == Institution.id)
        .where(Application.id == obligation.application_id)
    ).first()
    if row is None:
        raise HTTPException(status_code=404, detail='Linked application not found')
    application, institution = row
    ensure_region_access(actor, institution.region_code)
    if actor.role == 'applicant' and application.submitted_by_user_id != actor.id:
        raise HTTPException(status_code=403, detail='You cannot access this obligation')


@router.post('/obligations', response_model=ObligationResponse, status_code=status.HTTP_201_CREATED)
def create_obligation(
    payload: ObligationCreate,
    actor: User = Depends(require_roles(*_MANAGER_ROLES)),
    db: Session = Depends(get_db),
) -> Obligation:
    if payload.application_id is None and actor.role != 'platform_admin':
        raise HTTPException(status_code=403, detail='Only platform admins can create global obligations')
    if payload.application_id is not None:
        application = db.get(Application, payload.application_id)
        if application is None:
            raise HTTPException(status_code=404, detail='Application not found')
        institution = db.get(Institution, application.institution_id)
        ensure_region_access(actor, institution.region_code)
    if payload.owner_user_id is not None:
        owner = db.get(User, payload.owner_user_id)
        if owner is None or not owner.is_active:
            raise HTTPException(status_code=422, detail='Obligation owner does not exist or is inactive')
        if payload.application_id is not None and owner.region_code not in {None, institution.region_code}:
            raise HTTPException(status_code=422, detail='Obligation owner must belong to the application region')

    now = datetime.now(UTC)
    if payload.deadline_rule == 'fixed_days_from_creation':
        if payload.policy_id is None:
            raise HTTPException(status_code=422, detail='A policy version is required for a rule-based deadline')
        if payload.deadline_days is None:
            raise HTTPException(status_code=422, detail='deadline_days is required for a rule-based deadline')
        if payload.due_at is not None:
            raise HTTPException(status_code=422, detail='Do not supply due_at when using a calculated deadline rule')
    elif payload.deadline_days is not None:
        raise HTTPException(status_code=422, detail='deadline_days is only valid for a calculated deadline rule')

    policy = None
    if payload.policy_id is not None:
        policy = db.get(Policy, payload.policy_id)
        if policy is None:
            raise HTTPException(status_code=404, detail='Policy version not found')
        if not policy.is_active:
            raise HTTPException(status_code=422, detail='Policy version is inactive')
        effective_from = policy.effective_from
        effective_until = policy.effective_until
        if effective_from is not None:
            if effective_from.tzinfo is None:
                effective_from = effective_from.replace(tzinfo=UTC)
            if effective_from > now:
                raise HTTPException(status_code=422, detail='Policy version is not yet effective')
        if effective_until is not None:
            if effective_until.tzinfo is None:
                effective_until = effective_until.replace(tzinfo=UTC)
            if effective_until <= now:
                raise HTTPException(status_code=422, detail='Policy version has expired')

    due_at = payload.due_at
    if due_at is not None and payload.deadline_rule == 'manual':
        if due_at.tzinfo is None or due_at.utcoffset() is None:
            raise HTTPException(status_code=422, detail='due_at must include a timezone')
        due_at = due_at.astimezone(UTC)
    if payload.deadline_rule == 'fixed_days_from_creation':
        due_at = now + timedelta(days=payload.deadline_days or 0)

    calculation = {
        'rule': payload.deadline_rule,
        'calculated_at': now.isoformat(),
        'due_at': due_at.isoformat() if due_at else None,
        'source': 'policy_version' if policy else 'user_supplied',
        'policy_id': policy.id if policy else None,
        'policy_key': policy.policy_key if policy else None,
        'policy_version': policy.version if policy else None,
        'anchor': 'obligation_created_at' if payload.deadline_rule == 'fixed_days_from_creation' else None,
        'offset_days': payload.deadline_days if payload.deadline_rule == 'fixed_days_from_creation' else None,
    }
    obligation = Obligation(
        **payload.model_dump(),
        due_at=due_at,
        policy_key_snapshot=policy.policy_key if policy else None,
        policy_version_snapshot=policy.version if policy else None,
        deadline_calculation_json=json.dumps(calculation, sort_keys=True),
        due_at_calculated_at=now if due_at is not None else None,
        status='open',
    )
    db.add(obligation)
    db.flush()
    db.add(AuditEvent(
        actor_user_id=actor.id,
        entity_type='obligation',
        entity_id=str(obligation.id),
        action='obligation.created',
        reason='Obligation created',
        details_json=json.dumps({
            'application_id': obligation.application_id,
            'due_at': obligation.due_at.isoformat() if obligation.due_at else None,
            'deadline_rule': obligation.deadline_rule,
            'deadline_days': obligation.deadline_days,
            'policy_id': obligation.policy_id,
            'policy_key_snapshot': obligation.policy_key_snapshot,
            'policy_version_snapshot': obligation.policy_version_snapshot,
            'deadline_calculation': calculation,
        }, sort_keys=True),
    ))
    db.commit()
    db.refresh(obligation)
    return obligation


@router.get('/obligations', response_model=list[ObligationResponse])
def list_obligations(
    status_filter: str | None = Query(default=None, alias='status'),
    due_before: datetime | None = None,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    actor: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[Obligation]:
    query = select(Obligation)
    if actor.role != 'platform_admin':
        query = query.join(Application, Obligation.application_id == Application.id).join(
            Institution, Application.institution_id == Institution.id
        )
        if actor.role == 'applicant':
            query = query.where(
                Application.submitted_by_user_id == actor.id,
                Institution.region_code == actor.region_code,
                or_(Obligation.owner_user_id.is_(None), Obligation.owner_user_id == actor.id),
            )
        else:
            if not actor.region_code:
                return []
            query = query.where(Institution.region_code == actor.region_code)
    if status_filter is not None:
        if status_filter not in {'open', 'in_progress', 'fulfilled', 'waived'}:
            raise HTTPException(status_code=422, detail='Unknown obligation status')
        query = query.where(Obligation.status == status_filter)
    if due_before is not None:
        query = query.where(Obligation.due_at <= due_before)
    query = query.order_by(Obligation.due_at.asc(), Obligation.id.asc()).offset(offset).limit(limit)
    return list(db.scalars(query).all())


@router.patch('/obligations/{obligation_id}', response_model=ObligationResponse)
def update_obligation(
    obligation_id: int,
    payload: ObligationUpdate,
    actor: User = Depends(require_roles(*_MANAGER_ROLES)),
    db: Session = Depends(get_db),
) -> Obligation:
    obligation = db.get(Obligation, obligation_id)
    if obligation is None:
        raise HTTPException(status_code=404, detail='Obligation not found')
    _check_obligation_access(db, obligation, actor)
    changes = payload.model_dump(exclude_unset=True)
    if not changes:
        raise HTTPException(status_code=422, detail='Provide at least one field to update')
    if 'owner_user_id' in changes and changes['owner_user_id'] is not None:
        owner = db.get(User, changes['owner_user_id'])
        if owner is None or not owner.is_active:
            raise HTTPException(status_code=422, detail='Obligation owner does not exist or is inactive')
        if obligation.application_id is not None:
            application = db.get(Application, obligation.application_id)
            if application is None:
                raise HTTPException(status_code=404, detail='Linked application not found')
            institution = db.get(Institution, application.institution_id)
            if institution is None:
                raise HTTPException(status_code=404, detail='Linked institution not found')
            if owner.region_code not in {None, institution.region_code}:
                raise HTTPException(
                    status_code=422,
                    detail='Obligation owner must belong to the application region',
                )
    previous_status = obligation.status
    previous_due_at = obligation.due_at
    previous_deadline_rule = obligation.deadline_rule
    if 'due_at' in changes:
        new_due_at = changes['due_at']
        if new_due_at is not None:
            if new_due_at.tzinfo is None or new_due_at.utcoffset() is None:
                raise HTTPException(status_code=422, detail='due_at must include a timezone')
            new_due_at = new_due_at.astimezone(UTC)
            changes['due_at'] = new_due_at
        changed_at = datetime.now(UTC)
        obligation.deadline_rule = 'manual'
        obligation.deadline_days = None
        obligation.due_at_calculated_at = changed_at if new_due_at is not None else None
        obligation.deadline_calculation_json = json.dumps({
            'rule': 'manual',
            'source': 'manager_override',
            'changed_at': changed_at.isoformat(),
            'changed_by_user_id': actor.id,
            'previous_rule': previous_deadline_rule,
            'previous_due_at': previous_due_at.isoformat() if previous_due_at else None,
            'due_at': new_due_at.isoformat() if new_due_at else None,
            'policy_id': obligation.policy_id,
            'policy_key': obligation.policy_key_snapshot,
            'policy_version': obligation.policy_version_snapshot,
        }, sort_keys=True)
    for field, value in changes.items():
        setattr(obligation, field, value)
    db.add(AuditEvent(
        actor_user_id=actor.id,
        entity_type='obligation',
        entity_id=str(obligation.id),
        action='obligation.updated',
        reason='Obligation updated',
        details_json=json.dumps({
            'changed_fields': sorted(changes),
            'previous_status': previous_status,
            'status': obligation.status,
            'deadline_rule': obligation.deadline_rule,
            'due_at': obligation.due_at.isoformat() if obligation.due_at else None,
            'policy_id': obligation.policy_id,
            'policy_key_snapshot': obligation.policy_key_snapshot,
            'policy_version_snapshot': obligation.policy_version_snapshot,
        }, sort_keys=True),
    ))
    db.commit()
    db.refresh(obligation)
    return obligation


@router.get('/notifications', response_model=list[NotificationResponse])
def list_notifications(
    limit: int = Query(default=50, ge=1, le=100),
    actor: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[Notification]:
    query = select(Notification).where(Notification.recipient_user_id == actor.id)
    return list(db.scalars(query.order_by(Notification.created_at.desc(), Notification.id.desc()).limit(limit)).all())


@router.post('/obligations/escalate-due', response_model=dict[str, int])
def escalate_due_obligations(
    actor: User = Depends(require_roles('regional_officer', 'platform_admin')),
    db: Session = Depends(get_db),
) -> dict[str, int]:
    now = datetime.now(UTC)
    due_items = list(db.scalars(
        select(Obligation).where(
            Obligation.status.in_(['open', 'in_progress']),
            Obligation.due_at.is_not(None),
            Obligation.owner_user_id.is_not(None),
        )
    ).all())
    created = 0
    for obligation in due_items:
        due_at = obligation.due_at
        if due_at is None:
            continue
        if due_at.tzinfo is None:
            due_at = due_at.replace(tzinfo=UTC)
        if due_at >= now:
            continue
        try:
            _check_obligation_access(db, obligation, actor)
        except HTTPException:
            continue
        event_key = f'obligation-overdue:{obligation.id}:{obligation.due_at.isoformat()}'
        notification = Notification(
            recipient_user_id=obligation.owner_user_id,
            event_key=event_key,
            channel='in_app',
            status='pending',
            attempt_count=0,
            payload_json=json.dumps({
                'type': 'obligation_overdue',
                'obligation_id': obligation.id,
                'title': obligation.title,
                'due_at': obligation.due_at.isoformat(),
            }, sort_keys=True),
        )
        try:
            # Isolate duplicate-key conflicts so earlier queued notifications remain intact.
            with db.begin_nested():
                db.add(notification)
                db.flush()
        except IntegrityError:
            continue
        db.add(AuditEvent(
            actor_user_id=actor.id,
            entity_type='obligation',
            entity_id=str(obligation.id),
            action='obligation.overdue_notified',
            reason='Overdue obligation notification queued',
            details_json=json.dumps({'recipient_user_id': obligation.owner_user_id, 'event_key': event_key}, sort_keys=True),
        ))
        created += 1
    db.commit()
    return {'notifications_created': created}
