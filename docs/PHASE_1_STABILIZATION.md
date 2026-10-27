# Phase 1 — Stabilization and Authorization Regression Coverage

## Scope
Phase 1 strengthens regression coverage around high-risk API boundaries without changing the application’s public behavior. All changes are isolated to `nithin-pravaah`.

## Added in this phase
- EVC visit authorization regressions:
  - only the assigned inspector can start a visit;
  - only the assigned inspector can complete a visit or amend its report;
  - cross-region officers cannot read an application’s EVC visit list;
  - inactive inspectors cannot be assigned;
  - applicants and other non-reviewers cannot schedule visits.
- Evidence upload boundary regressions:
  - empty files are rejected without creating an evidence record or stored file;
  - files larger than the configured upload limit are rejected without persistence;
  - uploads are blocked after an application has been submitted;
  - upload requests require authentication.
- Test settings are isolated with pytest monkeypatching to avoid leaking upload configuration into other tests.

## Commits
- `dbff90e1f0e46561d78b9b6358a2b5d65d7c7523` — EVC authorization regression coverage.
- `3239e849d03a87ae5db094a860b4179c12e83cb5` — evidence upload boundary regression tests.
- `fdba9ec0e89c2a861ce9d2a5a480b8ed97d584b0` — isolate evidence upload settings in test fixtures.

## Verification status
- Changes are committed on `nithin-pravaah`.
- GitHub Actions result for these new commits has not yet been confirmed in this status note.
- Local test execution has not been performed in this environment; do not infer passing tests from the fact that test files were committed.
- CI should verify pytest, Ruff, and PostgreSQL migrations before these changes are considered validated.

## Remaining work
- Expand role/region tests across obligation reads, updates, notifications, evidence review, and policy operations.
- Add a single end-to-end regression journey linking application submission, evidence review, obligation tracking, and EVC assessment.
- Review transactional cleanup and concurrent state changes for evidence review and obligation updates.
- Keep production storage, malware scanning, external audit checkpoint archival, and legal deadline validation as separate release blockers; tests do not replace those operational controls.
