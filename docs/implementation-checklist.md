# Implementation checklist

Statuses: NOT_STARTED, IN_PROGRESS, IMPLEMENTED, VERIFIED.

| Phase | Scope | Status | Evidence |
|---|---|---|---|
| 0 | Repository audit, references, architecture | IN_PROGRESS | Nexora URL/design audit and engineering-reference audit remain pending |
| 1 | Frontend foundation | IMPLEMENTED | React/TypeScript/Vite shell, responsive dashboard, route placeholders; frontend build not yet run |
| 2 | FastAPI and PostgreSQL foundation | IMPLEMENTED | FastAPI app, health/readiness routes, SQLAlchemy domain models, Alembic migrations, Compose services, backend tests and CI workflow added |
| 3 | Authentication and authorization | IMPLEMENTED | Argon2 password verification, JWT login/profile endpoints, inactive-account rejection, reusable role/region guards, and access tests added |
| 4 | Application workflow | IMPLEMENTED | Authenticated create/list/detail/transition endpoints, region and applicant scoping, state-machine validation, audit-event writes, and lifecycle tests added |
| 5 | Policy and evidence management | IMPLEMENTED | Policy metadata versioning, admin-only policy creation, size-limited evidence uploads with SHA-256 digests, evidence review endpoints, and audit events added |
| 6 | Obligations, deadlines, alerts, escalation | IMPLEMENTED | Obligation create/list/update endpoints, role and region checks, audit events, due-date filtering, idempotent overdue in-app notification queue, and tests added |
| 7 | EVC, undertakings, compliance operations | IMPLEMENTED | Undertaking submit/review workflow, EVC readiness snapshots, access controls, audit events, Alembic migration, and tests added |
| 8 | Auditability and operational intelligence | IMPLEMENTED | Filtered audit query endpoint with regional visibility, global/region-scoped operational metrics, and access tests added; CI verification pending |
| 9 | Advanced differentiators | NOT_STARTED | — |
| 10 | Integration and release hardening | NOT_STARTED | — |

Phases 1–8 are implemented in source but not marked VERIFIED until the corresponding build, tests, lint, and database migration checks have run successfully. Dashboard examples remain synthetic. EVC outcomes are workflow-readiness indicators, not official compliance decisions. Audit events are not yet tamper-evident or immutable. Evidence storage is local by default and still needs private durable object storage and malware scanning for production. Overdue notification generation is API-triggered; automatic scheduling and delivery workers remain outstanding.
