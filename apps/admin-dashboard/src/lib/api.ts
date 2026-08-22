export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8787'
export const SITE_URL = import.meta.env.VITE_SITE_URL ?? 'http://localhost:4321'

function getToken(): string | undefined {
  return document.cookie.split('; ').find((row) => row.startsWith('token='))?.split('=')[1]
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken()
  const isFormData = init.body instanceof FormData
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...(init.body && !isFormData ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  })
  const result = await response.json() as T & { message?: string }
  if (!response.ok) throw new Error(result.message || `Request failed (${response.status})`)
  return result
}

export async function apiDownload(path: string): Promise<{ blob: Blob; filename: string }> {
  const token = getToken()
  const response = await fetch(`${API_URL}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
  if (!response.ok) {
    const result = await response.json().catch(() => ({})) as { message?: string }
    throw new Error(result.message || `Download failed (${response.status})`)
  }
  const disposition = response.headers.get('content-disposition') ?? ''
  const filename = disposition.match(/filename="?([^";]+)"?/i)?.[1] ?? 'hiccms-template.json'
  return { blob: await response.blob(), filename }
}
