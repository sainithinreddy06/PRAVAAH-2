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

## Tests and lint

```bash
pytest
ruff check app tests migrations
```

## Schema
Alembic migration `20261024_0001` creates initial tables for users, institutions, applications, versioned policy metadata, evidence metadata, obligations, notification records, and audit events. The models are schema foundations only; authorization, workflow rules, secure file storage, notification dispatch, and audit integrity enforcement are not yet implemented.

The Compose password is for local development only. Never use it in a deployed environment. No official AICTE rules or data are seeded by this phase.