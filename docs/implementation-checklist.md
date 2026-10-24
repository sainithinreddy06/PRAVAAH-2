# Implementation checklist

Statuses: NOT_STARTED, IN_PROGRESS, IMPLEMENTED, VERIFIED.

| Phase | Scope | Status | Evidence |
|---|---|---|---|
| 0 | Repository audit, references, architecture | IN_PROGRESS | Nexora URL/design audit and engineering-reference audit remain pending |
| 1 | Frontend foundation | IMPLEMENTED | React/TypeScript/Vite shell, responsive dashboard, route placeholders; frontend CI now runs typecheck, lint, and build |
| 2 | FastAPI and PostgreSQL foundation | IMPLEMENTED | FastAPI, SQLAlchemy domain models, Alembic migrations, Docker Compose, health/readiness endpoints |
| 3 | Authentication and authorization | IMPLEMENTED | Argon2 password verification, JWT login/profile endpoints, inactive-account rejection, role/region guards |
| 4 | Application workflow | IMPLEMENTED | Authenticated create/list/detail/transition endpoints, state machine, role and region checks, audit-event writes |
| 5 | Policy and evidence management | IMPLEMENTED | Policy metadata versioning, size-limited evidence uploads, SHA-256 digests, review endpoints, audit events |
| 6 | Obligations, deadlines, alerts, escalation | IMPLEMENTED | Obligation management, due-date filters, idempotent overdue in-app notification queue; scheduling and delivery workers remain outstanding |
| 7 | EVC, undertakings, compliance operations | IMPLEMENTED | Undertaking submit/review workflow, EVC readiness snapshots, migration and tests |
| 8 | Auditability and operational intelligence | IMPLEMENTED | Filtered audit query, region-scoped operational metrics and access tests |
| 9 | Advanced differentiators | IMPLEMENTED | Explainable rule-based application recommendations and regional authorization tests |
| 10 | Integration and release hardening | IMPLEMENTED | PostgreSQL-backed migration checks in backend CI, frontend typecheck/lint/build workflow, Compose migration job before API startup, and updated setup/security documentation; CI verification pending |

No phase is marked VERIFIED until its latest relevant CI and integration checks pass. Frontend UI still uses synthetic demonstration data. EVC outcomes and recommendation scores are operational aids, not official compliance decisions or validated predictive models. Audit events are not yet tamper-evident or immutable. Evidence storage requires production-grade private object storage, malware scanning, and retention controls. Production deployment also needs managed secrets, deployment-specific CORS, monitoring, backup/restore testing, and a review of all role/region boundaries.
