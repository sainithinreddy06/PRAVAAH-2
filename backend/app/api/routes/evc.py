import json
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.api.deps import ensure_region_access, get_current_user, require_roles
from app.db.session import get_db
from app.models.application import Application
from app.models.audit_event import AuditEvent
from app.models.evidence import Evidence
from app.models.evc_assessment import EvcAssessment
from app.models.evc_visit import EvcVisit
from app.models.evc_visit_report import EvcVisitReport
from app.models.institution import Institution
from app.models.obligation import Obligation
from app.models.undertaking import Undertaking
from app.models.user import User
from app.schemas.evc import (
    EvcAssessmentCreate,
    EvcAssessmentResponse,
    EvcChecklistResult,
    EvcReportAmendment,
    EvcVisitComplete,
    EvcVisitCreate,
    EvcVisitResponse,
    EvcVisitReportResponse,
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


def _validated_evc_results(checklist_json: str, results: list[EvcChecklistResult]) -> tuple[str, list[str]]:
    checklist = json.loads(checklist_json)
    checklist_by_id = {item['item_id']: item for item in checklist}
    result_ids = [item.item_id for item in results]
    if len(result_ids) != len(set(result_ids)):
        raise HTTPException(status_code=422, detail='Checklist result IDs must be unique')
    unknown_ids = sorted(set(result_ids) - set(checklist_by_id))
    if unknown_ids:
        raise HTTPException(status_code=422, detail='Results contain unknown checklist item IDs')
    result_id_set = set(result_ids)
    missing_required = sorted(
        item['item_id'] for item in checklist
        if item.get('required', True) and item['item_id'] not in result_id_set
    )
    if missing_required:
        raise HTTPException(
            status_code=422,
            detail={'message': 'All required checklist items need a result', 'item_ids': missing_required},
        )
    required_not_applicable = sorted(
        result.item_id for result in results
        if checklist_by_id[result.item_id].get('required', True) and result.outcome == 'not_applicable'
    )
    if required_not_applicable:
        raise HTTPException(
            status_code=422,
            detail={'message': 'Required checklist items cannot be marked not applicable', 'item_ids': required_not_applicable},
        )
    results_json = json.dumps(
        [result.model_dump() for result in results],
        sort_keys=True,
        separators=(',', ':'),
    )
    failed_ids = sorted(result.item_id for result in results if result.outcome == 'fail')
    return results_json, failed_ids


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
    submitted_at = datetime.now(UTC)
    transition = db.execute(
        update(Undertaking)
        .where(Undertaking.id == undertaking.id, Undertaking.status == undertaking.status)
        .values(status='submitted', submitted_at=submitted_at)
        .execution_options(synchronize_session=False)
    )
    if transition.rowcount != 1:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail='Undertaking status changed concurrently; reload and retry',
        )
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
    reviewed_at = datetime.now(UTC)
    transition = db.execute(
        update(Undertaking)
        .where(Undertaking.id == undertaking.id, Undertaking.status == 'submitted')
        .values(
            status=payload.decision,
            reviewer_notes=payload.reviewer_notes,
            reviewed_by_user_id=actor.id,
            reviewed_at=reviewed_at,
        )
        .execution_options(synchronize_session=False)
    )
    if transition.rowcount != 1:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail='Undertaking status changed concurrently; reload and retry',
        )
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


