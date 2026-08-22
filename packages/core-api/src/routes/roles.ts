import { Hono } from 'hono'
import { authMiddleware, type JWTPayload } from '../middleware/authMiddleware'
import { ROLE_DEFINITIONS, getAssignableRoles } from '../roles'

const roles = new Hono<{ Bindings: { DB: D1Database }, Variables: { user: JWTPayload } }>()

roles.get('/', authMiddleware(['role-superadmin', 'role-admin']), async (c) => {
  const user = c.get('user')
  return c.json({
    success: true,
    data: {
      roles: ROLE_DEFINITIONS,
      assignable: getAssignableRoles(user.role),
    },
  })
})

export default roles
