import hashlib
import hmac
import json
from collections.abc import Generator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import settings
from app.core.security import create_access_token
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.audit_event import AuditEvent
from app.models.evidence import Evidence
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


def test_upload_rejects_policy_version_not_yet_effective(client: TestClient) -> None:
    policy = client.post(
        '/api/v1/policies',
        headers=_headers(3),
        json={
            'policy_key': 'DOC.FUTURE',
            'version': 1,
            'title': 'Future policy',
            'effective_from': '2099-01-01T00:00:00Z',
        },
    )
    assert policy.status_code == 201

    response = client.post(
        '/api/v1/applications/1/evidence',
        headers=_headers(1),
        data={'policy_id': str(policy.json()['id'])},
        files={'file': ('identity.pdf', b'%PDF-1.7\\ncontent', 'application/pdf')},
    )
    assert response.status_code == 422
    assert response.json()['detail'] == 'Policy version is not yet effective'


def test_upload_rejects_expired_policy_version(client: TestClient) -> None:
    policy = client.post(
        '/api/v1/policies',
        headers=_headers(3),
        json={
            'policy_key': 'DOC.EXPIRED',
            'version': 1,
            'title': 'Expired policy',
            'effective_from': '2000-01-01T00:00:00Z',
            'effective_until': '2001-01-01T00:00:00Z',
        },
    )
    assert policy.status_code == 201

    response = client.post(
        '/api/v1/applications/1/evidence',
        headers=_headers(1),
        data={'policy_id': str(policy.json()['id'])},
        files={'file': ('identity.pdf', b'%PDF-1.7\\ncontent', 'application/pdf')},
    )
    assert response.status_code == 422
    assert response.json()['detail'] == 'Policy version has expired'


def test_evidence_audit_snapshots_attached_policy_version(client: TestClient) -> None:
    policy = client.post(
        '/api/v1/policies',
        headers=_headers(3),
        json={
            'policy_key': 'DOC.IDENTITY',
            'version': 7,
            'title': 'Identity evidence',
            'source_reference': 'official-policy-reference',
        },
    )
    assert policy.status_code == 201
    policy_data = policy.json()

    upload = client.post(
        '/api/v1/applications/1/evidence',
        headers=_headers(1),
        data={'policy_id': str(policy_data['id'])},
        files={'file': ('identity.pdf', b'%PDF-1.7\\ncontent', 'application/pdf')},
    )
    assert upload.status_code == 201
    assert upload.json()['policy_id'] == policy_data['id']

    with _Session() as db:
        evidence = db.get(Evidence, upload.json()['id'])
        event = db.scalar(
            select(AuditEvent).where(
                AuditEvent.entity_type == 'evidence',
                AuditEvent.entity_id == str(upload.json()['id']),
                AuditEvent.action == 'evidence.uploaded',
            )
        )
    assert evidence is not None
    assert evidence.policy_id == policy_data['id']
    assert event is not None
    details = json.loads(event.details_json)
    assert details['policy_id'] == policy_data['id']
    assert details['policy_key'] == 'DOC.IDENTITY'
    assert details['policy_version'] == 7
    assert details['policy_source_reference'] == 'official-policy-reference'


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


def test_evidence_download_returns_original_bytes_to_authorized_user(client: TestClient) -> None:
    content = b'%PDF-1.7\\nsecure test document'
    upload = client.post(
        '/api/v1/applications/1/evidence',
        headers=_headers(1),
        files={'file': ('identity.pdf', content, 'application/pdf')},
    )
    assert upload.status_code == 201

    response = client.get(
        f"/api/v1/evidence/{upload.json()['id']}/download",
        headers=_headers(1),
    )
    assert response.status_code == 200
    assert response.content == content
    assert 'attachment' in response.headers['content-disposition']
    assert 'identity.pdf' in response.headers['content-disposition']



def test_expired_evidence_download_is_gone(client: TestClient) -> None:
    upload = client.post(
        '/api/v1/applications/1/evidence',
        headers=_headers(1),
        files={'file': ('expired.pdf', b'%PDF-1.7\\nexpired test document', 'application/pdf')},
    )
    assert upload.status_code == 201
    with _Session() as db:
        evidence = db.get(Evidence, upload.json()['id'])
        assert evidence is not None
        evidence.review_status = 'expired'
        db.commit()

    response = client.get(
        f"/api/v1/evidence/{upload.json()['id']}/download",
        headers=_headers(1),
    )
    assert response.status_code == 410
    assert response.json()['detail'] == 'Evidence has expired under the retention policy'


def test_evidence_download_rejects_file_modified_after_upload(client: TestClient) -> None:
    content = b'%PDF-1.7\\noriginal evidence bytes'
    upload = client.post(
        '/api/v1/applications/1/evidence',
        headers=_headers(1),
        files={'file': ('identity.pdf', content, 'application/pdf')},
    )
    assert upload.status_code == 201

    with _Session() as db:
        evidence = db.get(Evidence, upload.json()['id'])
        assert evidence is not None
        stored_path = Path(settings.evidence_storage_dir) / evidence.storage_key
    stored_path.write_bytes(b'%PDF-1.7\\nmodified evidence bytes')

    response = client.get(
        f"/api/v1/evidence/{upload.json()['id']}/download",
        headers=_headers(1),
    )
    assert response.status_code == 409
    assert response.json()['detail'] == 'Evidence integrity check failed'


