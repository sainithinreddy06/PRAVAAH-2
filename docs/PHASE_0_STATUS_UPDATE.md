# Phase 0 Status Update — Source Inspection and CI

## Repository and branch status
- Repository: `sainithinreddy06/PRAVAAH-2`
- Baseline `main`: `2635d99cb9e04ba2b151e7471df22a22ccb0a332`
- Working branch: `nithin-pravaah`
- All implementation commits in this workstream target `nithin-pravaah`; no merge or deployment was performed.
- The frontend CI run on this branch passed.
- Backend CI passed for the regional audit pagination fix, policy effective-window enforcement, policy audit traceability and evidence download endpoint. The latest backend CI for the notification worker passed: 64 tests passed, Ruff passed, and PostgreSQL migration graph/upgrade/current-head checks passed. The subsequent audit hash-chain CI passed with 67 tests, Ruff, and PostgreSQL migration checks. The EVC visit lifecycle CI passed with 70 tests, Ruff, and PostgreSQL migration checks.

## Findings and implementation progress
1. Application lifecycle uses a hard-coded allowed-transition graph; transitions require reasons and use backend authorization/conditional update guards.
2. Authentication reloads active user data from the database; role and region checks are centralized but still need route-by-route tests.
3. Policy versions store a key, integer version, source reference, effective dates and active flag.
4. Evidence uploads now reject selected policy versions that are not yet effective or have expired. The upload audit event also snapshots the policy key, version and source reference alongside the policy ID and evidence SHA-256 digest, improving traceability if policy metadata is later reviewed.
5. A regression test verifies that the evidence record and its upload audit event retain the selected policy version details. CI passed for the policy effective-window validation and its tests; CI for the later audit-snapshot change is pending.
6. An authenticated evidence download endpoint now checks application access, constrains the resolved path to the configured evidence storage directory, and returns the original bytes as an attachment. Tests cover successful download and cross-region denial; latest CI is pending.
7. Evidence files are still stored on the local filesystem. Production object storage, malware scanning, OCR provenance and discrepancy-review records remain separate gaps.
8. A durable notification worker has now been added. It periodically scans overdue obligations, creates idempotent in-app outbox records, processes pending records, records attempts and processing timestamps, and applies capped exponential backoff for retryable channel errors. The existing API escalation endpoint remains available. External email/SMS delivery adapters are not implemented; the worker currently supports in-app delivery only. A migration adds retry scheduling and processing fields. Latest CI verified this with 64 passing tests, Ruff passing, and successful PostgreSQL migration checks.
9. EVC now has a scheduled visit lifecycle with region-validated inspector assignment, snapshotted checklists, conditional state transitions, required-result validation, findings, completion timestamps, a report revision counter and audit events. The first completion revision is recorded; editing and maintaining multiple immutable report revisions remains future work.
10. Audit events now have SHA-256 hash-chain fields, a singleton chain-head record, a migration that backfills existing rows, and a platform-admin-only verification endpoint. Tests cover valid verification, tampering detection, and access control. The chain is tamper-evident, not independently immutable; production should export signed checkpoints to separately controlled immutable storage.
11. Regional audit filtering has been moved into the SQL query before ordering and pagination; a regression assertion covers the case where a newer out-of-region event must not hide an in-region event on a small page.

## Phase 0 checklist
- [x] Repository metadata, branch and baseline SHA recorded.
- [x] Initial feature-to-API matrix and source review added.
- [x] Backend CI and frontend CI wired to run on `nithin-pravaah`.
- [x] Regional audit pagination visibility fix and regression assertion committed.
- [x] Policy effective-window validation and tests committed; CI passed for those commits.
- [x] Evidence policy-version audit snapshot and regression test committed; CI passed.
- [x] Authenticated evidence download endpoint and authorization tests committed; CI passed.
- [x] Durable notification worker, retry scheduling migration and regression tests committed; backend CI passed (64 tests, Ruff, PostgreSQL migrations).
- [x] Tamper-evident audit hash chain, backfill migration, verification endpoint and regression tests committed; backend CI passed (67 tests, Ruff, PostgreSQL migrations).
- [x] EVC visit scheduling, assigned inspection, checklist validation, completion workflow, migration and regression tests committed; backend CI passed (70 tests, Ruff, PostgreSQL migrations).
- [ ] Finish reviewing all routes, test assertions, migrations and workflow YAML.
- [ ] Add immutable multi-revision EVC report history before production use.
- [ ] Add external signed checkpoints/immutable audit export before production use.
- [x] Confirm latest CI for notification worker, migration and regression tests.
- [ ] Complete remaining PostgreSQL integration, deployment configuration and environment checks.
- [ ] Mark Phase 0 complete only after remaining verification items are addressed.

Phase 0 remains open. CI success on selected commits is useful evidence, but it does not substitute for the remaining repository, environment and deployment checks.
