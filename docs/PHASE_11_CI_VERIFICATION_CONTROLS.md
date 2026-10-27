# PRAVAAH-2 Phase 11 — CI Verification Controls

## Implemented

Added the GitHub Actions `workflow_dispatch` trigger to Backend CI and Frontend CI. This allows a maintainer to request a deliberate verification run from GitHub Actions without creating an artificial code change.

The existing push and pull-request path filters remain in place. Backend CI still provisions PostgreSQL 16, validates and applies Alembic migrations, runs pytest, and runs Ruff. Frontend CI still runs typecheck, lint, and production build.

## Verification status

- Workflow configuration changes are committed on `nithin-pravaah`.
- A manual run must still be started from GitHub Actions and inspected; adding a dispatch trigger does not itself execute the workflow.
- No CI result is claimed until the run completes and its logs are reviewed.
- `main` has not been modified.

## Operator steps

1. Open the Actions page for this repository.
2. Select Backend CI or Frontend CI.
3. Choose Run workflow and select `nithin-pravaah`.
4. Inspect every job step, especially PostgreSQL migration, pytest and Ruff for backend; typecheck, lint and build for frontend.
5. Record the run URL and commit SHA in the release checklist.