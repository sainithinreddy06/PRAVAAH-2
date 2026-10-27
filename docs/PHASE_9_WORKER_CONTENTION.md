# Phase 9 — Worker Contention Guard

## Implemented

Refactored the notification worker's pending-row selection into `_pending_notifications_statement` without changing its filters or ordering. The query remains bounded by `BATCH_SIZE` and uses SQLAlchemy's `with_for_update(skip_locked=True)` so PostgreSQL workers can claim disjoint pending rows instead of waiting on rows already claimed by another worker.

Added `test_worker_query_uses_postgres_skip_locked_claiming`, which compiles the exact production query against the PostgreSQL dialect and asserts that the SQL includes `FOR UPDATE SKIP LOCKED`, a bounded `LIMIT`, and the pending/unprocessed filters.

## What this test proves — and does not prove

This test is a regression guard for the generated PostgreSQL query. It does **not** simulate two live PostgreSQL transactions, prove race behavior under load, or prove exactly-once external delivery. Current in-app delivery is represented by the durable notification row; external delivery channels would need idempotency keys and provider-aware retry semantics.

## Remaining verification and hardening

1. Run backend CI and inspect PostgreSQL-backed job results.
2. Add a dedicated two-session PostgreSQL contention integration test using isolated test data and coordinated transactions.
3. Add concurrent obligation status-update tests and decide whether row-level locking or version columns are required.
4. Confirm all domain writes and audit writes share the intended transaction boundary.
5. Keep `main` untouched; changes in this phase are on `nithin-pravaah`.
