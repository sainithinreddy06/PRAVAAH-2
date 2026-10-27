import hashlib
import json
import re
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import ensure_region_access, get_current_user, require_roles
from app.core.config import settings
from app.db.session import get_db
from app.models.application import Application
from app.models.audit_event import AuditEvent
from app.models.evidence import Evidence
from app.models.institution import Institution
from app.models.policy import Policy
from app.models.user import User
from app.schemas.compliance import (
    EvidenceResponse,
    EvidenceReviewRequest,
    PolicyCreate,
    PolicyResponse,
)

router = APIRouter(tags=['policy and evidence'])
_ALLOWED_SIGNATURES = {
    'application/pdf': (b'%PDF-', '.pdf'),
    'image/jpeg': (b'\xff\xd8\xff', '.jpg'),
    'image/png': (b'\x89PNG\r\n\x1a\n', '.png'),
}


def _application_for_actor(db: Session, application_id: int, actor: User) -> Application:
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


def _audit(
    db: Session,
    actor: User,
    entity_type: str,
    entity_id: int,
    action: str,
    reason: str,
    details: dict[str, object],
) -> None:
    db.add(
        AuditEvent(
            actor_user_id=actor.id,
            entity_type=entity_type,
            entity_id=str(entity_id),
            action=action,
            reason=reason,
            details_json=json.dumps(details, sort_keys=True),
        )
    )


