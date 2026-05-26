import { writeFile } from 'node:fs/promises'
import chalk from 'chalk'

import { config } from '../config/env'
import { RouteRunResult } from './types'

const formatStatus = (result: RouteRunResult): string => {
  if (result.status === 'PASSED') {
    return chalk.green(`✅ ${result.path}`)
  }

  if (result.status === 'SKIPPED') {
    return chalk.yellow(`⏭ ${result.path}`)
  }

  return chalk.red(`❌ ${result.path}`)
}

export const printReport = (results: RouteRunResult[]): void => {
  const failed = results.filter(item => item.status === 'FAILED')
  const skipped = results.filter(item => item.status === 'SKIPPED')
  const passed = results.filter(item => item.status === 'PASSED')

  process.stdout.write('\nSPA HEALTH CHECK REPORT\n\n')

  for (const result of results) {
    process.stdout.write(`${formatStatus(result)}\n`)
    if (result.status !== 'FAILED') {
      continue
    }

    process.stdout.write('   Errors:\n')
    for (const error of result.errors) {
      process.stdout.write(`   - [${error.type}] ${error.message}\n`)
    }
    if (result.screenshotPath) {
      process.stdout.write(`   - screenshot: ${result.screenshotPath}\n`)
    }
  }

  process.stdout.write('\n=====================================\n')
  process.stdout.write(`Total Routes: ${results.length}\n`)
  process.stdout.write(`Passed: ${passed.length}\n`)
  process.stdout.write(`Failed: ${failed.length}\n`)
  process.stdout.write(`Skipped: ${skipped.length}\n`)
}

export const writeJsonReport = async (results: RouteRunResult[]): Promise<string> => {
  const timestamp = new Date().toISOString().replace(/[:]/g, '-')
  const filePath = `${config.reportsDirectory}/spa-health-check-${timestamp}.json`

  await writeFile(
    filePath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        baseUrl: config.baseUrl,
        totals: {
          total: results.length,
          passed: results.filter(item => item.status === 'PASSED').length,
          failed: results.filter(item => item.status === 'FAILED').length,
          skipped: results.filter(item => item.status === 'SKIPPED').length
        },
        results
      },
      null,
      2
    ),
    'utf8'
  )

  return filePath
}
