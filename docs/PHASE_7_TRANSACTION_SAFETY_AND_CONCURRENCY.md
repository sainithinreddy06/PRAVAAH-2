# Phase 7 — Transaction Safety and Concurrency

## Goal

Exercise idempotent worker behavior and define the database-level checks still required before claiming concurrent-worker safety.

## Implemented

### Repeated notification-worker cycles

Added a regression test in `backend/tests/test_notification_worker_regressions.py` that seeds one overdue obligation and runs the notification cycle twice. It asserts:

- The first cycle queues and delivers one notification.
- The second cycle does not queue a duplicate for the same obligation deadline.
- Exactly one notification row exists for the deterministic event key.
- Exactly one `obligation.overdue_notified` audit event exists.

The test exercises the existing unique event-key guard and nested transaction handling under repeated processing.

## Verification status

- Test committed to `nithin-pravaah`; `main` remains untouched.
- Local test execution is unavailable in this environment.
- No passing CI status has been confirmed for this change. Do not treat the test as passing until the branch workflow reports success.
- Repeated sequential cycles establish idempotency coverage; they do not prove true simultaneous worker safety.

## Remaining transaction/concurrency gates

1. Run the notification worker tests against PostgreSQL, not only SQLite.
2. Add a PostgreSQL integration test with two workers contending for the same due notification and verify row locking plus unique-event-key behavior.
3. Test rollback after a database failure during a multi-write operation, verifying no partial domain/audit state remains.
4. Exercise simultaneous obligation status updates and define whether optimistic version checks or row-level locks are required.
5. Confirm production migration and transaction isolation behavior on the staging database.
