import { Browser } from 'playwright'

import { config } from '../config/env'
import { attachRuntimeListeners, detectBlankPage, detectErrorBoundary } from './detectors'
import { RouteError, RouteRunResult, RouteSpec } from './types'
import {
  buildAbsoluteUrl,
  buildRoutePath,
  normalizePathname,
  slugifyPath
} from './utils'

const resolveExpectedRedirect = (
  route: RouteSpec,
  params: Record<string, string>
): string | null => {
  if (!route.expectedRedirect) {
    return null
  }

  return normalizePathname(buildRoutePath(route.expectedRedirect, params))
}

export const runRouteHealthCheck = async (
  browser: Browser,
  route: RouteSpec
): Promise<RouteRunResult> => {
  const startedAt = Date.now()

  if (route.skip) {
    return {
      path: route.path,
      status: 'SKIPPED',
      durationMs: Date.now() - startedAt,
      errors: route.notes
        ? [{ type: 'navigation', message: route.notes }]
        : [{ type: 'navigation', message: 'Route is marked as skipped.' }]
    }
  }

  const params = route.params ?? {}
  const routePath = buildRoutePath(route.path, params)
  const routeUrl = buildAbsoluteUrl(config.baseUrl, routePath)
  const context = await browser.newContext({
    storageState: config.storageStatePath
  })
  const page = await context.newPage()
  const errors: RouteError[] = []

  try {
    const errorCapture = attachRuntimeListeners(page, config)

    await page.goto(routeUrl, {
      waitUntil: 'networkidle',
      timeout: config.timeoutMs
    })
    await page.waitForTimeout(config.postLoadWaitMs)

    const expectedRedirect = resolveExpectedRedirect(route, params)
    const finalPath = new URL(page.url()).pathname

    if (expectedRedirect && normalizePathname(finalPath) !== expectedRedirect) {
      errors.push({
        type: 'unexpected-final-url',
        message: `Expected final path "${expectedRedirect}" but got "${finalPath}".`
      })
    }

    const blankPageError = await detectBlankPage(page)
    if (blankPageError) {
      errors.push(blankPageError)
    }

    const errorBoundaryError = await detectErrorBoundary(page, config)
    if (errorBoundaryError) {
      errors.push(errorBoundaryError)
    }

    errors.push(...errorCapture.pageErrors, ...errorCapture.consoleErrors)

    if (errors.length > 0) {
      const screenshotName = `${slugifyPath(route.path)}-${Date.now()}.png`
      const screenshotPath = `${config.screenshotsDirectory}/${screenshotName}`
      await page.screenshot({ path: screenshotPath, fullPage: true })

      return {
        path: route.path,
        finalUrl: page.url(),
        status: 'FAILED',
        durationMs: Date.now() - startedAt,
        errors,
        screenshotPath
      }
    }

    return {
      path: route.path,
      finalUrl: page.url(),
      status: 'PASSED',
      durationMs: Date.now() - startedAt,
      errors: []
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown navigation error'
    const screenshotName = `${slugifyPath(route.path)}-${Date.now()}.png`
    const screenshotPath = `${config.screenshotsDirectory}/${screenshotName}`

    await page.screenshot({ path: screenshotPath, fullPage: true })

    return {
      path: route.path,
      finalUrl: page.url(),
      status: 'FAILED',
      durationMs: Date.now() - startedAt,
      errors: [{ type: 'navigation', message }],
      screenshotPath
    }
  } finally {
    await context.close()
  }
}
