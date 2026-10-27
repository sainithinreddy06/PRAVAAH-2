# Phase 0 Status Update — Source Inspection and CI

## Repository and branch status
- Repository: `sainithinreddy06/PRAVAAH-2`
- Baseline `main`: `2635d99cb9e04ba2b151e7471df22a22ccb0a332`
- Working branch: `nithin-pravaah`
- All implementation commits in this workstream target `nithin-pravaah`; no merge or deployment was performed.
- The frontend CI run on this branch passed.
- Backend CI passed for the regional audit pagination fix and the policy effective-window enforcement commits. Later runs for the evidence audit traceability change are still in progress at the time of this update.

## Findings and implementation progress
1. Application lifecycle uses a hard-coded allowed-transition graph; transitions require reasons and use backend authorization/conditional update guards.
2. Authentication reloads active user data from the database; role and region checks are centralized but still need route-by-route tests.
3. Policy versions store a key, integer version, source reference, effective dates and active flag.
4. Evidence uploads now reject selected policy versions that are not yet effective or have expired. The upload audit event also snapshots the policy key, version and source reference alongside the policy ID and evidence SHA-256 digest, improving traceability if policy metadata is later reviewed.
5. A regression test verifies that the evidence record and its upload audit event retain the selected policy version details. CI is running for this latest test and implementation; do not treat it as passed until the run concludes.
6. Evidence files are still stored on the local filesystem. Production object storage, malware scanning, OCR provenance and discrepancy-review records remain separate gaps.
7. Obligations lack a versioned source rule and explainable deadline calculation in the model. Notifications have a unique event key and attempt/error fields, but a durable scheduler/outbox/retry worker was not found in the inspected files.
8. EVC is currently a readiness snapshot model. Separate visits, schedules, assignments, inspection checklists, findings and report revisions are not represented in the inspected model inventory.
9. Audit events are queryable but do not yet have canonical hash-chain fields or a verification mechanism.
10. Regional audit filtering has been moved into the SQL query before ordering and pagination; a regression assertion covers the case where a newer out-of-region event must not hide an in-region event on a small page.

## Phase 0 checklist
- [x] Repository metadata, branch and baseline SHA recorded.
- [x] Initial feature-to-API matrix and source review added.
- [x] Backend CI and frontend CI wired to run on `nithin-pravaah`.
- [x] Regional audit pagination visibility fix and regression assertion committed.
- [x] Policy effective-window validation and tests committed; CI passed for those commits.
- [x] Evidence policy-version audit snapshot and regression test committed; latest CI pending.
- [ ] Finish reviewing all routes, test assertions, migrations and workflow YAML.
- [ ] Confirm latest CI for policy traceability changes.
- [ ] Complete remaining PostgreSQL integration, deployment configuration and environment checks.
- [ ] Mark Phase 0 complete only after remaining verification items are addressed.

Phase 0 remains open. CI success on selected commits is useful evidence, but it does not substitute for the remaining repository, environment and deployment checks.
