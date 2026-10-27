# Phase 3 — Health and Readiness Regression Coverage

## Goal
Protect the distinction between process liveness and dependency readiness so orchestrators can restart a dead process without treating a temporary database outage as a dead application process.

## Implemented
- Added tests that assert readiness returns `ready` when the database probe succeeds.
- Added tests that assert readiness returns HTTP 503 with a stable error detail when the database probe raises a SQLAlchemy error.
- Added a regression test that liveness remains healthy when the readiness database is unavailable.
- Tests use dependency overrides and do not require a running external PostgreSQL instance.

## Commit
- `05babbffbf28c298e8e06e6408935ed8f1061ef6` — cover liveness and database readiness behavior.

## Verification status
- Test file committed on `nithin-pravaah`.
- Local test execution is unavailable in this environment; GitHub Actions must confirm the test outcome.
- No deployment or merge to `main` was performed.

## Follow-on work
- Confirm the test suite in CI.
- Add a staging smoke test for health, readiness, authentication, evidence upload/download, obligation escalation, EVC lifecycle, and audit-chain verification.
- Keep external object storage, malware scanning, immutable checkpoint archiving, and policy/legal validation as release gates.
