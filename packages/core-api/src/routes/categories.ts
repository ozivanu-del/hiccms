import { Hono } from 'hono'
import { authMiddleware } from '../middleware/authMiddleware'

const categories = new Hono<{ Bindings: { DB: D1Database } }>()

// Public: Get all categories
categories.get('/', async (c) => {
  try {
    const { results } = await c.env.DB.prepare('SELECT * FROM categories ORDER BY name ASC').all()
    return c.json({ success: true, data: results })
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500)
  }
})

// Protected: Create category
categories.post('/', authMiddleware(['role-superadmin', 'role-admin', 'role-editor']), async (c) => {
  try {
    const body = await c.req.json()
    const id = crypto.randomUUID()
    
    await c.env.DB.prepare(
      'INSERT INTO categories (id, name, slug, description, parent_id) VALUES (?, ?, ?, ?, ?)'
    )
      .bind(id, body.name, body.slug, body.description || null, body.parent_id || null)
      .run()

    return c.json({ success: true, message: 'Category created', data: { id } }, 201)
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500)
  }
})

// Protected: Update category
categories.put('/:id', authMiddleware(['role-superadmin', 'role-admin', 'role-editor']), async (c) => {
  try {
    const id = c.req.param('id')
    const body = await c.req.json()
    
    await c.env.DB.prepare(
      'UPDATE categories SET name = ?, slug = ?, description = ?, parent_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    )
      .bind(body.name, body.slug, body.description || null, body.parent_id || null, id)
      .run()

    return c.json({ success: true, message: 'Category updated' })
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500)
  }
})

// Protected: Delete category
categories.delete('/:id', authMiddleware(['role-superadmin', 'role-admin']), async (c) => {
  try {
    const id = c.req.param('id')
    await c.env.DB.prepare('DELETE FROM categories WHERE id = ?').bind(id).run()
    return c.json({ success: true, message: 'Category deleted' })
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500)
  }
})

export default categories
