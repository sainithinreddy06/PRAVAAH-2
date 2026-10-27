from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.exc import OperationalError

from app.db.session import get_db
from app.main import app


class _ReadyDatabase:
    def execute(self, _statement: object) -> object:
        return object()


class _UnavailableDatabase:
    def execute(self, _statement: object) -> object:
        raise OperationalError('SELECT 1', {}, RuntimeError('database offline'))


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def test_readiness_returns_ready_when_database_query_succeeds(client: TestClient) -> None:
    def ready_db() -> Generator[_ReadyDatabase, None, None]:
        yield _ReadyDatabase()

    app.dependency_overrides[get_db] = ready_db
    response = client.get('/api/v1/ready')
    assert response.status_code == 200
    assert response.json()['status'] == 'ready'


def test_readiness_returns_503_when_database_query_fails(client: TestClient) -> None:
    def unavailable_db() -> Generator[_UnavailableDatabase, None, None]:
        yield _UnavailableDatabase()

    app.dependency_overrides[get_db] = unavailable_db
    response = client.get('/api/v1/ready')
    assert response.status_code == 503
    assert response.json()['detail'] == 'Database is unavailable'


def test_liveness_remains_available_when_readiness_database_is_down(client: TestClient) -> None:
    def unavailable_db() -> Generator[_UnavailableDatabase, None, None]:
        yield _UnavailableDatabase()

    app.dependency_overrides[get_db] = unavailable_db
    response = client.get('/api/v1/health')
    assert response.status_code == 200
    assert response.json()['status'] == 'ok'
