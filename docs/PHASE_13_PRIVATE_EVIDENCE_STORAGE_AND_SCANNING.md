# Phase 13 — Private Evidence Storage and Scan Gate

## Implemented on `nithin-pravaah`

- Added an evidence storage adapter with local disk support for development/tests and an S3-compatible implementation for production.
- S3 objects are stored under a configurable prefix, uploaded with server-side AES-256 encryption, and are not exposed through public or signed URLs. The adapter uses the standard AWS credential provider chain.
- Added ClamAV TCP INSTREAM scanning with bounded chunks and a configurable timeout.
- Evidence upload now scans before storage. A detected threat is rejected with HTTP 422; scanner unavailability or an invalid scanner response fails closed with HTTP 503.
- Evidence download reads through the storage adapter and verifies SHA-256 before returning bytes.
- Production settings now require S3-compatible storage, a bucket, enabled scanning, and a configured ClamAV host.
- Added storage path traversal, local storage lifecycle, production configuration, and scan rejection regression tests.
- Documented environment variables and deployment setup in `backend/README.md` and `backend/.env.example`.

## Required deployment setup

1. Configure a private S3 bucket with public access blocked and a least-privilege application identity.
2. Configure `EVIDENCE_STORAGE_BACKEND=s3`, `EVIDENCE_S3_BUCKET`, and any required region/endpoint/prefix.
3. Run ClamAV on a private network, maintain its signature database, and configure `EVIDENCE_MALWARE_SCANNING_ENABLED=true` plus `EVIDENCE_CLAMAV_HOST`.
4. Validate the deployed service can reach both services and test clean, infected, timeout, and storage-failure cases.
5. Implement a retention/deletion worker and quarantine/incident workflow before treating evidence lifecycle controls as complete.

## Limitations and verification

- The current scan gate rejects detected content before persistence but does not retain samples in a quarantine store or provide an incident review queue.
- No real S3 bucket or ClamAV daemon was available for integration verification here.
- Tests and lint have not been run locally in this environment; GitHub CI must be checked before marking the phase verified.
- This phase does not complete the independent immutable audit checkpoint archive or deployment backup/restore checks.
- Release readiness remains **not confirmed** until CI, deployment integration, retention controls, and operational recovery are verified.
- All changes target `nithin-pravaah`; `main` is untouched.
