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

## Authentication (Phase 3)
`POST /api/v1/auth/login` accepts email and password; `GET /api/v1/auth/me` returns the authenticated profile. Passwords are verified with Argon2 and access tokens are signed JWTs. The user record is reloaded for each authenticated request so inactive accounts are rejected and role/region values come from the database.

Set `JWT_SECRET_KEY` to a cryptographically random value of at least 32 characters in production. No default user or password is seeded.

## Application workflow (Phase 4)
The authenticated application API provides create, list, detail, and transition endpoints under `/api/v1/applications`. Valid statuses are `draft`, `submitted`, `under_review`, `changes_requested`, `approved`, and `rejected`. Transitions follow a state machine; applicants can see only their own applications, other non-admin roles are scoped to their region, and only regional officers or platform admins can make review decisions. Changes write audit events.

## Policy and evidence management (Phase 5)
- `GET /api/v1/policies` lists policy metadata.
- `POST /api/v1/policies` creates a policy version and is restricted to platform admins.
- `POST /api/v1/applications/{id}/evidence` accepts size-limited PDF, JPEG, or PNG uploads and stores a SHA-256 digest.
- `GET /api/v1/applications/{id}/evidence` lists evidence metadata.
- `PATCH /api/v1/evidence/{id}/review` lets authorized officers review evidence and records an audit event.

Configure `EVIDENCE_STORAGE_DIR` and `MAX_EVIDENCE_SIZE_BYTES`. Local disk is the default; production should use private durable object storage, encryption, malware scanning, retention controls, and signed access URLs. File signature checks are not malware scanning. Policy metadata is not verified official AICTE guidance.

## Obligations, deadlines, and notifications (Phase 6)
- `POST /api/v1/obligations` creates an application-linked obligation; global obligations are restricted to platform admins.
- `GET /api/v1/obligations` supports status and due-date filtering and pagination.
- `PATCH /api/v1/obligations/{id}` updates an obligation and records an audit event. Statuses: `open`, `in_progress`, `fulfilled`, `waived`.
- `POST /api/v1/obligations/escalate-due` queues idempotent in-app notifications for overdue obligations with assigned owners.
- `GET /api/v1/notifications` returns the current user's inbox.

The escalation endpoint is manually/API triggered, not a background scheduler. Email/SMS delivery and retry workers remain future work. A `pending` notification is queued, not delivered.

## EVC and undertakings (Phase 7)

- `POST /api/v1/undertakings` creates an application-linked undertaking in draft status.
- `GET /api/v1/applications/{id}/undertakings` lists undertakings for an application.
- `POST /api/v1/undertakings/{id}/submit` submits a draft or returned undertaking.
- `POST /api/v1/undertakings/{id}/review` lets regional officers or platform admins accept, reject, or request changes from a submitted undertaking. Reviews include notes and audit events.
- `POST /api/v1/evc/assessments` snapshots evidence review counts, open obligations, and unaccepted undertakings into a readiness assessment.
- `GET /api/v1/applications/{id}/evc-assessments` lists assessment history.

EVC outcomes are workflow-readiness indicators only: `needs_attention`, `incomplete`, `insufficient_evidence`, or `ready_for_officer_review`. They are not an official compliance verdict and do not replace officer judgement or verified AICTE policy. The assessment stores a snapshot; create a new assessment after the underlying evidence or obligations change.

## Tests and lint

```bash
pytest
ruff check app tests migrations
```

## Schema and security notes
Migration `20261024_0001` creates the initial domain schema. Migration `20261025_0002` adds undertakings and EVC assessment snapshots. The Compose password is for local development only. Evidence storage is local by default; production-grade private storage, malware scanning, and immutable audit enforcement remain outstanding. No official AICTE rules or data are seeded.
