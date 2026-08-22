import { Context, Hono } from 'hono'
import { HICCMS_VERSION, isPluginCompatible, parsePluginConfig, parsePluginManifest, type InstalledPlugin, type PluginCapability } from '@hiccms/plugin-manager'
import { authMiddleware, type JWTPayload } from '../middleware/authMiddleware'

type AppEnv = { Bindings: { DB: D1Database }; Variables: { user: JWTPayload } }
type PluginContext = Context<AppEnv>

interface PluginRow {
  id: string; slug: string; name: string; version: string; description: string; author: string
  status: 'inactive' | 'active'; manifest_json: string; approved_capabilities_json: string
  config_json: string; compatibility_status: 'compatible' | 'incompatible'
  installed_at: string; activated_at: string | null; updated_at: string
}

interface PluginView extends InstalledPlugin {
  approvedCapabilities: PluginCapability[]
  config: Record<string, string | number | boolean>
  compatibilityStatus: 'compatible' | 'incompatible'
  cmsVersion: string
}

const plugins = new Hono<AppEnv>()
plugins.use('/*', authMiddleware(['role-superadmin']))
const messageOf = (error: unknown) => error instanceof Error ? error.message : 'Terjadi kesalahan pada Plugin Manager'

function toPlugin(row: PluginRow): PluginView {
  const manifest = parsePluginManifest(JSON.parse(row.manifest_json))
  return { ...manifest, id: row.id, status: row.status, approvedCapabilities: JSON.parse(row.approved_capabilities_json) as PluginCapability[], config: JSON.parse(row.config_json) as Record<string, string | number | boolean>, compatibilityStatus: row.compatibility_status, cmsVersion: HICCMS_VERSION, installedAt: row.installed_at, activatedAt: row.activated_at, updatedAt: row.updated_at }
}

function auditStatement(c: PluginContext, pluginId: string | null, slug: string, action: string, details: Record<string, unknown> = {}) {
  return c.env.DB.prepare('INSERT INTO plugin_audit_logs (id, plugin_id, plugin_slug, action, actor_id, details_json) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(crypto.randomUUID(), pluginId, slug, action, c.get('user').sub, JSON.stringify(details))
}

plugins.get('/', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM plugins ORDER BY name ASC').all<PluginRow>()
  return c.json({ success: true, data: results.map(toPlugin), meta: { cmsVersion: HICCMS_VERSION, executesExternalCode: false } })
})

