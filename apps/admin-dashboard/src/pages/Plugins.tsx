import { useCallback, useEffect, useState } from 'react'
import { Plug, Plus, Power, PowerOff, Trash2 } from 'lucide-react'
import { apiRequest } from '../lib/api'

const CAPABILITIES = ['content.read', 'content.write', 'media.read', 'media.write', 'settings.read', 'settings.write', 'automation.execute', 'appearance.manage']
const HOOKS = ['content.beforeSave', 'content.afterSave', 'content.beforePublish', 'content.afterPublish', 'media.afterUpload', 'automation.afterJob']

interface Plugin {
  id: string
  slug: string
  name: string
  version: string
  description: string
  author: string
  status: 'inactive' | 'active'
  capabilities: string[]
  approvedCapabilities: string[]
  hooks: string[]
  hiccms: { minVersion: string; maxVersion?: string }
  configSchema: Record<string, { type: 'string' | 'number' | 'boolean'; label: string; required?: boolean }>
  config: Record<string, string | number | boolean>
  compatibilityStatus: 'compatible' | 'incompatible'
}

interface ApiResult<T = unknown> { success: boolean; data: T; message?: string }
interface AuditLog { id: string; action: string; actor_id: string | null; created_at: string }

export default function Plugins() {
  const [plugins, setPlugins] = useState<Plugin[]>([])
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [configs, setConfigs] = useState<Record<string, Record<string, string | number | boolean>>>({})
  const [audits, setAudits] = useState<Record<string, AuditLog[]>>({})
  const emptyForm = { slug: '', name: '', version: '1.0.0', author: '', description: '', capabilities: [] as string[], hooks: [] as string[], minVersion: '1.2.0', maxVersion: '', consent: false }
  const [form, setForm] = useState(emptyForm)

  const load = useCallback(async () => {
    try {
      const result = await apiRequest<ApiResult<Plugin[]>>('/api/plugins')
      setPlugins(result.data)
      setError('')
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Gagal memuat plugin') }
  }, [])

  useEffect(() => { void load() }, [load])

  const install = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setNotice('')
    try {
      const manifest = { slug: form.slug, name: form.name, version: form.version, author: form.author, description: form.description, capabilities: form.capabilities, hooks: form.hooks, hiccms: { minVersion: form.minVersion, ...(form.maxVersion ? { maxVersion: form.maxVersion } : {}) }, configSchema: {} }
      const result = await apiRequest<ApiResult>('/api/plugins/install', { method: 'POST', body: JSON.stringify({ manifest, approvedCapabilities: form.consent ? form.capabilities : [] }) })
      setNotice(result.message ?? 'Plugin berhasil dipasang dalam keadaan nonaktif.')
      setForm(emptyForm)
      await load()
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Gagal memasang plugin') }
    finally { setBusy(false) }
  }

  const saveConfig = async (plugin: Plugin) => {
    setBusy(true)
    try {
      await apiRequest(`/api/plugins/${plugin.id}/config`, { method: 'PUT', body: JSON.stringify(configs[plugin.id] ?? plugin.config) })
      await load()
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Konfigurasi gagal disimpan') }
    finally { setBusy(false) }
  }

  const approvePermissions = async (plugin: Plugin) => {
    if (!confirm(`Setujui seluruh capability untuk ${plugin.name}?`)) return
    setBusy(true)
    try {
      await apiRequest(`/api/plugins/${plugin.id}/permissions`, { method: 'PUT', body: JSON.stringify({ approvedCapabilities: plugin.capabilities }) })
      await load()
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Permission gagal diperbarui') }
    finally { setBusy(false) }
  }

  const loadAudit = async (plugin: Plugin) => {
    try {
      const result = await apiRequest<ApiResult<AuditLog[]>>(`/api/plugins/${plugin.id}/audit`)
      setAudits((current) => ({ ...current, [plugin.id]: result.data }))
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Audit plugin gagal dimuat') }
  }

  const action = async (plugin: Plugin, operation: 'activate' | 'deactivate' | 'delete') => {
    if (operation === 'delete' && !confirm(`Hapus plugin ${plugin.name}?`)) return
    setBusy(true)
    setNotice('')
    try {
      const result = await apiRequest<ApiResult>(`/api/plugins/${plugin.id}${operation === 'delete' ? '' : `/${operation}`}`, { method: operation === 'delete' ? 'DELETE' : 'POST' })
      setNotice(result.message ?? 'Status plugin berhasil diperbarui.')
      await load()
      window.dispatchEvent(new CustomEvent('hiccms:plugin-status-changed', { detail: { slug: plugin.slug } }))
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Operasi plugin gagal') }
    finally { setBusy(false) }
  }

  return <div className="space-y-6">
    <div><h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Plug className="w-6 h-6" /> Plugin Manager</h1>
      <p className="text-gray-600 mt-1">Fondasi aman untuk registrasi manifest, permission, dan lifecycle plugin.</p></div>
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">Plugin SDK v1 memvalidasi kompatibilitas, hook, konfigurasi, dan persetujuan capability. Hook hanya berupa metadata dan kode eksternal tetap tidak dieksekusi.</div>
    {notice && <div role="status" className="rounded-lg bg-green-50 p-4 text-sm text-green-800">{notice}</div>}
    {error && <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</div>}

    <form onSubmit={install} className="bg-white border rounded-xl p-5 space-y-4">
      <h2 className="font-semibold flex items-center gap-2"><Plus className="w-5 h-5" /> Pasang Manifest Plugin</h2>
      <div className="grid md:grid-cols-2 gap-4">
        <input required placeholder="Nama plugin" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="border rounded-lg px-3 py-2" />
        <input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="slug-plugin" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="border rounded-lg px-3 py-2" />
        <input required placeholder="Versi, contoh 1.0.0" value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} className="border rounded-lg px-3 py-2" />
        <input required placeholder="Author" value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} className="border rounded-lg px-3 py-2" />
        <input required placeholder="Minimum HIC-CMS" value={form.minVersion} onChange={(e) => setForm({ ...form, minVersion: e.target.value })} className="border rounded-lg px-3 py-2" />
        <input placeholder="Maksimum HIC-CMS (opsional)" value={form.maxVersion} onChange={(e) => setForm({ ...form, maxVersion: e.target.value })} className="border rounded-lg px-3 py-2" />
      </div>
      <textarea placeholder="Deskripsi" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="border rounded-lg px-3 py-2 w-full" />
      <div><p className="text-sm font-medium mb-2">Capability yang diminta</p><div className="grid md:grid-cols-4 gap-2">{CAPABILITIES.map((capability) => <label key={capability} className="text-sm flex gap-2 items-center"><input type="checkbox" checked={form.capabilities.includes(capability)} onChange={() => setForm({ ...form, capabilities: form.capabilities.includes(capability) ? form.capabilities.filter((item) => item !== capability) : [...form.capabilities, capability] })} />{capability}</label>)}</div></div>
      <div><p className="text-sm font-medium mb-2">Hook yang didaftarkan</p><div className="grid md:grid-cols-3 gap-2">{HOOKS.map((hook) => <label key={hook} className="text-sm flex gap-2 items-center"><input type="checkbox" checked={form.hooks.includes(hook)} onChange={() => setForm({ ...form, hooks: form.hooks.includes(hook) ? form.hooks.filter((item) => item !== hook) : [...form.hooks, hook] })} />{hook}</label>)}</div></div>
      <label className="flex gap-2 items-start rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm"><input required type="checkbox" checked={form.consent} onChange={(e) => setForm({ ...form, consent: e.target.checked })} /><span>Saya menyetujui seluruh capability yang dipilih. Plugin tetap nonaktif setelah dipasang.</span></label>
      <button disabled={busy} className="bg-blue-600 text-white px-4 py-2 rounded-lg disabled:opacity-50">Setujui & Pasang Nonaktif</button>
    </form>

    <div className="grid lg:grid-cols-2 gap-4">{plugins.map((plugin) => <article key={plugin.id} className="bg-white border rounded-xl p-5">
      <div className="flex justify-between gap-3"><div><h2 className="font-semibold">{plugin.name} <span className="text-xs text-gray-500">v{plugin.version}</span></h2><p className="text-sm text-gray-500">{plugin.slug} · {plugin.author}</p></div><div className="flex gap-2"><span className={`h-fit rounded-full px-3 py-1 text-xs ${plugin.compatibilityStatus === 'compatible' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>{plugin.compatibilityStatus === 'compatible' ? 'Kompatibel' : 'Tidak kompatibel'}</span><span className={`h-fit rounded-full px-3 py-1 text-xs ${plugin.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>{plugin.status === 'active' ? 'Aktif' : 'Nonaktif'}</span></div></div>
      <p className="text-sm text-gray-600 mt-3">{plugin.description || 'Tanpa deskripsi.'}</p>
      <p className="text-xs text-gray-500 mt-3">{plugin.capabilities.length ? plugin.capabilities.join(', ') : 'Tidak meminta capability'}</p>
      {plugin.approvedCapabilities.length !== plugin.capabilities.length && <button disabled={busy || plugin.status === 'active'} onClick={() => approvePermissions(plugin)} className="mt-3 border border-amber-300 bg-amber-50 text-amber-800 px-3 py-2 rounded-lg text-sm">Tinjau & Setujui Capability</button>}
      <p className="text-xs text-gray-500 mt-1">Hook: {plugin.hooks.length ? plugin.hooks.join(', ') : 'Tidak ada'} · HIC-CMS {plugin.hiccms.minVersion}{plugin.hiccms.maxVersion ? `–${plugin.hiccms.maxVersion}` : '+'}</p>
      <button onClick={() => void loadAudit(plugin)} className="mt-3 text-sm text-blue-600">Lihat audit lifecycle</button>
      {audits[plugin.id] && <ul className="mt-2 rounded-lg bg-gray-50 p-3 text-xs space-y-1">{audits[plugin.id].map((audit) => <li key={audit.id}>{audit.action} · {new Date(audit.created_at).toLocaleString('id-ID')}</li>)}</ul>}
      <div className="flex gap-2 mt-4">{plugin.status === 'active' ? <button disabled={busy} onClick={() => action(plugin, 'deactivate')} className="border px-3 py-2 rounded-lg flex gap-2"><PowerOff className="w-4 h-4" /> Nonaktifkan</button> : <><button disabled={busy || plugin.compatibilityStatus !== 'compatible' || plugin.approvedCapabilities.length !== plugin.capabilities.length} onClick={() => action(plugin, 'activate')} className="bg-green-600 text-white px-3 py-2 rounded-lg flex gap-2 disabled:opacity-50"><Power className="w-4 h-4" /> Aktifkan</button><button disabled={busy} onClick={() => action(plugin, 'delete')} className="border border-red-200 text-red-600 px-3 py-2 rounded-lg"><Trash2 className="w-4 h-4" /></button></>}</div>
      {Object.keys(plugin.configSchema).length > 0 && <div className="mt-4 border-t pt-4"><button className="text-sm text-blue-600" onClick={() => { setExpanded(expanded === plugin.id ? null : plugin.id); setConfigs((current) => ({ ...current, [plugin.id]: current[plugin.id] ?? plugin.config })) }}>{expanded === plugin.id ? 'Tutup konfigurasi' : 'Atur konfigurasi'}</button>{expanded === plugin.id && <div className="mt-3 space-y-3">{Object.entries(plugin.configSchema).map(([key, field]) => <label key={key} className="block text-sm">{field.label}<input type={field.type === 'number' ? 'number' : field.type === 'boolean' ? 'checkbox' : 'text'} checked={field.type === 'boolean' ? Boolean(configs[plugin.id]?.[key]) : undefined} value={field.type === 'boolean' ? undefined : String(configs[plugin.id]?.[key] ?? '')} onChange={(event) => setConfigs((current) => ({ ...current, [plugin.id]: { ...(current[plugin.id] ?? plugin.config), [key]: field.type === 'boolean' ? event.target.checked : field.type === 'number' ? Number(event.target.value) : event.target.value } }))} className={field.type === 'boolean' ? 'ml-2' : 'block border rounded-lg px-3 py-2 mt-1 w-full'} /></label>)}<button disabled={busy} onClick={() => saveConfig(plugin)} className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm">Simpan Konfigurasi</button></div>}</div>}
    </article>)}</div>
    {!plugins.length && <div className="text-center text-gray-500 bg-white border rounded-xl p-8">Belum ada plugin yang terpasang.</div>}
  </div>
}
