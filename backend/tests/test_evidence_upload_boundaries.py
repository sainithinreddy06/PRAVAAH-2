from collections.abc import Generator
from pathlib import Path

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import settings
from app.core.security import create_access_token
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.application import Application
from app.models.evidence import Evidence
from app.models.institution import Institution
from app.models.user import User

_engine = create_engine(
    'sqlite://',
    connect_args={'check_same_thread': False},
    poolclass=StaticPool,
)
_Session = sessionmaker(bind=_engine, autoflush=False, autocommit=False)


def _headers(user_id: int) -> dict[str, str]:
    return {'Authorization': f'Bearer {create_access_token(str(user_id))}'}


def _build_client(storage_dir: Path, max_bytes: int, application_status: str = 'draft'):
    settings.evidence_storage_dir = str(storage_dir)
    settings.max_evidence_size_bytes = max_bytes
    Base.metadata.create_all(bind=_engine)
    with _Session() as db:
        db.add_all([
            User(id=1, email='applicant@example.test', full_name='Applicant', role='applicant', region_code='TS', is_active=True),
            Institution(id=1, name='TS Institute', institution_code='TS-001', region_code='TS'),
            Application(
                id=1,
                reference_code='TS-APP-SEC-001',
                institution_id=1,
                submitted_by_user_id=1,
                workflow_stage=application_status,
                status=application_status,
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
    return TestClient(app)


def _cleanup(client: TestClient) -> None:
    client.close()
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=_engine)


def test_empty_evidence_is_rejected_without_persisting_file_or_record(tmp_path: Path) -> None:
    client = _build_client(tmp_path / 'evidence', 128)
    try:
        response = client.post(
            '/api/v1/applications/1/evidence',
            headers=_headers(1),
            files={'file': ('empty.pdf', b'', 'application/pdf')},
        )
        assert response.status_code == 422
        assert response.json()['detail'] == 'Evidence file is empty'
        with _Session() as db:
            assert db.scalar(select(Evidence.id)) is None
        assert list((tmp_path / 'evidence').glob('*')) == []
    finally:
        _cleanup(client)


def test_oversized_evidence_is_rejected_without_persisting_file_or_record(tmp_path: Path) -> None:
    client = _build_client(tmp_path / 'evidence', 32)
    try:
        content = b'%PDF-1.7\\n' + (b'x' * 40)
        response = client.post(
            '/api/v1/applications/1/evidence',
            headers=_headers(1),
            files={'file': ('large.pdf', content, 'application/pdf')},
        )
        assert response.status_code == 413
        assert response.json()['detail'] == 'Evidence file exceeds the configured size limit'
        with _Session() as db:
            assert db.scalar(select(Evidence.id)) is None
        assert list((tmp_path / 'evidence').glob('*')) == []
    finally:
        _cleanup(client)


def test_evidence_upload_is_blocked_after_application_submission(tmp_path: Path) -> None:
    client = _build_client(tmp_path / 'evidence', 128, application_status='submitted')
    try:
        response = client.post(
            '/api/v1/applications/1/evidence',
            headers=_headers(1),
            files={'file': ('identity.pdf', b'%PDF-1.7\\nvalid test bytes', 'application/pdf')},
        )
        assert response.status_code == 409
        assert 'draft or changes-requested' in response.json()['detail']
        with _Session() as db:
            assert db.scalar(select(Evidence.id)) is None
        assert not (tmp_path / 'evidence').exists()
    finally:
        _cleanup(client)


def test_evidence_upload_requires_authentication(tmp_path: Path) -> None:
    client = _build_client(tmp_path / 'evidence', 128)
    try:
        response = client.post(
            '/api/v1/applications/1/evidence',
            files={'file': ('identity.pdf', b'%PDF-1.7\\nvalid test bytes', 'application/pdf')},
        )
        assert response.status_code == 401
        assert not (tmp_path / 'evidence').exists()
    finally:
        _cleanup(client)
