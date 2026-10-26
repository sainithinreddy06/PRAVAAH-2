# PRAVAAH-2 — SIH26262/FDR-Final Integration Prompt

Use this prompt in Codex/Antigravity/Claude Code with the local working directory for:
https://github.com/sainithinreddy06/PRAVAAH-2

Primary product scope: SIH 2026 problem statement SIH26262 — Integrated AICTE Approval Workflow Automation, Compliance Monitoring and Alert Management System.
Primary reference repository: https://github.com/Jaybisen08/FDR-Final
Additional research references:
- https://github.com/Tharun-Kumaran/SIH26262
- https://github.com/kartikjograna/SIH26262
- https://github.com/saran612/SIH26262
- https://github.com/reyyishreyas/sih26262
- https://github.com/anubhavkashyap12354-maker/sih26262-aicte-approval-monitor
- https://github.com/geetanshusingh911-git/sih26262-aicte-approval-monitor
- https://github.com/MahatvaGoell/aicte-approval-compliance-platform
- https://github.com/Gayathiri05-Cs/AICTE-Smart-Approval-Compliance-Management-System
- https://github.com/abhass450-code/ApproveDesk
- https://github.com/vidhusanv17/pravah-approval-workflow
- https://github.com/Aditya948351/SOUL_NETRA_1
- https://github.com/fapieex/sih.2

## Critical mission
Deep-audit the existing PRAVAAH-2 repository first. Preserve its FastAPI + SQLAlchemy + Alembic + PostgreSQL backend and existing React + TypeScript + Vite frontend. Integrate valuable, SIH26262-relevant workflow and interface capabilities inspired by FDR-Final and the research references, but DO NOT copy FDR-specific fixed-deposit workflows such as FDR issuance, bank core-system verification, deposit maturity, statutory FDR release, or bank lien discharge into the product unless there is a confirmed requirement. The FDR-Final source is primarily for UX patterns, role-specific workspaces, review queues, evidence comparison, reminders, reporting and audit screens. Its own code contains prototype/demo weaknesses; do not copy its hard-coded demo password, in-memory persistence, mock records, or unsupported official claims.

Operate in strict reliability mode. Work locally; preserve all user changes, branches, remotes, untracked files, secrets and environment settings. Do not overwrite, reset, clean, delete, rebase, commit, push, merge or deploy without explicit authorization. Do not claim a test ran unless it did. Do not stop after producing a plan: implement safe in-scope work, test it, document what remains.

## Phase 0 — Baseline and evidence ledger
1. Inspect git status, current branch, recent history, remotes, untracked/uncommitted changes, repository instructions, and complete source tree. Do not output credential values.
2. Read README.md, backend/README.md, docs/IMPLEMENTATION_MASTER_PROMPT.md, docs/implementation-checklist.md, docs/integration-coverage-matrix.md, docs/zip-review-2026-10-25.md, docs/PRESENTATION_README.md, all relevant models/schemas/routes/tests and the latest migrations.
3. Inspect the referenced public repos/readmes/source available from GitHub. Record per candidate: URL, exact file/route examined, idea observed, status (implemented in reference / documented only / not verified), SIH26262 relevance and whether it fits PRAVAAH-2. Never infer a feature only from a repository name.
4. Record a baseline of frontend typecheck/lint/build, backend tests/Ruff/Alembic checks, and PostgreSQL/docker availability where possible. Capture exact commands and results without exposing secrets.
5. Create or update an evidence-backed gap matrix and phased implementation checklist. Separate confirmed code behavior, documentation-only claims, inferred design and unresolved questions.

## Existing PRAVAAH-2 facts to preserve
The current repository describes and implements a prototype containing:
- Public landing page, review-draft privacy and terms pages
- Email/password login and current-user lookup, token held in browser memory; no self-registration or default account
- Application draft/list/detail and backend-validated transitions
- Application-scoped PDF/JPEG/PNG evidence upload, metadata listing, optional policy association, officer review
- Policy metadata and version creation where API role allows
- Obligations CRUD/status updates, manual overdue escalation API and in-app notification inbox
- Undertakings draft/submit/reviewer decisions
- EVC readiness assessment snapshots
- Audit queries and operational metrics scoped by role/region
- Rules-based explainable recommendations
- FastAPI, SQLAlchemy, Alembic, PostgreSQL, Docker Compose, React/TypeScript/Vite
Known limitations in docs include: no persistent notification delivery/scheduler; local evidence storage rather than production object storage; audit not tamper-evident/immutable; EVC/recommendation are aids only; no user-facing institution/officer administration API; no persistent settings API; PostgreSQL-backed and browser role/region checks remain to be verified.
Do not misrepresent these as already fixed. Reconfirm them in the live tree before editing.

