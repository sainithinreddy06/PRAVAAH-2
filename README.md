# PRAVAAH-2

PRAVAAH-2 is an approval workflow and compliance operations prototype. It connects a React workspace to a FastAPI service for application review, evidence, policy metadata, obligations, notifications, undertakings, EVC readiness snapshots, audit queries, operational metrics, and explainable recommendations.

This is a prototype, not an official AICTE service or a compliance decision system. EVC and recommendation results are workflow aids. Policy metadata is not verified official guidance, audit records are not immutable, and local evidence storage is not production storage.

## Current implementation

| Area | What works |
|---|---|
| Public site | Landing page at `/`; privacy and terms pages are review drafts. |
| Sign-in | Email/password login and current-user lookup; access token stays in browser memory. There is no self-registration or default account. |
| Applications | List, status filter, create draft, inspect details, and request supported status transitions. Backend authorization governs every operation. |
| Evidence | Application-scoped PDF/JPEG/PNG upload, metadata listing, optional policy association, and officer review action. The UI does not download private files. |
| Policies | List policy metadata and create versions where the API role allows it. |
| Compliance operations | List/create/update obligations, trigger overdue escalation, and view the signed-in user's notification inbox. Escalation is an API action, not a scheduled job; queued notifications are not email/SMS delivery. |
| Undertakings | Create draft, submit for review, and accept/reject/request changes. This is not a digital signature. |
| EVC and recommendations | View assessment snapshots and reviewer recommendations from the application detail. EVC is a readiness indicator; recommendations are rule-based, not a validated predictive model. |
| Audit and metrics | Regional or global views according to backend role and scope. Audit records are not tamper-evident or immutable. |
| Institution/officer administration and settings | No user-facing management API or persistent settings API is implemented. Operator provisioning scripts are available for local setup. The UI states these limitations rather than presenting mock controls. |

The application detail page is the home for evidence, undertakings, EVC snapshots, and reviewer recommendations. The global evidence library and configurable workflow studio are not backed by APIs; their old routes lead to supported application workflows.

## Architecture

```mermaid
flowchart LR
  Browser[React + TypeScript / Vite] -->|Bearer JWT, JSON or multipart| API[FastAPI /api/v1]
  API --> DB[(PostgreSQL 16+)]
  API --> Files[Local evidence directory]
  API --> Audit[Audit events]
  Compose[Docker Compose] --> DB
  Compose --> Migrate[Alembic migrations]
  Compose --> API
```

The browser API base is configured with `VITE_API_BASE_URL` (default `http://127.0.0.1:8000`). The API reads settings from environment variables or `backend/.env`. The Docker Compose file starts PostgreSQL, runs Alembic migrations, then starts the API. Vite runs separately during local development.

## Requirements

- Docker Desktop / Docker Engine with Compose plugin for the documented full-stack setup.
- Node.js 20+ and npm for the frontend.
- Python 3.12+ for local backend development.
- PostgreSQL 16+ if running the backend outside Compose.

## Run with Docker Compose

From the repository root:

```bash
docker compose up --build
```

In a second terminal, install frontend dependencies and start Vite:

```bash
npm install
npm run dev
```

Local URLs:

- Frontend: <http://localhost:5173>
- API: <http://localhost:8000>
- Interactive API docs (development): <http://localhost:8000/docs>
- Liveness: <http://localhost:8000/api/v1/health>
- Readiness (includes a database check): <http://localhost:8000/api/v1/ready>

Compose uses local development defaults. Set `POSTGRES_PASSWORD` and `JWT_SECRET_KEY` in the environment before starting when custom local values are needed. Do not use development secrets in a deployed environment. Compose persists PostgreSQL data and evidence in named volumes. To reset local Compose state, stop the stack and deliberately remove the named volumes; this permanently deletes that local data.

Create an institution and user through the interactive operator scripts after migrations finish:

```bash
docker compose exec api python -m scripts.create_institution
docker compose exec api python -m scripts.create_user
```

Create the institution first. Use the institution's region when provisioning the user. There are no seeded default accounts, public signup, or client-side role switching.

## Run services without Compose

Start a PostgreSQL 16+ database and set its connection string, then configure backend settings in `backend/.env` (see `backend/app/core/config.py` for supported defaults):

```dotenv
APP_ENV=development
DATABASE_URL=postgresql+psycopg://USER:PASSWORD@localhost:5432/pravaah
JWT_SECRET_KEY=replace-with-a-random-secret-of-at-least-32-characters
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
EVIDENCE_STORAGE_DIR=.data/evidence
MAX_EVIDENCE_SIZE_BYTES=10485760
```

