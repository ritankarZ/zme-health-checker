# ZME Health Checker

Playwright-based runtime health checker for SPA routes.

This project runs **outside** the frontend app and catches runtime breakages before production rollout (for example: `Cannot read properties of undefined`, redirect mismatches, blank/error pages).

## What This Does

- Opens configured routes in a real browser session
- Detects runtime failures:
  - page exceptions (`pageerror`)
  - important console runtime errors
  - unexpected redirect destinations
  - blank/error-boundary style screens
- Captures screenshots for failed routes
- Generates machine-readable + human-readable reports
- Produces a live progress UI while checks are running
- Optionally generates an AI remediation handoff for zippy automation

## Project Layout

- `routes/routes.ts` — route inventory to validate
- `config/env.ts` — all runtime configuration
- `src/health-check.ts` — main runner
- `src/auth.ts` — login/session state capture
- `src/runner.ts` — per-route execution and validation
- `src/detectors.ts` — failure signal collection
- `src/live-ui.ts` — live HTML progress view
- `src/remediation.ts` — AI handoff and optional zippy command orchestration

## Quick Start

### 1) Install dependencies

```bash
npm install
```

### 2) Install Playwright browser

```bash
npx playwright install chromium
```

### 3) Configure environment

```bash
cp .env.example .env
```

Minimum required values:
- `BASE_URL` should be **origin only** (example: `https://phoenix.app.zetaglobal.net`)
- `E2E_USER` for scripted auth mode: `email@example.com:password`

## Running the App

### One command (headed auth + headed checks)

```bash
pnpm dev:headed:with-auth
```

### Or step-by-step

Save auth state once:

```bash
npm run auth:save:headed
```

Then run checks in headed mode:

```bash
npm run dev:headed
```

Headless mode:

```bash
npm run dev
```

Interactive SSO/MFA flow (headed browser opens, then waits):

```bash
npm run auth:save:interactive
```

## Live Progress + Outputs

During execution:
- `reports/live-progress.html` (auto-refreshes every second)
- `reports/live-progress.json`

After execution:
- `reports/spa-health-check-<timestamp>.json`
- `screenshots/*.png` for failed routes
- `reports/zippy-handoff-<timestamp>.md` when failures exist

Exit code:
- `0` if no route failed
- `1` if one or more routes failed

## Common Commands

```bash
# Build TypeScript
npm run build

# Run compiled output
npm start

# Save auth state (headless/scripted)
npm run auth:save
```

## Key Configs (`.env`)

- `AUTH_MODE`: `ui-login` or `storage-only`
- `AUTH_SUCCESS_SELECTOR`: selector that indicates post-login success
- `INTERACTIVE_AUTH_TIMEOUT_MS`: max wait for interactive login completion
- `HEALTH_CHECK_CONCURRENCY`: number of route workers
- `HEALTH_CHECK_HEADLESS`: `true` / `false`
- `HEALTH_CHECK_SLOW_MO_MS`: browser action slowdown in ms
- `IGNORE_CONSOLE_ERRORS`: pipe-delimited ignore patterns for noisy console errors
- `TARGET_CODEBASE_PATH`: repo path used for remediation code search
- `AUTO_REMEDIATION_ENABLED`: run zippy commands automatically on failures
- `ZIPPY_COMMAND`: command template for remediation
- `ZIPPY_MR_COMMAND`: optional follow-up MR command

## Route Parameters (`:id` routes)

Parametric routes are intentionally marked `SKIPPED` until you provide concrete params.

Example:

```ts
{
  path: '/reports/dashboard/:id',
  requiresAuth: true,
  params: { id: '12345' }
}
```

## Troubleshooting

### Browser does not launch (`Executable doesn't exist`)

Install Playwright browser binaries:

```bash
npx playwright install chromium
```

If needed, reinstall after Playwright version changes.

### Login succeeds visually, but script does not detect success

Update `AUTH_SUCCESS_SELECTOR` in `.env` to a stable post-login element.

Example:

```env
AUTH_SUCCESS_SELECTOR=[class^="Navbar"]
```

Also increase interactive timeout if SSO is slow:

```env
INTERACTIVE_AUTH_TIMEOUT_MS=300000
```

### Routes open under `/signin/...` and fail unexpectedly

Ensure `BASE_URL` is origin-only.

Correct:

```env
BASE_URL=https://phoenix.app.zetaglobal.net
```

Incorrect:

```env
BASE_URL=https://phoenix.app.zetaglobal.net/signin
```

### Healthy pages reported as failed due to console noise

Tune `IGNORE_CONSOLE_ERRORS` in `.env` (pipe-delimited patterns).

Example:

```env
IGNORE_CONSOLE_ERRORS=Failed to load resource|ResizeObserver loop limit exceeded
```

### Interactive auth opens login page but fields are not filled

Verify `E2E_USER` format:

```env
E2E_USER=email@example.com:password
```

If auth flow is custom/SSO-heavy, use:

```bash
npm run auth:save:interactive
```

and complete sign-in manually.