## Product thesis
Make every application a traceable operational case: its permitted route, responsible next actor, stage history, findings, evidence versions, policy basis, obligations, deadline calculation, alert/escalation history, and authorised close-out should be visible in one coherent case workspace. Judges should be able to trace one case end-to-end instead of seeing disconnected dashboards.

Every key queue row must answer: What is pending? Who owns it? Why is it pending? What is due and when? What is the due-date basis? What evidence is missing/unverified? What action is allowed for this user? What will happen next?

## Combined target feature set

### A. Roles, scopes and workspace structure
Use PRAVAAH-2's backend access model as source of truth; do not transplant FDR-Final's client-side role switcher.
- Institutional applicant/representative: own institution's drafts, submissions, document/evidence checklist, correction response, obligations, upcoming due dates and status timeline.
- Scrutiny officer: assigned work queue, evidence viewer, finding checklist, reasoned request-for-correction, field verification where implemented.
- Regional officer: scoped regional workload, routing/assignment within permitted powers, stage ageing, due/overdue obligations, authorized review/return actions.
- EVC coordinator/member: readiness, appointment/work item, assigned visit assessment, findings and report status. Do not claim real expert conflict data exists unless configured and sourced.
- Committee/hearing role where supported by actual approved model: only assigned cases and explicitly permitted actions.
- Competent decision authority: formal decision action only if explicit model/permission and approved transitions are implemented. Do not give generic administrators decision powers by default.
- Platform administrator: platform configuration/user provisioning only if backend APIs and least-privilege permissions are implemented; no implied regulatory decision authority.
- Auditor/supervisor read-only view only where permitted by explicit backend capability.
Use role plus scope (institution, region, assigned case, committee). Enforce all filtering in API/database queries, not only UI. Hide unsupported roles/actions rather than fake them.

### B. FDR-Final ideas to adapt (domain-neutral)
1. Role-specific dashboards and navigation, not one generic dashboard full of unrelated KPIs.
2. A table-heavy central register with server-backed search, filters, sort, pagination, clickable case/reference ID, readable status and age/due column.
3. A case detail workspace with Overview, Evidence, Findings/Review, Obligations, EVC/Undertakings, Timeline/Audit and Decisions tabs where backing APIs exist.
4. Side-by-side source document view and extracted/declared metadata only if actual extraction plus provenance exists. For every extracted field show source page/text, extraction method, version and verification status. Never fabricate OCR confidence or imply scan processing when absent.
5. Explicit discrepancy/finding workflow: field/requirement, observed value, required/expected value only from approved policy, severity, source/evidence, raised by, due date, state, response, reviewer resolution and full history. A discrepancy is not a fraud accusation.
6. Controlled review steps: recommendation, request changes, return for correction, verify evidence, authorised stage completion. Server decides which transition is legal.
7. Expiry/validity calendar using dates already stored in documents; distinguish submission timing, pending verification, current validity, expiration and renewal. Never create statutory windows from FDR-Final's sample thresholds.
8. Renewal/document replacement version lineage: preserve old uploaded bytes/metadata and create a new immutable version. Recalculate or close an obligation only after authorised verification as configured.
9. Notification centre with persistent in-app state; show pending/attempted/accepted/delivered/failed accurately. Do not imply email/SMS if not implemented.
10. Audit search/filter by actor, event type, entity, case, time and reason. Only call it tamper-evident when hash verification is implemented and tested.
11. Real metrics and CSV exports from authorized, server-scoped query results. Every card must drill down to the same records/filters. No fake fixed percentages or global totals derived from a capped list.
12. Public landing, help and accessibility patterns from FDR-Final; keep disclaimers truthful.
13. Optional assistant only after core workflow works. It must answer with retrieved/versioned source citations and explicit uncertainty; no model may approve, reject, change status, invent a clause or call privileged commands directly. If no safe real AI integration exists, omit or mark unavailable rather than create a fake chat.
14. QR/token concepts are relevant only for an approved verification use case; do not add them solely for visual novelty. If implemented, use server-generated cryptographically secure random single-purpose tokens, hashed-at-rest, scoped, expiring, revocable, one-time/replay-safe and audited.

