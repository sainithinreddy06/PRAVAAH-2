# PRAVAAH API

Phase 2 backend foundation for PRAVAAH-2.

## Requirements
- Python 3.12+
- PostgreSQL 16+ (or Docker Compose)

## Local setup
From the repository root, start PostgreSQL and the API with `docker compose up --build`. API docs are available at `http://localhost:8000/docs` in development. The liveness endpoint is `http://localhost:8000/api/v1/health`; readiness, including a PostgreSQL query, is `http://localhost:8000/api/v1/ready`.

For a local Python environment instead:

```bash
cd backend
python -m venv .venv
# Windows PowerShell: .venv\\Scripts\\Activate.ps1
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
Copy-Item .env.example .env  # Windows PowerShell; copy .env.example .env on macOS/Linux
alembic upgrade head
uvicorn app.main:app --reload
```

Set `DATABASE_URL` in `.env` to a reachable PostgreSQL instance before running migrations or the readiness endpoint.

## Authentication

Phase 3 adds `POST /api/v1/auth/login` with a JSON body containing `email` and `password`, and `GET /api/v1/auth/me` for the authenticated profile. Passwords are verified with Argon2 and access tokens are signed JWTs. The user record is reloaded for each authenticated request so inactive accounts are rejected and role/region values come from the database. Reusable backend dependencies provide role checks and regional-boundary checks for protected routes.

Set `JWT_SECRET_KEY` to a cryptographically random value of at least 32 characters in production. The development fallback is not suitable for deployment. Tokens expire after 30 minutes by default; configure `ACCESS_TOKEN_EXPIRE_MINUTES` as needed. No default user or password is seeded: create users through a controlled administrative process, never by committing credentials.

## Application workflow (Phase 4)

The authenticated application API provides `POST /api/v1/applications` to create a draft, `GET /api/v1/applications` to list visible applications with optional status filtering and pagination, `GET /api/v1/applications/{id}` to view one application, and `POST /api/v1/applications/{id}/transitions` to request a workflow transition. Valid statuses are `draft`, `submitted`, `under_review`, `changes_requested`, `approved`, and `rejected`. Transitions are constrained by a state machine; applicants can see only their own applications, other non-admin roles are scoped to their assigned region, and only regional officers or platform admins can perform review decisions. Creation and status changes write audit events. This phase uses existing schema tables; it does not yet provide production-grade immutable audit storage.

## Policy and evidence management (Phase 5)

- `GET /api/v1/policies` lists policy metadata, optionally filtered by `policy_key`; `active_only=true` by default.
- `POST /api/v1/policies` creates a policy version and is restricted to platform administrators. A policy key/version pair cannot be duplicated.
- `POST /api/v1/applications/{id}/evidence` accepts PDF, JPEG, or PNG uploads for draft or changes-requested applications. Uploads are size-limited, checked against basic file signatures, stored under generated opaque filenames, and recorded with a SHA-256 digest.
- `GET /api/v1/applications/{id}/evidence` lists evidence metadata for an authorized application.
- `PATCH /api/v1/evidence/{id}/review` lets authorized regional officers or platform administrators accept, reject, or request changes, with reviewer notes and an audit event.

Configure `EVIDENCE_STORAGE_DIR` and `MAX_EVIDENCE_SIZE_BYTES` through the environment. The default directory is local disk and is suitable only where the deployment provides persistent, private storage and backups. Do not expose this directory as static web content. For production, use a private object store with encryption, malware scanning, retention controls, and signed access URLs. File signature checks are not a malware scanner. Policy records are user-managed metadata, not verified official AICTE rules, and this phase does not automatically decide compliance.

## Obligations, deadlines, and notifications (Phase 6)

- `POST /api/v1/obligations` creates an application-linked obligation; only regional officers, institution admins, or platform admins can create obligations, and global obligations are restricted to platform admins.
- `GET /api/v1/obligations` lists obligations visible to the caller and supports `status`, `due_before`, `limit`, and `offset` filters.
- `PATCH /api/v1/obligations/{id}` updates an obligation and records an audit event. Supported statuses are `open`, `in_progress`, `fulfilled`, and `waived`.
- `POST /api/v1/obligations/escalate-due` queues idempotent in-app notifications for overdue obligations with assigned owners. It is an authenticated operation for regional officers and platform admins; it is not a background scheduler.
- `GET /api/v1/notifications` returns the authenticated user's in-app notification inbox.

Notifications are queued in the database with a unique event key to avoid duplicate overdue alerts. Email/SMS delivery, automatic scheduled execution, retry workers, and operational dashboards remain future work. Notification status `pending` means queued, not delivered.

## Tests and lint

```bash
pytest
ruff check app tests migrations
```

## Schema
Alembic migration `20261024_0001` creates initial tables for users, institutions, applications, versioned policy metadata, evidence metadata, obligations, notification records, and audit events. The initial migration contains schema foundations; routes must apply role and region checks explicitly. Evidence storage is local by default and does not include malware scanning or immutable audit enforcement.

The Compose password is for local development only. Never use it in a deployed environment. No official AICTE rules or data are seeded by this phase.
