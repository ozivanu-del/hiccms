export type RoleId = 'role-superadmin' | 'role-admin' | 'role-editor' | 'role-author'

export type RoleDefinition = {
  id: RoleId
  name: string
  label: string
  description: string
  permissions: string[]
}

export const ROLE_DEFINITIONS: RoleDefinition[] = [
  {
    id: 'role-superadmin',
    name: 'Super Admin',
    label: 'Super Root',
    description: 'Akses penuh ke seluruh sistem, pengguna, dan pengaturan hak akses.',
    permissions: [
      'Kelola semua menu dashboard',
      'Kelola semua pengguna dan semua role',
      'Ubah pengaturan, media, halaman, artikel, template',
      'Akses penuh termasuk promosi/demosi akun lain',
    ],
  },
  {
    id: 'role-admin',
    name: 'Admin',
    label: 'Admin',
    description: 'Mengelola seluruh konten situs dan dapat membuat akun admin/editor/penulis.',
    permissions: [
      'Kelola artikel, halaman, media, tampilan, template',
      'Kelola pengguna selain Super Root',
      'Buat akun admin, editor, dan penulis',
      'Tidak dapat membuat atau mengubah Super Root',
    ],
  },
  {
    id: 'role-editor',
    name: 'Editor',
    label: 'Editor',
    description: 'Mengelola konten editorial tanpa akses manajemen pengguna.',
    permissions: [
      'Kelola artikel, halaman, kategori, navigasi',
      'Tidak dapat mengelola user dan hak akses',
    ],
  },
  {
    id: 'role-author',
    name: 'Author',
    label: 'Penulis',
    description: 'Menulis dan mengelola kontennya sendiri.',
    permissions: [
      'Membuat dan mengedit artikel sendiri',
      'Mengelola halaman sendiri sesuai batas sistem',
      'Tidak dapat mengelola user dan pengaturan tingkat situs',
    ],
  },
]

export const MANAGEMENT_ROLES: RoleId[] = ['role-superadmin', 'role-admin']

export function getRoleDefinition(roleId: string | undefined): RoleDefinition | undefined {
  return ROLE_DEFINITIONS.find((role) => role.id === roleId)
}

export function getAssignableRoles(actorRole: string): RoleDefinition[] {
  if (actorRole === 'role-superadmin') return ROLE_DEFINITIONS
  if (actorRole === 'role-admin') return ROLE_DEFINITIONS.filter((role) => role.id !== 'role-superadmin')
  return []
}

export function canManageUsers(actorRole: string): boolean {
  return MANAGEMENT_ROLES.includes(actorRole as RoleId)
}

export function canAssignRole(actorRole: string, targetRole: string): boolean {
  return getAssignableRoles(actorRole).some((role) => role.id === targetRole)
}

export function canManageTarget(actorRole: string, targetRole: string, actorId?: string, targetId?: string): boolean {
  if (!canManageUsers(actorRole)) return false
  if (actorId && targetId && actorId === targetId) return actorRole === 'role-superadmin'
  if (actorRole === 'role-superadmin') return true
  if (actorRole === 'role-admin') return targetRole !== 'role-superadmin'
  return false
}

export function canResetPasswordForTarget(actorRole: string, targetRole: string, actorId?: string, targetId?: string): boolean {
  if (actorRole === 'role-superadmin') return true
  if (actorRole !== 'role-admin') return false
  if (actorId && targetId && actorId === targetId) return true
  return targetRole === 'role-editor' || targetRole === 'role-author'
}
