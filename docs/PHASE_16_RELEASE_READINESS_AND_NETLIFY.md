# Phase 16 — Release Readiness and Netlify Handoff

## CI evidence

- Backend CI: 115 tests passed; Ruff reported all checks passed on commit `6d3b26dae28bb1712921b4a71fdab32cbcd77c65`.
- Frontend CI: TypeScript typecheck, lint, and production build passed on commit `99465d32fe806da4a4fd070a892a512d721d9e19`.
- A regression test is being added for expired-evidence downloads; rerun backend CI before treating the newest branch head as verified.

## Netlify configuration

The repository now includes `netlify.toml` with `npm run build`, publish directory `dist`, Node 20, and SPA history fallback. The `.netlify/` directory is ignored.

## Deployment blockers

The connected Netlify account currently has zero sites and only Google is listed as a connected account; GitHub repository import is not connected through the available Netlify integration. No deployment was created or published.

The frontend also needs a real `VITE_API_BASE_URL`. The API is not yet deployed, and production API configuration requires:
- a private S3-compatible evidence bucket;
- a reachable ClamAV scanner;
- a separate S3 Object Lock audit archive bucket;
- approved retention settings, credentials/roles, and a scheduler for cleanup/archive jobs.

Do not publish a supposedly functional full-stack production site with the frontend pointing at localhost or with backend security controls bypassed.

## Next deployment sequence

1. Provision and integration-test evidence storage, scanner, and independent archive bucket.
2. Deploy the API and PostgreSQL with production secrets and approved CORS origins.
3. Connect GitHub to Netlify, import `sainithinreddy06/PRAVAAH-2`, select `nithin-pravaah`, and use the committed `netlify.toml`.
4. Set `VITE_API_BASE_URL` in Netlify to the deployed API origin.
5. Verify public routes, API connectivity, CORS, login, authorization boundaries, evidence upload/download, and SPA deep links before publishing production.
