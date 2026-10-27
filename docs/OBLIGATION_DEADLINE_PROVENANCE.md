# Obligation deadline provenance

## Supported deadline rules

An obligation can use a manually supplied due date or a policy-pinned `fixed_days_from_creation` rule.

- Manual due dates must include a timezone. The API normalizes them to UTC.
- `fixed_days_from_creation` requires an existing, active, currently effective policy version and `deadline_days` from 1 to 3650. The client must not also supply `due_at`.
- Calculated deadlines use the obligation creation timestamp as the anchor and add the configured number of calendar days.
- The obligation stores `policy_id` plus policy key/version snapshots, the rule, offset, calculation timestamp, due date and a JSON explanation of the calculation.
- Changing `due_at` through the update API explicitly switches the deadline to `manual` and records the previous rule, previous due date, actor, timestamp and new due date in the calculation metadata and audit event.

## API example

`POST /api/v1/obligations`

```json
{
  "application_id": 1,
  "owner_user_id": 1,
  "obligation_type": "document_submission",
  "title": "Submit required document",
  "policy_id": 1,
  "deadline_rule": "fixed_days_from_creation",
  "deadline_days": 14
}
```

The response exposes `policy_key_snapshot`, `policy_version_snapshot`, `deadline_rule`, `deadline_days`, `deadline_calculation_json`, and `due_at_calculated_at` so the deadline decision can be explained later.

## Important limitation

This phase records and executes an explicit fixed-days rule pinned to a policy version; it does not infer statutory deadlines from policy text or claim that a policy itself authorizes a particular duration. The configured duration must be reviewed and supplied by an authorized operator. Existing obligations remain on the `manual` rule unless updated or recreated. The migration adds provenance fields without rewriting existing due dates.