Windows PowerShell:

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
alembic upgrade head
python -m scripts.create_institution
python -m scripts.create_user
uvicorn app.main:app --reload
```

macOS/Linux:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
python -m scripts.create_institution
python -m scripts.create_user
uvicorn app.main:app --reload
```

In another terminal from the repository root:

```bash
npm install
npm run dev
```

To point the frontend at another API origin, set `VITE_API_BASE_URL` in a root `.env` file before starting/building Vite. `.env.example` documents the default.

## API overview

All routes are under `/api/v1`. Use `/docs` in development for schemas and request details.

| Group | Routes |
|---|---|
| Authentication | `POST /auth/login`, `GET /auth/me` |
| Applications | `POST /applications`, `GET /applications`, `GET /applications/{id}`, `POST /applications/{id}/transitions` |
| Policies and evidence | `GET/POST /policies`, `POST /applications/{id}/evidence`, `GET /applications/{id}/evidence`, `PATCH /evidence/{id}/review` |
| Obligations and notifications | `POST/GET /obligations`, `PATCH /obligations/{id}`, `POST /obligations/escalate-due`, `GET /notifications` |
| Undertakings and EVC | `POST /undertakings`, `GET /applications/{id}/undertakings`, `POST /undertakings/{id}/submit`, `POST /undertakings/{id}/review`, `POST /evc/assessments`, `GET /applications/{id}/evc-assessments` |
| Operations | `GET /audit/events`, `GET /operations/metrics` |
| Recommendations | `GET /applications/{id}/recommendations` |
| Service status | `GET /health`, `GET /ready` |

The application state machine supports `draft`, `submitted`, `under_review`, `changes_requested`, `approved`, and `rejected`. Applicants are limited to their own records. Other non-admin users are region-scoped, and review actions are restricted by role. Backend checks are authoritative; hiding a UI control is not an authorization boundary.

## Security and operational notes

- Passwords use Argon2; signed bearer tokens use JWT. The frontend keeps its token in memory, so a page refresh requires signing in again. Production should assess a server-managed HttpOnly session/BFF design.
- Set a cryptographically random `JWT_SECRET_KEY` of at least 32 characters in production. Configure deployment-specific CORS and secure secret management.
- Evidence uploads are constrained by supported file types, file signatures, and `MAX_EVIDENCE_SIZE_BYTES`; files are stored locally by default. Signature checks do not scan for malware. Production needs private durable object storage, encryption, malware scanning, retention controls, and controlled download links.
- Overdue escalation only queues in-app notifications when the API is called. There is no scheduler, email/SMS delivery, or retry worker.
- Audit events are queryable but are not protected as immutable or tamper-evident records.
- Metrics and overview counts are scoped to the requesting user and API response. The overview may show only the endpoint's returned limit, not global totals.
- The privacy and terms pages are review drafts and need deployment owner, contact, provider, and retention details before publication.

## Quality checks

Frontend:

```bash
npm run typecheck
npm run lint
npm run build
```

Backend (from `backend`, with the virtual environment active):

```bash
pytest
ruff check app tests migrations
alembic history
```

The current backend tests use SQLite fixtures. For PostgreSQL compatibility, run migration and integration checks against a disposable PostgreSQL instance as part of CI/release verification; a SQLite test pass does not prove PostgreSQL behavior.

## Verification record for this working tree

On 25 October 2026, the frontend typecheck and production build passed. ESLint passed with one existing Fast Refresh warning in `src/components/AuthGate.tsx`. The backend suite reported 57 passed using SQLite fixtures; Ruff and Alembic history passed. A local browser-to-API journey successfully signed in, loaded the current user, created/listed/opened an application, and created/read back an undertaking draft against a disposable SQLite database.

A PostgreSQL-backed run was not completed: local PostgreSQL rejected the documented Compose development credential and Docker was unavailable in the environment. Evidence upload/review, policy mutation, obligation operations, EVC, audit/metrics, recommendation display, and applicant/officer/admin browser authorization boundaries still need browser verification. These results are not a full end-to-end release gate or production certification. See [integration coverage matrix](docs/integration-coverage-matrix.md) and [implementation checklist](docs/implementation-checklist.md) for the detailed status.

## Repository map

```text
backend/                 FastAPI service, models, migrations, tests, operator scripts
src/components/          Authentication gate and shared UI
src/lib/api.ts           Typed API client and request handling
src/pages/               Public site, application list/detail, operations pages
docs/                    Integration coverage, checklist, presentation notes
.github/workflows/       Frontend and backend CI workflows
docker-compose.yml       PostgreSQL, migration, API services
```

Additional references: [backend setup and API notes](backend/README.md), [presentation brief](docs/PRESENTATION_README.md), [implementation master prompt](docs/IMPLEMENTATION_MASTER_PROMPT.md), [ZIP inventory review](docs/zip-review-2026-10-25.md).
