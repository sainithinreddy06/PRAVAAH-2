# Notification worker

Run from `backend` after applying migrations:

`alembic upgrade head`

One cycle: `python -m notification_worker --once`

Continuous polling: `python -m notification_worker --interval-seconds 30`

The worker scans overdue obligations and creates idempotent in-app notification records. It processes pending records in batches, records attempts and processing timestamps, and retries retryable channel errors with exponential backoff capped at one hour. After five attempts a retryable record is marked failed. Missing or inactive recipients are permanent failures.

The current supported channel is `in_app`; email and SMS adapters are not implemented. Run this as a separate process using the same `DATABASE_URL` as the API. Apply migrations before starting it. The existing `POST /api/v1/obligations/escalate-due` endpoint remains available for manual escalation.