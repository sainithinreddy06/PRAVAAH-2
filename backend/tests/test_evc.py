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
            Institution(id=1, name='TS Institute', institution_code='TS-001', region_code='TS'),
        ])
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


def test_undertaking_requires_submission_before_review(client: TestClient) -> None:
    created = client.post('/api/v1/undertakings', headers=_headers(1), json={
        'application_id': 1,
        'undertaking_type': 'accuracy_declaration',
        'statement': 'I confirm that the information submitted is accurate to the best of my knowledge.',
    })
    assert created.status_code == 201
    undertaking_id = created.json()['id']
    premature = client.post(f'/api/v1/undertakings/{undertaking_id}/review', headers=_headers(2), json={
        'decision': 'accepted',
        'reviewer_notes': 'Reviewed declaration',
    })
    assert premature.status_code == 409

    submitted = client.post(f'/api/v1/undertakings/{undertaking_id}/submit', headers=_headers(1))
    assert submitted.status_code == 200
    reviewed = client.post(f'/api/v1/undertakings/{undertaking_id}/review', headers=_headers(2), json={
        'decision': 'accepted',
        'reviewer_notes': 'Declaration reviewed and accepted',
    })
    assert reviewed.status_code == 200
    assert reviewed.json()['status'] == 'accepted'


def test_evc_assessment_reports_incomplete_without_evidence(client: TestClient) -> None:
    response = client.post('/api/v1/evc/assessments', headers=_headers(2), json={
        'application_id': 1,
        'notes': 'Initial evidence checklist',
    })
    assert response.status_code == 201
    assert response.json()['outcome'] == 'insufficient_evidence'
    assert response.json()['evidence_total'] == 0


def test_applicant_cannot_create_evc_assessment(client: TestClient) -> None:
    response = client.post('/api/v1/evc/assessments', headers=_headers(1), json={
        'application_id': 1,
    })
    assert response.status_code == 403
