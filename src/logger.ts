import chalk from 'chalk'

export const logInfo = (message: string): void => {
  process.stdout.write(`${chalk.blue('[INFO]')} ${message}\n`)
}

export const logWarn = (message: string): void => {
  process.stdout.write(`${chalk.yellow('[WARN]')} ${message}\n`)
}

export const logError = (message: string): void => {
  process.stderr.write(`${chalk.red('[ERROR]')} ${message}\n`)
}