@router.get('/policies', response_model=list[PolicyResponse])
def list_policies(
    policy_key: str | None = None,
    active_only: bool = True,
    actor: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[Policy]:
    query = select(Policy)
    if policy_key:
        query = query.where(Policy.policy_key == policy_key)
    if active_only:
        query = query.where(Policy.is_active.is_(True))
    return list(db.scalars(query.order_by(Policy.policy_key, Policy.version.desc())).all())


@router.post('/policies', response_model=PolicyResponse, status_code=status.HTTP_201_CREATED)
def create_policy_version(
    payload: PolicyCreate,
    actor: User = Depends(require_roles('platform_admin')),
    db: Session = Depends(get_db),
) -> Policy:
    if (
        payload.effective_from is not None
        and payload.effective_until is not None
        and payload.effective_until <= payload.effective_from
    ):
        raise HTTPException(status_code=422, detail='effective_until must be after effective_from')

    duplicate = db.scalar(
        select(Policy).where(
            Policy.policy_key == payload.policy_key,
            Policy.version == payload.version,
        )
    )
    if duplicate is not None:
        raise HTTPException(status_code=409, detail='Policy version already exists')

    policy = Policy(**payload.model_dump(), is_active=True)
    db.add(policy)
    try:
        # The database constraint is authoritative if simultaneous requests
        # race after the pre-insert duplicate check.
        db.flush()
        _audit(
            db, actor, 'policy', policy.id, 'policy.version_created',
            'Policy version created', {'policy_key': policy.policy_key, 'version': policy.version},
        )
        db.commit()
    except IntegrityError:
        db.rollback()
        duplicate = db.scalar(
            select(Policy).where(
                Policy.policy_key == payload.policy_key,
                Policy.version == payload.version,
            )
        )
        if duplicate is not None:
            raise HTTPException(status_code=409, detail='Policy version already exists') from None
        raise
    db.refresh(policy)
    return policy


@router.post(
    '/applications/{application_id}/evidence',
    response_model=EvidenceResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_evidence(
    application_id: int,
    file: UploadFile = File(...),
    policy_id: int | None = Form(default=None),
    actor: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Evidence:
    application = _application_for_actor(db, application_id, actor)
    if actor.role not in {'applicant', 'institution_admin', 'regional_officer', 'platform_admin'}:
        raise HTTPException(status_code=403, detail='Your role cannot upload evidence')
    if application.status not in {'draft', 'changes_requested'}:
        raise HTTPException(status_code=409, detail='Evidence can only be uploaded to draft or changes-requested applications')

    policy = None
    if policy_id is not None:
        policy = db.get(Policy, policy_id)
        if policy is None or not policy.is_active:
            raise HTTPException(status_code=422, detail='Policy does not exist or is inactive')

        now = datetime.now(UTC)
        effective_from = policy.effective_from
        effective_until = policy.effective_until
        # SQLite test fixtures may return naive datetimes even when the column
        # is timezone-aware; treat those values as UTC for consistent checks.
        if effective_from is not None and effective_from.tzinfo is None:
            effective_from = effective_from.replace(tzinfo=UTC)
        if effective_until is not None and effective_until.tzinfo is None:
            effective_until = effective_until.replace(tzinfo=UTC)
        if effective_from is not None and effective_from > now:
            raise HTTPException(status_code=422, detail='Policy version is not yet effective')
        if effective_until is not None and effective_until <= now:
            raise HTTPException(status_code=422, detail='Policy version has expired')

    safe_name = Path(file.filename or 'evidence').name
    safe_name = re.sub(r'[^A-Za-z0-9._-]+', '_', safe_name)[:255] or 'evidence'
    declared_type = (file.content_type or '').split(';', maxsplit=1)[0].strip().lower()
    content = await file.read(settings.max_evidence_size_bytes + 1)
    await file.close()
    if not content:
        raise HTTPException(status_code=422, detail='Evidence file is empty')
    if len(content) > settings.max_evidence_size_bytes:
        raise HTTPException(status_code=413, detail='Evidence file exceeds the configured size limit')
    signature = _ALLOWED_SIGNATURES.get(declared_type)
    if signature is None or not content.startswith(signature[0]):
        raise HTTPException(status_code=415, detail='Only valid PDF, JPEG, and PNG files are accepted')

    storage_key = f'{uuid4().hex}{signature[1]}'
    storage_root = Path(settings.evidence_storage_dir).resolve()
    storage_root.mkdir(parents=True, exist_ok=True)
    destination = (storage_root / storage_key).resolve()
    if destination.parent != storage_root:
        raise HTTPException(status_code=400, detail='Invalid storage key')
    destination.write_bytes(content)

    evidence = Evidence(
        application_id=application.id,
        policy_id=policy.id if policy else None,
        original_filename=safe_name,
        storage_key=storage_key,
        content_type=declared_type,
        sha256_digest=hashlib.sha256(content).hexdigest(),
        review_status='pending',
    )
    try:
        db.add(evidence)
        db.flush()
        _audit(
            db, actor, 'evidence', evidence.id, 'evidence.uploaded',
            'Evidence uploaded', {
                'application_id': application.id,
                'sha256_digest': evidence.sha256_digest,
                'policy_id': evidence.policy_id,
                'policy_key': policy.policy_key if policy else None,
                'policy_version': policy.version if policy else None,
                'policy_source_reference': policy.source_reference if policy else None,
            },
        )
        db.commit()
        db.refresh(evidence)
    except Exception:
        db.rollback()
        destination.unlink(missing_ok=True)
        raise
    return evidence


@router.get(
    '/applications/{application_id}/evidence',
    response_model=list[EvidenceResponse],
)
def list_evidence(
    application_id: int,
    actor: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[Evidence]:
    _application_for_actor(db, application_id, actor)
    return list(
        db.scalars(
            select(Evidence)
            .where(Evidence.application_id == application_id)
            .order_by(Evidence.created_at.desc(), Evidence.id.desc())
        ).all()
    )


@router.get('/evidence/{evidence_id}/download')
def download_evidence(
    evidence_id: int,
    actor: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FileResponse:
    evidence = db.get(Evidence, evidence_id)
    if evidence is None:
        raise HTTPException(status_code=404, detail='Evidence not found')

    _application_for_actor(db, evidence.application_id, actor)
    storage_root = Path(settings.evidence_storage_dir).resolve()
    destination = (storage_root / evidence.storage_key).resolve()
    if destination.parent != storage_root:
        raise HTTPException(status_code=404, detail='Evidence file not found')
    if not destination.is_file():
        raise HTTPException(status_code=404, detail='Evidence file not found')

    return FileResponse(
        path=destination,
        media_type=evidence.content_type or 'application/octet-stream',
        filename=evidence.original_filename,
        content_disposition_type='attachment',
    )


@router.patch('/evidence/{evidence_id}/review', response_model=EvidenceResponse)
def review_evidence(
    evidence_id: int,
    payload: EvidenceReviewRequest,
    actor: User = Depends(require_roles('regional_officer', 'platform_admin')),
    db: Session = Depends(get_db),
) -> Evidence:
    evidence = db.get(Evidence, evidence_id)
    if evidence is None:
        raise HTTPException(status_code=404, detail='Evidence not found')
    _application_for_actor(db, evidence.application_id, actor)

    reviewer_notes = payload.reviewer_notes.strip()
    # Make the pending-to-reviewed transition atomic so concurrent reviewers
    # cannot overwrite each other's decision or create duplicate audit events.
    result = db.execute(
        update(Evidence)
        .where(Evidence.id == evidence.id, Evidence.review_status == 'pending')
        .values(review_status=payload.review_status, reviewer_notes=reviewer_notes)
        .execution_options(synchronize_session=False)
    )
    if result.rowcount != 1:
        db.rollback()
        raise HTTPException(status_code=409, detail='Evidence has already been reviewed')
    _audit(
        db, actor, 'evidence', evidence.id, 'evidence.reviewed',
        reviewer_notes,
        {'review_status': payload.review_status, 'application_id': evidence.application_id},
    )
    db.commit()
    db.refresh(evidence)
    return evidence
