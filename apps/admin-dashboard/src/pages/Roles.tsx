import { useEffect, useState } from 'react'
import { CheckCircle2, ShieldCheck } from 'lucide-react'
import { apiRequest } from '../lib/api'
import { canManageUsers, type RoleDefinition, type UserProfile } from '../lib/roles'

type ApiResponse<T> = { success: boolean; data: T }
type RoleResponse = { roles: RoleDefinition[]; assignable: RoleDefinition[] }

export default function Roles() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null)
  const [roles, setRoles] = useState<RoleDefinition[]>([])
  const [assignableRoles, setAssignableRoles] = useState<RoleDefinition[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void Promise.all([
      apiRequest<ApiResponse<UserProfile>>('/api/auth/me').then((response) => setCurrentUser(response.data)),
      apiRequest<ApiResponse<RoleResponse>>('/api/roles').then((response) => {
        setRoles(response.data.roles)
        setAssignableRoles(response.data.assignable)
      }),
    ]).finally(() => setLoading(false))
  }, [])

  const isSuperRoot = currentUser?.role === 'role-superadmin'
  const baseRoles = isSuperRoot ? roles : assignableRoles
  const visibleRoles = baseRoles
    .map((role) => ({
      ...role,
      permissions: (isSuperRoot ? role.permissions : role.permissions.slice(0, 3)).map((permission) => {
        if (isSuperRoot) return permission
        return permission
          .replace('selain Super Root', 'sesuai batas akses')
          .replace('Super Root', 'role di atasnya')
      }),
    }))

  if (loading) return <div className="text-sm text-gray-500">Memuat hak akses...</div>
  if (!canManageUsers(currentUser?.role)) return <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">Menu ini hanya untuk Super Root dan Admin.</div>

  return (
    <div className="space-y-6">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900"><ShieldCheck className="h-7 w-7 text-blue-600" />Hak Akses & Role</h1>
        <p className="mt-1 text-slate-500">Matriks role yang berlaku untuk tenant RA Hidayatul Muhibbin.</p>
      </header>

      <div className="grid gap-5 xl:grid-cols-2">
        {visibleRoles.map((role) => (
          <section key={role.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{role.label}</h2>
                <p className="mt-1 text-sm text-slate-500">{role.description}</p>
              </div>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">{role.id}</span>
            </div>
            <ul className="mt-5 space-y-3 text-sm text-slate-700">
              {role.permissions.map((permission) => (
                <li key={permission} className="flex gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{permission}</span>
                </li>
              ))}
            </ul>
            {!isSuperRoot && (
              <p className="mt-4 text-xs text-slate-400">Tampilan diringkas untuk role non Super Root.</p>
            )}
          </section>
        ))}
      </div>
    </div>
  )
}
