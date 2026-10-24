# PRAVAAH-2 Integration Coverage Matrix

Audit basis: the current `main` branch inspected on 25 October 2026. This is a repository-level static audit; it is not a browser E2E run or a live database test.

## Executive finding

The backend exposes real FastAPI routes for authentication, applications, policies/evidence, obligations/notifications, undertakings/EVC assessments, audit events, operational metrics, and recommendations. The current React app does not yet call those APIs: the overview uses hard-coded synthetic data and the other workspace pages render placeholders. Therefore, the presence of backend endpoints must not be interpreted as end-to-end UI integration.

## Coverage matrix

| User workflow / UI route | Current UI behavior | Backend capability | Integration status | Highest-value next check |
|---|---|---|---|---|
| Overview `/` | Hard-coded metrics, cases, alerts, and activity | `GET /api/v1/operations/metrics`; applications, obligations, notifications, audit routes | Not connected; all overview figures remain synthetic | Replace static metrics only after mapping response schema and adding loading/error/empty states |
| Sign in / current user | `AuthGate` sign-in form; `/api/v1/auth/login` followed by `/api/v1/auth/me`; workspace gated behind authentication | `POST /api/v1/auth/login`; `GET /api/v1/auth/me` | Implemented in frontend; CI/runtime verification pending. Bearer token stays in module memory and is cleared on sign-out/401; refresh requires signing in again | Verify valid/invalid login, 401 handling, expiry behavior, and backend connectivity in a browser; consider HttpOnly-cookie/BFF session design before production |
| Applications `/applications` | API-backed list, status filter, refresh, role-aware transition buttons, required reason prompt, loading/error/empty states | `POST/GET /api/v1/applications`; `GET /api/v1/applications/{id}`; `POST /api/v1/applications/{id}/transitions` | List, status filter, create-draft form, and transitions connected; detail UI not implemented. Frontend CI passed typecheck, lint, and production build on commit `81583e4f878561ec93b56176385e4cda353fd4d9` ([run](https://github.com/sainithinreddy06/PRAVAAH-2/actions/runs/40122685895)) | Verify application listing and transition success, 409 conflict handling, invalid reasons, and applicant/region access boundaries |
| Scrutiny queue `/scrutiny` | Placeholder | Application list/status filters and transitions; evidence review endpoints | Not connected; no dedicated queue endpoint identified | Define queue filters from supported API fields; do not imply an endpoint exists until implemented |
| Compliance `/compliance` | Placeholder | Obligations CRUD/list, notifications, manual overdue escalation; EVC assessment history | Not connected | Connect obligation and notification reads first; verify escalation authorization and idempotency |
| Evidence library `/evidence` | Placeholder | `POST /api/v1/applications/{application_id}/evidence`; `GET /api/v1/applications/{application_id}/evidence`; `PATCH /api/v1/evidence/{evidence_id}/review` | Not connected; listing is application-scoped, not a global library endpoint | Implement application-scoped upload/list/review and surface upload validation errors |
| Workflow studio `/workflows` | Placeholder | Application transition rules exist in backend; no workflow configuration API identified | No matching configuration API | Treat as informational or implement a separately specified workflow configuration API; avoid implying configurable workflows exist |
| Institutions `/institutions` | Placeholder | Institution model is used by application routes; no institution CRUD router registered | No matching management API | Decide whether institution administration is in scope; add authorized CRUD only with requirements/tests |
| Officers & roles `/officers` | Placeholder | User model and role/region checks exist; no user administration router registered | No matching management API | Decide admin requirements; do not expose user/role changes without a dedicated authorization model |
| Policy register `/policies` | Placeholder | `GET /api/v1/policies`; `POST /api/v1/policies` | Not connected | Connect versioned policy listing and admin-only creation with validation feedback |
| Settings `/settings` | Placeholder | No workspace preferences endpoint identified | No matching API | Keep local-only settings clearly labelled until persistence requirements are defined |
| Undertakings | No dedicated page/route visible | Create/list/submit/review undertaking endpoints; application-scoped list | No dedicated UI | Add to the relevant application detail workflow after core application/evidence integration |
| EVC readiness | No dedicated page/route visible | Create assessment and list application assessment history | No dedicated UI | Show timestamped snapshots and clearly label them as workflow-readiness aids, not official decisions |
| Audit events | No dedicated page/route visible | `GET /api/v1/audit/events` | No dedicated UI | Add authorized audit view and preserve the caveat that events are not immutable/tamper-evident |
| Risk recommendations | No dedicated page/route visible | `GET /api/v1/applications/{application_id}/recommendations` | No dedicated UI | Present explanations and recommended actions; label scores as rule-based, not ML or official decisions |
| Health / readiness | Not shown in UI | `GET /api/v1/health`; `GET /api/v1/ready` | Backend-only | Use readiness for operational checks; do not treat liveness as proof that the database is ready |

## Cross-cutting integration requirements

1. **API client and configuration:** `src/lib/api.ts` now centralizes API calls and uses `VITE_API_BASE_URL` (defaults to `http://127.0.0.1:8000`); `.env.example` documents the setting.
2. **Authentication:** the frontend now uses the backend bearer JWT login/current-user endpoints, keeps the access token in memory only, clears it on logout/401, and has no built-in demo credentials. This means a page refresh signs the user out. A production-grade HttpOnly-cookie/BFF session remains preferable if the backend is extended to support it.
3. **Authorization:** frontend role-based visibility is only a usability aid. Backend authorization remains authoritative. Test applicant ownership, region isolation, and platform-admin exceptions for every read and mutation.
4. **State and feedback:** every data-backed screen needs loading, error, empty, success, and permission-denied states. Mutations need pending/disabled states and visible API validation errors.
5. **Data semantics:** overview demo records and counts are synthetic. Do not mix them with live API results without explicit labelling.
6. **Uploads:** UI must respect PDF/JPEG/PNG validation and configured size limits. Signature checks do not replace malware scanning; local evidence storage is not a production storage strategy.
7. **Dates and transitions:** render timestamps consistently, handle stale state and HTTP 409 transition conflicts, and only offer transitions the server can authorize.
8. **Operational claims:** obligation escalation is API-triggered, not a verified recurring scheduler. EVC and risk recommendations are workflow aids. Audit events are not established as immutable.

## Prioritized work order

- **P0 — Close the integration gap:** API client/configuration, sign-in/current-user gate, and application list/status transitions are implemented. Await frontend CI and perform real browser/API verification; application detail/create UI and the overview remain unconnected.
- **P1 — Evidence and policy:** connect policy listing/creation and application-scoped evidence upload/list/review; add regression coverage for validation and authorization failures.
- **P1 — Operational workflows:** connect obligations, notifications, EVC assessments, audit events, metrics, and recommendations to dedicated UI views.
- **P2 — Product-scope decisions:** specify missing institution/officer administration, configurable workflow studio, global evidence library, and persisted settings before implementing them.
- **P2 — Runtime validation:** run Docker Compose against a clean local environment, then execute real browser journeys for sign-in, application creation/listing, transitions, evidence upload/review, and regional-access denial.

## Verification status

- Repository files and route registration were inspected on `main`.
- Recent GitHub Actions history was inspected. The last known Backend CI run (`40121994608`) and Frontend CI run (`40122014079`) report success, but they target different commits and validate backend tests/migrations/lint and frontend typecheck/lint/build respectively.
- No browser E2E session, live Compose integration run, production deployment test, or external institutional integration was executed as part of this static audit.


## Integration slice update (25 October 2026)

- Added `src/lib/api.ts`, `src/components/AuthGate.tsx`, and `src/pages/ApplicationsPage.tsx`; routed `/applications` to the API-backed list/create/transition UI and added `.env.example` plus `src/vite-env.d.ts`.
- Added `backend/scripts/create_user.py` and `backend/scripts/create_institution.py` for interactive local/operator provisioning and included the scripts in the API container image. No default accounts/institutions or public management/self-registration endpoints are introduced.
- The application list supports status filtering and backend-validated transitions with a required reason, loading/error/empty feedback, and HTTP 409 conflict messaging.
- The access token is held in memory, not Web Storage. This reduces persistence and refresh-token exposure but does not eliminate XSS risk; production should evaluate a server-managed HttpOnly session.
- GitHub Actions Frontend CI passed typecheck, lint, and production build on commit `81583e4f878561ec93b56176385e4cda353fd4d9` ([run](https://github.com/sainithinreddy06/PRAVAAH-2/actions/runs/40122685895)). Backend CI passed migration checks, PostgreSQL migration application, tests, and Ruff for the account-provisioning work on commit `df8f63b29b5381472e9efdffd907e8fa2e8be187` ([run](https://github.com/sainithinreddy06/PRAVAAH-2/actions/runs/40122629323)); the institution-provisioning script also passed migration checks, tests, and Ruff on commit `e35379b70c190bb39f9bcb3efe4d70a8b38c6f2f` ([run](https://github.com/sainithinreddy06/PRAVAAH-2/actions/runs/40122783060)). These checks validate builds and backend tests, not live UI-to-API behavior. No seeded-account browser login, browser E2E, or full Docker Compose workflow test has been performed in this update.
