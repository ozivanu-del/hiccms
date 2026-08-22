export type RoleId = 'role-superadmin' | 'role-admin' | 'role-editor' | 'role-author'

export type UserProfile = {
  sub: string
  email: string
  name: string
  role: RoleId | string
  mustChangePassword?: boolean
}

export type RoleDefinition = {
  id: RoleId
  name: string
  label: string
  description: string
  permissions: string[]
}

export const ROLE_LABELS: Record<string, string> = {
  'role-superadmin': 'Super Root',
  'role-admin': 'Admin',
  'role-editor': 'Editor',
  'role-author': 'Penulis',
}

export function roleLabel(roleId?: string): string {
  return roleId ? (ROLE_LABELS[roleId] ?? roleId) : '-'
}

export function canManageUsers(roleId?: string): boolean {
  return roleId === 'role-superadmin' || roleId === 'role-admin'
}

export function isSuperRoot(roleId?: string): boolean {
  return roleId === 'role-superadmin'
}

export function canResetPassword(currentRole?: string, currentUserId?: string, targetRole?: string, targetUserId?: string): boolean {
  if (currentRole === 'role-superadmin') return true
  if (currentRole !== 'role-admin') return false
  if (currentUserId && targetUserId && currentUserId === targetUserId) return true
  return targetRole === 'role-editor' || targetRole === 'role-author'
}
