import { Hono } from 'hono'
import {
  parseFooterConfig, parseHeaderConfig, validateMenuSlug, validateMenuUrl,
  type FooterConfig, type HeaderConfig, type Menu, type MenuItem, type MenuLocation, type MenuTarget,
} from '@hiccms/appearance-manager'
import { authMiddleware, type JWTPayload } from '../middleware/authMiddleware'

type Env = { Bindings: { DB: D1Database }; Variables: { user: JWTPayload } }
interface MenuRow { id: string; name: string; slug: string; location: MenuLocation; is_enabled: number; created_at: string; updated_at: string }
interface ItemRow { id: string; menu_id: string; parent_id: string | null; label: string; url: string; target: MenuTarget; sort_order: number; is_enabled: number }

const route = new Hono<Env>()

function mapMenus(menuRows: MenuRow[], itemRows: ItemRow[]): Menu[] {
  const byParent = new Map<string | null, ItemRow[]>()
  for (const item of itemRows) {
    const list = byParent.get(item.parent_id) ?? []
    list.push(item); byParent.set(item.parent_id, list)
  }
  const buildItems = (menuId: string, parentId: string | null): MenuItem[] =>
    (byParent.get(parentId) ?? []).filter((item) => item.menu_id === menuId)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((item) => ({ id: item.id, menuId: item.menu_id, parentId: item.parent_id,
        label: item.label, url: item.url, target: item.target, sortOrder: item.sort_order,
        isEnabled: item.is_enabled === 1, children: buildItems(menuId, item.id) }))
  return menuRows.map((menu) => ({ id: menu.id, name: menu.name, slug: menu.slug,
    location: menu.location, isEnabled: menu.is_enabled === 1, items: buildItems(menu.id, null),
    createdAt: menu.created_at, updatedAt: menu.updated_at }))
}

async function loadMenus(db: D1Database, publicOnly: boolean): Promise<Menu[]> {
  const menusQuery = publicOnly ? 'SELECT * FROM menus WHERE is_enabled = 1 ORDER BY name' : 'SELECT * FROM menus ORDER BY name'
  const itemsQuery = publicOnly ? 'SELECT * FROM menu_items WHERE is_enabled = 1 ORDER BY sort_order' : 'SELECT * FROM menu_items ORDER BY sort_order'
  const [menus, items] = await db.batch([db.prepare(menusQuery), db.prepare(itemsQuery)])
  return mapMenus(menus.results as unknown as MenuRow[], items.results as unknown as ItemRow[])
}

async function loadLayout(db: D1Database) {
  const { results } = await db.prepare('SELECT section, config FROM layout_sections').all<{ section: string; config: string }>()
  const values = Object.fromEntries(results.map((row) => [row.section, JSON.parse(row.config)]))
  return { header: parseHeaderConfig(values.header), footer: parseFooterConfig(values.footer) }
}

route.get('/public', async (c) => {
  try {
    const [menus, layout] = await Promise.all([loadMenus(c.env.DB, true), loadLayout(c.env.DB)])
    return c.json({ success: true, data: { menus, ...layout } })
  } catch (error: any) { return c.json({ success: false, message: error.message }, 500) }
})

route.use('/*', authMiddleware(['role-superadmin', 'role-admin', 'role-editor']))

