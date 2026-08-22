import { useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import type { Menu, MenuItem, MenuLocation } from '@hiccms/appearance-manager'
import type { PageSummary } from '@hiccms/page-manager'
import { appearanceApi } from '../../lib/appearance-api'
import { apiRequest } from '../../lib/api'

type LinkType = 'page' | 'custom'

export default function MenuManager() {
  const [menus, setMenus] = useState<Menu[]>([])
  const [pages, setPages] = useState<PageSummary[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [menuName, setMenuName] = useState('')
  const [location, setLocation] = useState<MenuLocation>('custom')
  const [linkType, setLinkType] = useState<LinkType>('page')
  const [label, setLabel] = useState('')
  const [url, setUrl] = useState('')
  const [message, setMessage] = useState('')
  const selected = useMemo(() => menus.find((menu) => menu.id === selectedId), [menus, selectedId])

  const loadMenus = async () => {
    try {
      const result = await appearanceApi.menus()
      setMenus(result.data)
      setSelectedId((current) => current || result.data[0]?.id || '')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Gagal memuat menu')
    }
  }

  useEffect(() => {
    void loadMenus()
    apiRequest<{ data: PageSummary[] }>('/api/pages/published')
      .then((result) => setPages(result.data))
      .catch(() => setPages([]))
  }, [])

  const createMenu = async (event: React.FormEvent) => {
    event.preventDefault()
    const slug = menuName.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    try {
      const result = await appearanceApi.createMenu({ name: menuName, slug, location })
      setMenuName('')
      await loadMenus()
      setSelectedId(result.data.id)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Gagal membuat menu')
    }
  }

  const addItem = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!selected) return
    try {
      await appearanceApi.addItem(selected.id, { label, url, target: '_self', sortOrder: selected.items.length })
      setLabel('')
      setUrl('')
      await loadMenus()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Gagal menambah item')
    }
  }

  const move = async (index: number, direction: -1 | 1) => {
    if (!selected) return
    const target = index + direction
    if (target < 0 || target >= selected.items.length) return
    const items = [...selected.items]
    ;[items[index], items[target]] = [items[target], items[index]]
    await appearanceApi.reorder(selected.id, items.map(({ id }) => ({ id })))
    await loadMenus()
  }

  const renderItem = (item: MenuItem, index: number) => <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border bg-white p-3">
    <div className="min-w-0"><p className="font-medium text-gray-900">{item.label}</p><p className="truncate text-xs text-gray-500">{item.url}</p></div>
    <div className="flex gap-1"><button onClick={() => void move(index, -1)} className="rounded p-2 hover:bg-gray-100" aria-label="Naik"><ArrowUp className="h-4 w-4" /></button><button onClick={() => void move(index, 1)} className="rounded p-2 hover:bg-gray-100" aria-label="Turun"><ArrowDown className="h-4 w-4" /></button><button onClick={async () => { await appearanceApi.deleteItem(item.id); await loadMenus() }} className="rounded p-2 text-red-600 hover:bg-red-50" aria-label="Hapus"><Trash2 className="h-4 w-4" /></button></div>
  </div>

  return <div className="grid gap-6 xl:grid-cols-[300px_1fr]">
    <aside className="space-y-4"><form onSubmit={createMenu} className="space-y-3 rounded-xl border bg-white p-4"><h2 className="font-semibold">Menu Baru</h2><input required value={menuName} onChange={(e) => setMenuName(e.target.value)} placeholder="Nama menu" className="w-full rounded-lg border px-3 py-2" /><select value={location} onChange={(e) => setLocation(e.target.value as MenuLocation)} className="w-full rounded-lg border bg-white px-3 py-2"><option value="primary">Primary</option><option value="footer">Footer</option><option value="custom">Custom</option></select><button className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm text-white"><Plus className="mr-2 h-4 w-4" />Buat Menu</button></form><div className="space-y-2">{menus.map((menu) => <button key={menu.id} onClick={() => setSelectedId(menu.id)} className={`w-full rounded-lg border p-3 text-left ${selectedId === menu.id ? 'border-blue-500 bg-blue-50' : 'bg-white'}`}><p className="font-medium">{menu.name}</p><p className="text-xs text-gray-500">{menu.location} · /{menu.slug}</p></button>)}</div></aside>
    <section className="space-y-4">{selected ? <><div className="flex items-center justify-between"><div><h2 className="text-lg font-semibold">{selected.name}</h2><p className="text-sm text-gray-500">Susun link dari atas ke bawah.</p></div>{selected.location === 'custom' && <button onClick={async () => { if (confirm('Hapus menu ini?')) { await appearanceApi.deleteMenu(selected.id); setSelectedId(''); await loadMenus() } }} className="text-sm text-red-600">Hapus Menu</button>}</div>
      <form onSubmit={addItem} className="grid gap-3 rounded-xl border bg-white p-4 md:grid-cols-[140px_1fr_1fr_auto]"><select value={linkType} onChange={(e) => { setLinkType(e.target.value as LinkType); setLabel(''); setUrl('') }} className="rounded-lg border bg-white px-3 py-2"><option value="page">Page</option><option value="custom">Custom URL</option></select><input required value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label" className="rounded-lg border px-3 py-2" />{linkType === 'page' ? <select required value={url} onChange={(e) => { const page = pages.find((item) => `/${item.slug}` === e.target.value); setUrl(e.target.value); if (!label && page) setLabel(page.title) }} className="rounded-lg border bg-white px-3 py-2"><option value="">Pilih halaman...</option>{pages.map((page) => <option key={page.id} value={`/${page.slug}`}>{page.title}</option>)}</select> : <input required value={url} onChange={(e) => setUrl(e.target.value)} placeholder="/path atau https://..." className="rounded-lg border px-3 py-2" />}<button className="rounded-lg bg-gray-900 px-4 py-2 text-white">Tambah Link</button></form>
      <div className="space-y-2">{selected.items.map(renderItem)}{!selected.items.length && <p className="rounded-xl border border-dashed p-8 text-center text-gray-500">Menu belum memiliki link.</p>}</div></> : <p className="rounded-xl border border-dashed p-8 text-center text-gray-500">Pilih atau buat menu.</p>}{message && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{message}</p>}</section>
  </div>
}
