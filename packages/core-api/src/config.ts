import type { WorkerBindings } from './env'

const DEVELOPMENT_JWT_SECRET = 'hiccms-local-development-secret-change-me'

function commaSeparated(value?: string): string[] {
  return (value ?? '').split(',').map((item) => item.trim()).filter(Boolean)
}

export function getJwtSecret(env: WorkerBindings): string {
  if (env.JWT_SECRET && env.JWT_SECRET.length >= 32) return env.JWT_SECRET
  if ((env.ENVIRONMENT ?? 'development') === 'development') return DEVELOPMENT_JWT_SECRET
  throw new Error('JWT_SECRET must contain at least 32 characters outside development')
}

export function resolveAllowedOrigin(origin: string, env: WorkerBindings): string | undefined {
  const environment = env.ENVIRONMENT ?? 'development'
  const exactOrigins = new Set(commaSeparated(env.ALLOWED_ORIGINS))
  if (environment === 'development') {
    exactOrigins.add('http://localhost:5173')
    exactOrigins.add('http://localhost:5174')
    exactOrigins.add('http://127.0.0.1:5173')
    exactOrigins.add('http://127.0.0.1:5174')
  }
  if (exactOrigins.has(origin)) return origin

  try {
    const url = new URL(origin)
    if (url.protocol !== 'https:') return undefined
    const suffixes = commaSeparated(env.ALLOWED_ORIGIN_SUFFIXES)
    if (suffixes.some((suffix) => url.hostname === suffix || url.hostname.endsWith(`.${suffix}`))) {
      return origin
    }
  } catch {
    return undefined
  }
  return undefined
}

export function getAdminUrl(env: WorkerBindings): string {
  const value = env.ADMIN_URL?.replace(/\/$/, '')
  if (value) return value
  if ((env.ENVIRONMENT ?? 'development') === 'development') return 'http://localhost:5173'
  throw new Error('ADMIN_URL is required outside development')
}

export function getResetEmailFrom(env: WorkerBindings): string {
  if (env.RESET_EMAIL_FROM?.trim()) return env.RESET_EMAIL_FROM.trim()
  if ((env.ENVIRONMENT ?? 'development') === 'development') return 'HIC-CMS <noreply@hiccms.com>'
  throw new Error('RESET_EMAIL_FROM is required outside development when password reset email is enabled')
}
