from __future__ import annotations

import socket
from pathlib import Path
from typing import Protocol

from app.core.config import settings


class EvidenceStorage(Protocol):
    def put(self, key: str, content: bytes, content_type: str) -> None: ...
    def get(self, key: str) -> bytes: ...
    def delete(self, key: str) -> None: ...


class LocalEvidenceStorage:
    def __init__(self, root: str) -> None:
        self.root = Path(root).resolve()

    def _path(self, key: str) -> Path:
        path = (self.root / key).resolve()
        if path.parent != self.root or Path(key).name != key:
            raise ValueError('Invalid evidence storage key')
        return path

    def put(self, key: str, content: bytes, content_type: str) -> None:
        del content_type
        self.root.mkdir(parents=True, exist_ok=True)
        self._path(key).write_bytes(content)

    def get(self, key: str) -> bytes:
        return self._path(key).read_bytes()

    def delete(self, key: str) -> None:
        self._path(key).unlink(missing_ok=True)


class S3EvidenceStorage:
    def __init__(self, bucket: str, region: str, endpoint_url: str | None, prefix: str) -> None:
        import boto3
        self.client = boto3.client('s3', region_name=region or None, endpoint_url=endpoint_url or None)
        self.bucket = bucket
        self.prefix = prefix.strip('/')

    def _key(self, key: str) -> str:
        if not key or Path(key).name != key or key in {'.', '..'}:
            raise ValueError('Invalid evidence storage key')
        return f'{self.prefix}/{key}' if self.prefix else key

    def put(self, key: str, content: bytes, content_type: str) -> None:
        self.client.put_object(Bucket=self.bucket, Key=self._key(key), Body=content,
                               ContentType=content_type, ServerSideEncryption='AES256')

    def get(self, key: str) -> bytes:
        response = self.client.get_object(Bucket=self.bucket, Key=self._key(key))
        try:
            return response['Body'].read()
        finally:
            response['Body'].close()

    def delete(self, key: str) -> None:
        self.client.delete_object(Bucket=self.bucket, Key=self._key(key))


class ClamAVScanner:
    def __init__(self, host: str, port: int, timeout_seconds: float) -> None:
        self.host, self.port, self.timeout_seconds = host, port, timeout_seconds

    def scan(self, content: bytes) -> None:
        if not self.host:
            raise RuntimeError('Malware scanning is not configured')
        with socket.create_connection((self.host, self.port), timeout=self.timeout_seconds) as client:
            client.settimeout(self.timeout_seconds)
            client.sendall(b'zINSTREAM\\0')
            for offset in range(0, len(content), 64 * 1024):
                chunk = content[offset:offset + 64 * 1024]
                client.sendall(len(chunk).to_bytes(4, 'big') + chunk)
            client.sendall((0).to_bytes(4, 'big'))
            response = bytearray()
            while not response.endswith(b'\\0') and len(response) < 4096:
                part = client.recv(1024)
                if not part:
                    break
                response.extend(part)
        result = bytes(response).rstrip(b'\\0').decode('utf-8', errors='replace')
        if result.endswith('FOUND'):
            raise ValueError('Malware detected in evidence file')
        if not result.endswith('OK'):
            raise RuntimeError('Malware scanner returned an invalid response')


def get_evidence_storage() -> EvidenceStorage:
    if settings.evidence_storage_backend == 'local':
        return LocalEvidenceStorage(settings.evidence_storage_dir)
    if settings.evidence_storage_backend == 's3':
        return S3EvidenceStorage(settings.evidence_s3_bucket, settings.evidence_s3_region,
                                 settings.evidence_s3_endpoint_url, settings.evidence_s3_prefix)
    raise RuntimeError('Unsupported evidence storage backend')


def scan_evidence(content: bytes) -> None:
    if not settings.evidence_malware_scanning_enabled:
        if settings.app_env.casefold() == 'production':
            raise RuntimeError('Malware scanning must be enabled in production')
        return
    ClamAVScanner(settings.evidence_clamav_host, settings.evidence_clamav_port,
                  settings.evidence_clamav_timeout_seconds).scan(content)
