# Source-level Phase 0 Review — Routes, Models and Control Boundaries

**Branch:** `nithin-pravaah`  
**Review basis:** current branch source files accessed through the repository connector.  
**Note:** static inspection only. No Python/Node commands or database-backed tests were executed during this review.

## Application lifecycle
Source: `backend/app/api/routes/applications.py`, `backend/app/models/application.py`, `backend/app/schemas/application.py`, `backend/tests/test_applications.py`.

- Implemented status graph: draft → submitted → under_review → changes_requested / approved / rejected; changes_requested → submitted; approved/rejected terminal.
- Transitions require a reason and are guarded by backend role checks. The update uses prior status in the SQL predicate to detect a concurrent competing transition.
- Region checks are used on application detail and transitions. Applicant ownership is checked against `submitted_by_user_id`.
- Reviewer roles currently contain `regional_officer` and `platform_admin`; these are product permissions, not a complete AICTE authorization model.
- Gap: transition graph is embedded in route code; there is no separate versioned route/policy configuration model in the source inventory.
- Gap to test: route-specific actor/region/ownership matrix, especially institution_admin and platform_admin semantics. A local check of one endpoint does not prove all endpoints use the same predicate.

## Authentication and authorization dependencies
Source: `backend/app/api/routes/auth.py`, `backend/app/api/deps.py`.

- Login normalizes email using strip/casefold, verifies Argon2 password hash, rejects inactive users, and returns a signed access token. `get_current_user` reloads the user from database and rejects invalid/expired tokens and inactive accounts.
- `require_roles` centralizes role checks; `ensure_region_access` allows platform admins across regions and otherwise requires matching assigned region.
- Gap: production session/token storage, token revocation semantics, brute-force/rate-limit protection and full route/object authorization matrix require explicit verification.

## Policy and evidence
Source: `backend/app/api/routes/compliance.py`, `backend/app/models/policy.py`, `backend/app/models/evidence.py`, `backend/app/schemas/compliance.py`.

- Policy has key, numeric version, title, description, source reference, effective period, active flag and creation timestamp. Creating a version is platform-admin-only and validates effective-until after effective-from.
- Evidence is linked to an application and optionally to one policy; it has filename, storage key, content type, SHA-256 digest, review status/notes, optional valid-until date and created timestamp.
- Upload validates declared MIME type plus file signature, enforces a configured byte limit, generates a random storage key, computes SHA-256 and records an audit event. File bytes are written to local disk before the database commit, with file cleanup on caught transaction error.
- Reviewer decision is restricted to regional officers and platform admins; only pending evidence can be changed to a reviewed state through an atomic conditional update.
- Important limitations: there is no evidence version/replace lineage, private object-storage adapter, malware scanning, authenticated file-download endpoint, extraction/OCR provenance, field discrepancy record, or relationship to a stable requirement entity in the inspected model inventory. A file digest is an integrity identifier, not proof of authenticity. Policy metadata must not be presented as official AICTE guidance without source verification.
- Security follow-up: assess local filesystem crash/transaction consistency and path/permission deployment assumptions; add an explicit storage adapter and reconciliation strategy before production durability claims.

## Obligations and notifications
Source: `backend/app/api/routes/obligations.py`, `backend/app/models/obligation.py`, `backend/app/models/notification.py`, `backend/app/schemas/obligation.py`.

- Obligation fields include optional application/owner, type, title, description, due time, status, policy reference and created timestamp.
- Notification has unique event key, channel, status, attempt counter, payload, error and creation time.
- Current documentation says overdue notification generation is API-triggered, not scheduled, and notification statuses are in-app queue state rather than external delivery confirmation.
- High-priority gap: no inspected persistent scheduler/worker/outbox implementation, retry schedule, lock/lease processing, delivery adapter status callback or dead-letter handling. Current notification schema is a starting record, not proof of reliable delivery.
- Gap: obligation schema does not store source rule/version, original due date, calculated due-date explanation, extension history, completion evidence or closure reviewer. The policy reference is free text, not version-pinned provenance.
- Safe next step: define deadline semantics and data contracts first, then implement durable idempotent event processing and tests rather than simply adding a process-local timer.

## EVC and undertakings
Source: `backend/app/api/routes/evc.py`, `backend/app/models/evc_assessment.py`, `backend/app/models/undertaking.py`, `backend/app/schemas/evc.py`.

- EVC model currently stores an assessment snapshot (evidence counts, open obligations, undertaking count, outcome, notes and assessor/time).
- Undertaking has application linkage, creator, type, statement, status, version, submit/review timestamps, reviewer and notes.
- No separate EVC visit, scheduling, team assignment, checklist response, finding, report version or corrective-finding-to-obligation entity was identified in the initial source-tree inventory. Treat end-to-end visit management as a new capability, not an existing feature.
- Any new visit/finding models should preserve assessment snapshot history and use explicit state transitions and authorization.

## Audit and operations
Source: `backend/app/models/audit_event.py`, `backend/app/api/routes/operations.py`.

- Audit events store actor, entity type/id, action, reason, JSON details and timestamp. This is queryable history, but no previous-event digest, canonical serializer, chain-head synchronization or verification record exists on the inspected model.
- Regional audit query filters events through the referenced domain record; current implementation loads a bounded page before applying its regional visibility pass. This should be reviewed for correct pagination semantics: a page may include fewer than the requested limit after filtering. Unrecognized entity types are omitted from regional results.
- Metrics currently use aggregate SQL counts and region scoping for region officers; this is preferable to deriving KPIs from a capped application list. Verify access and queries with separate role fixtures.
- Do not call the audit chain immutable or tamper-evident until a threat model, transactional chain implementation and tampering tests exist.

## Phase 0 acceptance follow-up
- [x] Directly reviewed core application/auth/policy/evidence/obligation/notification/EVC/undertaking/audit source and schemas.
- [x] Recorded the implementation findings and high-priority gaps.
- [ ] Finish full route/test/migration/CI inspection and test mapping.
- [ ] Check actual workflow runs for backend CI as well as frontend CI.
- [ ] Run the source-equivalent commands in a real checkout/CI and PostgreSQL test environment.
- [ ] Finalize phase-0 sign-off only after environment/deployment/database mapping and current checks are established.

## Source-first implementation order recommended by this inspection
1. Complete regression coverage and fix any baseline failures before schema changes.
2. Add requirement entities/links with pinned policy-version provenance and compatibility-safe migration.
3. Add evidence lineage/private storage boundary and deterministic evidence assessment records.
4. Implement EVC visits/findings and link findings to obligations.
5. Harden obligation semantics, then durable alert/outbox worker and delivery-state reporting.
6. Implement verified audit integrity chain and downloadable case manifest.
7. Add explainable operational queues and policy change-impact preview.
