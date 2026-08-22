import { Context, Hono } from 'hono'
import { setCookie, deleteCookie } from 'hono/cookie'
import { sign } from 'hono/jwt'
import {
  generateSecureToken,
  hashPassword,
  sha256,
  validatePassword,
  verifyPassword,
} from '../utils/crypto'
import { authMiddleware, type JWTPayload } from '../middleware/authMiddleware'
import { getAdminUrl, getJwtSecret, getResetEmailFrom } from '../config'
import { sendPasswordResetEmail } from '../services/resendEmail'
import { consumeRateLimit, type RateLimitResult } from '../services/rate-limit'
import { writeSecurityAuditEvent } from '../services/security-audit'
import type { WorkerBindings } from '../env'

const auth = new Hono<{
  Bindings: WorkerBindings
  Variables: { user: JWTPayload }
}>()
type AuthContext = Context<{
  Bindings: WorkerBindings
  Variables: { user: JWTPayload }
}>

auth.post('/login', async (c) => {
  try {
    const { email, password } = await c.req.json()
    if (!email || !password) {
      return c.json({ success: false, message: 'Email and password are required' }, 400)
    }

    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''
    const clientIp = c.req.header('CF-Connecting-IP') || 'unknown'
    const [ipLimit, emailLimit] = await Promise.all([
      consumeRateLimit(c.env.DB, {
        scope: 'auth-login-ip', identifier: clientIp, limit: 10, windowSeconds: 15 * 60,
      }),
      consumeRateLimit(c.env.DB, {
        scope: 'auth-login-email', identifier: normalizedEmail || 'invalid', limit: 5, windowSeconds: 15 * 60,
      }),
    ])
    const blockedLimit = !ipLimit.allowed ? ipLimit : !emailLimit.allowed ? emailLimit : undefined
    if (blockedLimit) return rateLimitResponse(c, blockedLimit, 'Terlalu banyak percobaan login. Coba lagi nanti.')

    // Query user from D1
    const { results } = await c.env.DB.prepare('SELECT * FROM users WHERE email = ?')
      .bind(normalizedEmail)
      .all()
    
    const user: any = results && results.length > 0 ? results[0] : null
    
    if (!user) {
      return c.json({ success: false, message: 'Invalid credentials' }, 401)
    }

    // Verify password hash
    const isValid = await verifyPassword(password, user.password_hash)
    if (!isValid) {
      return c.json({ success: false, message: 'Invalid credentials' }, 401)
    }

    // Generate JWT
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role_id,
      mustChangePassword: user.must_change_password === 1,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 // 24 hours expiration
    }

    const secret = getJwtSecret(c.env)
    const token = await sign(payload, secret, 'HS256')

    // Set HttpOnly Cookie
    setCookie(c, 'token', token, {
      httpOnly: true,
      secure: true, // Requires HTTPS, CF Pages enforces this
      sameSite: 'Strict',
      path: '/',
      maxAge: 60 * 60 * 24 // 24 hours
    })

    return c.json({
      success: true,
      message: 'Login successful',
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role_id,
        mustChangePassword: user.must_change_password === 1,
        token: token
      }
    })
  } catch (err: any) {
    return c.json({ success: false, message: 'Internal server error', error: err.message }, 500)
  }
})

auth.post('/logout', (c) => {
  deleteCookie(c, 'token', { path: '/' })
  return c.json({ success: true, message: 'Logout successful' })
})

// Protected route to get current user info
auth.get('/me', authMiddleware(), (c) => {
  const user = c.get('user')
  return c.json({
    success: true,
    data: user
  })
})

auth.put('/password', authMiddleware(), async (c) => {
  try {
    const { currentPassword, newPassword } = await c.req.json<{
      currentPassword?: string
      newPassword?: string
    }>()

    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
      return c.json({ success: false, message: 'Password saat ini dan password baru wajib diisi' }, 400)
    }

    if (!currentPassword || !newPassword) {
      return c.json({ success: false, message: 'Password saat ini dan password baru wajib diisi' }, 400)
    }

    if (currentPassword.length > 128 || newPassword.length > 128) {
      return c.json({ success: false, message: 'Password maksimal 128 karakter' }, 400)
    }

    const passwordError = validatePassword(newPassword)
    if (passwordError) return c.json({ success: false, message: passwordError }, 400)

    if (currentPassword === newPassword) {
      return c.json({ success: false, message: 'Password baru harus berbeda dari password saat ini' }, 400)
    }

    const userPayload = c.get('user')
    const user = await c.env.DB.prepare('SELECT password_hash FROM users WHERE id = ?')
      .bind(userPayload.sub)
      .first<{ password_hash: string }>()

    if (!user || !(await verifyPassword(currentPassword, user.password_hash))) {
      return c.json({ success: false, message: 'Password saat ini tidak benar' }, 400)
    }

    const passwordHash = await hashPassword(newPassword)
    await c.env.DB.prepare(
      'UPDATE users SET password_hash = ?, must_change_password = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    )
      .bind(passwordHash, userPayload.sub)
      .run()

    return c.json({
      success: true,
      message: 'Password berhasil diubah. Silakan login kembali dengan password baru.',
    })
  } catch (err) {
    console.error('Change password error:', err)
    return c.json({ success: false, message: 'Gagal mengubah password' }, 500)
  }
})

const resetRequestMessage = 'Jika email terdaftar, tautan pengaturan ulang password akan segera dikirim.'

