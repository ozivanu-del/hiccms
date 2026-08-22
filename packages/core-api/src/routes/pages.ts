import { Hono } from 'hono'
import { parsePageInput } from '@hiccms/page-manager'
import { authMiddleware, type JWTPayload } from '../middleware/authMiddleware'

type Bindings = { DB: D1Database }
type Variables = { user: JWTPayload }
const pages = new Hono<{ Bindings: Bindings, Variables: Variables }>()
const editorRoles = ['role-superadmin', 'role-admin', 'role-editor', 'role-author']

const summaryColumns = `id, title, slug, COALESCE(excerpt, '') AS excerpt, status, template,
  COALESCE(featured_image, '') AS featuredImage, is_homepage AS isHomepage,
  published_at AS publishedAt, created_at AS createdAt, updated_at AS updatedAt`
const detailColumns = `${summaryColumns}, COALESCE(content, '') AS content,
  COALESCE(meta_title, '') AS metaTitle, COALESCE(meta_description, '') AS metaDescription,
  COALESCE(meta_keywords, '') AS metaKeywords, author_id AS authorId`

function normalizePage<T extends Record<string, unknown>>(page: T | null): T | null {
  if (!page) return null
  return { ...page, isHomepage: Boolean(page.isHomepage) }
}

pages.get('/home', async (c) => {
  const settings = await c.env.DB.prepare(
    "SELECT key, value FROM settings WHERE key IN ('homepage_display', 'homepage_page_id')",
  ).all<{ key: string, value: string }>()
  const homepageSettings = Object.fromEntries(settings.results.map(({ key, value }) => [key, value]))
  if ((homepageSettings.homepage_display ?? 'latest_posts') !== 'static_page') {
    return c.json({ success: false, message: 'Homepage displays latest posts' }, 404)
  }
  const page = await c.env.DB.prepare(
    `SELECT ${detailColumns} FROM pages WHERE id = ? AND status = 'published' LIMIT 1`,
  ).bind(homepageSettings.homepage_page_id ?? '').first<Record<string, unknown>>()
  return page
    ? c.json({ success: true, data: normalizePage(page) })
    : c.json({ success: false, message: 'Homepage not configured' }, 404)
})

pages.get('/published', async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT ${summaryColumns} FROM pages WHERE status = 'published' ORDER BY title ASC`,
  ).all<Record<string, unknown>>()
  return c.json({ success: true, data: results.map((page) => normalizePage(page)) })
})

pages.get('/admin/:id', authMiddleware(editorRoles), async (c) => {
  const page = await c.env.DB.prepare(`SELECT ${detailColumns} FROM pages WHERE id = ?`)
    .bind(c.req.param('id')).first<Record<string, unknown>>()
  if (!page) return c.json({ success: false, message: 'Page not found' }, 404)
  const user = c.get('user')
  if (user.role === 'role-author' && page.authorId !== user.sub) return c.json({ success: false, message: 'Forbidden' }, 403)
  return c.json({ success: true, data: normalizePage(page) })
})

pages.get('/', authMiddleware(editorRoles), async (c) => {
  const user = c.get('user')
  const query = user.role === 'role-author'
    ? c.env.DB.prepare(`SELECT ${summaryColumns} FROM pages WHERE author_id = ? ORDER BY updated_at DESC`).bind(user.sub)
    : c.env.DB.prepare(`SELECT ${summaryColumns} FROM pages ORDER BY updated_at DESC`)
  const { results } = await query.all<Record<string, unknown>>()
  return c.json({ success: true, data: results.map((page) => normalizePage(page)) })
})

pages.get('/:slug', async (c) => {
  const page = await c.env.DB.prepare(
    `SELECT ${detailColumns} FROM pages WHERE slug = ? AND status = 'published' LIMIT 1`,
  ).bind(c.req.param('slug')).first<Record<string, unknown>>()
  return page
    ? c.json({ success: true, data: normalizePage(page) })
    : c.json({ success: false, message: 'Page not found' }, 404)
})

pages.post('/', authMiddleware(editorRoles), async (c) => {
  try {
    const input = parsePageInput(await c.req.json())
    const user = c.get('user')
    const id = crypto.randomUUID()
    const publishedAt = input.status === 'published' ? input.publishedAt ?? new Date().toISOString() : input.publishedAt
    const insert = c.env.DB.prepare(
      `INSERT INTO pages (id, title, slug, excerpt, content, status, template, featured_image,
       meta_title, meta_description, meta_keywords, is_homepage, author_id, published_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(id, input.title, input.slug, input.excerpt || null, input.content || null, input.status,
      input.template, input.featuredImage || null, input.metaTitle || null, input.metaDescription || null,
      input.metaKeywords || null, input.isHomepage ? 1 : 0, user.sub, publishedAt)
    if (input.isHomepage) await c.env.DB.batch([c.env.DB.prepare('UPDATE pages SET is_homepage = 0'), insert])
    else await insert.run()
    return c.json({ success: true, data: { id, slug: input.slug } }, 201)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create page'
    return c.json({ success: false, message }, message.includes('UNIQUE') ? 409 : 400)
  }
})

pages.put('/:id', authMiddleware(editorRoles), async (c) => {
  try {
    const id = c.req.param('id')
    const user = c.get('user')
    const existing = await c.env.DB.prepare('SELECT author_id FROM pages WHERE id = ?').bind(id).first<{ author_id: string }>()
    if (!existing) return c.json({ success: false, message: 'Page not found' }, 404)
    if (user.role === 'role-author' && existing.author_id !== user.sub) return c.json({ success: false, message: 'Forbidden' }, 403)
    const input = parsePageInput(await c.req.json())
    const publishedAt = input.status === 'published' ? input.publishedAt ?? new Date().toISOString() : input.publishedAt
    const update = c.env.DB.prepare(
      `UPDATE pages SET title = ?, slug = ?, excerpt = ?, content = ?, status = ?, template = ?,
       featured_image = ?, meta_title = ?, meta_description = ?, meta_keywords = ?, is_homepage = ?,
       published_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    ).bind(input.title, input.slug, input.excerpt || null, input.content || null, input.status, input.template,
      input.featuredImage || null, input.metaTitle || null, input.metaDescription || null,
      input.metaKeywords || null, input.isHomepage ? 1 : 0, publishedAt, id)
    if (input.isHomepage) await c.env.DB.batch([c.env.DB.prepare('UPDATE pages SET is_homepage = 0'), update])
    else await update.run()
    return c.json({ success: true, message: 'Page updated' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to update page'
    return c.json({ success: false, message }, message.includes('UNIQUE') ? 409 : 400)
  }
})

pages.delete('/:id', authMiddleware(editorRoles), async (c) => {
  const id = c.req.param('id')
  const user = c.get('user')
  const existing = await c.env.DB.prepare('SELECT author_id FROM pages WHERE id = ?').bind(id).first<{ author_id: string }>()
  if (!existing) return c.json({ success: false, message: 'Page not found' }, 404)
  if (user.role === 'role-author' && existing.author_id !== user.sub) return c.json({ success: false, message: 'Forbidden' }, 403)
  await c.env.DB.prepare("UPDATE pages SET status = 'archived', is_homepage = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(id).run()
  return c.json({ success: true, message: 'Page archived' })
})

export default pages
