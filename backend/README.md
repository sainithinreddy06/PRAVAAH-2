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

Set `DATABASE_URL` in `.env` to a reachable PostgreSQL instance before running migrations or the readiness endpoint. To create local data after migrations, use `python -m scripts.create_institution` and `python -m scripts.create_user` from the `backend` directory with the virtual environment activated. With Docker Compose, run `docker compose exec api python -m scripts.create_institution` and `docker compose exec api python -m scripts.create_user` from the repository root. Institution provisioning prompts for a name and region; user provisioning prompts for identity, role, region, and password, hashes the password with Argon2, and refuses duplicate email addresses. Create the institution first and use the same region for the test officer. No default users or institutions are seeded.

## Authentication (Phase 3)
`POST /api/v1/auth/login` accepts email and password; `GET /api/v1/auth/me` returns the authenticated profile. User provisioning is intentionally an operator-managed CLI task; there is no public self-registration endpoint. Passwords are verified with Argon2 and access tokens are signed JWTs. The user record is reloaded for each authenticated request so inactive accounts are rejected and role/region values come from the database. Set a cryptographically random `JWT_SECRET_KEY` of at least 32 characters in production.

## Application workflow (Phase 4)
The authenticated application API provides create, list, detail, and transition endpoints under `/api/v1/applications`. Statuses are `draft`, `submitted`, `under_review`, `changes_requested`, `approved`, and `rejected`. Transitions follow a state machine; applicants are restricted to their own applications, other non-admin roles are scoped to their region, and review decisions are restricted to regional officers or platform admins.

## Policy and evidence management (Phase 5)
- `GET /api/v1/policies` lists policy metadata; `POST /api/v1/policies` creates a version and is restricted to platform admins.
- `POST /api/v1/applications/{id}/evidence` accepts size-limited PDF, JPEG, or PNG uploads and stores a SHA-256 digest.
- `GET /api/v1/applications/{id}/evidence` lists evidence metadata.
- `PATCH /api/v1/evidence/{id}/review` allows authorized officers to review evidence and records an audit event.

Configure `EVIDENCE_STORAGE_DIR` and `MAX_EVIDENCE_SIZE_BYTES`. Local disk is the default; production should use private durable object storage, encryption, malware scanning, retention controls, and signed access URLs. File signature checks are not malware scanning. Policy metadata is not verified official AICTE guidance.

## Obligations and notifications (Phase 6)
- `POST /api/v1/obligations` creates application-linked obligations; global obligations are restricted to platform admins.
- `GET /api/v1/obligations` supports status/due-date filters and pagination.
- `PATCH /api/v1/obligations/{id}` updates an obligation and records an audit event.
- `POST /api/v1/obligations/escalate-due` queues idempotent in-app notifications for overdue obligations.
- `GET /api/v1/notifications` returns the current user's inbox.

Escalation is API-triggered, not scheduled automatically. Email/SMS delivery and retry workers remain future work. A `pending` notification is queued, not delivered.

## EVC and undertakings (Phase 7)
- `POST /api/v1/undertakings` creates an application-linked undertaking in draft status.
- `GET /api/v1/applications/{id}/undertakings` lists undertakings.
- `POST /api/v1/undertakings/{id}/submit` submits a draft or returned undertaking.
- `POST /api/v1/undertakings/{id}/review` lets regional officers or platform admins accept, reject, or request changes.
- `POST /api/v1/evc/assessments` snapshots evidence counts, open obligations, and unaccepted undertakings.
- `GET /api/v1/applications/{id}/evc-assessments` lists assessment history.

EVC outcomes are workflow-readiness indicators only, not official compliance verdicts. Assessments are snapshots; create a new one after evidence or obligations change.

## Auditability and operational intelligence (Phase 8)
- `GET /api/v1/audit/events` supports entity, action, actor, date, and pagination filters. Regional officers are scoped to their region; platform admins can query global events.
- `GET /api/v1/operations/metrics` returns application, evidence, obligation, and undertaking counts plus overdue obligations, scoped to the officer's region or globally for platform admins.

Audit events are not yet tamper-evident immutable records. Metrics are operational summaries and do not imply official compliance.

## Explainable recommendations (Phase 9)
- `GET /api/v1/applications/{id}/recommendations` evaluates evidence gaps, rejected or pending evidence, overdue and near-due obligations, and undertakings that are not accepted.
- The response includes a rule-based risk score, risk level, explicit factors, and recommended next actions.
- Access is restricted to regional officers and platform admins, with regional scoping.

The score is a transparent operational heuristic, not a trained prediction model, an official AICTE rubric, or an approval decision. The recommendations only cover the categories implemented by the current rules; officers must validate requirements against authoritative policy sources.

## Tests and lint

```bash
pytest
ruff check app tests migrations
```

## Schema and security notes
Migration `20261024_0001` creates the initial domain schema; `20261025_0002` adds undertakings and EVC assessment snapshots. The Compose password is for local development only. Evidence storage is local by default; production-grade private storage and malware scanning remain outstanding. No official AICTE rules or data are seeded.
