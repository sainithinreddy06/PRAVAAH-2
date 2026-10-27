# Phase 0 Status Update — Source Inspection

## Repository and branch status
- Repository: `sainithinreddy06/PRAVAAH-2`
- Baseline `main`: `2635d99cb9e04ba2b151e7471df22a22ccb0a332`
- Working branch: `nithin-pravaah`
- Latest commit before this update: `3206ae2dde20b71f19c8fabc63f15c62633541ea`
- Open pull requests query: 0 returned.
- GitHub Actions query for `nithin-pravaah`: 0 runs returned.
- Existing runs on other branches include successful and failed Frontend CI and Backend CI. They refer to older commits and are not evidence for this branch's tests.

## Source-level findings recorded
1. The application lifecycle is a hard-coded allowed-transition graph; transitions require reasons and use backend authorization/conditional update guards.
2. Authentication reloads active user data from the database; role and region checks are centralized but still need route-by-route tests.
3. Policy versions store key, integer version, source reference, effective dates and an active flag; there is no distinct requirement entity in the initial source inventory.
4. Evidence upload supports file signature checking, byte limits and SHA-256, but local file storage is not production object storage; version lineage, OCR provenance and a discrepancy-review record are not present in the inspected schema.
5. Obligations lack a versioned source rule and explainable deadline calculation in the model. Notifications have a unique event key and attempt/error fields, but a durable scheduler/outbox/retry worker was not found in the inspected files.
6. EVC is currently a readiness snapshot model. Separate visits, schedules, assignments, inspection checklists, findings and report revisions are not represented in the inspected model inventory.
7. Audit events are queryable but have no canonical hash-chain fields or verification mechanism in the model inspected.
8. Regional audit filtering is applied after fetching a limited page; confirm pagination correctness with authorization tests.
9. Existing repository documentation reports earlier checks, but this session did not run them. It also documents a prior gap in PostgreSQL-backed validation.

## Updated Phase 0 checklist
- [x] Repository metadata, branch, baseline SHA.
- [x] Initial feature-to-API matrix.
- [x] Core source inspection for application, auth, policy, evidence, obligations/notifications, EVC/undertakings, audit/metrics and recommendations.
- [x] PR/CI metadata checked.
- [ ] Finish inspecting all routes, test assertions, migration chain and workflow YAML.
- [ ] Run tests and frontend checks in a real local checkout or CI.
- [ ] Run PostgreSQL integration checks against a confirmed disposable database.
- [ ] Map deployment and database configuration without exposing secrets.
- [ ] Mark Phase 0 complete only after remaining verification items are addressed.

The initial Phase 0 document is intentionally not marked fully complete while runtime and environment evidence is unavailable.
