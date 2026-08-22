import { API_URL } from './api'

export function resolveMediaUrl(value?: string | null): string | undefined {
  const url = value?.trim()
  if (!url) return undefined
  if (url.startsWith('/customer/')) return url
  const driveMatch = url.match(/^https?:\/\/drive\.google\.com\/file\/d\/([^/]+)/i)
  if (driveMatch) return `https://drive.google.com/thumbnail?id=${encodeURIComponent(driveMatch[1])}&sz=w1600`
  if (/^https?:\/\//i.test(url)) return url
  return `${API_URL}${url.startsWith('/') ? url : `/${url}`}`
}
