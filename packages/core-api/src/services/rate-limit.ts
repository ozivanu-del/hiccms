import { sha256 } from '../utils/crypto'

export type RateLimitResult = {
  allowed: boolean
  limit: number
  remaining: number
  retryAfterSeconds: number
}

type RateLimitInput = {
  scope: string
  identifier: string
  limit: number
  windowSeconds: number
  cost?: number
}

export async function consumeRateLimit(db: D1Database, input: RateLimitInput): Promise<RateLimitResult> {
  const cost = Math.max(1, Math.floor(input.cost ?? 1))
  const nowSeconds = Math.floor(Date.now() / 1000)
  const windowStartSeconds = Math.floor(nowSeconds / input.windowSeconds) * input.windowSeconds
  const windowStartedAt = new Date(windowStartSeconds * 1000).toISOString()
  const identifierHash = await sha256(`${input.scope}:${input.identifier}`)
  const retryAfterSeconds = Math.max(1, windowStartSeconds + input.windowSeconds - nowSeconds)

  if (cost > input.limit) {
    return { allowed: false, limit: input.limit, remaining: 0, retryAfterSeconds }
  }

  const counter = await db.prepare(
    `INSERT INTO security_rate_limits
       (scope, identifier_hash, window_started_at, request_count, updated_at)
     VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(scope, identifier_hash, window_started_at) DO UPDATE SET
       request_count = security_rate_limits.request_count + excluded.request_count,
       updated_at = CURRENT_TIMESTAMP
     WHERE security_rate_limits.request_count + excluded.request_count <= ?
     RETURNING request_count`,
  ).bind(input.scope, identifierHash, windowStartedAt, cost, input.limit)
    .first<{ request_count: number }>()

  if (!counter) return { allowed: false, limit: input.limit, remaining: 0, retryAfterSeconds }
  return {
    allowed: true,
    limit: input.limit,
    remaining: Math.max(0, input.limit - counter.request_count),
    retryAfterSeconds,
  }
}