def test_evidence_download_rejects_cross_region_user(client: TestClient) -> None:
    upload = client.post(
        '/api/v1/applications/1/evidence',
        headers=_headers(1),
        files={'file': ('identity.pdf', b'%PDF-1.7\\ncontent', 'application/pdf')},
    )
    assert upload.status_code == 201

    response = client.get(
        f"/api/v1/evidence/{upload.json()['id']}/download",
        headers=_headers(4),
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


def test_evidence_cannot_be_reviewed_twice(client: TestClient) -> None:
    upload = client.post(
        '/api/v1/applications/1/evidence',
        headers=_headers(1),
        files={'file': ('identity.pdf', b'%PDF-1.7\\ncontent', 'application/pdf')},
    )
    assert upload.status_code == 201
    evidence_id = upload.json()['id']

    first = client.patch(
        f'/api/v1/evidence/{evidence_id}/review',
        headers=_headers(2),
        json={'review_status': 'accepted', 'reviewer_notes': 'First review decision'},
    )
    second = client.patch(
        f'/api/v1/evidence/{evidence_id}/review',
        headers=_headers(2),
        json={'review_status': 'rejected', 'reviewer_notes': 'Conflicting second decision'},
    )
    assert first.status_code == 200
    assert second.status_code == 409
    assert second.json()['detail'] == 'Evidence has already been reviewed'

    with _Session() as db:
        events = db.scalars(
            select(AuditEvent).where(
                AuditEvent.entity_type == 'evidence',
                AuditEvent.entity_id == str(evidence_id),
                AuditEvent.action == 'evidence.reviewed',
            )
        ).all()
    assert len(events) == 1


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




def test_evidence_upload_rejects_malware_scan_detection(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    def reject_content(content: bytes) -> None:
        raise ValueError('Malware detected in evidence file')

    monkeypatch.setattr('app.api.routes.compliance.scan_evidence', reject_content)
    response = client.post(
        '/api/v1/applications/1/evidence',
        headers=_headers(1),
        files={'file': ('suspect.pdf', b'%PDF-1.7\\ncontent', 'application/pdf')},
    )
    assert response.status_code == 422
    assert response.json()['detail'] == 'Evidence failed the malware scan'
    storage_dir = Path(settings.evidence_storage_dir)
    assert not storage_dir.exists() or list(storage_dir.iterdir()) == []
    with _Session() as db:
        assert db.query(Evidence).filter_by(original_filename='suspect.pdf').count() == 0


def test_audit_checkpoint_signature_is_verifiable(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    secret = 'checkpoint-test-secret-' + ('x' * 32)
    monkeypatch.setattr(settings, 'audit_checkpoint_secret', secret)

    response = client.get('/api/v1/audit/checkpoint', headers=_headers(3))
    assert response.status_code == 200
    checkpoint = response.json()
    assert checkpoint['signature_algorithm'] == 'HMAC-SHA256'

    signed_payload = json.dumps(
        {
            'event_count': checkpoint['event_count'],
            'generated_at': checkpoint['generated_at'],
            'head_hash': checkpoint['head_hash'],
        },
        sort_keys=True,
        separators=(',', ':'),
    )
    expected_signature = hmac.new(
        secret.encode('utf-8'),
        signed_payload.encode('utf-8'),
        hashlib.sha256,
    ).hexdigest()
    assert hmac.compare_digest(checkpoint['signature'], expected_signature)


def test_audit_checkpoint_fails_closed_without_signing_secret(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, 'audit_checkpoint_secret', '')
    response = client.get('/api/v1/audit/checkpoint', headers=_headers(3))
    assert response.status_code == 503
    assert response.json()['detail'] == 'Audit checkpoint signing is not configured'



def test_evidence_file_is_removed_if_audit_persistence_fails(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def fail_audit_insert(mapper, connection, target) -> None:
        raise RuntimeError('simulated evidence audit failure')

    event.listen(AuditEvent, 'before_insert', fail_audit_insert)
    try:
        with pytest.raises(RuntimeError, match='simulated evidence audit failure'):
            client.post(
                '/api/v1/applications/1/evidence',
                headers=_headers(1),
                files={'file': ('rollback.pdf', b'%PDF-1.7\\nrollback test payload', 'application/pdf')},
            )
    finally:
        event.remove(AuditEvent, 'before_insert', fail_audit_insert)

    assert list(Path(settings.evidence_storage_dir).iterdir()) == []
    with _Session() as db:
        assert db.query(Evidence).filter_by(original_filename='rollback.pdf').count() == 0


def test_evidence_text_extraction_endpoint_returns_bounded_preview(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    upload = client.post(
        '/api/v1/applications/1/evidence',
        headers=_headers(1),
        files={'file': ('identity.pdf', b'%PDF-1.7\\nfixture', 'application/pdf')},
    )
    assert upload.status_code == 201
    evidence_id = upload.json()['id']

    def fake_extract(content: bytes, content_type: str | None) -> dict[str, object]:
        assert content.startswith(b'%PDF-')
        assert content_type == 'application/pdf'
        return {
            'method': 'pdf_text_layer',
            'text': 'Institution Name: Example Institute',
            'character_count': 35,
            'truncated': False,
            'message': 'Extracted text is unverified.',
        }

    monkeypatch.setattr('app.api.routes.compliance.extract_evidence_text', fake_extract)
    response = client.get(
        f'/api/v1/evidence/{evidence_id}/extract-text',
        headers=_headers(1),
    )
    assert response.status_code == 200
    assert response.json()['method'] == 'pdf_text_layer'
    assert response.json()['text'] == 'Institution Name: Example Institute'
    assert 'not AI validation' in response.json()['disclaimer']

    with _Session() as db:
        audit_event = db.scalar(
            select(AuditEvent).where(
                AuditEvent.entity_type == 'evidence',
                AuditEvent.entity_id == str(evidence_id),
                AuditEvent.action == 'evidence.text_extracted',
            )
        )
    assert audit_event is not None
    details = json.loads(audit_event.details_json)
    assert details['method'] == 'pdf_text_layer'
    assert details['character_count'] == 35
    assert 'text' not in details
    assert 'Example Institute' not in audit_event.details_json



def test_evidence_audit_history_exposes_safe_metadata_to_reviewers(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    upload = client.post(
        '/api/v1/applications/1/evidence',
        headers=_headers(1),
        files={'file': ('identity.pdf', b'%PDF-1.7\\nfixture', 'application/pdf')},
    )
    assert upload.status_code == 201
    evidence_id = upload.json()['id']

    monkeypatch.setattr(
        'app.api.routes.compliance.extract_evidence_text',
        lambda content, content_type: {
            'method': 'pdf_text_layer',
            'text': 'Private extracted institution details',
            'character_count': 36,
            'truncated': False,
            'message': 'Extracted text is unverified.',
        },
    )
    extracted = client.get(
        f'/api/v1/evidence/{evidence_id}/extract-text',
        headers=_headers(1),
    )
    assert extracted.status_code == 200

    response = client.get(
        f'/api/v1/evidence/{evidence_id}/audit-history',
        headers=_headers(2),
    )
    assert response.status_code == 200
    events = response.json()
    assert [item['action'] for item in events] == [
        'evidence.text_extracted',
        'evidence.uploaded',
    ]
    extraction_event = events[0]
    assert extraction_event['details']['method'] == 'pdf_text_layer'
    assert extraction_event['details']['character_count'] == 36
    assert 'text' not in extraction_event['details']
    assert 'Private extracted institution details' not in json.dumps(events)
    assert extraction_event['event_hash']
    assert extraction_event['previous_hash']

    denied = client.get(
        f'/api/v1/evidence/{evidence_id}/audit-history',
        headers=_headers(1),
    )
    assert denied.status_code == 403



def test_evidence_text_extraction_obeys_application_access(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    upload = client.post(
        '/api/v1/applications/1/evidence',
        headers=_headers(1),
        files={'file': ('identity.pdf', b'%PDF-1.7\\nfixture', 'application/pdf')},
    )
    assert upload.status_code == 201
    evidence_id = upload.json()['id']
    response = client.get(
        f'/api/v1/evidence/{evidence_id}/extract-text',
        headers=_headers(4),
    )
    assert response.status_code == 403



def test_audit_integrity_endpoint_verifies_chain_and_requires_admin(client: TestClient) -> None:
    valid = client.get('/api/v1/audit/integrity', headers=_headers(3))
    assert valid.status_code == 200
    assert valid.json()['valid'] is True
    assert valid.json()['events_checked'] == 0

    denied = client.get('/api/v1/audit/integrity', headers=_headers(2))
    assert denied.status_code == 403


def test_audit_integrity_endpoint_detects_modified_event(client: TestClient) -> None:
    upload = client.post(
        '/api/v1/applications/1/evidence',
        headers=_headers(1),
        files={'file': ('integrity.pdf', b'%PDF-1.7\\nfixture', 'application/pdf')},
    )
    assert upload.status_code == 201

    with _Session() as db:
        audit_event = db.scalar(
            select(AuditEvent).where(
                AuditEvent.entity_type == 'evidence',
                AuditEvent.action == 'evidence.uploaded',
            )
        )
        assert audit_event is not None
        audit_event.details_json = json.dumps({'tampered': True})
        db.commit()

    response = client.get('/api/v1/audit/integrity', headers=_headers(3))
    assert response.status_code == 200
    assert response.json()['valid'] is False
    assert response.json()['first_invalid_event_id'] is not None
