# PRAVAAH
### Enterprise Autonomous Transformation — Approval Workflow Automation & Compliance Monitoring

PRAVAAH is a prototype platform for organising approval workflows, supporting evidence-based reviews, tracking compliance obligations, and maintaining an operational history of key actions. It is designed to demonstrate how a structured digital workspace can help teams manage application records and compliance activities more consistently.

> **Project status:** Academic / hackathon prototype. PRAVAAH is not an official AICTE service, does not issue official approvals, and must not be treated as a substitute for applicable regulations or authorised human review. Demonstration data should be synthetic.

## Table of contents
- [Problem context](#problem-context)
- [Objectives](#objectives)
- [Key capabilities](#key-capabilities)
- [Roles and workflow](#roles-and-workflow)
- [Architecture](#architecture)
- [Technology stack](#technology-stack)
- [Run locally](#run-locally)
- [Configuration](#configuration)
- [API overview](#api-overview)
- [Security and data handling](#security-and-data-handling)
- [Testing and verification](#testing-and-verification)
- [Repository structure](#repository-structure)
- [Known limitations](#known-limitations)
- [Future scope](#future-scope)

## Problem context
Approval and compliance processes can involve multiple stakeholders, policy requirements, supporting documents, review stages, deadlines, and follow-up actions. When these activities are spread across separate records and communication channels, it becomes harder to understand application status, identify missing evidence, and follow up on obligations.

PRAVAAH demonstrates a centralised workflow where application information, evidence review, policy metadata, obligations, readiness information, notifications, and audit events can be managed from one workspace.

## Objectives
- Centralise application and review information in a consistent workflow.
- Make evidence requirements and review outcomes easier to track.
- Organise compliance obligations and follow-up actions.
- Present role-oriented views for operational work.
- Provide a traceable record of relevant application and compliance events.
- Demonstrate a modular frontend and backend architecture that can be extended and tested.

## Key capabilities

| Capability | Purpose |
|---|---|
| Application workflow | Organise application records and their review stages. |
| Evidence management | Associate supporting evidence with workflow records and reviews. |
| Policy metadata | Represent policy requirements and related information for workflow use. |
| Compliance obligations | Track obligations, status, and follow-up work. |
| Undertakings | Represent undertaking-related workflow information. |
| EVC readiness snapshots | Present readiness information to support human review. |
| Recommendations | Surface workflow guidance where implemented; these are not official decisions. |
| Notifications | Display or track notification-related workflow items supported by the current implementation. |
| Audit events | Expose operational events for traceability and review. |
| Operational metrics | Summarise available workflow data for monitoring. |
| Role-oriented workspace | Organise the interface around user responsibilities and access. |

Feature availability depends on the configured environment and current implementation. Do not interpret a displayed status, recommendation, or readiness snapshot as an official approval or compliance determination.

## Roles and workflow
The application is intended to demonstrate role-oriented access for users involved in submitting, reviewing, administering, or monitoring workflow records. Exact permissions depend on the active backend configuration.

A typical workflow is:

1. Create or register an application record.
2. Associate the relevant policy and evidence information.
3. Review the submitted information and record findings.
4. Track outstanding obligations, undertakings, or follow-up actions.
5. Review readiness information and workflow recommendations, where available.
6. Consult operational history and metrics to understand progress.

This sequence is illustrative; the enabled transitions depend on the implementation and configured roles.

## Architecture

```mermaid
flowchart TD
    U[User / Reviewer] --> FE[React + TypeScript Frontend]
    FE -->|HTTP API| API[FastAPI Backend]
    API --> DB[(PostgreSQL Database)]
    API --> EV[Evidence / File Storage]
    API --> AUD[Operational Audit Events]
    API --> WF[Workflow Services]
```

The frontend provides the user interface, while the FastAPI backend exposes application functionality and coordinates workflow operations. SQLAlchemy and Alembic support database access and schema migrations. The deployed configuration may differ from a local development setup.

## Technology stack

| Layer | Technologies |
|---|---|
| Frontend | React, TypeScript, Vite |
| Backend | Python, FastAPI |
| Data access | SQLAlchemy |
| Database migrations | Alembic |
| Database | PostgreSQL for the intended deployment configuration; SQLite may be used in selected tests |
| API format | HTTP endpoints with JSON where applicable |
| Deployment | Render services; Docker for the backend deployment |

Check the repository's dependency and configuration files for the exact versions used by the current branch.

## Run locally

### Prerequisites
- Git
- Node.js and npm compatible with the frontend lockfile
- Python version supported by the backend dependency configuration
- PostgreSQL, or the database configured for your local/test environment
- Docker and Docker Compose if using the container workflow

### 1. Clone the repository
```bash
git clone https://github.com/sainithinreddy06/PRAVAAH.git
cd PRAVAAH
git switch nithin-pravaah
```

### 2. Configure the backend
Open a terminal in the repository root, then:
```bash
cd backend
python -m venv .venv
```

Activate the virtual environment:

**Windows PowerShell**
```powershell
.\.venv\Scripts\Activate.ps1
```

**macOS / Linux**
```bash
source .venv/bin/activate
```

Install the backend requirements using the dependency file present in `backend/`. For example, if the repository provides `requirements.txt`:
```bash
python -m pip install -r requirements.txt
```

Set the environment variables required by the backend, configure a local database, and run migrations using the repository's Alembic configuration. Then start the API using the entry point documented in the backend configuration. A common FastAPI development command, when the module is named `main.py`, is:
```bash
uvicorn main:app --reload
```

Do not assume this example module name applies if the current backend entry point differs.

### 3. Start the frontend
Open a second terminal at the repository root:
```bash
cd frontend
npm ci
npm run dev
```

Use the local URL printed by Vite. Configure the frontend API base URL to point to the local backend before testing API-backed screens.

### 4. Docker workflow
If a Docker Compose file is present in the checked-out branch, review its services and required environment variables, then start the configured stack:
```bash
docker compose up --build
```

Use the Compose file as the source of truth for service names, ports, database initialization, and migrations. Do not run both Docker and manual services on the same ports at the same time.

## Configuration
Use the repository's example environment file, if provided, as the starting point. Typical settings in a project of this architecture may include:

- Database connection string
- Application environment and logging level
- API host and port
- Frontend API base URL
- CORS allowed origins
- Evidence/file storage location
- Authentication or session configuration, if enabled

Names and required values vary by branch; verify them against the actual settings code and deployment configuration. Never commit real credentials, private keys, production database passwords, or personal data. Use environment variables or the hosting provider's secret settings.

## API overview
The backend exposes HTTP endpoints for the workflow areas enabled in the current build. Depending on the implementation, these may include:

- Health or service status
- Applications and review workflow
- Policy metadata
- Evidence and review records
- Obligations and undertakings
- Readiness snapshots and recommendations
- Notifications
- Audit-event queries
- Operational metrics

For exact routes, request schemas, response formats, and authentication requirements, inspect the backend route definitions and the API documentation served by the running FastAPI instance (commonly `/docs` when enabled). This README intentionally does not promise endpoint paths that have not been verified against the active branch.

## Security and data handling
- Use synthetic data for demos and evaluation unless appropriate authorisation and safeguards are in place.
- Keep secrets in environment variables or deployment secret stores; never put them in source control.
- Restrict CORS to the frontend origins required by the environment.
- Apply authentication and role-based authorisation appropriate to the deployment before exposing sensitive workflows.
- Validate uploads and inputs, enforce file size/type limits, and control access to stored evidence.
- Avoid logging passwords, tokens, confidential documents, or unnecessary personal information.
- Back up the database and define retention and access policies before any real operational use.
- Treat audit events as application-level records unless independent tamper-resistance has been implemented and verified.

## Testing and verification
Run the tests and checks defined by the current branch and its configuration. Common examples, when corresponding scripts or configuration are present, include:

```bash
# Frontend
npm ci
npm run typecheck
npm run build

# Backend
python -m pytest
```

Use the actual script names in `package.json` and the backend test configuration; commands above are examples and may need adjustment. A successful unit-test run does not by itself verify every end-to-end workflow, a production database, deployment configuration, or external integrations. Record fresh test results before presenting them as verified.

## Repository structure
The repository is organised around a frontend and backend. Exact paths can change between branches.

- `frontend/` — React/TypeScript user interface.
- `backend/` — FastAPI application, workflow logic, database access, and tests.
- Database migration files and deployment configuration — schema evolution and runtime setup.
- Documentation and environment examples — project setup and developer guidance, where present.

## Known limitations
- This is a prototype intended for demonstration and evaluation, not a certified production platform.
- Official AICTE integrations, approval authority, and regulatory correctness are not implied.
- Recommendation and readiness outputs require human interpretation and validation.
- Email/SMS delivery, scheduled processing, external integrations, and tamper-resistant audit guarantees should be considered available only if separately configured, implemented, and verified.
- Local test success does not establish production readiness or full workflow coverage.

## Future scope
- Expand automated integration and end-to-end tests across role-specific journeys.
- Add deployment monitoring, backups, and operational runbooks.
- Strengthen identity, authorisation, and evidence retention controls.
- Add validated integration adapters for approved external systems, subject to access and policy.
- Improve reporting, accessibility, and reviewer feedback loops.
- Conduct security, performance, and usability reviews before real-world deployment.

## Project links
- **Repository:** https://github.com/sainithinreddy06/PRAVAAH
- **Target development branch:** `nithin-pravaah`

---

**PRAVAAH — structured workflows, evidence visibility, and compliance operations.**
