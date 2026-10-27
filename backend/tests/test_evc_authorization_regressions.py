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
            User(id=2, email='scheduler@example.test', full_name='Scheduler', role='regional_officer', region_code='TS', is_active=True),
            User(id=3, email='admin@example.test', full_name='Admin', role='platform_admin', region_code=None, is_active=True),
            User(id=4, email='other-region@example.test', full_name='Other Region Officer', role='regional_officer', region_code='AP', is_active=True),
            User(id=5, email='inspector@example.test', full_name='Assigned Inspector', role='regional_officer', region_code='TS', is_active=True),
            User(id=6, email='inactive-inspector@example.test', full_name='Inactive Inspector', role='regional_officer', region_code='TS', is_active=False),
        ])
        db.add_all([
            Institution(id=1, name='TS Institute', institution_code='TS-001', region_code='TS'),
            Institution(id=2, name='AP Institute', institution_code='AP-001', region_code='AP'),
        ])
        db.add_all([
            Application(id=1, reference_code='TS-APP-001', institution_id=1, submitted_by_user_id=1, workflow_stage='draft', status='draft'),
            Application(id=2, reference_code='AP-APP-001', institution_id=2, submitted_by_user_id=4, workflow_stage='draft', status='draft'),
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


def _schedule_visit(client: TestClient, assigned_user_id: int = 5) -> int:
    response = client.post('/api/v1/evc/visits', headers=_headers(2), json={
        'application_id': 1,
        'assigned_to_user_id': assigned_user_id,
        'scheduled_at': (datetime.now(UTC) + timedelta(hours=2)).isoformat(),
        'checklist_items': [
            {'item_id': 'site-safety', 'label': 'Site safety controls', 'required': True},
        ],
    })
    assert response.status_code == 201, response.text
    return response.json()['id']


def test_only_assigned_inspector_can_start_visit(client: TestClient) -> None:
    visit_id = _schedule_visit(client)

    denied = client.post('/api/v1/evc/visits/' + str(visit_id) + '/start', headers=_headers(2))
    assert denied.status_code == 403
    assert denied.json()['detail'] == 'Only the assigned inspector can start this visit'

    started = client.post('/api/v1/evc/visits/' + str(visit_id) + '/start', headers=_headers(5))
    assert started.status_code == 200
    assert started.json()['status'] == 'in_progress'


def test_only_assigned_inspector_can_complete_or_amend_visit_report(client: TestClient) -> None:
    visit_id = _schedule_visit(client)
    started = client.post('/api/v1/evc/visits/' + str(visit_id) + '/start', headers=_headers(5))
    assert started.status_code == 200

    completed = client.post('/api/v1/evc/visits/' + str(visit_id) + '/complete', headers=_headers(5), json={
        'findings': 'Site safety controls inspected.',
        'results': [{'item_id': 'site-safety', 'outcome': 'pass'}],
    })
    assert completed.status_code == 200
    assert completed.json()['status'] == 'completed'

    denied_amendment = client.post('/api/v1/evc/visits/' + str(visit_id) + '/reports', headers=_headers(2), json={
        'findings': 'Unauthorized report change.',
        'change_reason': 'Attempted by a non-assigned inspector',
        'results': [{'item_id': 'site-safety', 'outcome': 'fail'}],
    })
    assert denied_amendment.status_code == 403
    assert denied_amendment.json()['detail'] == 'Only the assigned inspector can amend this report'


def test_cross_region_officer_cannot_read_evc_visits(client: TestClient) -> None:
    created = client.post('/api/v1/evc/visits', headers=_headers(2), json={
        'application_id': 1,
        'assigned_to_user_id': 5,
        'scheduled_at': (datetime.now(UTC) + timedelta(hours=2)).isoformat(),
        'checklist_items': [{'item_id': 'site-safety', 'label': 'Site safety controls', 'required': True}],
    })
    assert created.status_code == 201

    denied = client.get('/api/v1/applications/1/evc-visits', headers=_headers(4))
    assert denied.status_code == 403


def test_inactive_inspector_cannot_be_assigned_to_evc_visit(client: TestClient) -> None:
    response = client.post('/api/v1/evc/visits', headers=_headers(2), json={
        'application_id': 1,
        'assigned_to_user_id': 6,
        'scheduled_at': (datetime.now(UTC) + timedelta(hours=2)).isoformat(),
        'checklist_items': [{'item_id': 'site-safety', 'label': 'Site safety controls', 'required': True}],
    })
    assert response.status_code == 422
    assert response.json()['detail'] == 'Assigned inspector does not exist or is inactive'


@pytest.mark.parametrize('user_id', [1, 4])
def test_non_reviewer_cannot_schedule_evc_visit(client: TestClient, user_id: int) -> None:
    response = client.post('/api/v1/evc/visits', headers=_headers(user_id), json={
        'application_id': 1,
        'assigned_to_user_id': 5,
        'scheduled_at': (datetime.now(UTC) + timedelta(hours=2)).isoformat(),
        'checklist_items': [{'item_id': 'site-safety', 'label': 'Site safety controls', 'required': True}],
    })
    assert response.status_code == 403
