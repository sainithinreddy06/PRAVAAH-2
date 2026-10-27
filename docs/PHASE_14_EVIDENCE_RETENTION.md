# Phase 14 — Evidence Lifecycle and Retention

## Implemented
- Added configurable `EVIDENCE_RETENTION_DAYS` (default 365 days; an operational default, not a legal requirement).
- Added `backend/scripts/cleanup_expired_evidence.py`. It reports eligible records without changes by default; deletion requires explicit `--execute`.
- Successful cleanup deletes the stored object, marks the database record as an `expired` tombstone, and appends an audit event in the same database transaction.
- Failed storage or database operations are counted and rolled back. Storage deletion is idempotent, allowing retries if object deletion succeeded but the database commit failed.
- Expired tombstones cannot be downloaded; metadata remains available for auditability.

## Operator workflow
From `backend/`:
```bash
python -m scripts.cleanup_expired_evidence --limit 100
python -m scripts.cleanup_expired_evidence --execute --limit 100
```
The first command is report-only. Get policy-owner approval for the interval and confirm legal holds, backups, and incident-response requirements before scheduling deletion.

## Verification
CI must pass. Real object-store and ClamAV integration tests, cleanup monitoring, and approved retention policy remain release requirements.
