import { Page } from 'playwright'

import { CheckerConfig, RouteError } from './types'

type ErrorCapture = {
  pageErrors: RouteError[]
  consoleErrors: RouteError[]
}

export const attachRuntimeListeners = (
  page: Page,
  config: CheckerConfig
): ErrorCapture => {
  const pageErrors: RouteError[] = []
  const consoleErrors: RouteError[] = []

  page.on('pageerror', error => {
    pageErrors.push({
      type: 'pageerror',
      message: error.message
    })
  })

  page.on('console', msg => {
    if (msg.type() !== 'error') {
      return
    }

    const text = msg.text()
    const shouldIgnore = config.ignoreConsoleErrors.some(ignoreText =>
      text.includes(ignoreText)
    )

    if (shouldIgnore) {
      return
    }

    consoleErrors.push({
      type: 'console-error',
      message: text
    })
  })

  return { pageErrors, consoleErrors }
}

export const detectBlankPage = async (page: Page): Promise<RouteError | null> => {
  const isBlank = await page.evaluate(() => {
    const bodyText = document.body?.innerText?.trim() ?? ''
    const rootNode = document.querySelector('#root, #app')
    const rootChildrenCount = rootNode?.children.length ?? 0

    return bodyText.length === 0 || (Boolean(rootNode) && rootChildrenCount === 0)
  })

  if (!isBlank) {
    return null
  }

  return {
    type: 'blank-page',
    message: 'Detected a blank page (empty body/root content).'
  }
}

export const detectErrorBoundary = async (
  page: Page,
  config: CheckerConfig
): Promise<RouteError | null> => {
  for (const selector of config.errorBoundarySelectors) {
    const matchedCount = await page.locator(selector).count()

    if (matchedCount > 0) {
      return {
        type: 'error-boundary',
        message: `Error boundary selector matched: ${selector}`
      }
    }
  }

  const bodyText = await page.locator('body').innerText()
  const matchedText = config.errorBoundaryTexts.find(text =>
    bodyText.includes(text)
  )

  if (!matchedText) {
    return null
  }

  return {
    type: 'error-boundary',
    message: `Error boundary text matched: "${matchedText}"`
  }
}