auth.post('/forgot-password', async (c) => {
  try {
    const body = await c.req.json<{ email?: unknown }>()
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    if (!email || email.length > 254 || !email.includes('@')) {
      return c.json({ success: true, message: resetRequestMessage }, 202)
    }

    const [emailLimit, ipLimit] = await Promise.all([
      consumeRateLimit(c.env.DB, {
        scope: 'password-reset-email', identifier: email, limit: 3, windowSeconds: 60 * 60,
      }),
      consumeRateLimit(c.env.DB, {
        scope: 'password-reset-ip',
        identifier: c.req.header('CF-Connecting-IP') || 'unknown',
        limit: 20,
        windowSeconds: 60 * 60,
      }),
    ])
    if (!emailLimit.allowed || !ipLimit.allowed) {
      return c.json({ success: true, message: resetRequestMessage }, 202)
    }

    const user = await c.env.DB.prepare('SELECT id, email FROM users WHERE lower(email) = ?')
      .bind(email)
      .first<{ id: string; email: string }>()

    if (!user) return c.json({ success: true, message: resetRequestMessage }, 202)
    if (!c.env.RESEND_API_KEY) {
      await logPasswordResetError(c.env.DB, 'configuration', 'RESEND_API_KEY is not available')
      console.error('Password reset email skipped: RESEND_API_KEY is not configured')
      return c.json({ success: true, message: resetRequestMessage }, 202)
    }

    const token = generateSecureToken()
    const tokenHash = await sha256(token)
    const tokenId = crypto.randomUUID()
    await c.env.DB.prepare(
      "INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, datetime('now', '+30 minutes'))",
    ).bind(tokenId, user.id, tokenHash).run()

    try {
      const resetUrl = `${getAdminUrl(c.env)}/reset-password?token=${encodeURIComponent(token)}`
      const providerMessageId = await sendPasswordResetEmail(c.env.RESEND_API_KEY, user.email, resetUrl, {
        siteName: c.env.SITE_NAME ?? 'HIC-CMS',
        from: getResetEmailFrom(c.env),
      })
      await c.env.DB.prepare(
        'UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE user_id = ? AND id != ? AND used_at IS NULL',
      ).bind(user.id, tokenId).run()
      await logPasswordResetSuccess(c.env.DB, providerMessageId)
    } catch (emailError) {
      await c.env.DB.prepare('DELETE FROM password_reset_tokens WHERE id = ?').bind(tokenId).run()
      const message = emailError instanceof Error ? emailError.message : String(emailError)
      await logPasswordResetError(c.env.DB, 'delivery', message)
      console.error('Password reset email failed:', emailError)
    }

    return c.json({ success: true, message: resetRequestMessage }, 202)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    await logPasswordResetError(c.env.DB, 'request', message)
    console.error('Forgot password error:', error)
    return c.json({ success: true, message: resetRequestMessage }, 202)
  }
})

function rateLimitResponse(c: AuthContext, result: RateLimitResult, message: string) {
  c.header('Retry-After', String(result.retryAfterSeconds))
  c.header('X-RateLimit-Limit', String(result.limit))
  c.header('X-RateLimit-Remaining', String(result.remaining))
  return c.json({ success: false, message }, 429)
}

async function logPasswordResetError(db: D1Database, stage: string, error: string): Promise<void> {
  try {
    await writeSecurityAuditEvent(db, {
      eventType: 'password-reset-email',
      status: 'error',
      provider: 'resend',
      stage,
      detail: error,
    })
  } catch (loggingError) {
    console.error('Password reset logging failed:', loggingError)
  }
}

async function logPasswordResetSuccess(db: D1Database, providerMessageId?: string): Promise<void> {
  try {
    await writeSecurityAuditEvent(db, {
      eventType: 'password-reset-email',
      status: 'accepted',
      provider: 'resend',
      providerMessageId,
      stage: 'delivery',
    })
  } catch (loggingError) {
    console.error('Password reset success logging failed:', loggingError)
  }
}

auth.post('/reset-password', async (c) => {
  try {
    const { token, newPassword } = await c.req.json<{
      token?: unknown
      newPassword?: unknown
    }>()
    if (typeof token !== 'string' || !token || token.length > 128) {
      return c.json({ success: false, message: 'Tautan reset tidak valid atau sudah kedaluwarsa' }, 400)
    }

    const passwordError = validatePassword(newPassword)
    if (passwordError) return c.json({ success: false, message: passwordError }, 400)

    const tokenHash = await sha256(token)
    const resetToken = await c.env.DB.prepare(
      'SELECT user_id FROM password_reset_tokens WHERE token_hash = ? AND used_at IS NULL AND expires_at > CURRENT_TIMESTAMP',
    ).bind(tokenHash).first<{ user_id: string }>()

    if (!resetToken) {
      return c.json({ success: false, message: 'Tautan reset tidak valid atau sudah kedaluwarsa' }, 400)
    }

    const passwordHash = await hashPassword(newPassword as string)
    const results = await c.env.DB.batch([
      c.env.DB.prepare(
        'UPDATE users SET password_hash = ?, must_change_password = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND EXISTS (SELECT 1 FROM password_reset_tokens WHERE token_hash = ? AND used_at IS NULL AND expires_at > CURRENT_TIMESTAMP)',
      ).bind(passwordHash, resetToken.user_id, tokenHash),
      c.env.DB.prepare(
        'UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE user_id = ? AND used_at IS NULL',
      ).bind(resetToken.user_id),
    ])

    if ((results[0].meta.changes ?? 0) !== 1) {
      return c.json({ success: false, message: 'Tautan reset tidak valid atau sudah kedaluwarsa' }, 400)
    }

    return c.json({ success: true, message: 'Password berhasil diperbarui. Silakan login.' })
  } catch (error) {
    console.error('Reset password error:', error)
    return c.json({ success: false, message: 'Gagal mengatur ulang password' }, 500)
  }
})

export default auth
