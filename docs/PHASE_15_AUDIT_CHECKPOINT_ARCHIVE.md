# Phase 15 — Independent Audit Checkpoint Archive

## Implemented

- Added `backend/scripts/archive_audit_checkpoint.py` to create a signed checkpoint from the audit chain state and event count.
- The script writes to a separate S3-compatible bucket using server-side encryption and S3 Object Lock in COMPLIANCE mode with a configurable retention period.
- Production configuration requires a separate archive bucket, distinct from the evidence bucket.
- Added a signature verification regression test and documented archive configuration.

## Operator requirements

Configure `AUDIT_CHECKPOINT_SECRET`, `AUDIT_ARCHIVE_S3_BUCKET`, optional region/endpoint, and `AUDIT_ARCHIVE_RETENTION_DAYS`. The bucket must have versioning and Object Lock enabled before the first write. Use a separately controlled AWS account or role with least privilege, and schedule `python -m scripts.archive_audit_checkpoint` using an approved scheduler. Alert on failed runs and periodically verify signatures and compare archived heads with the live chain.

The default retention interval is a technical default, not a legal mandate. Have the policy owner approve the period and the archive account separation.

## Verification and limitations

The signing function has regression coverage. A real Object Lock bucket and scheduler were not available for integration verification. CI and deployment verification remain required.
