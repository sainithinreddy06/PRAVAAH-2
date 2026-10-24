from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import hash_password
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.user import User

_test_engine = create_engine(
    'sqlite://',
    connect_args={'check_same_thread': False},
    poolclass=StaticPool,
)
_TestSession = sessionmaker(bind=_test_engine, autoflush=False, autocommit=False)


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    Base.metadata.create_all(bind=_test_engine)
    with _TestSession() as db:
        db.add_all(
            [
                User(
                    email='officer@example.test',
                    full_name='Test Officer',
                    password_hash=hash_password('correct-horse-battery'),
                    role='regional_officer',
                    region_code='TS',
                    is_active=True,
                ),
                User(
                    email='disabled@example.test',
                    full_name='Disabled User',
                    password_hash=hash_password('correct-horse-battery'),
                    role='applicant',
                    region_code='TS',
                    is_active=False,
                ),
            ]
        )
        db.commit()

    def override_get_db() -> Generator[Session, None, None]:
        db = _TestSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=_test_engine)


def test_login_returns_bearer_token(client: TestClient) -> None:
    response = client.post(
        '/api/v1/auth/login',
        json={'email': 'OFFICER@example.test', 'password': 'correct-horse-battery'},
    )
    assert response.status_code == 200
    assert response.json()['token_type'] == 'bearer'
    assert response.json()['access_token']
    assert response.json()['expires_in'] > 0


def test_login_rejects_wrong_password(client: TestClient) -> None:
    response = client.post(
        '/api/v1/auth/login',
        json={'email': 'officer@example.test', 'password': 'wrong-password'},
    )
    assert response.status_code == 401


def test_login_rejects_inactive_user(client: TestClient) -> None:
    response = client.post(
        '/api/v1/auth/login',
        json={'email': 'disabled@example.test', 'password': 'correct-horse-battery'},
    )
    assert response.status_code == 401


def test_profile_requires_authentication(client: TestClient) -> None:
    response = client.get('/api/v1/auth/me')
    assert response.status_code == 401


def test_profile_returns_database_role_and_region(client: TestClient) -> None:
    login = client.post(
        '/api/v1/auth/login',
        json={'email': 'officer@example.test', 'password': 'correct-horse-battery'},
    )
    response = client.get(
        '/api/v1/auth/me',
        headers={'Authorization': f"Bearer {login.json()['access_token']}"},
    )
    assert response.status_code == 200
    assert response.json()['role'] == 'regional_officer'
    assert response.json()['region_code'] == 'TS'


def test_invalid_bearer_token_is_rejected(client: TestClient) -> None:
    response = client.get(
        '/api/v1/auth/me',
        headers={'Authorization': 'Bearer not-a-valid-token'},
    )
    assert response.status_code == 401



def test_region_access_rejects_cross_region_for_regional_officer(client: TestClient) -> None:
    from fastapi import HTTPException

    from app.api.deps import ensure_region_access

    with _TestSession() as db:
        officer = db.query(User).filter_by(email='officer@example.test').one()
        with pytest.raises(HTTPException) as error:
            ensure_region_access(officer, 'AP')
    assert error.value.status_code == 403


def test_region_access_allows_matching_region_for_regional_officer(client: TestClient) -> None:
    from app.api.deps import ensure_region_access

    with _TestSession() as db:
        officer = db.query(User).filter_by(email='officer@example.test').one()
        ensure_region_access(officer, 'TS')


def test_region_access_allows_platform_admin_across_regions(client: TestClient) -> None:
    from app.api.deps import ensure_region_access

    with _TestSession() as db:
        admin = User(
            email='admin@example.test',
            full_name='Platform Admin',
            password_hash=hash_password('admin-test-password'),
            role='platform_admin',
            region_code=None,
            is_active=True,
        )
        db.add(admin)
        db.commit()
        ensure_region_access(admin, 'AP')
