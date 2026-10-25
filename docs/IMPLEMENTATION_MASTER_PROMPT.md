# PRAVAAH-2 — Master Implementation Prompt

Use this prompt with a coding agent that has access to the repository. The goal is to complete and harden the existing PRAVAAH-2 prototype incrementally without replacing working code or damaging unrelated work.

## Repository and operating rules

Repository: https://github.com/sainithinreddy06/PRAVAAH-2
Target branch: `main`

Before making changes:

1. Inspect the current branch, working-tree status, recent commits, repository tree, and project instructions.
2. Read the root README, backend README, presentation brief, implementation checklist, integration-coverage matrix, and ZIP review.
3. If ECC is installed, inspect the available ECC setup and use the `codebase-onboarding` skill if available. Report the exact skill/agent actually used; do not claim to have run an agent or local CLI if you did not.
4. Identify existing functionality and tests before editing. Preserve unrelated changes, user work, remotes, branches, environment files, and existing backend contracts.
5. Do not overwrite the FastAPI/PostgreSQL architecture with the AI Studio ZIP's Express/in-memory demo server. Do not import its hard-coded demo identities/passwords, unsupported official-looking claims, duplicate temporary media, or large unused video assets.
6. Do not use mock data to make a page appear functional. If an API is missing, implement a properly authorized backend endpoint, migration/schema, frontend integration, and tests—or mark the feature clearly as unavailable. Never pretend a click worked when it did not.
7. Keep all changes scoped and reviewable. Do not delete or reformat unrelated files. Never expose secrets, credentials, personal data, or environment values in code, logs, docs, commits, or screenshots.
8. Do not commit, push, merge, deploy, or change production resources unless the user explicitly authorizes that action. When authorized, summarize the exact paths and commit SHA afterward.

## Product goal

Build a coherent approval workflow and compliance operations prototype for applicants, institution coordinators/admins, scrutiny officers, regional officers, EVC coordinators, council administrators, and platform administrators. This is a prototype and must not be represented as an official AICTE service, an official approval decision engine, or verified regulatory guidance.

The application must make it easy to understand:
- what work is waiting;
- which application or institution needs attention;
- what evidence and obligations are outstanding;
- who is authorized to take the next action;
- why a workflow state or recommendation was produced;
- what changed and who changed it;
- which functions are fully implemented versus unavailable or awaiting verification.

## Required application areas

### 1. Public landing page
- Explain the purpose, intended users, workflow stages, and major capabilities.
- Provide clear sign-in and help/contact paths.
- Distinguish workflow support from official regulatory advice or a formal approval decision.
- Avoid fabricated institution records, fake verification badges, unverified statutory claims, and invented government endorsements.
- Ensure links, calls to action, keyboard navigation, responsive layout, and accessibility states work.

### 2. Authentication and authorization
- Use the existing FastAPI authentication implementation and backend-issued tokens.
- Support sign-in, current-user/session state, sign-out, expired-token handling, and clear error messages.
- Do not add public signup unless explicitly approved and designed securely.
- Never ship hard-coded sample users/passwords, client-side role switching, or role-based access that exists only in the UI.
- Enforce access checks on the server for every protected read and write. Test unauthenticated, unauthorized-role, cross-institution, and cross-region attempts.
- Keep authorization decisions in backend policy/dependency code. The frontend may hide unavailable actions but must not be the security boundary.

### 3. Overview dashboard
- Load real counts and recent records from authorized API responses.
- Show meaningful loading, empty, error, and retry states.
- Label the scope and limitations of counts; do not imply a returned page limit is a global total.
- Link dashboard items to the relevant application or queue.
- Do not invent metrics when the API returns none.

### 4. Application list and scrutiny queue
- List applications with server-backed status/search/filter/pagination where supported.
- Show reference, institution, status, workflow stage, region/scope when authorized, and last-updated time.
- Support creating drafts and supported status transitions with a reason when required.
- Show transition availability based on the state machine and role, while relying on the backend to enforce it.
- Include loading/empty/error states and prevent duplicate submissions.

