import { Hono } from 'hono'

const redirects = new Hono<{ Bindings: { DB: D1Database } }>()

// Public: Get all redirects
redirects.get('/', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      `SELECT old_slug, new_slug FROM redirects ORDER BY created_at ASC`
    ).all()
    return c.json({ success: true, data: results })
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500)
  }
})

export default redirects
