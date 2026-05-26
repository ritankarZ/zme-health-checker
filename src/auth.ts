import { access, stat } from 'node:fs/promises'
import process from 'node:process'
import { chromium, Page } from 'playwright'

import { config } from '../config/env'
import { logInfo, logWarn } from './logger'
import { buildAbsoluteUrl } from './utils'

const parseCredentials = (credentials: string): { username: string; password: string } => {
  const delimiterIndex = credentials.indexOf(':')

  if (delimiterIndex <= 0) {
    throw new Error(
      'E2E_USER must be in the format "username@example.com:password".'
    )
  }

  return {
    username: credentials.slice(0, delimiterIndex),
    password: credentials.slice(delimiterIndex + 1)
  }
}

export const isStorageStateFresh = async (): Promise<boolean> => {
  try {
    await access(config.storageStatePath)
    const state = await stat(config.storageStatePath)
    const ageMs = Date.now() - state.mtimeMs
    const ttlMs = config.authTtlMinutes * 60 * 1000

    return ageMs <= ttlMs
  } catch {
    return false
  }
}

type SaveAuthOptions = {
  interactive: boolean
  headed: boolean
}

const clickLoginCta = async (page: Page): Promise<void> => {
  const loginButtonCandidates = [
    page.getByRole('button', { name: /log in/i }).first(),
    page.locator('button:has-text("Log in")').first(),
    page.locator('button[type="submit"]').first(),
    page.locator('input[type="submit"]').first()
  ]

  for (const button of loginButtonCandidates) {
    try {
      if ((await button.count()) > 0) {
        await button.click({ timeout: 2000 })
        return
      }
    } catch {
      continue
    }
  }

  await page.keyboard.press('Enter')
}

const waitForLoginCompletion = async (
  page: Page,
  interactive: boolean
): Promise<void> => {
  const timeoutMs = interactive ? config.interactiveAuthTimeoutMs : config.timeoutMs

  try {
    await Promise.any([
      page.waitForSelector(config.authSuccessSelector, { timeout: timeoutMs }).then(
        () => 'selector'
      ),
      page
        .waitForFunction(() => window.location.pathname !== '/signin', {
          timeout: timeoutMs
        })
        .then(() => 'url')
    ])
  } catch {
    throw new Error(
      `Login success was not detected within ${Math.floor(
        timeoutMs / 1000
      )}s. Verify AUTH_SUCCESS_SELECTOR or complete remaining SSO/MFA steps.`
    )
  }
}

export const saveAuthState = async ({
  interactive,
  headed
}: SaveAuthOptions): Promise<void> => {
  const browser = await chromium.launch({ headless: !headed })
  const context = await browser.newContext()
  const page = await context.newPage()

  logInfo('Opening /signin to create storage state...')
  await page.goto(buildAbsoluteUrl(config.baseUrl, '/signin'), {
    timeout: config.timeoutMs
  })

  if (interactive) {
    if (config.e2eUser) {
      try {
        const { username, password } = parseCredentials(config.e2eUser)
        await page.fill('[name="user[email]"]', username)
        await page.fill('[name="user[password]"]', password)
        await clickLoginCta(page)
        logInfo(
          'Prefilled credentials from E2E_USER and submitted login CTA. Complete any remaining SSO/MFA step manually.'
        )
      } catch {
        logWarn('E2E_USER is malformed, skipping prefill and waiting for manual sign-in.')
      }
    }

    logInfo(
      `Complete ZMP sign-in in the browser window. Waiting up to ${
        config.interactiveAuthTimeoutMs / 1000
      }s for login success...`
    )
  } else {
    const { username, password } = parseCredentials(config.e2eUser)
    await page.fill('[name="user[email]"]', username)
    await page.fill('[name="user[password]"]', password)
    await page.keyboard.press('Enter')
  }

  await waitForLoginCompletion(page, interactive)

  await context.storageState({ path: config.storageStatePath })
  await browser.close()
  logInfo(`Saved auth state to ${config.storageStatePath}`)
}

export const ensureAuthState = async (): Promise<void> => {
  const freshState = await isStorageStateFresh()

  if (freshState) {
    logInfo('Using fresh auth storage state.')
    return
  }

  if (config.authMode === 'storage-only') {
    throw new Error(
      `Auth mode is "storage-only", but missing/stale storage state at ${config.storageStatePath}. Run "npm run auth:save" first.`
    )
  }

  if (!config.e2eUser) {
    throw new Error(
      'E2E_USER is missing. Run "npm run auth:save:interactive" to sign in manually and capture storage state.'
    )
  }

  await saveAuthState({ interactive: false, headed: false })
}

const runAsScript = async (): Promise<void> => {
  const shouldSave = process.argv.includes('--save')
  const interactive = process.argv.includes('--interactive')
  const headed = process.argv.includes('--headed') || interactive

  if (!shouldSave) {
    return
  }

  await saveAuthState({ interactive, headed })
}

runAsScript().catch(error => {
  const message = error instanceof Error ? error.message : 'Unknown auth error'
  process.stderr.write(`${message}\n`)
  process.exit(1)
})