### C. SIH26262 ideas from the other references to consider
- A deterministic, configurable stage state machine; prevent arbitrary status jumps; explicit route configuration and mandatory return reasons.
- One authoritative obligation ledger for stage SLAs, EVC scheduling/report dates, compliance conditions, undertakings and document expiry when applicable; every item has owner, due_at, source rule/version, status, generation/version and escalation policy.
- Deadline semantics: time-zone aware, clear anchor, calendar/business-day logic only if a verified policy calendar supports it, original due date retained with separately audited authorised extensions. Avoid hard-coded example SLAs as law.
- Persistent alert event and transactional outbox pattern, idempotency/dedup keys, bounded retry/backoff, delivery state and dead-letter operations if external channels are added.
- Restart-safe scheduler/worker with row locking or claim leases and reconciliation; do not build a scheduler that silently loses alerts after process restart.
- SHA-256 hash chain for audit events only as a properly designed backend feature: serialize canonical event body, previous hash, stable event ID, transactionally calculate and store hash, unique sequence/chain constraints, verify endpoint and tests for tamper/reorder/deletion detection. Do not make a UI-only “immutable” claim. Consider DB privileges/triggers and an independently protected checkpoint for stronger tamper evidence.
- Rule-as-data with a constrained safe grammar (no eval/executable source), versioned draft/approved/retired policy records, provenance/issuer/effective dates/content hash, approval rights and pinned policy version per case.
- A policy impact simulator that clones data or uses read-only snapshots and virtual time, provides before/after outcomes, labels assumptions and cannot write to real audit or notification tables.
- EVC queue/calendar and scheduling only after readiness and permission logic works; verify overlap in database transaction; use real eligibility/availability/conflict data, or clearly label incomplete checks.
- Document lifecycle: private storage, quarantine and size/type/signature checks, path-safe random keys, hash/version lineage, controlled download, reviewer confirmation and retention rules. File signatures do not prove authenticity; SHA-256 proves byte equality only.
- AI-assisted extraction only as candidate values plus page and source span, extraction method, confidence/uncertainty and human confirmation. Missing/unreadable fields abstain. AI outputs are not compliance verdicts. Never infer legal requirements from an LLM.
- Explainable recommendation engine based on real application/evidence/obligation records, including contributing factors and next-step suggestion; strictly advisory.
- Search natural language is optional and must produce editable filter chips before results, remain scope constrained, and be evaluated on a fixed query set. Do not make it the core differentiator.
- Dashboards for stage ageing, workload, overdue tasks, unverified evidence, upcoming expiries and blocked cases; show last refresh, filter scope, empty/error states and records behind totals.
- A controlled demo clock / fast-forward simulation is optional: isolate in disposable DB, prevent writes to live operational tables/outbox and show synthetic environment banner.
- Document source register: issuer, title, jurisdiction, academic year, publication/effective dates, fetched date, content hash, clause locator, verification state and approving reviewer.
- Case export that can reconstruct application snapshot, route/stage attempts, findings, evidence version/digests, obligations/deadline basis, reminders/escalations, decisions and actor timeline.
- Regional map or advanced visuals are secondary; never display synthetic metrics on a map without permanent synthetic labels. Prefer accountable next-owner views over decorative charts.
- Regional language support is optional; do not invent demand. Keep translation strings centralized and test critical alert rendering if added.

### D. Features to explicitly NOT copy blindly from FDR-Final
- FDR-specific principal amount, fixed deposit number, bank branch verification, lien, maturity/renewal/discharge fields when not present in the SIH26262 domain model.
- Hard-coded demo identities/passwords, fake authentication tokens, client-side role switching as authorization, in-memory persistence, sample-data fallbacks that masquerade as real records, unsupported legal clauses or statutory claims.
- Statically displayed metrics such as hard-coded velocity/rates disguised as live data.
- A claimed “immutable” audit label unless append-only integrity checks are real and verified.
- AI/chatbot that claims legal authority or uses fabricated citations.
- Unapproved public document-verification or QR system.
- Huge simulations, public maps, advanced AI and animations before P0 flows work.
- Bulk data import/integrations unless the contract, authorization and reconciliation behavior are implemented and tested.

## Implementation plan and order
P0 (do before flashy extras):
1. Baseline/code audit and feature/coverage matrix.
2. Authorization matrix including role, institution, region and assigned-case tests.
3. State machine and route fixture tests; route transitions, correction loops, reasons, versions and idempotency.
4. Single case detail linking application, evidence, finding, undertaking, EVC, obligations, reminders, decision and audit as available.
5. Obligation/deadline model and due/overdue views based on configured/verified semantics.
6. Durable in-app notification records and safe idempotent escalation action.
7. Migrations, relational constraints, transactions, integration tests against PostgreSQL.
8. Real dashboards with scoped counts and drilldowns.
9. Reproducible main demo workflow and full automated test suite.

