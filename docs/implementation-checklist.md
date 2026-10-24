# Implementation checklist

Statuses: NOT_STARTED, IN_PROGRESS, IMPLEMENTED, VERIFIED.

| Phase | Scope | Status | Evidence |
|---|---|---|---|
| 0 | Repository audit, references, architecture | IN_PROGRESS | Nexora URL/design audit and engineering-reference audit remain pending |
| 1 | Frontend foundation | IMPLEMENTED | React/TypeScript/Vite shell, responsive dashboard, route placeholders; frontend build not yet run |
| 2 | FastAPI and PostgreSQL foundation | IMPLEMENTED | FastAPI app, health/readiness routes, SQLAlchemy domain models, initial Alembic migration, Compose services, backend tests and CI workflow added; execution results pending |
| 3 | Authentication and authorization | IMPLEMENTED | Argon2 password verification, JWT login/profile endpoints, inactive-account rejection, reusable role/region guards, and authentication/region-boundary tests added; CI execution still needs confirmation |
| 4 | Application workflow | IMPLEMENTED | Authenticated create/list/detail/transition endpoints, region and applicant scoping, state-machine validation, audit-event writes, and lifecycle/access tests added; CI execution pending |
| 5 | Policy and evidence management | IMPLEMENTED | Policy metadata versioning, admin-only policy creation, size-limited PDF/JPEG/PNG evidence uploads with SHA-256 digests, evidence review endpoints, audit events, and compliance tests added; CI execution pending |
| 6 | Obligations, deadlines, alerts, escalation | IMPLEMENTED | Obligation create/list/update endpoints, role and region checks, audit events, due-date filtering, idempotent overdue in-app notification queue, and initial tests added; CI execution pending |
| 7 | EVC, undertakings, compliance operations | NOT_STARTED | — |
| 8 | Auditability and operational intelligence | NOT_STARTED | — |
| 9 | Advanced differentiators | NOT_STARTED | — |
| 10 | Integration and release hardening | NOT_STARTED | — |

Phases 1–6 are implemented in source but not marked VERIFIED until the corresponding build, tests, lint, and database migration checks have run successfully. Dashboard examples remain synthetic. Evidence upload uses local disk by default and still needs private durable object storage and malware scanning for production. Overdue notification generation is an API-triggered queue operation, not an automated scheduler; delivery workers and email/SMS integration remain outstanding. Audit integrity enforcement remains future work.
