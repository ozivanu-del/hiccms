import { useState } from 'react'
import type { FormEvent } from 'react'
import { KeyRound, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { apiRequest } from '../lib/api'

type ChangePasswordResponse = {
  success: boolean
  message: string
}

export default function AccountSecurity() {
  const navigate = useNavigate()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
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
      await apiRequest<ChangePasswordResponse>('/api/auth/password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
      navigate('/login', {
        replace: true,
        state: { message: 'Password berhasil diubah. Silakan login kembali.' },
      })
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Gagal mengubah password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Keamanan Akun</h1>
        <p className="mt-1 text-sm text-gray-600">Ganti password akun Admin yang sedang digunakan.</p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-start gap-3 rounded-lg bg-blue-50 p-4 text-blue-900">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="text-sm">
            Gunakan minimal 12 karakter yang memuat huruf besar, huruf kecil, dan angka. Setelah
            berhasil, Anda akan diminta login kembali.
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

          <PasswordField
            id="current-password"
            label="Password saat ini"
            value={currentPassword}
            onChange={setCurrentPassword}
            autoComplete="current-password"
          />
          <PasswordField
            id="new-password"
            label="Password baru"
            value={newPassword}
            onChange={setNewPassword}
            autoComplete="new-password"
          />
          <PasswordField
            id="confirm-password"
            label="Konfirmasi password baru"
            value={confirmation}
            onChange={setConfirmation}
            autoComplete="new-password"
          />

          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <KeyRound className="mr-2 h-4 w-4" />
            {loading ? 'Menyimpan...' : 'Ubah Password'}
          </button>
        </form>
      </div>
    </div>
  )
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  autoComplete: string
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-gray-700">
        {label}
      </label>
      <input
        id={id}
        type="password"
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
      />
    </div>
  )
}
