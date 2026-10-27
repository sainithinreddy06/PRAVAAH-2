# Phase 10 — Concurrent Obligation Updates

## Implemented

- Changed the obligation update route to select the target row with SQLAlchemy `SELECT ... FOR UPDATE` before validating and applying changes.
- Added a PostgreSQL-dialect regression test that compiles the exact update lookup and asserts the target obligation is filtered by ID and locked with `FOR UPDATE`.

The row lock serializes competing updates to the same obligation on PostgreSQL transactions that use this route. Each update still commits its domain changes and audit event together in the route's transaction.

## Scope and limits

The regression test checks generated SQL; it does not create two live PostgreSQL sessions or demonstrate the resulting interleaving under contention. SQLite-based route tests do not enforce PostgreSQL row locks. This change also does not introduce optimistic version checks or reject stale intent: later requests can still update a row after waiting for an earlier transaction, according to the existing API semantics.

## Verification

- Code and test changes are committed on `nithin-pravaah`.
- GitHub CI status was queried after the changes, but no check results or workflow runs were returned through the available status/run lookup.
- Do not mark the test as passed until the backend CI job's PostgreSQL migration, pytest, and Ruff steps have been inspected.

## Next integration gate

Add a PostgreSQL-only test with two independent sessions coordinated by barriers: hold a row lock in session A, issue an update through session B, release A, then assert B completes against the latest committed row and that both intended audit records reflect the actual serialized changes. Add worker contention integration coverage in the same PostgreSQL test environment.
