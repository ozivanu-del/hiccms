import { Hono } from 'hono'
import { authMiddleware, type JWTPayload } from '../middleware/authMiddleware'
import { hashPassword, validatePassword } from '../utils/crypto'
import { canAssignRole, canManageTarget, canResetPasswordForTarget } from '../roles'

type Env = { Bindings: { DB: D1Database }, Variables: { user: JWTPayload } }

type UserRow = {
  id: string
  email: string
  name: string
  role_id: string
  must_change_password?: number
}

const users = new Hono<Env>()

users.use('/*', authMiddleware(['role-superadmin', 'role-admin']))

users.get('/', async (c) => {
  const currentUser = c.get('user')
  const rows = await c.env.DB.prepare(
    `SELECT users.id, users.email, users.name, users.role_id, users.must_change_password, users.created_at, users.updated_at,
            roles.name AS role_name
     FROM users
     JOIN roles ON roles.id = users.role_id
     ${currentUser.role === 'role-admin' ? "WHERE users.role_id != 'role-superadmin'" : ''}
     ORDER BY
       CASE users.role_id
         WHEN 'role-superadmin' THEN 0
         WHEN 'role-admin' THEN 1
         WHEN 'role-editor' THEN 2
         ELSE 3
       END,
       users.name ASC`,
  ).all()

  return c.json({ success: true, data: rows.results })
})

users.post('/', async (c) => {
  try {
    const currentUser = c.get('user')
    const body = await c.req.json<{
      email?: string
      name?: string
      roleId?: string
      password?: string
      mustChangePassword?: boolean
    }>()

    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const roleId = typeof body.roleId === 'string' ? body.roleId : ''
    const password = body.password

    if (!email || !name || !roleId || typeof password !== 'string') {
      return c.json({ success: false, message: 'Nama, email, role, dan password wajib diisi' }, 400)
    }
    if (!canAssignRole(currentUser.role, roleId)) {
      return c.json({ success: false, message: 'Role tidak diizinkan untuk akun Anda' }, 403)
    }
    const passwordError = validatePassword(password)
    if (passwordError) return c.json({ success: false, message: passwordError }, 400)

    const existing = await c.env.DB.prepare('SELECT id FROM users WHERE lower(email) = ?').bind(email).first<{ id: string }>()
    if (existing) return c.json({ success: false, message: 'Email sudah terdaftar' }, 409)

    const id = crypto.randomUUID()
    const passwordHash = await hashPassword(password)
    await c.env.DB.prepare(
      'INSERT INTO users (id, email, password_hash, name, role_id, must_change_password) VALUES (?, ?, ?, ?, ?, ?)',
    ).bind(id, email, passwordHash, name, roleId, body.mustChangePassword ? 1 : 0).run()

    return c.json({ success: true, message: 'Pengguna berhasil dibuat', data: { id } }, 201)
  } catch (error: any) {
    return c.json({ success: false, message: error.message || 'Gagal membuat pengguna' }, 500)
  }
})

users.put('/:id', async (c) => {
  try {
    const currentUser = c.get('user')
    const targetId = c.req.param('id')
    const body = await c.req.json<{
      email?: string
      name?: string
      roleId?: string
      mustChangePassword?: boolean
    }>()

    const existing = await c.env.DB.prepare('SELECT id, role_id FROM users WHERE id = ?').bind(targetId).first<UserRow>()
    if (!existing) return c.json({ success: false, message: 'Pengguna tidak ditemukan' }, 404)
    if (!canManageTarget(currentUser.role, existing.role_id, currentUser.sub, existing.id)) {
      return c.json({ success: false, message: 'Anda tidak dapat mengubah pengguna ini' }, 403)
    }

    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const roleId = typeof body.roleId === 'string' ? body.roleId : ''
    if (!email || !name || !roleId) {
      return c.json({ success: false, message: 'Nama, email, dan role wajib diisi' }, 400)
    }
    if (!canAssignRole(currentUser.role, roleId)) {
      return c.json({ success: false, message: 'Role tujuan tidak diizinkan untuk akun Anda' }, 403)
    }

    const duplicate = await c.env.DB.prepare('SELECT id FROM users WHERE lower(email) = ? AND id != ?').bind(email, targetId).first<{ id: string }>()
    if (duplicate) return c.json({ success: false, message: 'Email sudah digunakan akun lain' }, 409)

    await c.env.DB.prepare(
      'UPDATE users SET email = ?, name = ?, role_id = ?, must_change_password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    ).bind(email, name, roleId, body.mustChangePassword ? 1 : 0, targetId).run()

    return c.json({ success: true, message: 'Pengguna berhasil diperbarui' })
  } catch (error: any) {
    return c.json({ success: false, message: error.message || 'Gagal memperbarui pengguna' }, 500)
  }
})

users.put('/:id/password', async (c) => {
  try {
    const currentUser = c.get('user')
    const targetId = c.req.param('id')
    const body = await c.req.json<{ newPassword?: string; mustChangePassword?: boolean }>()
    const existing = await c.env.DB.prepare('SELECT id, role_id FROM users WHERE id = ?').bind(targetId).first<UserRow>()
    if (!existing) return c.json({ success: false, message: 'Pengguna tidak ditemukan' }, 404)
    if (!canResetPasswordForTarget(currentUser.role, existing.role_id, currentUser.sub, existing.id)) {
      return c.json({ success: false, message: 'Anda tidak dapat mengubah password pengguna ini' }, 403)
    }
    const passwordError = validatePassword(body.newPassword)
    if (passwordError) return c.json({ success: false, message: passwordError }, 400)

    const passwordHash = await hashPassword(body.newPassword as string)
    await c.env.DB.prepare(
      'UPDATE users SET password_hash = ?, must_change_password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    ).bind(passwordHash, body.mustChangePassword === false ? 0 : 1, targetId).run()

    return c.json({ success: true, message: 'Password pengguna berhasil diperbarui' })
  } catch (error: any) {
    return c.json({ success: false, message: error.message || 'Gagal mengubah password pengguna' }, 500)
  }
})

users.delete('/:id', async (c) => {
  try {
    const currentUser = c.get('user')
    const targetId = c.req.param('id')
    const existing = await c.env.DB.prepare('SELECT id, role_id FROM users WHERE id = ?').bind(targetId).first<UserRow>()
    if (!existing) return c.json({ success: false, message: 'Pengguna tidak ditemukan' }, 404)
    if (currentUser.sub === targetId) return c.json({ success: false, message: 'Akun yang sedang aktif tidak dapat dihapus' }, 400)
    if (!canManageTarget(currentUser.role, existing.role_id, currentUser.sub, existing.id)) {
      return c.json({ success: false, message: 'Anda tidak dapat menghapus pengguna ini' }, 403)
    }

    await c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(targetId).run()
    return c.json({ success: true, message: 'Pengguna berhasil dihapus' })
  } catch (error: any) {
    return c.json({ success: false, message: error.message || 'Gagal menghapus pengguna' }, 500)
  }
})

export default users
