# Implementation checklist

Statuses: NOT_STARTED, IN_PROGRESS, IMPLEMENTED, VERIFIED.

| Phase | Scope | Status | Evidence |
|---|---|---|---|
| 0 | Repository audit, references, architecture | IN_PROGRESS | Nexora URL/design audit and engineering-reference audit remain pending |
| 1 | Frontend foundation | VERIFIED | Frontend CI passed TypeScript typecheck, ESLint, and Vite production build |
| 2 | FastAPI and PostgreSQL foundation | VERIFIED | Backend CI applied the Alembic migration chain to PostgreSQL and confirmed the migration head |
| 3 | Authentication and authorization | VERIFIED | Backend test suite passed with Argon2/JWT and role/region access coverage |
| 4 | Application workflow | VERIFIED | Backend lifecycle tests passed |
| 5 | Policy and evidence management | VERIFIED | Backend evidence and policy tests passed |
| 6 | Obligations, deadlines, alerts, escalation | VERIFIED | Backend obligation and notification tests passed; escalation remains API-triggered |
| 7 | EVC, undertakings, compliance operations | VERIFIED | Backend EVC/undertaking tests and PostgreSQL migration checks passed |
| 8 | Auditability and operational intelligence | VERIFIED | Audit access and operational metrics tests passed |
| 9 | Advanced differentiators | VERIFIED | Recommendation tests and regional access tests passed |
| 10 | Integration and release hardening | VERIFIED | PostgreSQL migration CI and frontend typecheck/lint/production build CI passed; Compose applies migrations before API startup |

Verification applies to the checks listed above, not a production certification or full end-to-end deployment test. Frontend UI still uses synthetic demonstration data. EVC outcomes and recommendation scores are operational aids, not official compliance decisions or validated predictive models. Audit events are not yet tamper-evident or immutable. Evidence storage requires production-grade private object storage, malware scanning, and retention controls. Production deployment still needs managed secrets, deployment-specific CORS, monitoring, backup/restore testing, and a review of all role/region boundaries.

## Post-phase integration audit (not a new phase)

Status: IN_PROGRESS. The repository-level coverage matrix is recorded in [integration-coverage-matrix.md](integration-coverage-matrix.md). The initial authenticated UI slice is now implemented: a configurable API client, sign-in/current-user gate, in-memory bearer-token handling with sign-out/401 clearing, an API-backed applications list with status filtering, a draft-creation form, and backend-validated transitions. Added interactive institution and account provisioning CLIs for local/operator setup; no default users/institutions or public self-registration/management endpoints are introduced. Frontend CI passed typecheck, lint, and production build for the application create form on commit `81583e4f878561ec93b56176385e4cda353fd4d9` ([run](https://github.com/sainithinreddy06/PRAVAAH-2/actions/runs/40122685895)). Backend CI passed migrations, PostgreSQL migration application, tests, and Ruff for account provisioning and the Docker image on commit `df8f63b29b5381472e9efdffd907e8fa2e8be187` ([run](https://github.com/sainithinreddy06/PRAVAAH-2/actions/runs/40122629323)); the institution-provisioning script passed the same checks on commit `e35379b70c190bb39f9bcb3efe4d70a8b38c6f2f` ([run](https://github.com/sainithinreddy06/PRAVAAH-2/actions/runs/40122783060)). The overview still uses synthetic demo data and other workspace pages remain placeholders. This is not full integration verification: live API login, seeded-account workflows, browser E2E, local Docker Compose integration, and regional-access checks remain outstanding. Do not mark integration as verified until those checks have been executed.