### 5. Application detail
- Provide a single authoritative detail view for application information, timeline/audit events, evidence, undertakings, EVC snapshots, and explainable recommendations.
- Clearly distinguish stored facts, user-entered content, derived readiness indicators, and recommendations.
- Validate inputs, confirm consequential actions, show server errors, and refresh data after successful mutations.
- Never show another institution's or region's records to unauthorized users.

### 6. Institution management
- First inspect whether a persistent, authorized institution-management API exists. Do not fabricate one in the frontend.
- If in scope, implement list/detail/create/update endpoints, schemas, database constraints/migrations, audit events, role and region restrictions, tests, and a functional UI.
- Prevent duplicate institution codes and invalid region assignments.
- If not yet implemented, show a clear unavailable state and document the blocker.

### 7. Officer, user, and role management
- Do not permit users to grant themselves elevated roles.
- Implement any user-management API only with explicit role/permission rules, secure provisioning, input validation, audit logging, and tests.
- Support active/inactive status and region/institution scope only where the backend model supports them.
- Do not expose passwords, token secrets, or sensitive account metadata.
- If the API is absent, document it rather than presenting nonfunctional controls.

### 8. Evidence library and evidence review
- Keep evidence tied to an authorized application and preserve the existing upload validation and size limits.
- Show filename, type, size, upload time, uploader, review status, and policy association when available.
- Provide clear upload progress, success, rejection, and retry states.
- Keep private evidence inaccessible through public URLs. Do not add uncontrolled downloads.
- Document that file-signature/type checks are not malware scanning and local storage is not production-grade.
- Any future download endpoint must enforce authorization and use controlled access.
- Add tests for invalid types, oversized files, unauthorized access, and review actions.

### 9. Policy register
- Treat policy records as metadata unless their official source and validity have been verified.
- Display title, identifier/version, effective date, status, source, and last-updated fields only when present in the API.
- Support authorized create/version operations only if implemented by the backend.
- Never invent legal requirements, effective dates, official citations, or claims of compliance.
- Add source and verification status fields if policy governance is expanded.

### 10. Compliance obligations
- Display obligations, due dates, status, application/institution relationship, and responsible party from real API data.
- Support authorized create/update/status changes with validation and audit records.
- Make overdue items visually clear without implying that an unrun background job has executed.
- Document that overdue escalation is currently API-triggered unless a real scheduler/worker is implemented.
- Test date boundaries, authorization, duplicate requests, and status transitions.

### 11. Notification centre
- Display the signed-in user's notifications from the API.
- Clearly distinguish in-app notifications from email/SMS delivery.
- If read/dismiss actions are added, implement and test the corresponding backend behavior.
- Do not claim delivery, retry, or scheduling capabilities unless implemented.

### 12. Undertakings
- Support the existing draft, submit, and review flow.
- Display version/content, status, actor, timestamps, and review reason where returned by the API.
- Confirm consequential review actions and retain audit history.
- Do not represent an undertaking as a digital signature or legally verified instrument unless a compliant signing system is separately implemented.

### 13. EVC readiness
- Display assessment snapshots, input evidence, missing items, rationale, and timestamps from the API.
- Explain that readiness is a workflow indicator, not an official EVC verdict or approval.
- Do not use fabricated scores or claim the output is an official determination.
- Test the API and role/scope restrictions before connecting UI controls.

### 14. Audit and activity
- Show authorized audit events with actor, action, entity, reason, time, and relevant details.
- Apply server-side role, region, and institution filters.
- Do not call the log immutable or tamper-evident unless a verified append-only integrity design exists.
- Do not let the UI edit or delete audit history.

### 15. Operational metrics
- Use real API aggregates and clearly label their scope and time window.
- Handle empty, partial, and unavailable data.
- Do not create plausible-looking fake counts or imply global totals when only scoped results are returned.
- Add backend tests for aggregation and authorization.

### 16. Explainable recommendations
- Display the recommendation, rule/rationale, evidence or inputs considered, and limitations.
- Keep the current rules-based approach explicit; do not label it machine learning or predictive AI.
- Recommendations are advisory and must not automatically approve/reject an application.
- Test rule behavior, missing inputs, and authorization.

