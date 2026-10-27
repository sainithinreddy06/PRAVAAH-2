# PRAVAAH-2 Phase 0 Baseline and Implementation Inventory

**Repository:** https://github.com/sainithinreddy06/PRAVAAH-2  
**Baseline branch:** `main`  
**Baseline commit:** `2635d99cb9e04ba2b151e7471df22a22ccb0a332`  
**Working branch:** `nithin-pravaah`  
**Audit date:** 27 October 2026  
**Purpose:** Record verified repository metadata and source-backed current capabilities before implementation changes. This is an evidence record, not a claim that every documented capability was independently executed in this turn.

## 1. Repository baseline

- Visibility: private.
- Default branch: `main`.
- Repository is not archived.
- Repository access reports admin/maintain/push permissions for the connected identity.
- Current baseline commit message: `docs: add SIH26262 integration research implementation prompt`.
- Baseline commit author timestamp: 26 October 2026 14:10:52 UTC.
- Branch `nithin-pravaah` was created from the baseline SHA above.
- Existing branches at inspection: `cleanup-unneeded-policy-section`, `feat/mailbluster-inspired-public-site`, `feat/video-reference-public-site`, `main`, `phase-1-public-site-polish`, `test/full-public-portal-ci`, `test/verify-info-icon-fix`.
- An open-PR list endpoint was queried, but its result was not separately parsed into this document; do not infer that there are no open PRs.
- No local checkout or shell environment was available through the GitHub connector. As a result, this turn did not execute install/build/test/migration commands. The results below distinguish source documentation from verified repository metadata.

## 2. Technology and source-tree inventory

### Frontend
- React 18, TypeScript, Vite, React Router, Tailwind CSS, Lucide React.
- Scripts declared in `package.json`: `dev`, `build` (TypeScript no-emit plus Vite build), `preview`, `lint` (ESLint), `typecheck`.
- Main areas: `src/App.tsx`, `src/components/AuthGate.tsx`, `src/lib/api.ts`, and pages for public site, application list/detail, and operations.
- CI file: `.github/workflows/frontend-ci.yml`.

### Backend
- FastAPI, SQLAlchemy 2, Pydantic/Pydantic Settings, PostgreSQL driver, Alembic, PyJWT, Argon2, multipart upload support.
- Routes in `backend/app/api/routes/`: auth, applications, compliance, EVC, health, obligations, operations, recommendations.
- Models include application, audit event, EVC assessment, evidence, institution, notification, obligation, policy, undertaking and user.
- Two versioned migrations are present: `20261024_0001_initial_schema.py` and `20261025_0002_evc_undertakings.py`.
- Test modules cover applications, auth, compliance, EVC, health, models, obligations and operations.
- CI file: `.github/workflows/backend-ci.yml`.
- Local setup / orchestration: `docker-compose.yml`, `backend/Dockerfile`, `backend/alembic.ini`, `backend/requirements.txt`, and operator provisioning scripts.

### Documentation
- `README.md`, `backend/README.md`, `docs/IMPLEMENTATION_MASTER_PROMPT.md`, `docs/implementation-checklist.md`, `docs/integration-coverage-matrix.md`, `docs/zip-review-2026-10-25.md`, `docs/PRESENTATION_README.md`, `docs/SIH26262_FDR_FINAL_INTEGRATION_PROMPT.md`.

## 3. Current feature-to-API matrix (source-backed; re-verify while implementing)

| Capability | Current UI/source indication | API/model evidence | Gap / verification required | Status |
|---|---|---|---|---|
| Public landing / legal drafts | Public site page and legal routes documented | No core API required | Legal policy text requires deployment owner/contact/provider/retention details before publication | Existing; review required |
| Authentication | Login/current-user flow; token held in browser memory per README | `POST /auth/login`, `GET /auth/me`; user model and security module | Browser role/scope matrix; assess production session model | Existing; integration test partial per docs |
| Applications | List/create/detail/status-transition UI documented | Application routes/model/schema; transitions | Run invalid-transition and role/region browser tests | Existing; documented as tested partly |
| Policy registry/versioning | Policy metadata list and version creation documented | `GET/POST /policies` in compliance route; policy model | Confirm immutable version semantics, source provenance, effective dates and policy-to-requirement linkage | Partial |
| Evidence upload/review | Application-scoped PDF/JPEG/PNG upload, metadata list, review action documented | Evidence model; evidence route in compliance; digest noted in backend README | Browser upload tests; private durable object storage, malware scanning, retention and controlled downloads | Partial |
| Obligations | Create/list/update and manual due escalation documented | Obligation route/model/schema | No scheduled restart-safe worker documented; verify ownership, state changes and deadlines | Partial |
| In-app notifications | Current-user inbox; escalation may queue notifications | Notification model and routes | Persistent lifecycle/status semantics; scheduling/retries/external channel not documented as present | Partial |
| Undertakings | Draft, submit and officer review documented | EVC route/schema; undertaking model/migration | Browser journey and evidence lineage/signature semantics | Existing, verification partial |
| EVC | Readiness assessment snapshots documented | EVC route/schema/model/migration | Visit scheduling/team assignment/checklists/findings/report lifecycle not established by the current described snapshot API | Partial; visit lifecycle gap |
| Audit | Filterable audit query UI/API documented | Audit event model; operations route | No tamper-evident integrity chain or verification endpoint documented | Partial |
| Operational metrics | Scoped dashboard documented | `GET /operations/metrics` | Verify drill-downs, pagination and count semantics; avoid presenting response-capped counts as global | Existing; browser verification pending |
| Recommendations | Rule-based explanation/factors shown to authorized reviewer | `GET /applications/{id}/recommendations` | Not validated predictive AI; do not imply official decision logic | Existing; rule-based |
| Institution/user administration | No self-service API documented | Institution/user model, CLI provisioning scripts | Define least privilege and administrative audit semantics before introducing APIs | Missing UI/API |
| Persistent product settings | Explicitly documented as absent | No settings route/model identified in listed route tree | Add only after scope and configuration semantics are approved | Missing |
| Policy-to-requirement traceability | Policy and evidence links exist, but requirement-level digital thread not documented | No distinct requirement model/route in source-tree inventory | Requirement stable IDs, policy version pinning, application linkage and traceability | Gap to verify/implement |
| Alert scheduler/retry | Manual API-triggered overdue escalation documented | Obligation and notification endpoints/models | Durable scheduled worker/outbox, idempotency, retries and actual delivery status | Missing/partial |
| EVC visit management | Snapshot-based readiness | No visit model or visit route visible in inventory | Visit creation/scheduling/assignment/checklist/findings/report/corrective closure workflow | Missing/major extension |
| Audit hash chain / proof package | Queryable audit events only | Audit event model | Canonical event encoding, scoped hash chain, concurrency safety and verifier | Missing |
| Exports / case report | Not identified as a working end-to-end feature in current docs | No dedicated report/export route in listed API map | Authorized report manifest and integrity verification | Needs audit |
| Deployment checks | Compose and CI configuration present | CI files and health/readiness routes | Run CI-equivalent checks and PostgreSQL integration from a usable environment | Not executed in this turn |

