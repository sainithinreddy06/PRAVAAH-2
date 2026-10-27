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


def test_undertaking_cannot_be_reviewed_twice(client: TestClient) -> None:
    created = client.post('/api/v1/undertakings', headers=_headers(1), json={
        'application_id': 1,
        'undertaking_type': 'accuracy_declaration',
        'statement': 'I confirm that the information submitted is accurate to the best of my knowledge.',
    })
    undertaking_id = created.json()['id']
    submitted = client.post(f'/api/v1/undertakings/{undertaking_id}/submit', headers=_headers(1))
    assert submitted.status_code == 200

    first = client.post(f'/api/v1/undertakings/{undertaking_id}/review', headers=_headers(2), json={
        'decision': 'accepted',
        'reviewer_notes': 'Declaration accepted after review',
    })
    second = client.post(f'/api/v1/undertakings/{undertaking_id}/review', headers=_headers(2), json={
        'decision': 'rejected',
        'reviewer_notes': 'Conflicting second decision',
    })
    assert first.status_code == 200
    assert second.status_code == 409
    assert second.json()['detail'] == 'Only submitted undertakings can be reviewed'


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



def test_evc_visit_requires_assignment_and_complete_checklist(client: TestClient) -> None:
    scheduled_at = (datetime.now(UTC) + timedelta(hours=2)).isoformat()
    created = client.post('/api/v1/evc/visits', headers=_headers(2), json={
        'application_id': 1,
        'assigned_to_user_id': 2,
        'scheduled_at': scheduled_at,
        'checklist_items': [
            {'item_id': 'site-safety', 'label': 'Site safety controls', 'required': True},
            {'item_id': 'records', 'label': 'Review supporting records', 'required': False},
        ],
    })
    assert created.status_code == 201
    visit = created.json()
    assert visit['status'] == 'scheduled'
    assert visit['report_revision'] == 0

    started = client.post(f"/api/v1/evc/visits/{visit['id']}/start", headers=_headers(2))
    assert started.status_code == 200
    assert started.json()['status'] == 'in_progress'
    assert started.json()['started_at'] is not None

    missing_required = client.post(
        f"/api/v1/evc/visits/{visit['id']}/complete",
        headers=_headers(2),
        json={
            'findings': 'Inspection completed with recorded observations.',
            'results': [{'item_id': 'records', 'outcome': 'pass'}],
        },
    )
    assert missing_required.status_code == 422
    assert 'required checklist items' in missing_required.json()['detail']['message']

    completed = client.post(
        f"/api/v1/evc/visits/{visit['id']}/complete",
        headers=_headers(2),
        json={
            'findings': 'Inspection completed; site safety requires remediation.',
            'results': [
                {'item_id': 'site-safety', 'outcome': 'fail', 'notes': 'Emergency exit sign missing'},
                {'item_id': 'records', 'outcome': 'pass'},
            ],
        },
    )
    assert completed.status_code == 200
    assert completed.json()['status'] == 'completed'
    assert completed.json()['report_revision'] == 1
    assert completed.json()['completed_at'] is not None
    assert 'Emergency exit sign missing' in completed.json()['results_json']

    second_completion = client.post(
        f"/api/v1/evc/visits/{visit['id']}/complete",
        headers=_headers(2),
        json={
            'findings': 'Attempt to overwrite completed visit report.',
            'results': [{'item_id': 'site-safety', 'outcome': 'pass'}],
        },
    )
    assert second_completion.status_code == 409


def test_evc_visit_rejects_wrong_region_assignment_and_unassigned_start(client: TestClient) -> None:
    with _Session() as db:
        db.add(User(
            id=4,
            email='other-officer@example.test',
            full_name='Other Region Officer',
            role='regional_officer',
            region_code='AP',
            is_active=True,
        ))
        db.commit()

    scheduled_at = (datetime.now(UTC) + timedelta(hours=1)).isoformat()
    wrong_region = client.post('/api/v1/evc/visits', headers=_headers(2), json={
        'application_id': 1,
        'assigned_to_user_id': 4,
        'scheduled_at': scheduled_at,
        'checklist_items': [{'item_id': 'site-safety', 'label': 'Site safety controls', 'required': True}],
    })
    assert wrong_region.status_code == 422

    created = client.post('/api/v1/evc/visits', headers=_headers(2), json={
        'application_id': 1,
        'assigned_to_user_id': 2,
        'scheduled_at': scheduled_at,
        'checklist_items': [{'item_id': 'site-safety', 'label': 'Site safety controls', 'required': True}],
    })
    assert created.status_code == 201
    denied = client.post(f"/api/v1/evc/visits/{created.json()['id']}/start", headers=_headers(3))
    assert denied.status_code == 200
    # Platform admins may override assignments; the same visit is now in progress.
    assert denied.json()['status'] == 'in_progress'


def test_applicant_cannot_schedule_evc_visit(client: TestClient) -> None:
    response = client.post('/api/v1/evc/visits', headers=_headers(1), json={
        'application_id': 1,
        'assigned_to_user_id': 2,
        'scheduled_at': (datetime.now(UTC) + timedelta(hours=1)).isoformat(),
        'checklist_items': [{'item_id': 'site-safety', 'label': 'Site safety controls', 'required': True}],
    })
    assert response.status_code == 403
