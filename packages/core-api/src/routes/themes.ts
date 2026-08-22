import { Hono } from 'hono'
import {
  isThemeId,
  parseStoredThemeConfig,
  parseThemeConfig,
  type ThemeSummary,
} from '@hiccms/theme-engine'
import { authMiddleware } from '../middleware/authMiddleware'

type Bindings = { DB: D1Database }

interface ThemeRow {
  id: string
  name: string
  version: string
  description: string
  author: string
  preview: string | null
  config: string
  is_active: number
  updated_at: string
}

const app = new Hono<{ Bindings: Bindings }>()

function toThemeSummary(row: ThemeRow): ThemeSummary {
  return {
    id: row.id,
    name: row.name,
    version: row.version,
    description: row.description,
    author: row.author,
    ...(row.preview ? { preview: row.preview } : {}),
    config: parseStoredThemeConfig(row.config),
    isActive: row.is_active === 1,
    updatedAt: row.updated_at,
  }
}

app.get('/active', async (c) => {
  try {
    const row = await c.env.DB.prepare(
      'SELECT * FROM themes WHERE is_active = 1 LIMIT 1',
    ).first<ThemeRow>()

    if (!row) return c.json({ success: false, message: 'No active theme found' }, 404)
    return c.json({ success: true, data: toThemeSummary(row) })
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500)
  }
})

app.get('/', authMiddleware(), async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM themes ORDER BY is_active DESC, name ASC',
    ).all<ThemeRow>()
    return c.json({ success: true, data: results.map(toThemeSummary) })
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500)
  }
})

app.put('/:id/config', authMiddleware(), async (c) => {
  const id = c.req.param('id')
  if (!id || !isThemeId(id)) return c.json({ success: false, message: 'Invalid theme id' }, 400)

  try {
    const config = parseThemeConfig(await c.req.json())
    const result = await c.env.DB.prepare(
      'UPDATE themes SET config = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    ).bind(JSON.stringify(config), id).run()

    if (!result.meta.changes) return c.json({ success: false, message: 'Theme not found' }, 404)

    const active = await c.env.DB.prepare(
      'SELECT is_active FROM themes WHERE id = ?',
    ).bind(id).first<{ is_active: number }>()

    if (active?.is_active === 1) {
      await c.env.DB.batch([
        c.env.DB.prepare(
          'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP',
        ).bind('theme_color', config.colors.primary),
        c.env.DB.prepare(
          'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP',
        ).bind('theme_mode', config.mode),
      ])
    }

    return c.json({ success: true, message: 'Theme configuration updated' })
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 400)
  }
})

app.post('/:id/activate', authMiddleware(), async (c) => {
  const id = c.req.param('id')
  if (!id || !isThemeId(id)) return c.json({ success: false, message: 'Invalid theme id' }, 400)

  try {
    const theme = await c.env.DB.prepare(
      'SELECT config FROM themes WHERE id = ?',
    ).bind(id).first<{ config: string }>()
    if (!theme) return c.json({ success: false, message: 'Theme not found' }, 404)

    const config = parseStoredThemeConfig(theme.config)
    await c.env.DB.batch([
      c.env.DB.prepare('UPDATE themes SET is_active = 0 WHERE is_active = 1'),
      c.env.DB.prepare(
        'UPDATE themes SET is_active = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      ).bind(id),
      c.env.DB.prepare(
        'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP',
      ).bind('theme_color', config.colors.primary),
      c.env.DB.prepare(
        'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP',
      ).bind('theme_mode', config.mode),
    ])

    return c.json({ success: true, message: 'Theme activated' })
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500)
  }
})

export default app