plugins.post('/install', async (c) => {
  try {
    const body = await c.req.json() as Record<string, unknown>
    const manifest = parsePluginManifest(body.manifest ?? body)
    const approved = Array.isArray(body.approvedCapabilities) ? body.approvedCapabilities : []
    if (!approved.every((item) => manifest.capabilities.includes(item as PluginCapability))) return c.json({ success: false, message: 'Persetujuan capability tidak sesuai manifest' }, 400)
    if (approved.length !== manifest.capabilities.length) return c.json({ success: false, message: 'Semua capability yang diminta harus disetujui sebelum instalasi' }, 400)
    const compatible = isPluginCompatible(manifest)
    const id = crypto.randomUUID()
    const initialConfig = Object.fromEntries(Object.entries(manifest.configSchema).filter(([, field]) => field.default !== undefined).map(([key, field]) => [key, field.default]))
    await c.env.DB.batch([
      c.env.DB.prepare(`INSERT INTO plugins (id, slug, name, version, description, author, manifest_json, approved_capabilities_json, config_json, compatibility_status, installed_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(id, manifest.slug, manifest.name, manifest.version, manifest.description, manifest.author, JSON.stringify(manifest), JSON.stringify(approved), JSON.stringify(initialConfig), compatible ? 'compatible' : 'incompatible', c.get('user').sub),
      c.env.DB.prepare("INSERT INTO plugin_lifecycle_events (id, plugin_id, action, actor_id) VALUES (?, ?, 'installed', ?)").bind(crypto.randomUUID(), id, c.get('user').sub),
      auditStatement(c, id, manifest.slug, 'installed', { version: manifest.version, approvedCapabilities: approved, compatible }),
    ])
    return c.json({ success: true, message: compatible ? 'Plugin berhasil dipasang dalam keadaan nonaktif' : 'Plugin dipasang tetapi tidak kompatibel dan tidak dapat diaktifkan', data: { id, compatible } }, 201)
  } catch (error: unknown) {
    const message = messageOf(error)
    return c.json({ success: false, message: message.includes('UNIQUE constraint failed') ? 'Slug plugin sudah terpasang' : message }, 400)
  }
})

async function changeStatus(c: PluginContext, status: 'active' | 'inactive') {
  const id = c.req.param('id')
  if (!id) return c.json({ success: false, message: 'ID plugin tidak valid' }, 400)
  const row = await c.env.DB.prepare('SELECT * FROM plugins WHERE id = ?').bind(id).first<PluginRow>()
  if (!row) return c.json({ success: false, message: 'Plugin tidak ditemukan' }, 404)
  if (row.status === status) return c.json({ success: true, message: `Plugin sudah ${status === 'active' ? 'aktif' : 'nonaktif'}` })
  const plugin = toPlugin(row)
  if (status === 'active') {
    if (plugin.compatibilityStatus !== 'compatible' || !isPluginCompatible(plugin)) return c.json({ success: false, message: `Plugin tidak kompatibel dengan HIC-CMS ${HICCMS_VERSION}` }, 409)
    if (plugin.capabilities.some((capability) => !plugin.approvedCapabilities.includes(capability))) return c.json({ success: false, message: 'Capability plugin belum disetujui seluruhnya' }, 409)
    try { parsePluginConfig(plugin, plugin.config) } catch (error: unknown) { return c.json({ success: false, message: `Konfigurasi plugin belum lengkap: ${messageOf(error)}` }, 409) }
  }
  const activatedAt = status === 'active' ? 'CURRENT_TIMESTAMP' : 'NULL'
  await c.env.DB.batch([
    c.env.DB.prepare(`UPDATE plugins SET status = ?, activated_at = ${activatedAt}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(status, id),
    c.env.DB.prepare('INSERT INTO plugin_lifecycle_events (id, plugin_id, action, actor_id) VALUES (?, ?, ?, ?)').bind(crypto.randomUUID(), id, status === 'active' ? 'activated' : 'deactivated', c.get('user').sub),
    auditStatement(c, id, row.slug, status === 'active' ? 'activated' : 'deactivated'),
  ])
  return c.json({ success: true, message: `Plugin berhasil ${status === 'active' ? 'diaktifkan' : 'dinonaktifkan'}` })
}

plugins.post('/:id/activate', (c) => changeStatus(c, 'active'))
plugins.post('/:id/deactivate', (c) => changeStatus(c, 'inactive'))

plugins.put('/:id/permissions', async (c) => {
  const id = c.req.param('id')
  const row = await c.env.DB.prepare('SELECT * FROM plugins WHERE id = ?').bind(id).first<PluginRow>()
  if (!row) return c.json({ success: false, message: 'Plugin tidak ditemukan' }, 404)
  if (row.status === 'active') return c.json({ success: false, message: 'Nonaktifkan plugin sebelum mengubah permission' }, 409)
  const manifest = parsePluginManifest(JSON.parse(row.manifest_json))
  const body = await c.req.json() as { approvedCapabilities?: unknown }
  const approved = Array.isArray(body.approvedCapabilities) ? body.approvedCapabilities : []
  if (!approved.every((item) => manifest.capabilities.includes(item as PluginCapability))) return c.json({ success: false, message: 'Persetujuan capability tidak sesuai manifest' }, 400)
  await c.env.DB.batch([
    c.env.DB.prepare('UPDATE plugins SET approved_capabilities_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(JSON.stringify(approved), id),
    auditStatement(c, id, row.slug, 'permissions_updated', { approvedCapabilities: approved }),
  ])
  return c.json({ success: true, message: 'Persetujuan capability berhasil diperbarui' })
})

plugins.put('/:id/config', async (c) => {
  try {
    const id = c.req.param('id')
    const row = await c.env.DB.prepare('SELECT * FROM plugins WHERE id = ?').bind(id).first<PluginRow>()
    if (!row) return c.json({ success: false, message: 'Plugin tidak ditemukan' }, 404)
    const manifest = parsePluginManifest(JSON.parse(row.manifest_json))
    const config = parsePluginConfig(manifest, await c.req.json())
    await c.env.DB.batch([
      c.env.DB.prepare('UPDATE plugins SET config_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(JSON.stringify(config), id),
      auditStatement(c, id, row.slug, 'configuration_updated', { keys: Object.keys(config) }),
    ])
    return c.json({ success: true, message: 'Konfigurasi plugin berhasil disimpan', data: config })
  } catch (error: unknown) { return c.json({ success: false, message: messageOf(error) }, 400) }
})

plugins.get('/:id/audit', async (c) => {
  const plugin = await c.env.DB.prepare('SELECT slug FROM plugins WHERE id = ?').bind(c.req.param('id')).first<{ slug: string }>()
  if (!plugin) return c.json({ success: false, message: 'Plugin tidak ditemukan' }, 404)
  const { results } = await c.env.DB.prepare('SELECT id, action, actor_id, details_json, created_at FROM plugin_audit_logs WHERE plugin_slug = ? ORDER BY created_at DESC LIMIT 100').bind(plugin.slug).all()
  return c.json({ success: true, data: results })
})

plugins.delete('/:id', async (c) => {
  const id = c.req.param('id')
  const row = await c.env.DB.prepare('SELECT status, slug FROM plugins WHERE id = ?').bind(id).first<{ status: string; slug: string }>()
  if (!row) return c.json({ success: false, message: 'Plugin tidak ditemukan' }, 404)
  if (row.status === 'active') return c.json({ success: false, message: 'Nonaktifkan plugin sebelum menghapusnya' }, 409)
  await c.env.DB.batch([auditStatement(c, id, row.slug, 'uninstalled'), c.env.DB.prepare('DELETE FROM plugins WHERE id = ?').bind(id)])
  return c.json({ success: true, message: 'Plugin berhasil dihapus; audit lifecycle tetap disimpan' })
})

export default plugins