@router.get('/evc/visits/{visit_id}/reports', response_model=list[EvcVisitReportResponse])
def list_evc_visit_reports(
    visit_id: int,
    actor: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[EvcVisitReport]:
    visit = db.get(EvcVisit, visit_id)
    if visit is None:
        raise HTTPException(status_code=404, detail='EVC visit not found')
    _application_access(db, visit.application_id, actor)
    return list(db.scalars(
        select(EvcVisitReport)
        .where(EvcVisitReport.visit_id == visit.id)
        .order_by(EvcVisitReport.revision.asc())
    ).all())


@router.post('/evc/visits/{visit_id}/reports', response_model=EvcVisitReportResponse, status_code=status.HTTP_201_CREATED)
def amend_evc_visit_report(
    visit_id: int,
    payload: EvcReportAmendment,
    actor: User = Depends(require_roles(*_REVIEW_ROLES)),
    db: Session = Depends(get_db),
) -> EvcVisitReport:
    visit = db.get(EvcVisit, visit_id)
    if visit is None:
        raise HTTPException(status_code=404, detail='EVC visit not found')
    _application_access(db, visit.application_id, actor)
    if actor.role != 'platform_admin' and visit.assigned_to_user_id != actor.id:
        raise HTTPException(status_code=403, detail='Only the assigned inspector can amend this report')
    if visit.status != 'completed':
        raise HTTPException(status_code=409, detail='Only completed visits can have report amendments')

    results_json, failed_ids = _validated_evc_results(visit.checklist_json, payload.results)
    next_revision = visit.report_revision + 1
    now = datetime.now(UTC)
    transition = db.execute(
        update(EvcVisit)
        .where(
            EvcVisit.id == visit.id,
            EvcVisit.status == 'completed',
            EvcVisit.report_revision == visit.report_revision,
        )
        .values(
            findings=payload.findings,
            results_json=results_json,
            report_revision=next_revision,
            updated_at=now,
        )
        .execution_options(synchronize_session=False)
    )
    if transition.rowcount != 1:
        db.rollback()
        raise HTTPException(status_code=409, detail='Report revision changed concurrently; reload and retry')

    report = EvcVisitReport(
        visit_id=visit.id,
        revision=next_revision,
        findings=payload.findings,
        results_json=results_json,
        change_reason=payload.change_reason,
        created_by_user_id=actor.id,
    )
    db.add(report)
    _audit(db, actor, 'evc_visit', visit.id, 'evc.report_amended', {
        'application_id': visit.application_id,
        'report_revision': next_revision,
        'change_reason': payload.change_reason,
        'failed_items': failed_ids,
    })
    db.commit()
    db.refresh(report)
    return report


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



@router.post('/evc/visits', response_model=EvcVisitResponse, status_code=status.HTTP_201_CREATED)
def schedule_evc_visit(
    payload: EvcVisitCreate,
    actor: User = Depends(require_roles(*_REVIEW_ROLES)),
    db: Session = Depends(get_db),
) -> EvcVisit:
    application = _application_access(db, payload.application_id, actor)
    if payload.scheduled_at.tzinfo is None or payload.scheduled_at.utcoffset() is None:
        raise HTTPException(status_code=422, detail='scheduled_at must include a timezone')
    scheduled_at = payload.scheduled_at.astimezone(UTC)
    if scheduled_at <= datetime.now(UTC):
        raise HTTPException(status_code=422, detail='scheduled_at must be in the future')

    assigned_user = db.get(User, payload.assigned_to_user_id)
    if assigned_user is None or not assigned_user.is_active:
        raise HTTPException(status_code=422, detail='Assigned inspector does not exist or is inactive')
    if assigned_user.role not in {'regional_officer', 'platform_admin'}:
        raise HTTPException(status_code=422, detail='Assigned user must be an inspector or platform administrator')
    institution = db.get(Institution, application.institution_id)
    if institution is None:
        raise HTTPException(status_code=404, detail='Application institution not found')
    if assigned_user.role != 'platform_admin' and assigned_user.region_code != institution.region_code:
        raise HTTPException(status_code=422, detail='Assigned inspector must belong to the application region')

    item_ids = [item.item_id for item in payload.checklist_items]
    if len(item_ids) != len(set(item_ids)):
        raise HTTPException(status_code=422, detail='Checklist item IDs must be unique')

    visit = EvcVisit(
        application_id=application.id,
        scheduled_by_user_id=actor.id,
        assigned_to_user_id=assigned_user.id,
        scheduled_at=scheduled_at,
        status='scheduled',
        checklist_json=json.dumps(
            [item.model_dump() for item in payload.checklist_items],
            sort_keys=True,
            separators=(',', ':'),
        ),
        results_json='[]',
        report_revision=0,
    )
    db.add(visit)
    db.flush()
    _audit(db, actor, 'evc_visit', visit.id, 'evc.visit_scheduled', {
        'application_id': application.id,
        'assigned_to_user_id': assigned_user.id,
        'scheduled_at': scheduled_at.isoformat(),
        'checklist_items': len(item_ids),
    })
    db.commit()
    db.refresh(visit)
    return visit


@router.get('/applications/{application_id}/evc-visits', response_model=list[EvcVisitResponse])
def list_evc_visits(
    application_id: int,
    actor: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[EvcVisit]:
    _application_access(db, application_id, actor)
    return list(db.scalars(
        select(EvcVisit)
        .where(EvcVisit.application_id == application_id)
        .order_by(EvcVisit.scheduled_at.desc(), EvcVisit.id.desc())
    ).all())


@router.post('/evc/visits/{visit_id}/start', response_model=EvcVisitResponse)
def start_evc_visit(
    visit_id: int,
    actor: User = Depends(require_roles(*_REVIEW_ROLES)),
    db: Session = Depends(get_db),
) -> EvcVisit:
    visit = db.get(EvcVisit, visit_id)
    if visit is None:
        raise HTTPException(status_code=404, detail='EVC visit not found')
    _application_access(db, visit.application_id, actor)
    if actor.role != 'platform_admin' and visit.assigned_to_user_id != actor.id:
        raise HTTPException(status_code=403, detail='Only the assigned inspector can start this visit')
    if visit.status != 'scheduled':
        raise HTTPException(status_code=409, detail='Only scheduled visits can be started')

    now = datetime.now(UTC)
    transition = db.execute(
        update(EvcVisit)
        .where(EvcVisit.id == visit.id, EvcVisit.status == 'scheduled')
        .values(status='in_progress', started_at=now, updated_at=now)
        .execution_options(synchronize_session=False)
    )
    if transition.rowcount != 1:
        db.rollback()
        raise HTTPException(status_code=409, detail='Visit status changed concurrently; reload and retry')
    _audit(db, actor, 'evc_visit', visit.id, 'evc.visit_started', {'application_id': visit.application_id})
    db.commit()
    db.refresh(visit)
    return visit


@router.post('/evc/visits/{visit_id}/complete', response_model=EvcVisitResponse)
def complete_evc_visit(
    visit_id: int,
    payload: EvcVisitComplete,
    actor: User = Depends(require_roles(*_REVIEW_ROLES)),
    db: Session = Depends(get_db),
) -> EvcVisit:
    visit = db.get(EvcVisit, visit_id)
    if visit is None:
        raise HTTPException(status_code=404, detail='EVC visit not found')
    _application_access(db, visit.application_id, actor)
    if actor.role != 'platform_admin' and visit.assigned_to_user_id != actor.id:
        raise HTTPException(status_code=403, detail='Only the assigned inspector can complete this visit')
    if visit.status != 'in_progress':
        raise HTTPException(status_code=409, detail='Only in-progress visits can be completed')

    results_json, failed_ids = _validated_evc_results(visit.checklist_json, payload.results)
    now = datetime.now(UTC)
    transition = db.execute(
        update(EvcVisit)
        .where(EvcVisit.id == visit.id, EvcVisit.status == 'in_progress')
        .values(
            status='completed',
            results_json=results_json,
            findings=payload.findings,
            report_revision=visit.report_revision + 1,
            completed_at=now,
            updated_at=now,
        )
        .execution_options(synchronize_session=False)
    )
    if transition.rowcount != 1:
        db.rollback()
        raise HTTPException(status_code=409, detail='Visit status changed concurrently; reload and retry')
    _audit(db, actor, 'evc_visit', visit.id, 'evc.visit_completed', {
        'application_id': visit.application_id,
        'report_revision': visit.report_revision + 1,
        'result_count': len(payload.results),
        'failed_items': failed_ids,
    })
    db.add(EvcVisitReport(
        visit_id=visit.id,
        revision=visit.report_revision + 1,
        findings=payload.findings,
        results_json=results_json,
        change_reason='Initial inspection report',
        created_by_user_id=actor.id,
    ))
    db.commit()
    db.refresh(visit)
    return visit
