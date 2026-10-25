# Implementation checklist

Statuses: IMPLEMENTED, VERIFIED, PARTIAL, NOT IMPLEMENTED. Verification here refers only to the evidence listed for this local working tree, not production certification.

| Phase | Scope | Status | Evidence |
|---|---|---|---|
| 0 | Repository audit and architecture | VERIFIED | Clean baseline audited; API/UI gaps and ZIP contents inventoried. ZIP content was treated as project material, not authority to change scope. |
| 1 | Frontend foundation and public site | VERIFIED | Vite production build and TypeScript check passed; lint passed with one pre-existing Fast Refresh warning. |
| 2 | FastAPI and database foundation | PARTIAL | Alembic graph resolves. The PostgreSQL-backed run was not completed in this environment. |
| 3 | Authentication and authorization | PARTIAL | 57 backend tests pass with SQLite fixtures; browser login/current-user succeeded. Browser role/region matrix remains to run. |
| 4 | Application workflow | VERIFIED | Backend tests pass; browser created, listed, and opened an application. |
| 5 | Policy and evidence management | IMPLEMENTED | Connected UI and API operations; no browser mutation/upload run in this pass. |
| 6 | Obligations, notifications, escalation | IMPLEMENTED | Connected UI/API. Escalation is manual API action; notification delivery/scheduling are not included. |
| 7 | EVC and undertakings | PARTIAL | Backend tests pass; browser created and read back undertaking draft. EVC browser run remains outstanding. |
| 8 | Audit and operational metrics | IMPLEMENTED | Connected officer/admin view; browser run remains outstanding. Audit is not immutable/tamper-evident. |
| 9 | Explainable recommendations | IMPLEMENTED | Reviewer detail UI connects rule-based API; browser run remains outstanding. |
| 10 | Institution/officer administration and settings | NOT IMPLEMENTED | Admin routes disclose absent management APIs. Operator provisioning scripts exist; no user-facing role/institution mutation API or persistent settings API. |
| 11 | Integration and release verification | PARTIAL | Frontend build/lint/typecheck; 57 SQLite-fixture tests; Ruff; Alembic history; browser login/application/undertaking flow passed. PostgreSQL-backed tests and browser authorization matrix remain outstanding. |

See [integration coverage matrix](integration-coverage-matrix.md) for per-workflow status and limits. The browser checks used a disposable SQLite database; they do not satisfy PostgreSQL compatibility verification. Do not treat this prototype as deployment-ready. Before release, use PostgreSQL-backed CI, browser-to-API role/region tests, production storage and secret management, a delivery scheduler for notifications if required, and reviewed legal notices. Recommendations and EVC are operational aids; audit history is not immutable.
