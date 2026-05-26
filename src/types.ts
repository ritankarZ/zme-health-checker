export type RouteStatus = 'PASSED' | 'FAILED' | 'SKIPPED'

export type RouteSpec = {
  path: string
  requiresAuth?: boolean
  expectedRedirect?: string
  params?: Record<string, string>
  skip?: boolean
  notes?: string
}

export type RouteErrorType =
  | 'navigation'
  | 'pageerror'
  | 'console-error'
  | 'error-boundary'
  | 'blank-page'
  | 'unexpected-final-url'

export type RouteError = {
  type: RouteErrorType
  message: string
}

export type RouteRunResult = {
  path: string
  finalUrl?: string
  status: RouteStatus
  durationMs: number
  errors: RouteError[]
  screenshotPath?: string
}

export type CheckerConfig = {
  baseUrl: string
  e2eUser: string
  concurrency: number
  headless: boolean
  slowMoMs: number
  targetCodebasePath: string
  autoRemediationEnabled: boolean
  zippyCommand: string
  zippyMrCommand: string
  authMode: 'ui-login' | 'storage-only'
  authTtlMinutes: number
  authSuccessSelector: string
  interactiveAuthTimeoutMs: number
  timeoutMs: number
  postLoadWaitMs: number
  errorBoundarySelectors: string[]
  errorBoundaryTexts: string[]
  ignoreConsoleErrors: string[]
  storageStatePath: string
  reportsDirectory: string
  screenshotsDirectory: string
}
