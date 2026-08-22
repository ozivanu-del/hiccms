import type { APIRoute } from 'astro'
import { SITE_URL } from '../lib/site'

const ROBOTS_HEADERS = {
  'Content-Type': 'text/plain; charset=utf-8',
  'Cache-Control': 'public, max-age=3600',
}

export const GET: APIRoute = () => new Response([
  'User-agent: *',
  'Allow: /',
  '',
  `Sitemap: ${SITE_URL}/sitemap.xml`,
  '',
].join('\n'), { headers: ROBOTS_HEADERS })

export const HEAD: APIRoute = () => new Response(null, { headers: ROBOTS_HEADERS })