### 17. Settings and help
- Implement only settings that persist through a real backend or established configuration mechanism.
- Do not display save buttons for settings that cannot be saved.
- Provide accessible help text, error guidance, and contact details only when verified and configured.
- Keep privacy and terms pages clearly marked as drafts until reviewed and completed.

### 18. Navigation and shared UX
- Make all navigation destinations intentional and working.
- Use consistent status labels, date/time formatting, form validation, feedback banners, confirmation dialogs, and accessible controls.
- Ensure responsive behavior, keyboard access, visible focus, semantic headings, and sufficient contrast.
- Avoid dead buttons, placeholder links, unexplained disabled controls, and duplicate sources of truth.
- Respect reduced-motion preferences and prevent layout overflow on small screens.

## Backend and data requirements

- Keep FastAPI, SQLAlchemy, Alembic, PostgreSQL, and the current API namespace unless a deliberate migration is separately approved.
- Keep Pydantic schemas and database models aligned; create reviewed Alembic migrations for schema changes.
- Use transactions and database constraints for integrity.
- Validate all input server-side; return consistent HTTP status codes and useful non-sensitive error details.
- Keep secrets in environment/configuration, never in source control.
- Maintain password hashing, token signing, CORS restrictions, and role/region/institution checks.
- Protect upload paths, validate file signatures and size, and avoid path traversal.
- Use timezone-aware timestamps consistently.
- Add pagination for potentially large result sets.
- Avoid N+1 query patterns and unsafe SQL.
- Add a real scheduled worker only if required; document deployment, retry, idempotency, and observability behavior.
- Keep local development defaults separate from production configuration.

## Testing and verification

For each change:
1. Add or update focused unit/API tests.
2. Test happy paths, invalid input, missing authentication, insufficient roles, and cross-scope access.
3. Run frontend typecheck, lint, and production build.
4. Run backend pytest, Ruff, and Alembic history checks.
5. Run migration/integration tests against PostgreSQL where available; SQLite-only results do not prove PostgreSQL compatibility.
6. Verify key user journeys in a browser when a browser environment is available.
7. Record exact commands and outcomes. Separate checks that passed from checks not run.
8. Never claim complete E2E, production, legal, or security verification without evidence.

Suggested checks from the repository root:

```bash
npm run typecheck
npm run lint
npm run build
```

From `backend/` with the project virtual environment active:

```bash
pytest
ruff check app tests migrations
alembic history
```

Use Docker Compose and a disposable PostgreSQL database for integration verification where Docker is available. Do not destroy existing local data without explicit confirmation.

## Implementation order

1. Inspect current code and document a baseline; preserve all user work.
2. Reconcile API contracts, authentication, roles, and scope checks.
3. Fix correctness, security, migrations, and tests before adding new UI.
4. Complete application list/detail and wire existing evidence, obligations, undertakings, EVC, audit, and recommendations to real APIs.
5. Complete the dashboard and operational pages with truthful empty/error states.
6. Implement institution/officer administration only after agreeing on permissions and API/data models.
7. Polish public site, accessibility, responsive layout, privacy/terms drafts, and help.
8. Run all available checks, browser journeys, and PostgreSQL verification.
9. Update root README, backend README, integration coverage matrix, implementation checklist, and release notes to reflect actual behavior.
10. Report changed paths, migration impact, tests, known gaps, and any actions not performed.

## Definition of done

- Existing FastAPI/PostgreSQL architecture and unrelated files are preserved.
- No fake records, demo passwords, client-side role switching, or unsupported official/regulatory claims are introduced.
- Every visible action works, is correctly disabled with an explanation, or is explicitly marked unavailable.
- Backend authorization is tested for both allowed and denied paths.
- Database changes have migrations and tests.
- Frontend and backend checks have documented outcomes.
- README and coverage documentation match the implementation.
- The final report separates verified behavior, inferred behavior, and outstanding work.
- No commit, push, merge, or deployment occurs without explicit authorization.
