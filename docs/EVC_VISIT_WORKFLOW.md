# EVC visit workflow

## Lifecycle

An EVC visit moves through `scheduled` → `in_progress` → `completed`. Transitions use conditional database updates so two concurrent requests cannot both advance the same state. Completed visits cannot be completed a second time.

## Schedule a visit

`POST /api/v1/evc/visits` (regional officer or platform admin)

Required fields:
- `application_id`
- `assigned_to_user_id`
- timezone-aware future `scheduled_at`
- `checklist_items`: 1–50 items, each with a unique `item_id`, label and optional `required` flag

The assigned inspector must be active and belong to the application region, unless the assignee is a platform administrator. Checklist definitions are snapshotted into the visit record.

## Inspect and complete

- `GET /api/v1/applications/{application_id}/evc-visits` lists visits the caller may access.
- `POST /api/v1/evc/visits/{visit_id}/start` starts a scheduled visit. The assigned inspector or platform admin can start it.
- `POST /api/v1/evc/visits/{visit_id}/complete` submits findings and checklist results. Required checklist items must have a result; required items cannot be marked `not_applicable`; unknown or duplicate result IDs are rejected.

Completion stores checklist results and findings, sets `completed_at`, increments `report_revision`, and writes a tamper-evident audit event. The current implementation records the first completed report revision; editing and versioning subsequent report revisions is not yet supported.

## Migration and verification

Apply migrations before running the API:

`cd backend; alembic upgrade head`

CI validates the PostgreSQL migration graph and runs backend tests and Ruff. In the current execution environment, local pre-push execution was unavailable because the shell could not resolve GitHub; post-push GitHub Actions is the verified test evidence.