**Interpretation rule:** this is a repository-inventory matrix, not proof of runtime behavior. A route or UI is not considered working until its API behavior and authorization have tests. Labels marked “documented” derive from repository documentation, whose verification record describes work done on 25 October 2026.

## 4. Previously documented quality evidence (not run in this turn)

The existing `README.md` and `docs/integration-coverage-matrix.md` state:
- Frontend typecheck and production build previously passed; lint passed with one existing Fast Refresh warning in `src/components/AuthGate.tsx`.
- Backend test suite previously reported 57 passed using SQLite fixtures; Ruff and Alembic history passed.
- A local browser-to-API journey previously passed login/current-user, application create/list/detail, and undertaking draft create/readback using a disposable SQLite database.
- PostgreSQL-backed migration/application verification was not completed in that prior run because Docker was unavailable and the documented Compose credential was rejected by local PostgreSQL.
- Browser verification for evidence upload/review, policy mutation, obligations, EVC, metrics, recommendations, and the role/region authorization matrix remained outstanding.
- These documented results do not constitute PostgreSQL compatibility or production/release certification.

No new tests were executed through this GitHub-only session. Re-run all checks in an actual checkout/CI environment and record current results before feature work is considered verified.

## 5. Environment and database safety

- Repository contains example environment files and Docker Compose; this inspection did not retrieve secret values.
- Do not run schema reset, destructive migration, volume removal, database cleanup, or any production write as part of baseline.
- Identify target database and deployment mapping from actual environment/hosting configuration before any database operation.
- Run migrations/integration tests only against a known disposable PostgreSQL database, with explicit database identity confirmation.
- Preserve existing data and migration chain; add forward migrations rather than editing applied migrations.
- Do not assume CI status or deployment health from the presence of workflow files.

## 6. Phase 0 decisions / exit criteria

- [x] Verified repository identity, default branch, baseline commit and write permissions.
- [x] Created `nithin-pravaah` from the exact `main` baseline SHA.
- [x] Enumerated all tracked source paths from the baseline tree (93 blob files reported).
- [x] Recorded stack, domain modules, tests, migrations, CI and documentation files.
- [x] Built an initial feature-to-API gap matrix based on the tree and current README docs.
- [ ] Record actual local working-tree status / remotes / untracked files from a real checkout (not available via GitHub connector).
- [ ] Parse all open PRs and workflow run statuses and record them.
- [ ] Execute fresh frontend checks and backend checks, including PostgreSQL on a disposable instance.
- [ ] Confirm target deployment and database mapping without exposing secrets.
- [ ] Complete direct inspection of all relevant route/model/schema/test/migration implementations.
- [ ] Finalize traceable synthetic end-to-end demo scenario acceptance checklist.

## 7. Planned implementation batches (do not imply completion)

1. **Finish Phase 0 evidence:** direct source review, PR/CI status, environment/deployment mapping, and current test baseline.
2. **Stabilization:** reproduce baseline failures and fix root causes with regression tests.
3. **Traceability core:** policy version/effective-date and requirement-to-evidence linkage, retaining historic decisions.
4. **Evidence integrity:** private durable storage adapter, evidence version lineage, deterministic checks, extraction provenance and reviewer-controlled discrepancies.
5. **EVC lifecycle:** visits, assignment/schedule, checklist, finding, report revision, corrective obligation and closure.
6. **Alert reliability:** obligation semantics, idempotent durable events/outbox, bounded retry and truthful channel states.
7. **Operational insight:** server-scoped queues, explainable pendency/SLA flags and real drill-downs.
8. **Policy change preview:** version comparison and impact assessment before authorized activation.
9. **Audit verification/report manifest:** canonical chain and verifier with threat-model limitations.
10. **Administration/security:** least-privilege user/institution management only where justified, audit and object-scope tests.
11. **End-to-end regression and deployment:** role-separated synthetic journey, PostgreSQL tests, CI and demo KPI measurement.

Each batch must be reviewed, tested, documented and committed only on `nithin-pravaah`. Do not merge into `main` or deploy unless separately requested.
