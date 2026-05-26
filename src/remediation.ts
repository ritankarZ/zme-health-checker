import { readFile, writeFile } from 'node:fs/promises'
import { exec as execCallback } from 'node:child_process'
import path from 'node:path'
import { promisify } from 'node:util'

import { config } from '../config/env'
import { logInfo, logWarn } from './logger'
import { RouteError, RouteRunResult } from './types'

const exec = promisify(execCallback)

type SourceHint = {
  filePath: string
  lineNumber: number | null
}

type SearchMatch = {
  filePath: string
  lineNumber: number
  lineContent: string
}

const isActionableError = (error: RouteError): boolean => {
  if (error.type === 'pageerror') {
    return true
  }

  if (error.type === 'console-error') {
    const message = error.message.toLowerCase()
    return (
      message.includes('cannot read') ||
      message.includes('undefined') ||
      message.includes('typeerror') ||
      message.includes('referenceerror')
    )
  }

  return false
}

const extractPropertyName = (message: string): string | null => {
  const match = message.match(/reading ['"`]([^'"`]+)['"`]/i)
  if (!match?.[1]) {
    return null
  }

  return match[1]
}

const extractSourceHint = (message: string): SourceHint | null => {
  const stackMatch = message.match(
    /(src\/[A-Za-z0-9_./-]+\.(?:ts|tsx|js|jsx))(?::(\d+))?/
  )

  if (!stackMatch?.[1]) {
    return null
  }

  return {
    filePath: stackMatch[1],
    lineNumber: stackMatch[2] ? Number(stackMatch[2]) : null
  }
}

const escapeRegex = (value: string): string => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const findCodeMatches = async (query: string): Promise<SearchMatch[]> => {
  const escapedQuery = escapeRegex(query)
  const command = `rg --line-number --no-heading --glob "**/*.{ts,tsx,js,jsx}" "${escapedQuery}" "${config.targetCodebasePath}" | head -n 8`

  try {
    const { stdout } = await exec(command)
    if (!stdout.trim()) {
      return []
    }

    return stdout
      .split('\n')
      .filter(line => line.trim().length > 0)
      .map(line => {
        const match = line.match(/^(.*?):(\d+):(.*)$/)
        if (!match) {
          return null
        }

        return {
          filePath: match[1],
          lineNumber: Number(match[2]),
          lineContent: match[3].trim()
        }
      })
      .filter((item): item is SearchMatch => item !== null)
  } catch {
    return []
  }
}

const getSnippet = async (match: SearchMatch): Promise<string> => {
  try {
    const fileContent = await readFile(match.filePath, 'utf8')
    const lines = fileContent.split('\n')
    const from = Math.max(1, match.lineNumber - 3)
    const to = Math.min(lines.length, match.lineNumber + 3)
    const snippetLines: string[] = []

    for (let line = from; line <= to; line += 1) {
      snippetLines.push(`${line}: ${lines[line - 1]}`)
    }

    return snippetLines.join('\n')
  } catch {
    return `Unable to read snippet for ${match.filePath}:${match.lineNumber}`
  }
}

const buildHandoffMarkdown = async (failedResults: RouteRunResult[]): Promise<string> => {
  const lines: string[] = []
  lines.push('# SPA Failure Auto-Remediation Handoff')
  lines.push('')
  lines.push(`Generated at: ${new Date().toISOString()}`)
  lines.push(`Target codebase: ${config.targetCodebasePath}`)
  lines.push('')
  lines.push('## Failed Routes')
  lines.push('')

  const codeSnippetsSection: string[] = []
  const seenMatches = new Set<string>()

  for (const result of failedResults) {
    lines.push(`### ${result.path}`)
    lines.push(`- Final URL: ${result.finalUrl ?? 'N/A'}`)
    lines.push(`- Screenshot: ${result.screenshotPath ?? 'N/A'}`)
    lines.push('')
    lines.push('Errors:')

    for (const error of result.errors) {
      lines.push(`- [${error.type}] ${error.message}`)

      if (!isActionableError(error)) {
        continue
      }

      const propertyName = extractPropertyName(error.message)
      const sourceHint = extractSourceHint(error.message)
      const queries = [
        sourceHint?.filePath ? path.basename(sourceHint.filePath) : '',
        propertyName ?? ''
      ].filter(query => query.length > 0)

      for (const query of queries) {
        const matches = await findCodeMatches(query)
        for (const match of matches) {
          const key = `${match.filePath}:${match.lineNumber}`
          if (seenMatches.has(key)) {
            continue
          }
          seenMatches.add(key)

          const snippet = await getSnippet(match)
          codeSnippetsSection.push(`#### ${match.filePath}:${match.lineNumber}`)
          codeSnippetsSection.push('')
          codeSnippetsSection.push('```ts')
          codeSnippetsSection.push(snippet)
          codeSnippetsSection.push('```')
          codeSnippetsSection.push('')
        }
      }
    }

    lines.push('')
  }

  lines.push('## Candidate Code Areas')
  lines.push('')
  if (codeSnippetsSection.length === 0) {
    lines.push('No code matches found from current error signatures.')
    lines.push('')
  } else {
    lines.push(...codeSnippetsSection)
  }

  lines.push('## Suggested Zippy Prompt')
  lines.push('')
  lines.push(
    'Please analyze failed routes and errors above, propose minimal safe fixes, add/update tests, and prepare a merge request with summary and risk notes.'
  )
  lines.push('')

  return lines.join('\n')
}

export const generateRemediationHandoff = async (
  results: RouteRunResult[]
): Promise<string | null> => {
  const failedResults = results.filter(result => result.status === 'FAILED')

  if (failedResults.length === 0) {
    return null
  }

  const timestamp = new Date().toISOString().replace(/[:]/g, '-')
  const handoffPath = `${config.reportsDirectory}/zippy-handoff-${timestamp}.md`
  const content = await buildHandoffMarkdown(failedResults)

  await writeFile(handoffPath, content, 'utf8')
  return handoffPath
}

export const runZippyAutomation = async (
  handoffPath: string | null
): Promise<void> => {
  if (!handoffPath || !config.autoRemediationEnabled) {
    return
  }

  if (!config.zippyCommand) {
    logWarn(
      'AUTO_REMEDIATION_ENABLED=true but ZIPPY_COMMAND is not configured. Skipping zippy automation.'
    )
    return
  }

  const command = `${config.zippyCommand} "${handoffPath}"`
  logInfo(`Running zippy remediation command: ${command}`)

  try {
    const { stdout, stderr } = await exec(command)
    if (stdout.trim()) {
      logInfo(stdout.trim())
    }
    if (stderr.trim()) {
      logWarn(stderr.trim())
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown zippy command failure'
    logWarn(`Zippy remediation command failed: ${message}`)
    return
  }

  if (!config.zippyMrCommand) {
    return
  }

  logInfo(`Running zippy MR command: ${config.zippyMrCommand}`)
  try {
    const { stdout, stderr } = await exec(config.zippyMrCommand)
    if (stdout.trim()) {
      logInfo(stdout.trim())
    }
    if (stderr.trim()) {
      logWarn(stderr.trim())
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown zippy MR command failure'
    logWarn(`Zippy MR command failed: ${message}`)
  }
}
