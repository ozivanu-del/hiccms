import { useState } from 'react'
import type { FormEvent } from 'react'
import { KeyRound } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { API_URL } from '../lib/api'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const [newPassword, setNewPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState(token ? '' : 'Tautan reset tidak valid.')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    if (newPassword !== confirmation) {
      setError('Konfirmasi password baru tidak sama.')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      })
      const result = await response.json() as { success?: boolean; message?: string }
      if (!response.ok) throw new Error(result.message || 'Gagal mengatur ulang password.')
      navigate('/login', { replace: true, state: { message: 'Password berhasil diperbarui. Silakan login.' } })
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Koneksi ke server gagal.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-7 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600"><KeyRound className="h-6 w-6" /></div>
          <h1 className="mt-5 text-2xl font-bold text-gray-900">Buat Password Baru</h1>
          <p className="mt-2 text-sm text-gray-600">Minimal 12 karakter dengan huruf besar, huruf kecil, dan angka.</p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          <PasswordInput id="new-password" label="Password baru" value={newPassword} onChange={setNewPassword} />
          <PasswordInput id="confirm-password" label="Konfirmasi password baru" value={confirmation} onChange={setConfirmation} />
          <button type="submit" disabled={loading || !token} className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
            {loading ? 'Menyimpan...' : 'Simpan Password Baru'}
          </button>
        </form>
        <Link to="/forgot-password" className="mt-6 block text-center text-sm font-medium text-blue-600 hover:text-blue-700">Minta tautan reset baru</Link>
      </div>
    </div>
  )
}

function PasswordInput({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-gray-700">{label}</label>
      <input id={id} type="password" required autoComplete="new-password" value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200" />
    </div>
  )
}
