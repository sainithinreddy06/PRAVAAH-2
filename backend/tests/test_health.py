from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_root_returns_service_metadata() -> None:
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["service"] == "PRAVAAH API"
    assert response.json()["version"] == "0.3.0"


def test_health_does_not_require_database() -> None:
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert response.json()["environment"] == "development"


def test_openapi_documents_readiness_endpoint() -> None:
    response = client.get("/openapi.json")
    assert response.status_code == 200
    assert "/api/v1/ready" in response.json()["paths"]
