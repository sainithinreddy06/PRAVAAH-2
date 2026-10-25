# PRAVAAH-2 Integration Coverage Matrix

Audit basis: clean `main` at `10ede68` was audited on 25 October 2026, then the frontend integration work in this checkout was implemented and verified. This matrix describes the current local working tree; it does not describe a merged or deployed release.

## Workflow coverage

| Workflow | UI and API integration | Verification and limits |
|---|---|---|
| Public site and legal pages | `/`, `/privacy`, `/terms`; public product overview and review-draft legal pages | Browser was used for the authenticated workspace. Legal copy still needs owner, retention, provider, and contact details before launch. |
| Sign-in / current user | `AuthGate` calls `/auth/login` and `/auth/me`; bearer token stays in memory | Browser login and current-user calls succeeded against the local API. Refresh requires signing in again. |
| Overview | `/overview` shows the authenticated user's API-returned application records, response-scoped counts, refresh/error/empty states | Browser flow reached this page during app use. Counts are capped by API response and are not global totals. |
| Applications | `/applications` supports list, status filtering, draft creation and backend-validated transitions; `/applications/{id}` shows detail and status | Browser created an application and read its detail. Existing backend suite covers lifecycle and authorization. |
| Evidence | Detail view supports PDF/JPEG/PNG upload, optional policy link, metadata list, and officer review action | UI/API integrated; no file-upload browser journey performed. Server validation applies; local disk is not production storage and signature checks are not malware scanning. |
| Policies | `/policies` lists policy metadata; authorized users can create versions using API-supported fields | UI/API integrated; no policy mutation browser journey performed. Metadata is not verified official guidance. |
| Obligations and notifications | `/compliance` supports obligation listing/filtering, create/update flows, overdue escalation trigger, and current-user inbox | UI/API integrated; browser journey not executed. Escalation is API-triggered, not scheduled, and pending notifications are not delivered messages. |
| Undertakings | Application detail supports draft creation, submission, and reviewer decision | Browser created and read back a draft through the UI and API. The workflow does not provide a digital signature. |
| EVC | Application detail lists assessment snapshots and allows authorized reviewers to create a snapshot | UI/API integrated; browser journey not executed. Readiness indicators are workflow aids, not official compliance verdicts. |
| Audit and metrics | `/operations` shows scoped metrics and filtered audit events for authorized officers/admins | UI/API integrated; browser journey not executed. Audit events are not tamper-evident or immutable. |
| Recommendations | Reviewer view on application detail displays rule-based factors and suggested actions | API and detail UI integrated; browser journey not executed. Not a validated predictive model or official decision. |
| Institution/officer administration | Routes explain that there is no self-service management API; backend has interactive operator provisioning scripts | Deliberately not exposed as an unapproved management surface. A real management API requires explicit scope, authorization model, and tests. |
| Settings | Route explains that no persistent settings API exists | No false local persistence UI is presented. |
| Configurable workflow studio / global evidence library | No matching configuration API/global evidence endpoint exists | `/workflows` redirects to applications and `/evidence` redirects to application-scoped records. |

## Authorization and data semantics

Frontend visibility is a usability aid only; backend authorization remains authoritative. Backend tests cover application ownership, regional access, role-specific mutations, and platform-admin scope. Before deployment, verify the same boundaries through browser-to-API tests using separate applicant, officer, and administrator accounts.

Overview status counts reflect only the returned (limited) list. Evidence stores local files by default; use private durable storage, encryption, malware scanning, retention controls, and signed access before production. EVC and recommendations are aids. Notification escalation has no scheduler or external delivery worker. Audit records are not established as immutable.

## Verification run for this checkout

- `npm run typecheck`: passed.
- `npm run build`: passed after the undertaking form fix.
- `npm run lint`: passed with one existing Fast Refresh warning in `src/components/AuthGate.tsx`.
- Backend pytest: **57 passed**, using the repository's SQLite test fixtures; two third-party deprecation warnings.
- `ruff check app tests migrations`: passed.
- `alembic history`: passed and showed `20261025_0002` as head.
- Browser-to-API: login/current-user, application creation/list/detail, and undertaking draft creation/readback passed against a disposable local SQLite database.
- PostgreSQL-backed migration/application test: **not run**. The local PostgreSQL service rejected the documented Compose development credential, and Docker was unavailable, so no database was modified. Existing suite results do not establish PostgreSQL runtime compatibility.
- Browser authorization matrix, evidence upload/review, policy mutation, compliance operations, EVC, metrics, and recommendations: not exercised in browser.

## Follow-up verification before release

1. Run migrations and backend tests on a known disposable PostgreSQL 16 instance; verify migration apply and downgrade/reapply behavior.
2. Run browser journeys with separate applicant, regional officer, and platform admin accounts, including expected 403/404 boundaries.
3. Exercise evidence upload/review and each operational mutation through browser-to-API.
4. Validate production authentication/session strategy, CORS, storage, notification delivery/scheduling, audit immutability, monitoring, backups, and legal notices.
