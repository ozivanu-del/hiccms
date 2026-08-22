import { Hono } from 'hono'

type Bindings = { DB: D1Database }
type SitemapEntry = { slug: string; updatedAt: string | null }

const seo = new Hono<{ Bindings: Bindings }>()

seo.get('/sitemap', async (c) => {
  try {
    const [posts, pages] = await c.env.DB.batch([
      c.env.DB.prepare(
        `SELECT slug, COALESCE(updated_at, published_at, created_at) AS updatedAt
         FROM posts
         WHERE (status = 'published' OR (status = 'scheduled' AND datetime(published_at) <= CURRENT_TIMESTAMP))
           AND visibility != 'private'
         ORDER BY published_at DESC`,
      ),
      c.env.DB.prepare(
        `SELECT slug, COALESCE(updated_at, published_at, created_at) AS updatedAt
         FROM pages WHERE status = 'published' ORDER BY title ASC`,
      ),
    ])

    c.header('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600')
    return c.json({
      success: true,
      data: {
        posts: (posts.results ?? []) as unknown as SitemapEntry[],
        pages: (pages.results ?? []) as unknown as SitemapEntry[],
      },
    })
  } catch (error) {
    return c.json({
      success: false,
      message: error instanceof Error ? error.message : 'Unable to build sitemap data',
    }, 500)
  }
})

export default seo
