from collections.abc import Generator

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
from app.models.user import User

_engine = create_engine('sqlite://', connect_args={'check_same_thread': False}, poolclass=StaticPool)
_Session = sessionmaker(bind=_engine, autoflush=False, autocommit=False)


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    Base.metadata.create_all(bind=_engine)
    with _Session() as db:
        db.add_all([
            User(id=1, email='applicant@example.test', full_name='Applicant', role='applicant', region_code='TS', is_active=True),
            User(id=2, email='officer@example.test', full_name='Officer', role='regional_officer', region_code='TS', is_active=True),
            User(id=3, email='admin@example.test', full_name='Admin', role='platform_admin', region_code=None, is_active=True),
            User(id=4, email='other-officer@example.test', full_name='Other officer', role='regional_officer', region_code='AP', is_active=True),
            Institution(id=1, name='TS Institute', institution_code='TS-001', region_code='TS'),
            Institution(id=2, name='AP Institute', institution_code='AP-001', region_code='AP'),
        ])
        db.add_all([
            Application(id=1, reference_code='TS-APP-001', institution_id=1, submitted_by_user_id=1, workflow_stage='draft', status='draft'),
            Application(id=2, reference_code='AP-APP-001', institution_id=2, submitted_by_user_id=1, workflow_stage='draft', status='submitted'),
        ])
        db.add_all([
            AuditEvent(id=1, actor_user_id=2, entity_type='application', entity_id='1', action='application.created', reason='test', details_json='{}'),
            AuditEvent(id=2, actor_user_id=4, entity_type='application', entity_id='2', action='application.created', reason='test', details_json='{}'),
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


def test_regional_officer_only_sees_audit_events_for_own_region(client: TestClient) -> None:
    response = client.get('/api/v1/audit/events', headers=_headers(2))
    assert response.status_code == 200
    assert [event['entity_id'] for event in response.json()] == ['1']


def test_applicant_cannot_read_audit_log_or_operational_metrics(client: TestClient) -> None:
    audit = client.get('/api/v1/audit/events', headers=_headers(1))
    metrics = client.get('/api/v1/operations/metrics', headers=_headers(1))
    assert audit.status_code == 403
    assert metrics.status_code == 403


def test_platform_admin_can_read_global_operational_metrics(client: TestClient) -> None:
    response = client.get('/api/v1/operations/metrics', headers=_headers(3))
    assert response.status_code == 200
    payload = response.json()
    assert payload['applications_total'] == 2
    assert payload['applications_by_status'] == {'draft': 1, 'submitted': 1}
