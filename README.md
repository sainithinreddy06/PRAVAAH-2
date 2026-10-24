# PRAVAAH-2

PRAVAAH is a workflow foundation for approval applications, evidence review, obligations, undertakings, operational audit queries, and explainable compliance-readiness guidance.

## Run locally

Requirements: Docker Desktop with Docker Compose and Node.js 20+.

```bash
docker compose up --build
```

Compose starts PostgreSQL, applies Alembic migrations, and then starts the API. Run the React frontend in a separate terminal:

```bash
npm install
npm run dev
```

- Frontend: http://localhost:5173
- API: http://localhost:8000
- API docs (development): http://localhost:8000/docs
- Liveness: http://localhost:8000/api/v1/health
- Readiness (checks PostgreSQL): http://localhost:8000/api/v1/ready

For local testing, Compose uses a development-only database password and JWT secret unless overridden. Do not use these defaults in a deployed environment. Set `POSTGRES_PASSWORD` and `JWT_SECRET_KEY` in the shell environment before running Compose when you need custom local secrets. Production deployment additionally requires secure secret management, private object storage, malware scanning, and operational controls.

## Implemented backend capabilities

- Authentication with Argon2 password verification and JWT access tokens.
- Role- and region-aware application workflows and status transitions.
- Policy metadata, evidence upload/review, and SHA-256 file digests.
- Obligation management and API-triggered overdue notification queueing.
- Undertaking submission/review and EVC readiness snapshots.
- Filtered audit event queries and operational metrics.
- Explainable, rule-based application recommendations.

Recommendations and EVC outcomes are workflow aids, not official AICTE compliance decisions or validated predictive models. Dashboard case names and figures are synthetic demo data, not official AICTE records.

## Quality checks

Backend CI validates the Alembic migration graph, applies migrations against PostgreSQL, runs pytest, and checks Ruff lint. Frontend CI runs TypeScript checks, ESLint, and the Vite production build.

See [backend setup and API notes](backend/README.md) and [implementation checklist](docs/implementation-checklist.md) for details and remaining production-hardening work.
