# Implementation checklist

Statuses: NOT_STARTED, IN_PROGRESS, IMPLEMENTED, VERIFIED.

| Phase | Scope | Status | Evidence |
|---|---|---|---|
| 0 | Repository audit, references, architecture | IN_PROGRESS | Nexora URL/design audit and engineering-reference audit remain pending |
| 1 | Frontend foundation | IMPLEMENTED | React/TypeScript/Vite shell, responsive dashboard, route placeholders; frontend build not yet run |
| 2 | FastAPI and PostgreSQL foundation | IMPLEMENTED | FastAPI app, health/readiness routes, SQLAlchemy domain models, initial Alembic migration, Compose services, backend tests and CI workflow added; execution results pending |
| 3 | Authentication and authorization | NOT_STARTED | — |
| 4 | Application workflow | NOT_STARTED | — |
| 5 | Policy and evidence management | NOT_STARTED | — |
| 6 | Obligations, deadlines, alerts, escalation | NOT_STARTED | — |
| 7 | EVC, undertakings, compliance operations | NOT_STARTED | — |
| 8 | Auditability and operational intelligence | NOT_STARTED | — |
| 9 | Advanced differentiators | NOT_STARTED | — |
| 10 | Integration and release hardening | NOT_STARTED | — |

Phase 1 and Phase 2 are implemented in source but not marked VERIFIED until the corresponding build, tests, lint, and database migration checks have run successfully. Dashboard examples remain synthetic. Authentication, authorization, workflow transitions, secure evidence storage, notification dispatch, and audit integrity enforcement are future phases.