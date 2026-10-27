# Tamper-evident audit chain

## What is recorded

Each audit event stores a `previous_hash` and an `event_hash`. The hash is SHA-256 over a canonical JSON representation of the event action, actor ID, UTC timestamp, details, entity type/ID, reason and previous hash. A singleton `audit_chain_state` row stores the latest chain head. New ORM-created audit events are chained during SQLAlchemy flush while the chain-head row is locked in PostgreSQL.

The migration `20261028_0004` backfills existing audit events in ID order, adds the chain fields, and initializes the chain-head record. Apply all migrations before running the API.

## Verify the chain

Use a platform-admin access token:

`GET /api/v1/audit/verify-chain`

A valid result includes `verified: true`, the event count, `first_invalid_event_id: null`, and `head_matches: true`. If an event is altered or the chain is broken, the endpoint reports `verified: false` and the first invalid event ID when found. This endpoint is restricted to platform administrators because it verifies the global chain.

## Security boundary

The hash chain detects accidental or unauthorized changes that do not also rebuild the entire chain and update its head. It is tamper-evident, not independently immutable: a database administrator with write access to both audit rows and the chain-head table could rewrite the chain. For stronger production assurance, export signed checkpoints to separately controlled immutable storage and restrict database write permissions.

## Tests

Backend tests cover a valid chain, detection of altered event details, and role-based access control. PostgreSQL migration checks verify the new migration is the current head. CI is the available validation path in this environment; local pre-push execution could not be performed because GitHub could not be resolved from the local shell.

## Signed external checkpoints

Set the environment variable `AUDIT_CHECKPOINT_SECRET` to a high-entropy secret of at least 32 characters. The platform-admin-only endpoint `GET /api/v1/audit/checkpoint` then returns the event count, current head hash, generation timestamp and HMAC-SHA256 signature. The signature covers canonical JSON containing the count, timestamp and head hash.

Archive each checkpoint outside the application database in separately controlled immutable storage. Compare later chain heads against those archived signed checkpoints to detect a full database rewrite. The API generates the signed checkpoint but does not itself connect to or guarantee retention in an external immutable store. Without the secret configured, the endpoint returns HTTP 503.
