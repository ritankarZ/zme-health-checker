import { writeFile } from 'node:fs/promises'

import { config } from '../config/env'
import { RouteRunResult, RouteSpec } from './types'

type LiveRouteStatus = 'PENDING' | 'RUNNING' | 'PASSED' | 'FAILED' | 'SKIPPED'

type LiveRouteRow = {
  path: string
  status: LiveRouteStatus
  detail: string
  updatedAt: string
}

type LiveUiState = {
  startedAt: string
  updatedAt: string
  rows: LiveRouteRow[]
}

const liveUiHtmlPath = `${config.reportsDirectory}/live-progress.html`
const liveUiJsonPath = `${config.reportsDirectory}/live-progress.json`

const nowIso = (): string => new Date().toISOString()

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')

const statusClassName = (status: LiveRouteStatus): string => {
  if (status === 'PASSED') {
    return 'success'
  }

  if (status === 'FAILED') {
    return 'error'
  }

  if (status === 'RUNNING') {
    return 'running'
  }

  if (status === 'SKIPPED') {
    return 'skipped'
  }

  return 'pending'
}

const statusLabel = (status: LiveRouteStatus): string => {
  if (status === 'PASSED') {
    return 'SUCCESS'
  }

  if (status === 'FAILED') {
    return 'ERROR'
  }

  return status
}

const renderHtml = (state: LiveUiState): string => {
  const routeRows = state.rows
    .map(row => {
      const statusClass = statusClassName(row.status)
      return `
      <div class="row ${statusClass}">
        <div class="line">
          <span class="status">${statusLabel(row.status)}</span>
          <span class="path">Opening route: ${escapeHtml(row.path)}</span>
        </div>
        <div class="detail">${escapeHtml(row.detail)}</div>
      </div>
      `
    })
    .join('\n')

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="refresh" content="1" />
    <title>SPA Health Checker Live Progress</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 24px; background: #0f172a; color: #e2e8f0; }
      h1 { margin: 0 0 8px 0; font-size: 20px; }
      .meta { color: #94a3b8; margin-bottom: 20px; font-size: 12px; }
      .row { border: 1px solid #1e293b; border-radius: 8px; padding: 12px; margin-bottom: 10px; background: #111827; }
      .line { display: flex; gap: 10px; align-items: center; font-weight: 600; }
      .status { min-width: 74px; display: inline-block; }
      .detail { margin-top: 6px; color: #cbd5e1; font-size: 13px; }
      .row.success { border-color: #14532d; }
      .row.success .status { color: #22c55e; }
      .row.error { border-color: #7f1d1d; }
      .row.error .status { color: #ef4444; }
      .row.running { border-color: #1e3a8a; }
      .row.running .status { color: #60a5fa; }
      .row.skipped .status { color: #f59e0b; }
      .row.pending .status { color: #94a3b8; }
    </style>
  </head>
  <body>
    <h1>SPA Health Checker Live Progress</h1>
    <div class="meta">Started: ${escapeHtml(
      state.startedAt
    )} | Updated: ${escapeHtml(state.updatedAt)} | Auto-refresh: 1s</div>
    ${routeRows}
  </body>
</html>`
}

const writeLiveUiFiles = async (state: LiveUiState): Promise<void> => {
  await writeFile(liveUiJsonPath, JSON.stringify(state, null, 2), 'utf8')
  await writeFile(liveUiHtmlPath, renderHtml(state), 'utf8')
}

export const createLiveUiState = async (routeSpecs: RouteSpec[]): Promise<LiveUiState> => {
  const startedAt = nowIso()
  const state: LiveUiState = {
    startedAt,
    updatedAt: startedAt,
    rows: routeSpecs.map(route => ({
      path: route.path,
      status: 'PENDING',
      detail: 'Waiting to run.',
      updatedAt: startedAt
    }))
  }

  await writeLiveUiFiles(state)
  return state
}

const setRouteState = (
  state: LiveUiState,
  routePath: string,
  status: LiveRouteStatus,
  detail: string
): void => {
  const updatedAt = nowIso()
  const row = state.rows.find(item => item.path === routePath)
  if (!row) {
    return
  }

  row.status = status
  row.detail = detail
  row.updatedAt = updatedAt
  state.updatedAt = updatedAt
}

export const markRouteRunning = async (
  state: LiveUiState,
  routePath: string
): Promise<void> => {
  setRouteState(state, routePath, 'RUNNING', 'Opening route...')
  await writeLiveUiFiles(state)
}

export const markRouteFinished = async (
  state: LiveUiState,
  result: RouteRunResult
): Promise<void> => {
  if (result.status === 'PASSED') {
    setRouteState(state, result.path, 'PASSED', 'Route loaded successfully.')
  } else if (result.status === 'FAILED') {
    const firstError = result.errors[0]
    const reason = firstError
      ? `[${firstError.type}] ${firstError.message}`
      : 'Unknown failure reason.'
    setRouteState(state, result.path, 'FAILED', reason)
  } else {
    const firstError = result.errors[0]
    const reason = firstError ? firstError.message : 'Skipped.'
    setRouteState(state, result.path, 'SKIPPED', reason)
  }

  await writeLiveUiFiles(state)
}

export const getLiveUiHtmlPath = (): string => liveUiHtmlPath
