import dotenv from 'dotenv'

import { CheckerConfig } from '../src/types'

dotenv.config()

const parsePositiveInt = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value)

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback
  }

  return parsed
}

const parseNonNegativeInt = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value)

  if (!Number.isInteger(parsed) || parsed < 0) {
    return fallback
  }

  return parsed
}

const parseBoolean = (value: string | undefined, fallback: boolean): boolean => {
  if (!value) {
    return fallback
  }

  if (value === 'true') {
    return true
  }

  if (value === 'false') {
    return false
  }

  return fallback
}

const parseString = (value: string | undefined, fallback: string): string => {
  if (!value) {
    return fallback
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : fallback
}

const parseDelimitedList = (
  value: string | undefined,
  fallback: string[],
  separator: string
): string[] => {
  if (!value || value.trim().length === 0) {
    return fallback
  }

  return value
    .split(separator)
    .map(item => item.trim())
    .filter(item => item.length > 0)
}

const resolveAuthMode = (mode: string | undefined): 'ui-login' | 'storage-only' => {
  if (mode === 'storage-only') {
    return 'storage-only'
  }

  return 'ui-login'
}

const normalizeBaseUrl = (value: string | undefined): string => {
  const fallback = 'http://localhost:3000'
  const candidate = value && value.trim().length > 0 ? value : fallback

  let parsedUrl: URL
  try {
    parsedUrl = new URL(candidate)
  } catch {
    throw new Error(
      `Invalid BASE_URL "${candidate}". Use an absolute origin like "https://phoenix.app.zetaglobal.net".`
    )
  }

  return parsedUrl.origin
}

export const config: CheckerConfig = {
  baseUrl: normalizeBaseUrl(process.env.BASE_URL),
  e2eUser: process.env.E2E_USER ?? '',
  concurrency: parsePositiveInt(process.env.HEALTH_CHECK_CONCURRENCY, 1),
  headless: parseBoolean(process.env.HEALTH_CHECK_HEADLESS, true),
  slowMoMs: parseNonNegativeInt(process.env.HEALTH_CHECK_SLOW_MO_MS, 0),
  targetCodebasePath: parseString(process.env.TARGET_CODEBASE_PATH, '../fe-app'),
  autoRemediationEnabled: parseBoolean(process.env.AUTO_REMEDIATION_ENABLED, false),
  zippyCommand: parseString(process.env.ZIPPY_COMMAND, ''),
  zippyMrCommand: parseString(process.env.ZIPPY_MR_COMMAND, ''),
  authMode: resolveAuthMode(process.env.AUTH_MODE),
  authTtlMinutes: parsePositiveInt(process.env.AUTH_TTL_MINUTES, 60),
  authSuccessSelector: process.env.AUTH_SUCCESS_SELECTOR ?? '[class^="Navbar"]',
  interactiveAuthTimeoutMs: parsePositiveInt(
    process.env.INTERACTIVE_AUTH_TIMEOUT_MS,
    180000
  ),
  timeoutMs: parsePositiveInt(process.env.HEALTH_CHECK_TIMEOUT_MS, 30000),
  postLoadWaitMs: parsePositiveInt(process.env.HEALTH_CHECK_POST_LOAD_WAIT_MS, 3000),
  ignoreConsoleErrors: parseDelimitedList(
    process.env.IGNORE_CONSOLE_ERRORS,
    [
      'Failed to load resource',
      'Failed to load resource: the server responded with a status of 404 (Not Found)'
    ],
    '|'
  ),
  errorBoundarySelectors: parseDelimitedList(
    process.env.ERROR_BOUNDARY_SELECTORS,
    ['[data-testid="error-boundary"]'],
    '|'
  ),
  errorBoundaryTexts: parseDelimitedList(
    process.env.ERROR_BOUNDARY_TEXTS,
    ['Service Unavailable', 'Something went wrong', 'Application error', 'TID:'],
    '|'
  ),
  storageStatePath: '.auth/storageState.json',
  reportsDirectory: 'reports',
  screenshotsDirectory: 'screenshots'
}