route.get('/', async (c) => c.json({ success: true, data: await loadMenus(c.env.DB, false) }))
route.post('/', async (c) => {
  try {
    const body = await c.req.json()
    const slug = validateMenuSlug(body.slug)
    if (!body.name || !['primary', 'footer', 'custom'].includes(body.location)) return c.json({ success: false, message: 'Name and valid location are required' }, 400)
    const id = crypto.randomUUID()
    await c.env.DB.prepare('INSERT INTO menus (id, name, slug, location) VALUES (?, ?, ?, ?)').bind(id, body.name, slug, body.location).run()
    return c.json({ success: true, data: { id } }, 201)
  } catch (error: any) { return c.json({ success: false, message: error.message }, 400) }
})
route.put('/:id', async (c) => {
  try {
    const body = await c.req.json(); const slug = validateMenuSlug(body.slug)
    const result = await c.env.DB.prepare('UPDATE menus SET name = ?, slug = ?, location = ?, is_enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .bind(body.name, slug, body.location, body.isEnabled === false ? 0 : 1, c.req.param('id')).run()
    return result.meta.changes ? c.json({ success: true }) : c.json({ success: false, message: 'Menu not found' }, 404)
  } catch (error: any) { return c.json({ success: false, message: error.message }, 400) }
})
route.delete('/:id', async (c) => {
  const result = await c.env.DB.prepare('DELETE FROM menus WHERE id = ?').bind(c.req.param('id')).run()
  return result.meta.changes ? c.json({ success: true }) : c.json({ success: false, message: 'Menu not found' }, 404)
})

route.post('/:id/items', async (c) => {
  try {
    const body = await c.req.json(); const menuId = c.req.param('id')
    const menu = await c.env.DB.prepare('SELECT id FROM menus WHERE id = ?').bind(menuId).first()
    if (!menu) return c.json({ success: false, message: 'Menu not found' }, 404)
    if (body.parentId) {
      const parent = await c.env.DB.prepare('SELECT id FROM menu_items WHERE id = ? AND menu_id = ?').bind(body.parentId, menuId).first()
      if (!parent) return c.json({ success: false, message: 'Parent item is invalid' }, 400)
    }
    const id = crypto.randomUUID(); const url = validateMenuUrl(body.url)
    await c.env.DB.prepare('INSERT INTO menu_items (id, menu_id, parent_id, label, url, target, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(id, menuId, body.parentId ?? null, body.label, url, body.target === '_blank' ? '_blank' : '_self', Number(body.sortOrder ?? 0)).run()
    return c.json({ success: true, data: { id } }, 201)
  } catch (error: any) { return c.json({ success: false, message: error.message }, 400) }
})

route.put('/items/:id', async (c) => {
  try {
    const id = c.req.param('id'); const body = await c.req.json()
    if (body.parentId === id) return c.json({ success: false, message: 'Item cannot be its own parent' }, 400)
    if (body.parentId) {
      const cycle = await c.env.DB.prepare(
        `WITH RECURSIVE descendants(id) AS (SELECT id FROM menu_items WHERE parent_id = ? UNION ALL SELECT mi.id FROM menu_items mi JOIN descendants d ON mi.parent_id = d.id)
         SELECT id FROM descendants WHERE id = ? LIMIT 1`,
      ).bind(id, body.parentId).first()
      if (cycle) return c.json({ success: false, message: 'Menu hierarchy cannot contain a cycle' }, 400)
    }
    const result = await c.env.DB.prepare(
      'UPDATE menu_items SET parent_id = ?, label = ?, url = ?, target = ?, sort_order = ?, is_enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    ).bind(body.parentId ?? null, body.label, validateMenuUrl(body.url), body.target === '_blank' ? '_blank' : '_self', Number(body.sortOrder ?? 0), body.isEnabled === false ? 0 : 1, id).run()
    return result.meta.changes ? c.json({ success: true }) : c.json({ success: false, message: 'Menu item not found' }, 404)
  } catch (error: any) { return c.json({ success: false, message: error.message }, 400) }
})
route.delete('/items/:id', async (c) => {
  const result = await c.env.DB.prepare('DELETE FROM menu_items WHERE id = ?').bind(c.req.param('id')).run()
  return result.meta.changes ? c.json({ success: true }) : c.json({ success: false, message: 'Menu item not found' }, 404)
})
route.put('/:id/reorder', async (c) => {
  try {
    const { items } = await c.req.json()
    if (!Array.isArray(items)) return c.json({ success: false, message: 'Items must be an array' }, 400)
    const statements = items.map((item: any, index: number) => c.env.DB.prepare(
      'UPDATE menu_items SET sort_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND menu_id = ?',
    ).bind(index, item.id, c.req.param('id')))
    if (statements.length) await c.env.DB.batch(statements)
    return c.json({ success: true })
  } catch (error: any) { return c.json({ success: false, message: error.message }, 400) }
})

route.get('/layout/sections', async (c) => c.json({ success: true, data: await loadLayout(c.env.DB) }))
route.put('/layout/header', async (c) => saveSection(c, 'header', parseHeaderConfig))
route.put('/layout/footer', async (c) => saveSection(c, 'footer', parseFooterConfig))

async function saveSection<T>(c: any, section: 'header' | 'footer', parser: (value: unknown) => T) {
  try {
    const config = parser(await c.req.json())
    await c.env.DB.prepare('UPDATE layout_sections SET config = ?, updated_at = CURRENT_TIMESTAMP WHERE section = ?').bind(JSON.stringify(config), section).run()
    return c.json({ success: true, data: config })
  } catch (error: any) { return c.json({ success: false, message: error.message }, 400) }
}

export default route
