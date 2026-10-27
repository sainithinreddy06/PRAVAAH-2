from datetime import UTC, datetime
import hashlib
import hmac
import json

from scripts.archive_audit_checkpoint import signed_checkpoint


def test_signed_checkpoint_signature_is_verifiable() -> None:
    secret = 'checkpoint-archive-test-secret-' + ('x' * 32)
    generated_at = datetime(2026, 10, 28, 12, 0, tzinfo=UTC)
    checkpoint = signed_checkpoint(12, 'a' * 64, generated_at, secret)
    payload = json.dumps({
        'event_count': 12,
        'generated_at': generated_at.isoformat(),
        'head_hash': 'a' * 64,
    }, sort_keys=True, separators=(',', ':'))
    expected = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()
    assert checkpoint['signature_algorithm'] == 'HMAC-SHA256'
    assert hmac.compare_digest(str(checkpoint['signature']), expected)
