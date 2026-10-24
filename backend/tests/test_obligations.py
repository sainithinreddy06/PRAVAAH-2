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
from app.models.institution import Institution
from app.models.user import User

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
        ])
        db.add(Institution(id=1, name='TS Institute', institution_code='TS-001', region_code='TS'))
        db.add(Application(
            id=1,
            reference_code='TS-APP-001',
            institution_id=1,
            submitted_by_user_id=1,
            workflow_stage='draft',
            status='draft',
        ))
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
