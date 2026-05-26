import { chromium } from 'playwright'

import { config } from '../config/env'
import { routes } from '../routes/routes'
import { ensureAuthState } from './auth'
import {
  createLiveUiState,
  getLiveUiHtmlPath,
  markRouteFinished,
  markRouteRunning
} from './live-ui'
import { logError, logInfo, logWarn } from './logger'
import { generateRemediationHandoff, runZippyAutomation } from './remediation'
import { printReport, writeJsonReport } from './reporter'
import { runRouteHealthCheck } from './runner'
import { RouteRunResult } from './types'
import { ensureDirectory } from './utils'

const runAllRoutes = async (): Promise<RouteRunResult[]> => {
  const liveUiState = await createLiveUiState(routes)
  logInfo(`Live UI report: ${getLiveUiHtmlPath()}`)

  const browser = await chromium.launch({
    headless: config.headless,
    slowMo: config.slowMoMs
  })
  const results: RouteRunResult[] = []
  const queue = [...routes]
  const workerCount = Math.max(1, Math.min(config.concurrency, routes.length))

  const runWorker = async (): Promise<void> => {
    while (queue.length > 0) {
      const nextRoute = queue.shift()
      if (!nextRoute) {
        continue
      }

      await markRouteRunning(liveUiState, nextRoute.path)
      logInfo(`Checking route: ${nextRoute.path}`)
      const result = await runRouteHealthCheck(browser, nextRoute)
      results.push(result)
      await markRouteFinished(liveUiState, result)

      if (result.status === 'FAILED') {
        const firstError = result.errors[0]
        const detail = firstError
          ? ` [${firstError.type}] ${firstError.message}`
          : ''
        logWarn(`Route failed: ${result.path}${detail}`)
      }
    }
  }

  await Promise.all(Array.from({ length: workerCount }, () => runWorker()))
  await browser.close()

  return results
}

const run = async (): Promise<void> => {
  await ensureDirectory('.auth')
  await ensureDirectory(config.reportsDirectory)
  await ensureDirectory(config.screenshotsDirectory)

  await ensureAuthState()
  const results = await runAllRoutes()
  printReport(results)
  const reportPath = await writeJsonReport(results)
  logInfo(`JSON report written to ${reportPath}`)
  const handoffPath = await generateRemediationHandoff(results)
  if (handoffPath) {
    logInfo(`Remediation handoff written to ${handoffPath}`)
  }
  await runZippyAutomation(handoffPath)

  const failedCount = results.filter(item => item.status === 'FAILED').length
  process.exit(failedCount > 0 ? 1 : 0)
}

run().catch(error => {
  const message = error instanceof Error ? error.message : 'Unknown health checker failure'
  logError(message)
  process.exit(1)
})
