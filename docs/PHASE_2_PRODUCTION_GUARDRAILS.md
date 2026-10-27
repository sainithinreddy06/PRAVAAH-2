# Phase 2 — Production Configuration Guardrails

## Goal
Fail fast at startup when production configuration would weaken authentication, audit-checkpoint signing, or cross-origin boundaries. These checks are configuration guardrails; they do not constitute a deployment or a full security certification.

## Implemented
- Production must use a non-default JWT signing secret with at least 32 characters.
- Production must configure an audit-checkpoint signing secret with at least 32 characters.
- Production rejects wildcard CORS origins; deployers must list explicit trusted origins.
- Added focused configuration tests for the production secret requirements, wildcard CORS rejection, valid explicit origins, and continued development-mode usability.

## Commits
- `06c89d681ee6f3caa8d01f570134e9967c78a086` — enforce production audit signing and CORS settings.
- `784ee13f57541d5dd486e0a81a1f749ed302c2ae` — add production configuration security tests.

## Verification status
- Changes are committed on `nithin-pravaah`.
- The GitHub Actions checks for these commits must be inspected before calling this phase validated.
- Local tests have not been run in this environment.
- Before deployment, set `JWT_SECRET_KEY`, `AUDIT_CHECKPOINT_SECRET`, and explicit `CORS_ORIGINS` in the production environment. Both secrets must be at least 32 characters; use independent, randomly generated values and a secret manager.

## Remaining release gates
- Confirm production environment variables and deployment configuration without exposing secret values.
- Use production-grade object storage with access controls, lifecycle/retention policies, and backups for evidence; local filesystem storage is not sufficient for a multi-instance deployment.
- Integrate malware scanning/quarantine before evidence is trusted or reviewed.
- Export signed audit checkpoints to an independently controlled immutable archive and rehearse verification/recovery.
- Obtain legal/policy-owner approval for deadline rules and effective dates.
- Run the full PostgreSQL-backed CI suite and a staging smoke test before release.
