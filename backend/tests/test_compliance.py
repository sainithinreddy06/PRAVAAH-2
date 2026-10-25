import hashlib
from collections.abc import Generator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import settings
from app.core.security import create_access_token
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.audit_event import AuditEvent
from app.models.application import Application
from app.models.institution import Institution
from app.models.user import User

_engine = create_engine(
    'sqlite://',
    connect_args={'check_same_thread': False},
    poolclass=StaticPool,
)
_Session = sessionmaker(bind=_engine, autoflush=False, autocommit=False)


@pytest.fixture
def client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Generator[TestClient, None, None]:
    monkeypatch.setattr(settings, 'evidence_storage_dir', str(tmp_path / 'evidence'))
    monkeypatch.setattr(settings, 'max_evidence_size_bytes', 1024 * 1024)
    Base.metadata.create_all(bind=_engine)
    with _Session() as db:
        db.add_all(
            [
                User(id=1, email='applicant@example.test', full_name='Applicant', role='applicant', region_code='TS', is_active=True),
                User(id=2, email='officer@example.test', full_name='Officer', role='regional_officer', region_code='TS', is_active=True),
                User(id=3, email='admin@example.test', full_name='Admin', role='platform_admin', region_code=None, is_active=True),
                User(id=4, email='other@example.test', full_name='Other', role='applicant', region_code='AP', is_active=True),
            ]
        )
        db.add_all(
            [
                Institution(id=1, name='TS Institute', institution_code='TS-001', region_code='TS'),
                Institution(id=2, name='AP Institute', institution_code='AP-001', region_code='AP'),
            ]
        )
        db.add(
            Application(
                id=1,
                reference_code='TS-APP-001',
                institution_id=1,
                submitted_by_user_id=1,
                workflow_stage='draft',
                status='draft',
            )
        )
        db.commit()

    def override_get_db() -> Generator[Session, None, None]:
        db = _Session()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=_engine)


def _headers(user_id: int) -> dict[str, str]:
    return {'Authorization': f'Bearer {create_access_token(str(user_id))}'}


def test_platform_admin_can_create_versioned_policy(client: TestClient) -> None:
    response = client.post(
        '/api/v1/policies',
        headers=_headers(3),
        json={
            'policy_key': 'DOC.IDENTITY',
            'version': 1,
            'title': 'Identity evidence',
            'description': 'A test policy, not an official AICTE rule.',
            'source_reference': 'internal-test-fixture',
        },
    )
    assert response.status_code == 201
    assert response.json()['version'] == 1


def test_non_admin_cannot_create_policy(client: TestClient) -> None:
    response = client.post(
        '/api/v1/policies',
        headers=_headers(1),
        json={'policy_key': 'DOC.ID', 'version': 1, 'title': 'Identity policy'},
    )
    assert response.status_code == 403


def test_duplicate_policy_version_is_rejected(client: TestClient) -> None:
    payload = {'policy_key': 'DOC.ID', 'version': 1, 'title': 'Identity policy'}
    first = client.post('/api/v1/policies', headers=_headers(3), json=payload)
    second = client.post('/api/v1/policies', headers=_headers(3), json=payload)
    assert first.status_code == 201
    assert second.status_code == 409


def test_policy_version_date_range_must_be_valid(client: TestClient) -> None:
    response = client.post(
        '/api/v1/policies',
        headers=_headers(3),
        json={
            'policy_key': 'DOC.DATE',
            'version': 1,
            'title': 'Date range validation',
            'effective_from': '2026-10-25T00:00:00Z',
            'effective_until': '2026-10-24T00:00:00Z',
        },
    )
    assert response.status_code == 422
    assert response.json()['detail'] == 'effective_until must be after effective_from'


def test_upload_stores_hash_and_generated_storage_key(client: TestClient) -> None:
    content = b'%PDF-1.7\nminimal test PDF payload'
    response = client.post(
        '/api/v1/applications/1/evidence',
        headers=_headers(1),
        files={'file': ('identity.pdf', content, 'application/pdf')},
    )
    assert response.status_code == 201
    data = response.json()
    assert data['sha256_digest'] == hashlib.sha256(content).hexdigest()
    assert data['review_status'] == 'pending'
    assert data['original_filename'] == 'identity.pdf'
    files = list(Path(settings.evidence_storage_dir).iterdir())
    assert len(files) == 1
    assert files[0].read_bytes() == content


def test_upload_rejects_mismatched_file_signature(client: TestClient) -> None:
    response = client.post(
        '/api/v1/applications/1/evidence',
        headers=_headers(1),
        files={'file': ('malware.pdf', b'not a pdf', 'application/pdf')},
    )
    assert response.status_code == 415


def test_upload_rejects_cross_region_application(client: TestClient) -> None:
    response = client.post(
        '/api/v1/applications/1/evidence',
        headers=_headers(4),
        files={'file': ('identity.pdf', b'%PDF-1.7\ncontent', 'application/pdf')},
    )
    assert response.status_code == 403


def test_officer_can_review_evidence_and_audit_is_written(client: TestClient) -> None:
    upload = client.post(
        '/api/v1/applications/1/evidence',
        headers=_headers(1),
        files={'file': ('identity.pdf', b'%PDF-1.7\ncontent', 'application/pdf')},
    )
    assert upload.status_code == 201
    evidence_id = upload.json()['id']
    review = client.patch(
        f'/api/v1/evidence/{evidence_id}/review',
        headers=_headers(2),
        json={'review_status': 'accepted', 'reviewer_notes': 'Reviewed test evidence'},
    )
    assert review.status_code == 200
    assert review.json()['review_status'] == 'accepted'

    with _Session() as db:
        events = db.scalars(
            select(AuditEvent).where(AuditEvent.entity_type == 'evidence').order_by(AuditEvent.id)
        ).all()
    assert [event.action for event in events] == ['evidence.uploaded', 'evidence.reviewed']


def test_applicant_cannot_review_evidence(client: TestClient) -> None:
    upload = client.post(
        '/api/v1/applications/1/evidence',
        headers=_headers(1),
        files={'file': ('identity.pdf', b'%PDF-1.7\ncontent', 'application/pdf')},
    )
    response = client.patch(
        f"/api/v1/evidence/{upload.json()['id']}/review",
        headers=_headers(1),
        json={'review_status': 'accepted', 'reviewer_notes': 'Self approval attempt'},
    )
    assert response.status_code == 403
