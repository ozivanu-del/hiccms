import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { apiRequest } from '../lib/api'

export default function ProtectedRoute() {
  const location = useLocation()
  const [state, setState] = useState<'checking' | 'authenticated' | 'force-password' | 'guest'>('checking')

  useEffect(() => {
    apiRequest<{ data: { mustChangePassword?: boolean } }>('/api/auth/me')
      .then((response) => setState(response.data.mustChangePassword ? 'force-password' : 'authenticated'))
      .catch(() => setState('guest'))
  }, [])

  if (state === 'checking') {
    return <div className="grid min-h-screen place-items-center bg-gray-50 text-sm text-gray-500">Memeriksa sesi...</div>
  }
  if (state === 'force-password') {
    return location.pathname === '/account/security' ? <Outlet /> : <Navigate to="/account/security" replace />
  }
  return state === 'authenticated' ? <Outlet /> : <Navigate to="/login" replace />
}
