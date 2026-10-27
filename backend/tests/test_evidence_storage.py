from pathlib import Path

import pytest

from app.services.evidence_storage import ClamAVScanner, LocalEvidenceStorage, scan_evidence
from app.core.config import settings


def test_local_storage_round_trip_and_delete(tmp_path: Path) -> None:
    storage = LocalEvidenceStorage(str(tmp_path / 'evidence'))
    storage.put('sample.pdf', b'%PDF-test', 'application/pdf')
    assert storage.get('sample.pdf') == b'%PDF-test'
    storage.delete('sample.pdf')
    with pytest.raises(FileNotFoundError):
        storage.get('sample.pdf')


def test_local_storage_rejects_path_traversal(tmp_path: Path) -> None:
    storage = LocalEvidenceStorage(str(tmp_path / 'evidence'))
    with pytest.raises(ValueError, match='Invalid evidence storage key'):
        storage.get('../outside.pdf')


def test_production_scan_cannot_be_disabled(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, 'app_env', 'production')
    monkeypatch.setattr(settings, 'evidence_malware_scanning_enabled', False)
    with pytest.raises(RuntimeError, match='must be enabled'):
        scan_evidence(b'%PDF-test')


def test_scanner_requires_host() -> None:
    with pytest.raises(RuntimeError, match='not configured'):
        ClamAVScanner('', 3310, 1).scan(b'%PDF-test')
