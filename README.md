# SPA Health Checker

Standalone Playwright-based runtime checker for SPA route health.

This repository is intentionally separate from `fe-app` and is designed to catch frontend runtime failures before production deployment.

## What It Checks

- JS runtime exceptions (`pageerror`)
- Serious browser console errors (`console.error`)
- Error-boundary fallback UI text/selectors
- Blank-page rendering
- Unexpected final URL for redirect routes

## Routes Covered (Current Scope)

Current route set is derived from selected dashboard/home/reports sections in `fe-app/src/framework/routes/routes.tsx`:

- `/`, `/home`, `/home/widget/new`
- `/dashboard`, `/dashboard/widget/new`, `/dashboard/widget/:id`
- reports routes from `/reports` through `/reports/templates` in the provided range

Parametric routes (`:id`) are included but default to `SKIPPED` until you provide `params`.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Install browser binaries:

```bash
npx playwright install chromium
```

3. Copy and configure environment:

```bash
cp .env.example .env
```

Required values:

- `BASE_URL` origin only (example: `https://qa.example.com`, not `https://qa.example.com/signin`)
- `E2E_USER` (format: `email@example.com:password`) for scripted login mode

## Run

### Save auth state once

Scripted login with credentials from `E2E_USER`:

```bash
npm run auth:save
```

Interactive ZMP/SSO login (recommended when MFA/redirect flow is involved):

```bash
npm run auth:save:interactive
```

This opens a headed browser. If `E2E_USER` is present it pre-fills email/password and clicks the login CTA automatically, then you complete any remaining sign-in steps manually (useful for SSO/MFA). The checker saves `.auth/storageState.json` automatically after login succeeds.

### Run health checks

```bash
npm run dev
```

Run in headed mode (watch route navigation/failures live):

```bash
npm run dev:headed
```

Run headed auth then headed checks in one command:

```bash
pnpm dev:headed:with-auth
```

### Build and run compiled output

```bash
npm run build
npm start
```

## Output

- Console summary with PASS/FAIL/SKIPPED
- Failure screenshots in `screenshots/`
- JSON report in `reports/`
- Live progress UI in `reports/live-progress.html` (auto-refreshes every second)
- Auto-remediation handoff in `reports/zippy-handoff-<timestamp>.md` when failures exist
- Exit code:
  - `0` when no route fails
  - `1` when any route fails

## Config Highlights

- `AUTH_MODE=ui-login` (default): auto-login when auth state is missing/stale
- `AUTH_MODE=storage-only`: require existing `.auth/storageState.json`
- `AUTH_SUCCESS_SELECTOR`: selector that indicates login success (default `[class^="Navbar"]`)
- `INTERACTIVE_AUTH_TIMEOUT_MS`: max wait for interactive sign-in before failing
- `HEALTH_CHECK_CONCURRENCY`: worker count (default `1`)
- `HEALTH_CHECK_HEADLESS`: run visible browser (`false`) or headless (`true`)
- `HEALTH_CHECK_SLOW_MO_MS`: slow down browser actions for debugging (default `0`)
- `TARGET_CODEBASE_PATH`: local path to the repo that should be analyzed for fixes (default `../fe-app`)
- `AUTO_REMEDIATION_ENABLED`: when `true`, runs configured zippy commands after generating handoff
- `ZIPPY_COMMAND`: command template to run zippy with handoff file argument (example: `zippy fix --input`)
- `ZIPPY_MR_COMMAND`: optional follow-up command to create MR after zippy fix step
- `IGNORE_CONSOLE_ERRORS`: pipe-delimited ignore substrings (defaults to ignoring generic `Failed to load resource` browser asset noise)
- `ERROR_BOUNDARY_SELECTORS`: pipe-delimited CSS selectors
- `ERROR_BOUNDARY_TEXTS`: pipe-delimited fallback text markers

## Parametric Routes

To unskip parametric routes, edit `routes/routes.ts` and add `params`, for example:

```ts
{
  path: '/reports/dashboard/:id',
  requiresAuth: true,
  params: { id: '12345' }
}
```
