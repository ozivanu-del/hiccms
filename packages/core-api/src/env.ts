import type { JWTPayload } from './middleware/authMiddleware'

export type WorkerBindings = {
  DB: D1Database
  STORAGE: R2Bucket
  JWT_SECRET?: string
  ENVIRONMENT?: 'development' | 'preview' | 'production'
  ALLOWED_ORIGINS?: string
  ALLOWED_ORIGIN_SUFFIXES?: string
  ADMIN_URL?: string
  SITE_NAME?: string
  RESET_EMAIL_FROM?: string
  RESEND_API_KEY?: string
}
export type WorkerVariables = { user: JWTPayload }
export type WorkerEnv = { Bindings: WorkerBindings; Variables: WorkerVariables }
