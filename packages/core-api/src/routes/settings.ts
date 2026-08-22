import { Hono } from 'hono'
import { authMiddleware } from '../middleware/authMiddleware'

const app = new Hono<{ Bindings: { DB: D1Database } }>()

// Fetch all settings
app.get('/', async (c) => {
  try {
    const { results } = await c.env.DB.prepare('SELECT key, value FROM settings').all()
    
    // Convert array of {key, value} to an object {key: value}
    const settingsObject = results.reduce((acc: any, curr: any) => {
      acc[curr.key] = curr.value
      return acc
    }, {})

    return c.json({ success: true, data: settingsObject })
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500)
  }
})

// Update multiple settings (Requires Authentication)
app.post('/', authMiddleware(), async (c) => {
  try {
    const body = await c.req.json()
    
    if (!body || typeof body !== 'object') {
      return c.json({ success: false, message: 'Invalid payload' }, 400)
    }

    const homepageDisplay = body.homepage_display
    const homepagePageId = body.homepage_page_id
    if (homepageDisplay !== undefined && !['latest_posts', 'static_page'].includes(homepageDisplay)) {
      return c.json({ success: false, message: 'Invalid homepage display mode' }, 400)
    }
    if (homepageDisplay === 'static_page') {
      if (typeof homepagePageId !== 'string' || !homepagePageId) {
        return c.json({ success: false, message: 'Published homepage is required' }, 400)
      }
      const page = await c.env.DB.prepare("SELECT id FROM pages WHERE id = ? AND status = 'published'").bind(homepagePageId).first()
      if (!page) return c.json({ success: false, message: 'Selected homepage is not published' }, 400)
    }

    if (body.whatsapp_enabled !== undefined && !['true', 'false'].includes(body.whatsapp_enabled)) {
      return c.json({ success: false, message: 'Invalid WhatsApp enabled value' }, 400)
    }
    const whatsappDigits = typeof body.whatsapp_number === 'string' ? body.whatsapp_number.replace(/\D/g, '') : ''
    const normalizedWhatsApp = whatsappDigits.startsWith('620')
      ? `62${whatsappDigits.slice(3)}`
      : whatsappDigits.startsWith('0')
        ? `62${whatsappDigits.slice(1)}`
        : whatsappDigits.startsWith('8')
          ? `62${whatsappDigits}`
          : whatsappDigits
    if (body.whatsapp_enabled === 'true' && !/^\d{8,15}$/.test(normalizedWhatsApp)) {
      return c.json({ success: false, message: 'Nomor WhatsApp tidak valid' }, 400)
    }
    if (typeof body.whatsapp_label === 'string' && body.whatsapp_label.length > 40) {
      return c.json({ success: false, message: 'Label WhatsApp terlalu panjang' }, 400)
    }
    if (typeof body.whatsapp_message === 'string' && body.whatsapp_message.length > 300) {
      return c.json({ success: false, message: 'Pesan WhatsApp terlalu panjang' }, 400)
    }

    const statements = []
    
    for (const [key, value] of Object.entries(body)) {
      if (typeof value === 'string') {
        const storedValue = key === 'whatsapp_number' && normalizedWhatsApp ? normalizedWhatsApp : value
        statements.push(
          c.env.DB.prepare(
            'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP'
          ).bind(key, storedValue)
        )
      }
    }

    if (statements.length > 0) {
      await c.env.DB.batch(statements)
    }

    return c.json({ success: true, message: 'Settings updated successfully' })
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500)
  }
})

export default app
