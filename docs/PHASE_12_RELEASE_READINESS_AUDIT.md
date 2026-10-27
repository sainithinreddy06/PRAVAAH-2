# Phase 12 — Release Readiness Audit

## Implemented

Added a regression test in `backend/tests/test_compliance.py` that injects an audit insert failure during evidence upload and checks that the uploaded file is removed and no evidence metadata row remains. This covers cleanup when the database transaction fails; it is not a substitute for a passing CI run.

## Release gates found in source review

### Evidence storage
- Evidence is currently written to `settings.evidence_storage_dir` on the local filesystem.
- Upload validates file size, declared MIME type and a leading signature; downloads verify SHA-256 and enforce application/region access.
- The reviewed route does not implement a private object-storage adapter, malware scanning/quarantine, or a retention/deletion worker.
- Production release should wait until durable private storage, malware scanning with fail-closed quarantine, and retention/deletion controls are implemented and tested.

### Audit durability
- Audit events are hash-chained and checkpoints can be signed when configured.
- A database-only chain does not protect against an administrator rewriting both the event history and chain state. Configure independently controlled immutable checkpoint archival and monitor export/verification.

### Configuration and policy
- Production configuration validates JWT/checkpoint secrets and rejects wildcard CORS.
- Verify deployment origins, secret rotation, backups, restore drills, alerting and access logging.
- Deadline rules and policy references require approval from the responsible policy owner; example records must not be presented as official requirements.

## Verification status

- Source review only; no local test suite or deployment was executed here.
- CI status for the new test remains unconfirmed.
- Release status remains **not ready** until CI is inspected and the production gates above are implemented and validated.
- Changes target `nithin-pravaah`; `main` remains untouched.
