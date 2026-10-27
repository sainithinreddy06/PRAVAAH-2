# Phase 8 — Transaction Rollback Regression

## Goal

Prove that an obligation creation and its audit event are not partially persisted when the audit write fails during commit.

## Implemented

Added `test_obligation_and_audit_write_roll_back_together_on_audit_failure` in `backend/tests/test_obligations.py`.

The test injects a controlled failure at the SQLAlchemy `AuditEvent` insert boundary, calls the real obligation API, removes the injected listener, and verifies that neither the obligation nor its `obligation.created` audit event remains in the database.

This specifically exercises the existing route's single-transaction behavior. It does not prove all API routes have the same transactional boundary.

## Verification status

- Test committed on `nithin-pravaah`; `main` is unchanged.
- Local execution is unavailable in this environment.
- No CI pass has been confirmed for this commit. Treat this as implemented test coverage, not a verified passing test.

## Remaining transaction/concurrency gates

1. Execute the test on CI and inspect the backend job logs.
2. Add PostgreSQL-backed contention tests for two workers processing the same due notification.
3. Add simultaneous obligation update tests and determine whether row-level locking or optimistic version checks are needed.
4. Audit other multi-write API routes for domain changes and audit events sharing one transaction.