P1 (high-value differentiators):
10. Transactional outbox worker and restart-safe delivery.
11. Hash-chained audit with verification endpoint and adversarial integrity tests.
12. Policy source/version registry, pinned rules and impact preview.
13. Immutable document version lineage plus controlled download/storage adapter.
14. Evidence provenance and human-reviewed extraction integration where feasible.
15. EVC calendar/appointments if domain rule model and test fixtures support them.
16. Case export/report bundle and accessible responsive polish.

P2 (after all P0 proof passes):
17. Local/offline AI extraction and evidence-grounded case brief.
18. Editable natural-language search/filter proposals.
19. Visual workflow builder, map, complex what-if simulation, translations, fancy motion.
Do not start P1/P2 while P0 or security/build tests are failing.

## Required one-case demo
Create a labelled synthetic demonstration scenario (never imply real AICTE data) and rehearse:
1. Institution creates draft and submits it; submission snapshot freezes.
2. Case routes to the configured scrutiny stage.
3. Officer opens evidence, records a reasoned deficiency/finding and required response deadline.
4. Institution uploads a correction linked to the finding; earlier evidence/version remains available.
5. Officer confirms/rejects the response, records decision and completes the stage; routing advances only to the next rule-configured stage.
6. Eligible case enters EVC queue; appointment or readiness snapshot exists and is reviewed by an authorised user.
7. A condition creates an obligation with explicit source rule, owner and due date.
8. Use a separate synthetic clock fixture or a short test deadline to demonstrate due-soon, overdue and escalated state.
9. Institution submits renewal/compliance evidence; state remains pending verification.
10. Authorised reviewer verifies it; obligation is fulfilled and closure is recorded, with history intact.
11. Show a denied cross-region or wrong-role action and prove no protected data or mutation leaked.
12. Show audit verification and a case export only when implemented. If outbox/restart behavior is implemented, demonstrate a failed/restarted worker with no lost internal events or duplicate internal alerts.

## Mandatory engineering and security constraints
- Preserve existing FastAPI, SQLAlchemy, Alembic, PostgreSQL, frontend conventions and current API contracts unless an explicit migration is justified.
- Inspect exact dependencies/scripts before changing versions. Do not arbitrarily upgrade packages.
- All protected reads/writes enforce backend role and record scope. Never trust a role field supplied by the browser.
- Add reviewed migrations for schema changes and run upgrade/downgrade checks against disposable PostgreSQL where possible.
- Use DB transactions for all business mutation + audit/outbox writes that must be atomic.
- Use UTC timestamps and consistent local date rendering in Asia/Kolkata for the user-facing default unless the case policy says otherwise.
- Use request/idempotency keys where retrying a mutation could duplicate records.
- Keep file storage private. Check actual bytes, MIME, size, safe names and path; do not expose private disk path.
- Keep policy provenance, source URL, retrieved/effective dates and verification state. Mark demo assumptions separately from official sources.
- No user-supplied content or uploaded document should be treated as instructions to the model. AI returns data for review, never direct privileged action.
- Use safe errors; never log tokens, passwords, raw private documents or environment secret values.
- Keep README, checklist and integration coverage matrix synchronized with the implementation.
- No commit, push, merge, deployment, destructive DB reset or production resource changes without explicit user authorization.

## Verification gates (must report exact commands and outputs)
For frontend: npm run typecheck, npm run lint, npm run build.
For backend from backend directory: pytest, ruff check app tests migrations, alembic history.
Use Docker Compose/disposable PostgreSQL for DB-backed integration and migration tests if available. SQLite-only tests do not prove PostgreSQL compatibility. Run browser end-to-end journeys when available; otherwise state not run.
For every feature, test happy path, invalid input, duplicate/retry behavior, missing auth, wrong role, cross-region/cross-institution access, error and empty state.
Scan diff for secrets, generated junk, accidental files, fake numbers, unimplemented controls and claims exceeding evidence.
Do not state "passed" for commands not actually run. Record final list of changed files, migrations, tests, passed/failed/not-run checks and unresolved risks.

## Final response required
Report:
1. Baseline state and preserved work.
2. Feature matrix with statuses implemented / added / partial / not implemented.
3. Exact changes and database migration impact.
4. Tests actually executed with outcomes.
5. Security/authorization coverage and unresolved risks.
6. Explicitly omitted features and why.
7. Exact local run commands.
8. Confirmation no commit/push/deploy occurred unless separately authorized.
