import pytest
from collections.abc import Generator

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import create_access_token
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.audit_event import AuditEvent
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
        db.add_all(
            [
                User(
                    id=1,
                    email='applicant@example.test',
                    full_name='Test Applicant',
                    role='applicant',
                    region_code='TS',
                    is_active=True,
                ),
                User(
                    id=2,
                    email='officer@example.test',
                    full_name='Test Officer',
                    role='regional_officer',
                    region_code='TS',
                    is_active=True,
                ),
                User(
                    id=3,
                    email='admin@example.test',
                    full_name='Platform Admin',
                    role='platform_admin',
                    region_code=None,
                    is_active=True,
                ),
                User(
                    id=4,
                    email='other@example.test',
                    full_name='Other Region Applicant',
                    role='applicant',
                    region_code='AP',
                    is_active=True,
                ),
            ]
        )
        db.add_all(
            [
                Institution(id=1, name='TS Institute', institution_code='TS-001', region_code='TS'),
                Institution(id=2, name='AP Institute', institution_code='AP-001', region_code='AP'),
            ]
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


def test_applicant_can_create_and_view_own_application(client: TestClient) -> None:
    response = client.post(
        '/api/v1/applications',
        headers=_headers(1),
        json={'institution_id': 1, 'reference_code': 'TS-APP-001'},
    )
    assert response.status_code == 201
    assert response.json()['status'] == 'draft'

    detail = client.get('/api/v1/applications/1', headers=_headers(1))
    assert detail.status_code == 200
    assert detail.json()['reference_code'] == 'TS-APP-001'


def test_duplicate_reference_is_rejected(client: TestClient) -> None:
    payload = {'institution_id': 1, 'reference_code': 'TS-APP-002'}
    first = client.post('/api/v1/applications', headers=_headers(1), json=payload)
    second = client.post('/api/v1/applications', headers=_headers(1), json=payload)
    assert first.status_code == 201
    assert second.status_code == 409


def test_applicant_can_submit_draft_and_audit_is_written(client: TestClient) -> None:
    created = client.post(
        '/api/v1/applications',
        headers=_headers(1),
        json={'institution_id': 1, 'reference_code': 'TS-APP-003'},
    )
    assert created.status_code == 201

    submitted = client.post(
        '/api/v1/applications/1/transitions',
        headers=_headers(1),
        json={'target_status': 'submitted', 'reason': 'Required fields completed'},
    )
    assert submitted.status_code == 200
    assert submitted.json()['status'] == 'submitted'

    with _Session() as db:
        events = db.scalars(
            select(AuditEvent).where(AuditEvent.entity_id == '1').order_by(AuditEvent.id)
        ).all()
    assert [event.action for event in events] == [
        'application.created',
        'application.status_changed',
    ]


def test_only_officer_can_start_review(client: TestClient) -> None:
    client.post(
        '/api/v1/applications',
        headers=_headers(1),
        json={'institution_id': 1, 'reference_code': 'TS-APP-004'},
    )
    client.post(
        '/api/v1/applications/1/transitions',
        headers=_headers(1),
        json={'target_status': 'submitted', 'reason': 'Ready for review'},
    )
    response = client.post(
        '/api/v1/applications/1/transitions',
        headers=_headers(1),
        json={'target_status': 'under_review', 'reason': 'Start review'},
    )
    assert response.status_code == 403

    reviewed = client.post(
        '/api/v1/applications/1/transitions',
        headers=_headers(2),
        json={'target_status': 'under_review', 'reason': 'Officer started review'},
    )
    assert reviewed.status_code == 200
    assert reviewed.json()['status'] == 'under_review'


def test_cross_region_access_is_denied(client: TestClient) -> None:
    created = client.post(
        '/api/v1/applications',
        headers=_headers(1),
        json={'institution_id': 1, 'reference_code': 'TS-APP-005'},
    )
    assert created.status_code == 201
    response = client.get('/api/v1/applications/1', headers=_headers(4))
    assert response.status_code == 403


def test_applicant_cannot_create_for_another_region(client: TestClient) -> None:
    response = client.post(
        '/api/v1/applications',
        headers=_headers(1),
        json={'institution_id': 2, 'reference_code': 'AP-APP-001'},
    )
    assert response.status_code == 403


def test_invalid_workflow_jump_is_rejected(client: TestClient) -> None:
    client.post(
        '/api/v1/applications',
        headers=_headers(1),
        json={'institution_id': 1, 'reference_code': 'TS-APP-006'},
    )
    response = client.post(
        '/api/v1/applications/1/transitions',
        headers=_headers(2),
        json={'target_status': 'approved', 'reason': 'Skipping required review'},
    )
    assert response.status_code == 409


def test_list_is_scoped_to_applicant_and_region(client: TestClient) -> None:
    client.post(
        '/api/v1/applications',
        headers=_headers(1),
        json={'institution_id': 1, 'reference_code': 'TS-APP-007'},
    )
    client.post(
        '/api/v1/applications',
        headers=_headers(4),
        json={'institution_id': 2, 'reference_code': 'AP-APP-002'},
    )

    applicant_list = client.get('/api/v1/applications', headers=_headers(1))
    assert [item['reference_code'] for item in applicant_list.json()] == ['TS-APP-007']

    officer_list = client.get('/api/v1/applications', headers=_headers(2))
    assert [item['reference_code'] for item in officer_list.json()] == ['TS-APP-007']

    admin_list = client.get('/api/v1/applications', headers=_headers(3))
    assert len(admin_list.json()) == 2
