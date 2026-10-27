from collections.abc import Generator
from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import create_access_token
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.application import Application
from app.models.audit_event import AuditEvent
from app.models.institution import Institution
from app.models.notification import Notification
from app.models.user import User
from app.services.notification_worker import run_notification_cycle

_engine = create_engine(
    'sqlite://',
    connect_args={'check_same_thread': False},
    poolclass=StaticPool,
)
_Session = sessionmaker(bind=_engine, autoflush=False, autocommit=False)


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    Base.metadata.create_all(bind=_engine)
    with _Session() as db:
        db.add_all([
            User(id=1, email='applicant@example.test', full_name='Applicant', role='applicant', region_code='TS', is_active=True),
            User(id=2, email='officer@example.test', full_name='Officer', role='regional_officer', region_code='TS', is_active=True),
            User(id=3, email='admin@example.test', full_name='Admin', role='platform_admin', region_code=None, is_active=True),
            User(id=4, email='other@example.test', full_name='Other Region User', role='applicant', region_code='AP', is_active=True),
        ])
        db.add_all([
            Institution(id=1, name='TS Institute', institution_code='TS-001', region_code='TS'),
            Institution(id=2, name='AP Institute', institution_code='AP-001', region_code='AP'),
        ])
        db.add_all([
            Application(
                id=1,
                reference_code='TS-APP-001',
                institution_id=1,
                submitted_by_user_id=1,
                workflow_stage='draft',
                status='draft',
            ),
            Application(
                id=2,
                reference_code='AP-APP-001',
                institution_id=2,
                submitted_by_user_id=4,
                workflow_stage='draft',
                status='draft',
            ),
        ])
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


def test_officer_can_create_and_update_region_obligation(client: TestClient) -> None:
    created = client.post(
        '/api/v1/obligations',
        headers=_headers(2),
        json={
            'application_id': 1,
            'owner_user_id': 1,
            'obligation_type': 'document_submission',
            'title': 'Submit missing document',
            'description': 'Provide the missing document for review.',
        },
    )
    assert created.status_code == 201
    obligation_id = created.json()['id']
    updated = client.patch(
        f'/api/v1/obligations/{obligation_id}',
        headers=_headers(2),
        json={'status': 'fulfilled'},
    )
    assert updated.status_code == 200
    assert updated.json()['status'] == 'fulfilled'


def test_obligation_owner_cannot_be_reassigned_across_regions(client: TestClient) -> None:
    created = client.post(
        '/api/v1/obligations',
        headers=_headers(2),
        json={
            'application_id': 1,
            'owner_user_id': 1,
            'obligation_type': 'document_submission',
            'title': 'Region-scoped owner check',
        },
    )
    assert created.status_code == 201
    obligation_id = created.json()['id']

    response = client.patch(
        f'/api/v1/obligations/{obligation_id}',
        headers=_headers(2),
        json={'owner_user_id': 4},
    )
    assert response.status_code == 422
    assert response.json()['detail'] == 'Obligation owner must belong to the application region'

    unchanged = client.get('/api/v1/obligations', headers=_headers(2))
    assert unchanged.status_code == 200
    assert next(item for item in unchanged.json() if item['id'] == obligation_id)['owner_user_id'] == 1


def test_obligation_list_is_scoped_before_pagination(client: TestClient) -> None:
    for application_id, owner_user_id, title in [
        (1, 1, 'TS obligation'),
        (2, 4, 'AP obligation'),
    ]:
        created = client.post(
            '/api/v1/obligations',
            headers=_headers(3),
            json={
                'application_id': application_id,
                'owner_user_id': owner_user_id,
                'obligation_type': 'document_submission',
                'title': title,
            },
        )
        assert created.status_code == 201

    ts_page = client.get('/api/v1/obligations', headers=_headers(2), params={'limit': 1})
    assert ts_page.status_code == 200
    assert [item['title'] for item in ts_page.json()] == ['TS obligation']

    ap_page = client.get('/api/v1/obligations', headers=_headers(4), params={'limit': 1})
    assert ap_page.status_code == 200
    assert [item['title'] for item in ap_page.json()] == ['AP obligation']


def test_applicant_cannot_create_obligation(client: TestClient) -> None:
    response = client.post(
        '/api/v1/obligations',
        headers=_headers(1),
        json={'application_id': 1, 'obligation_type': 'document', 'title': 'Submit document'},
    )
    assert response.status_code == 403


def test_overdue_escalation_is_idempotent_and_in_app(client: TestClient) -> None:
    due_at = (datetime.now(UTC) - timedelta(days=1)).isoformat()
    created = client.post(
        '/api/v1/obligations',
        headers=_headers(2),
        json={
            'application_id': 1,
            'owner_user_id': 1,
            'obligation_type': 'document_submission',
            'title': 'Overdue evidence',
            'due_at': due_at,
        },
    )
    assert created.status_code == 201

    first = client.post('/api/v1/obligations/escalate-due', headers=_headers(2))
    second = client.post('/api/v1/obligations/escalate-due', headers=_headers(2))
    assert first.status_code == 200
    assert first.json()['notifications_created'] == 1
    assert second.status_code == 200
    assert second.json()['notifications_created'] == 0

    inbox = client.get('/api/v1/notifications', headers=_headers(1))
    assert inbox.status_code == 200
    assert len(inbox.json()) == 1
    assert 'Overdue evidence' in inbox.json()[0]['payload_json']

    with _Session() as db:
        audit_events = db.query(AuditEvent).filter_by(
            entity_type='obligation',
            action='obligation.overdue_notified',
        ).all()
    assert len(audit_events) == 1



def test_notification_worker_queues_and_delivers_overdue_obligation(client: TestClient) -> None:
    due_at = (datetime.now(UTC) - timedelta(hours=2)).isoformat()
    created = client.post(
        '/api/v1/obligations',
        headers=_headers(2),
        json={
            'application_id': 1,
            'owner_user_id': 1,
            'obligation_type': 'document_submission',
            'title': 'Worker overdue item',
            'due_at': due_at,
        },
    )
    assert created.status_code == 201

    with _Session() as db:
        result = run_notification_cycle(db)

    assert result['overdue_notifications_queued'] == 1
    assert result['notifications_delivered'] == 1
    assert result['notifications_retried'] == 0
    with _Session() as db:
        notification = db.query(Notification).filter_by(
            event_key=f"obligation-overdue:{created.json()['id']}:{created.json()['due_at']}"
        ).one()
    assert notification.status == 'delivered'
    assert notification.attempt_count == 1
    assert notification.processed_at is not None
    assert notification.next_attempt_at is None


def test_notification_worker_retries_unsupported_channel_with_backoff(client: TestClient) -> None:
    with _Session() as db:
        db.add(Notification(
            recipient_user_id=1,
            event_key='test-unsupported-channel',
            channel='external_email',
            status='pending',
            attempt_count=0,
            payload_json='{"type":"test"}',
            next_attempt_at=datetime.now(UTC) - timedelta(seconds=1),
        ))
        db.commit()

    with _Session() as db:
        result = run_notification_cycle(db)

    assert result['notifications_retried'] == 1
    with _Session() as db:
        notification = db.query(Notification).filter_by(
            event_key='test-unsupported-channel'
        ).one()
    assert notification.status == 'pending'
    assert notification.attempt_count == 1
    assert notification.last_error == 'RuntimeError: Unsupported notification channel: external_email'
    assert notification.next_attempt_at is not None
    assert notification.processed_at is None
