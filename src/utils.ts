import { mkdir } from 'node:fs/promises'

export const ensureDirectory = async (directoryPath: string): Promise<void> => {
  await mkdir(directoryPath, { recursive: true })
}

export const slugifyPath = (path: string): string => {
  return path
    .replace(/^\/+/, '')
    .replace(/\/+/g, '-')
    .replace(/[:]/g, '')
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '') || 'root'
}

export const buildRoutePath = (
  routePath: string,
  params: Record<string, string> = {}
): string => {
  return routePath.replace(/:([A-Za-z0-9_]+)/g, (_, key: string) => {
    return params[key] ?? `missing-${key}`
  })
}

export const normalizePathname = (value: string): string => {
  if (!value.startsWith('/')) {
    return `/${value}`
  }

  return value
}

export const buildAbsoluteUrl = (baseUrl: string, path: string): string => {
  return new URL(path, `${baseUrl}/`).toString()
}
