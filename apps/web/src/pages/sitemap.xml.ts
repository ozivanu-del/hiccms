import type { APIRoute } from 'astro'
import { API_URL } from '../lib/api'
import { SITE_URL } from '../lib/site'
const SITEMAP_HEADERS = {
  'Content-Type': 'application/xml; charset=utf-8',
  'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
}

interface SitemapEntry {
  slug: string
  updatedAt: string | null
}

interface SitemapResponse {
  success: boolean
  data?: { posts: SitemapEntry[]; pages: SitemapEntry[] }
}

function escapeXml(value: string) {
  return value.replace(/[<>&'\"]/g, (character) => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;',
  })[character] ?? character)
}

function normalizeLastModified(value: string | null) {
  if (!value) return null
  const normalized = value.includes('T') ? value : `${value.replace(' ', 'T')}Z`
  const date = new Date(normalized)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function absoluteUrl(pathname: string) {
  return new URL(pathname, SITE_URL).href
}

export const GET: APIRoute = async () => {
  const urls = new Map<string, string | null>([
    [absoluteUrl('/'), null],
    [absoluteUrl('/blog'), null],
    [absoluteUrl('/about'), null],
  ])

  try {
    const response = await fetch(`${API_URL}/api/seo/sitemap`)
    if (response.ok) {
      const result = await response.json() as SitemapResponse
      for (const page of result.data?.pages ?? []) {
        if (page.slug) urls.set(absoluteUrl(`/${encodeURIComponent(page.slug)}`), normalizeLastModified(page.updatedAt))
      }
      for (const post of result.data?.posts ?? []) {
        if (post.slug) urls.set(absoluteUrl(`/blog/${encodeURIComponent(post.slug)}`), normalizeLastModified(post.updatedAt))
      }
    }
  } catch {
    // Static public routes remain discoverable when the API is temporarily unavailable.
  }

  const entries = [...urls.entries()].map(([url, lastModified]) => [
    '  <url>',
    `    <loc>${escapeXml(url)}</loc>`,
    lastModified ? `    <lastmod>${escapeXml(lastModified)}</lastmod>` : null,
    '  </url>',
  ].filter(Boolean).join('\n')).join('\n')

  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`
  return new Response(body, { headers: SITEMAP_HEADERS })
}

export const HEAD: APIRoute = () => new Response(null, { headers: SITEMAP_HEADERS })
