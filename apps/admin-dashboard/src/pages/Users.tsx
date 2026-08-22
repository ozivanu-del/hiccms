import { useEffect, useMemo, useState } from 'react'
import { Edit2, KeyRound, Plus, Shield, Trash2, UserPlus, X } from 'lucide-react'
import { apiRequest } from '../lib/api'
import { canManageUsers, canResetPassword, roleLabel, type RoleDefinition, type UserProfile } from '../lib/roles'

type ApiResponse<T> = { success: boolean; data: T; message?: string }

type ManagedUser = {
  id: string
  email: string
  name: string
  role_id: string
  role_name?: string
  must_change_password?: number
  created_at?: string
  updated_at?: string
}

type RoleResponse = {
  roles: RoleDefinition[]
  assignable: RoleDefinition[]
}

type UserForm = {
  name: string
  email: string
  roleId: string
  password: string
  mustChangePassword: boolean
}

const emptyForm = (): UserForm => ({
  name: '',
  email: '',
  roleId: 'role-author',
  password: '',
  mustChangePassword: true,
})

export default function Users() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null)
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [roles, setRoles] = useState<RoleDefinition[]>([])
  const [assignableRoles, setAssignableRoles] = useState<RoleDefinition[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<UserForm>(emptyForm())

  useEffect(() => {
    void Promise.all([fetchMe(), fetchRoles(), fetchUsers()]).finally(() => setLoading(false))
  }, [])

  const roleOptions = useMemo(
    () => (editingUser ? roles.filter((role) => assignableRoles.some((item) => item.id === role.id) || role.id === editingUser.role_id) : assignableRoles),
    [assignableRoles, editingUser, roles],
  )

  const fetchMe = async () => {
    const response = await apiRequest<ApiResponse<UserProfile>>('/api/auth/me')
    setCurrentUser(response.data)
  }

  const fetchUsers = async () => {
    const response = await apiRequest<ApiResponse<ManagedUser[]>>('/api/users')
    setUsers(response.data)
  }

  const fetchRoles = async () => {
    const response = await apiRequest<ApiResponse<RoleResponse>>('/api/roles')
    setRoles(response.data.roles)
    setAssignableRoles(response.data.assignable)
  }

  const openCreate = () => {
    setEditingUser(null)
    setForm({ ...emptyForm(), roleId: assignableRoles[0]?.id ?? 'role-author' })
    setShowForm(true)
    setMessage('')
  }

  const openEdit = (user: ManagedUser) => {
    setEditingUser(user)
    setForm({
      name: user.name,
      email: user.email,
      roleId: user.role_id,
      password: '',
      mustChangePassword: user.must_change_password === 1,
    })
    setShowForm(true)
    setMessage('')
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      if (!form.name.trim() || !form.email.trim() || !form.roleId) {
        throw new Error('Nama, email, dan role wajib diisi')
      }
      if (!editingUser && !form.password) {
        throw new Error('Password awal wajib diisi saat membuat akun baru')
      }

      if (editingUser) {
        await apiRequest('/api/users/' + editingUser.id, {
          method: 'PUT',
          body: JSON.stringify({
            name: form.name,
            email: form.email,
            roleId: form.roleId,
            mustChangePassword: form.mustChangePassword,
          }),
        })
        setMessage('Pengguna berhasil diperbarui.')
      } else {
        await apiRequest('/api/users', {
          method: 'POST',
          body: JSON.stringify({
            name: form.name,
            email: form.email,
            roleId: form.roleId,
            password: form.password,
            mustChangePassword: form.mustChangePassword,
          }),
        })
        setMessage('Pengguna baru berhasil dibuat.')
      }

      setShowForm(false)
      setEditingUser(null)
      setForm(emptyForm())
      await fetchUsers()
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Gagal menyimpan pengguna')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (user: ManagedUser) => {
    if (!window.confirm(`Hapus akun ${user.name}?`)) return
    try {
      await apiRequest(`/api/users/${user.id}`, { method: 'DELETE' })
      setMessage(`Akun ${user.name} dihapus.`)
      await fetchUsers()
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Gagal menghapus pengguna')
    }
  }

  const handleResetPassword = async (user: ManagedUser) => {
    const newPassword = window.prompt(`Masukkan password baru untuk ${user.email}\nMinimal 12 karakter, wajib huruf besar, kecil, dan angka.`)
    if (!newPassword) return
    try {
      await apiRequest(`/api/users/${user.id}/password`, {
        method: 'PUT',
        body: JSON.stringify({ newPassword, mustChangePassword: true }),
      })
      setMessage(`Password ${user.name} berhasil direset dan wajib diganti saat login.`)
      await fetchUsers()
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Gagal mereset password')
    }
  }

  if (loading) return <div className="text-sm text-gray-500">Memuat data pengguna...</div>
  if (!canManageUsers(currentUser?.role)) return <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">Menu ini hanya untuk Super Root dan Admin.</div>

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900"><UserPlus className="h-7 w-7 text-blue-600" />Manajemen Pengguna</h1>
          <p className="mt-1 text-slate-500">Kelola akun Super Root, Admin, Editor, dan Penulis sesuai struktur akses tenant RA.</p>
        </div>
        <button onClick={openCreate} className="inline-flex items-center rounded-xl bg-blue-600 px-5 py-2.5 font-medium text-white shadow-sm transition hover:bg-blue-700">
          <Plus className="mr-2 h-5 w-5" />
          Buat Akun
        </button>
      </header>

      {message && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div>}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-700">
              <tr>
                <th className="px-6 py-4 font-semibold">Nama</th>
                <th className="px-6 py-4 font-semibold">Email</th>
                <th className="px-6 py-4 font-semibold">Role</th>
                <th className="px-6 py-4 font-semibold">Status Password</th>
                <th className="px-6 py-4 text-right font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-slate-100">
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-900">{user.name}</div>
                    {currentUser?.sub === user.id && <div className="mt-1 text-xs font-medium text-blue-600">Akun aktif Anda</div>}
                  </td>
                  <td className="px-6 py-4">{user.email}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">{roleLabel(user.role_id)}</span>
                  </td>
                  <td className="px-6 py-4">
                    {user.must_change_password === 1
                      ? <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">Wajib ganti saat login</span>
                      : <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">Normal</span>}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openEdit(user)} className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-blue-700" title="Edit pengguna"><Edit2 className="h-4 w-4" /></button>
                      <button
                        onClick={() => handleResetPassword(user)}
                        disabled={!canResetPassword(currentUser?.role, currentUser?.sub, user.role_id, user.id)}
                        className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-500"
                        title="Reset password"
                      ><KeyRound className="h-4 w-4" /></button>
                      <button onClick={() => handleDelete(user)} className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-red-700" title="Hapus pengguna"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {!users.length && <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">Belum ada pengguna.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{editingUser ? 'Edit Pengguna' : 'Buat Pengguna Baru'}</h2>
                <p className="text-sm text-slate-500">{editingUser ? 'Perbarui nama, email, dan role akun.' : 'Tambahkan akun admin/editor/penulis baru di bawah tenant ini.'}</p>
              </div>
              <button onClick={() => setShowForm(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-5 px-6 py-5">
              <label className="block text-sm font-medium text-slate-700">Nama
                <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5" />
              </label>
              <label className="block text-sm font-medium text-slate-700">Email
                <input type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5" />
              </label>
              <label className="block text-sm font-medium text-slate-700">Role
                <select value={form.roleId} onChange={(event) => setForm((current) => ({ ...current, roleId: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5">
                  {roleOptions.map((role) => <option key={role.id} value={role.id}>{role.label}</option>)}
                </select>
              </label>
              {!editingUser && (
                <label className="block text-sm font-medium text-slate-700">Password Awal
                  <input type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5" />
                  <span className="mt-1 block text-xs font-normal text-slate-500">Minimal 12 karakter, wajib huruf besar, huruf kecil, dan angka.</span>
                </label>
              )}
              <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700">
                <input type="checkbox" checked={form.mustChangePassword} onChange={(event) => setForm((current) => ({ ...current, mustChangePassword: event.target.checked }))} className="h-4 w-4 rounded border-slate-300 text-blue-600" />
                Wajib ganti password saat login
              </label>
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
              <button onClick={() => setShowForm(false)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">Batal</button>
              <button onClick={() => void handleSave()} disabled={saving} className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-medium text-white disabled:opacity-60">{saving ? 'Menyimpan...' : editingUser ? 'Simpan Perubahan' : 'Buat Akun'}</button>
            </div>
          </div>
        </div>
      )}

      <section className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
        <h2 className="flex items-center gap-2 text-lg font-bold text-blue-950"><Shield className="h-5 w-5 text-blue-700" />Catatan Hak Akses</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-blue-900">
          {currentUser?.role === 'role-superadmin'
            ? <li>Super Root dapat mengelola semua akun, termasuk Admin dan role lain.</li>
            : <li>Admin dapat mengelola akun sesuai batas akses yang diizinkan sistem.</li>}
          {currentUser?.role === 'role-superadmin'
            ? <li>Super Root dapat membuat dan mengubah seluruh role, termasuk Super Root lain bila diperlukan.</li>
            : <li>Admin hanya dapat reset password akun sendiri, Editor, dan Penulis.</li>}
          <li>Password reset dari menu ini otomatis memaksa pengguna mengganti password saat login berikutnya.</li>
        </ul>
      </section>
    </div>
  )
}
