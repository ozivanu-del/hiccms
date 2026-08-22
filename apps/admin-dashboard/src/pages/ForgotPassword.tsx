import { useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowLeft, Mail } from 'lucide-react'
import { Link } from 'react-router-dom'
import { API_URL } from '../lib/api'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const result = await response.json() as { success?: boolean; message?: string }
      if (!response.ok) throw new Error(result.message || 'Permintaan reset gagal.')
      setMessage(result.message || 'Jika email terdaftar, tautan reset akan segera dikirim.')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Koneksi ke server gagal.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthCard icon={<Mail className="h-6 w-6" />} title="Lupa Password" description="Masukkan email akun Admin Anda.">
      {message ? (
        <div className="space-y-5">
          <div className="rounded-lg bg-green-50 p-4 text-sm leading-6 text-green-800">{message}</div>
          <p className="text-sm text-gray-600">Periksa juga folder Spam. Tautan berlaku selama 30 menit.</p>
        </div>
      ) : (
        <form className="space-y-5" onSubmit={handleSubmit}>
          {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          <div>
            <label htmlFor="reset-email" className="mb-1.5 block text-sm font-medium text-gray-700">Email</label>
            <input
              id="reset-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="admin@hiccms.com"
            />
          </div>
          <button type="submit" disabled={loading} className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Mengirim...' : 'Kirim Tautan Reset'}
          </button>
        </form>
      )}
      <Link to="/login" className="mt-6 inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700">
        <ArrowLeft className="mr-1.5 h-4 w-4" /> Kembali ke Login
      </Link>
    </AuthCard>
  )
}

function AuthCard({ icon, title, description, children }: { icon: React.ReactNode; title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-7 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600">{icon}</div>
          <h1 className="mt-5 text-2xl font-bold text-gray-900">{title}</h1>
          <p className="mt-2 text-sm text-gray-600">{description}</p>
        </div>
        {children}
      </div>
    </div>
  )
}
