# PRAVAAH-2

Integrated AICTE approval workflow automation, compliance monitoring, and alert management platform.

## Phase 1 — Frontend foundation

React + TypeScript + Vite + Tailwind workspace shell with responsive navigation, dashboard layout, and initial workspace routes. Dashboard figures and case names are synthetic demonstration data, not official AICTE records.

## Phase 2 — Backend and database foundation

FastAPI service, PostgreSQL/SQLAlchemy domain models, Alembic initial migration, liveness/readiness endpoints, Docker Compose, and initial backend tests/CI.

### Run the stack locally

Requirements: Docker Desktop with Docker Compose, or Node.js 20+, Python 3.12+, and PostgreSQL 16+.

```bash
docker compose up --build
```

- Frontend (run separately): `npm install` then `npm run dev`
- API: http://localhost:8000
- API docs (development): http://localhost:8000/docs
- Liveness: http://localhost:8000/api/v1/health
- Readiness (checks PostgreSQL): http://localhost:8000/api/v1/ready

The default Compose database password is local-development-only. Set `POSTGRES_PASSWORD` to a strong local value if needed; never use development defaults in deployment. For standalone backend instructions and tests, see `backend/README.md`.

## Phase status

See `docs/implementation-checklist.md`. Features are marked VERIFIED only after their checks have actually run successfully. Authentication, authorization, application workflow rules, secure evidence storage, notifications, and audit enforcement are not yet implemented. Do not use this foundation with real institutional records.