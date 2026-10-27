import pytest

from app.models.audit_event import AuditEvent
from scripts import cleanup_expired_evidence as cleanup


class FakeEvidence:
    def __init__(self, evidence_id: int = 12, key: str = 'old.pdf') -> None:
        self.id = evidence_id
        self.storage_key = key
        self.application_id = 8
        self.sha256_digest = 'a' * 64
        self.review_status = 'pending'


class FakeStorage:
    def __init__(self, fail: bool = False) -> None:
        self.deleted: list[str] = []
        self.fail = fail

    def delete(self, key: str) -> None:
        if self.fail:
            raise OSError('storage unavailable')
        self.deleted.append(key)


class FakeScalars:
    def __init__(self, rows: list[FakeEvidence]) -> None:
        self.rows = rows

    def all(self) -> list[FakeEvidence]:
        return self.rows


class FakeSession:
    def __init__(self, rows: list[FakeEvidence]) -> None:
        self.rows = rows
        self.added: list[object] = []
        self.commits = 0
        self.rollbacks = 0

    def __enter__(self):
        return self

    def __exit__(self, *args: object) -> None:
        return None

    def scalars(self, statement: object) -> FakeScalars:
        return FakeScalars(self.rows)

    def add(self, item: object) -> None:
        self.added.append(item)

    def commit(self) -> None:
        self.commits += 1

    def rollback(self) -> None:
        self.rollbacks += 1


def test_retention_dry_run_never_deletes(monkeypatch: pytest.MonkeyPatch) -> None:
    row = FakeEvidence()
    db = FakeSession([row])
    storage = FakeStorage()
    monkeypatch.setattr(cleanup, 'SessionLocal', lambda: db)
    monkeypatch.setattr(cleanup, 'get_evidence_storage', lambda: storage)

    result = cleanup.run_cleanup(execute=False)

    assert result == {'eligible': 1, 'deleted': 0, 'failed': 0}
    assert storage.deleted == []
    assert row.review_status == 'pending'
    assert db.commits == 0


def test_retention_execute_deletes_and_audits(monkeypatch: pytest.MonkeyPatch) -> None:
    row = FakeEvidence()
    db = FakeSession([row])
    storage = FakeStorage()
    monkeypatch.setattr(cleanup, 'SessionLocal', lambda: db)
    monkeypatch.setattr(cleanup, 'get_evidence_storage', lambda: storage)

    result = cleanup.run_cleanup(execute=True)

    assert result == {'eligible': 1, 'deleted': 1, 'failed': 0}
    assert storage.deleted == ['old.pdf']
    assert row.review_status == 'expired'
    assert db.commits == 1
    assert any(isinstance(item, AuditEvent) and item.action == 'evidence.retention_deleted' for item in db.added)


def test_retention_storage_failure_preserves_database_record(monkeypatch: pytest.MonkeyPatch) -> None:
    row = FakeEvidence()
    db = FakeSession([row])
    storage = FakeStorage(fail=True)
    monkeypatch.setattr(cleanup, 'SessionLocal', lambda: db)
    monkeypatch.setattr(cleanup, 'get_evidence_storage', lambda: storage)

    result = cleanup.run_cleanup(execute=True)

    assert result == {'eligible': 1, 'deleted': 0, 'failed': 1}
    assert row.review_status == 'pending'
    assert db.commits == 0
    assert db.rollbacks == 1


def test_retention_limit_must_be_positive() -> None:
    with pytest.raises(ValueError, match='Batch limit'):
        cleanup.run_cleanup(limit=0)
