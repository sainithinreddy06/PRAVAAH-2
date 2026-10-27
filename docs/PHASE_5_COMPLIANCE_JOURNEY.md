# Phase 5 — Cross-Module Compliance Journey

## Goal
Add a backend regression journey that exercises the core compliance lifecycle across evidence, obligations, undertakings, and EVC assessment.

## Implemented
The new integration test drives these real API routes in sequence using isolated test fixtures:
1. Applicant uploads evidence to a draft application.
2. A regional officer accepts the evidence.
3. The officer creates an obligation and marks it fulfilled.
4. The applicant creates and submits an undertaking.
5. The regional officer accepts the undertaking.
6. An EVC assessment evaluates the combined state and must report `ready_for_officer_review`, with accepted evidence, no open obligations, and no unaccepted undertakings.

The evidence directory is redirected to pytest's temporary directory so the test does not write user evidence into the repository workspace.

## Commit
- `44c068c8b66ff5c885656e80af45ccd0bc4e1326` — cover end-to-end compliance readiness journey.

## Verification status
- The test has been committed to `nithin-pravaah`.
- Local execution is unavailable in this environment; do not treat the journey as passing until CI confirms it.
- This is an API-level integration test, not a deployed-browser end-to-end test.

## Remaining gaps
- Run the PostgreSQL-backed suite in CI.
- Add a staging browser journey using provisioned non-production accounts.
- Validate transaction rollback and concurrent updates against PostgreSQL.
- Complete the evidence storage/scanning, external audit archive, and policy/legal release gates.
