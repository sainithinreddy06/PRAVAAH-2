# Phase 6 — Reliability and Regional Isolation

## Goal

Strengthen regression coverage around notification delivery failures and regional operational metrics so that transient delivery problems are retried safely and regional users only see metrics for applications in their own region.

## Implemented

### Notification worker failure behavior

Added `backend/tests/test_notification_worker_regressions.py` with isolated SQLite-backed tests covering:

- In-app notification delivery to an inactive recipient is marked permanently failed.
- Permanent recipient failures are not scheduled for retry and receive a processed timestamp.
- A transient delivery error leaves the notification pending and schedules the expected bounded retry delay.
- Error details and attempt counts are retained for troubleshooting.

### Regional operational metrics

Added a regression test to `backend/tests/test_operations.py` that seeds open and overdue obligations for both a TS application and an AP application, then queries metrics as a TS regional officer. The response must include only TS application, obligation, and overdue-obligation counts.

## Verification status

- Changes committed on `nithin-pravaah`; `main` was not modified.
- The GitHub write operations returned commit SHAs, but local execution is unavailable in this environment.
- CI status must be checked before treating the new tests as passing.

## Remaining release gates

- Run the full PostgreSQL-backed backend suite and frontend checks in CI.
- Verify concurrent notification workers and transaction rollback against PostgreSQL.
- Configure production evidence object storage, malware scanning/quarantine, and retention.
- Export signed audit checkpoints to an independently controlled immutable archive.
- Complete policy/legal review of configured deadline rules and staging smoke tests.
