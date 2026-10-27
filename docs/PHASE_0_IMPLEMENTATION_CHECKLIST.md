# PRAVAAH-2 Phase 0 Implementation Checklist

Branch: `nithin-pravaah`  
Baseline: `2635d99cb9e04ba2b151e7471df22a22ccb0a332`  
Latest Phase 0 documentation commit: `be02213d51dbcff7573b011eb1a93c44b454bd90`

## Phase 0 — Repository baseline and product decisions

### 0.1 Freeze baseline
- [x] Record default branch and baseline commit SHA.
- [x] Record repository visibility/access and known existing branches.
- [x] Confirm target working branch exists from the baseline SHA.
- [ ] Inspect local working-tree state and remotes from a real checkout.
- [x] Inspect top-level tree, app source areas, migrations, tests, CI and docs.
- [ ] Parse open PRs and latest frontend/backend CI results in detail.
- [ ] Confirm deployment-to-repository and deployment-to-database mapping without revealing secrets.

### 0.2 Inventory current implementation
- [x] Initial code/documentation inventory recorded in `docs/PHASE_0_BASELINE_AND_GAP_MATRIX.md`.
- [x] Current documented capabilities separated from missing/partial items.
- [ ] Directly inspect all authorization dependencies, role/scope predicates, transition rules, evidence lifecycle, policy/version schema, obligation/notification semantics and audit event creation.
- [ ] Confirm every documented route/button against current route + test implementation.
- [ ] Identify any behavior that is UI-only or lacks integration test evidence.

### 0.3 Feature-to-API matrix
- [x] Initial matrix added to `docs/PHASE_0_BASELINE_AND_GAP_MATRIX.md`.
- [ ] Add exact source paths and route names after detailed route/model/schema inspection.
- [ ] Link each feature to automated test names.
- [ ] Assign work owner and batch/status as work proceeds.

### 0.4 End-to-end demo scenario
- [ ] Create synthetic institution/users with distinct least-privilege roles.
- [ ] Submit an application and pin one policy version to a requirement.
- [ ] Upload evidence and surface a deterministic missing/expired/inconsistent condition.
- [ ] Request correction with recorded reason and deadline.
- [ ] Trace alert creation, queue/process/delivery status and audit history.
- [ ] Schedule/assign EVC visit, record a finding, link it to a corrective obligation.
- [ ] Submit replacement evidence and verify authorized closure.
- [ ] Generate a report manifest and verify evidence/audit integrity.
- [ ] Label all sample data synthetic and record actual pass/fail results.

## Execution record
- 2026-10-27: Branch created from `main` SHA `2635d99cb9e04ba2b151e7471df22a22ccb0a332`.
- 2026-10-27: Added `docs/PHASE_0_BASELINE_AND_GAP_MATRIX.md`.
- 2026-10-27: Queried open PR endpoint; no open pull requests returned.
- 2026-10-27: Latest listed GitHub Actions runs include successful Frontend CI on `main` at commit `fe687fb` and earlier failures on older commits; these are not tests for the current HEAD or new branch.
- 2026-10-27: Runtime commands have not been run in this session because the available GitHub connector supports repository reads and Git object/content writes, not an interactive checkout/shell. Do not represent runtime validation as complete.
