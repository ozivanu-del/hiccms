import { Context, Next } from 'hono'
import { getCookie } from 'hono/cookie'
import { verify } from 'hono/jwt'
import { getJwtSecret } from '../config'

// Default secret for development. Must be overridden in production via environment variables.
export type JWTPayload = {
  sub: string
  email: string
  role: string
  exp: number
  mustChangePassword?: boolean
}

export const authMiddleware = (allowedRoles: string[] = []) => {
  return async (c: Context, next: Next) => {
    try {
      // Prioritize Authorization Bearer header
      let token = c.req.header('Authorization')
      if (token && token.startsWith('Bearer ')) {
        token = token.substring(7)
      }
      
      // Fallback to cookie if no header
      if (!token) {
        token = getCookie(c, 'token')
      }
      
      // If the token literally says "undefined" (due to a previous frontend bug), clear it
      if (token === 'undefined') {
        token = undefined;
      }

      if (!token) {
        return c.json({ success: false, message: 'Unauthorized, no token provided' }, 401)
      }

      // Verify the token
      const secret = getJwtSecret(c.env)
      const payload = await verify(token, secret, 'HS256') as JWTPayload
      
      // Check expiration
      if (payload.exp < Math.floor(Date.now() / 1000)) {
        return c.json({ success: false, message: 'Token expired' }, 401)
      }

      const passwordChangeRoutes = new Set(['/api/auth/me', '/api/auth/password'])
      if (payload.mustChangePassword && !passwordChangeRoutes.has(c.req.path)) {
        return c.json({ success: false, message: 'Password must be changed before continuing' }, 403)
      }

      // Role Based Access Control check
      if (allowedRoles.length > 0 && !allowedRoles.includes(payload.role)) {
        return c.json({ success: false, message: 'Forbidden, insufficient role' }, 403)
      }

      // Attach user payload to the Hono context for downstream handlers
      c.set('user', payload)
      await next()
    } catch (e: any) {
      console.error('JWT Verification Error:', e);
      return c.json({ success: false, message: 'Invalid token: ' + (e.message || String(e)) }, 401)
    }
  }
}
