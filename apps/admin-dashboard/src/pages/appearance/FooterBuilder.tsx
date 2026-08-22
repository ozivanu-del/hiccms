import { useEffect, useState } from 'react'
import { Plus, Save, Trash2 } from 'lucide-react'
import { DEFAULT_FOOTER_CONFIG, type FooterConfig, type Menu } from '@hiccms/appearance-manager'
import { appearanceApi } from '../../lib/appearance-api'

export default function FooterBuilder() {
  const [config, setConfig] = useState<FooterConfig>(DEFAULT_FOOTER_CONFIG)
  const [menus, setMenus] = useState<Menu[]>([])
  const [message, setMessage] = useState('')

  useEffect(() => {
    Promise.all([appearanceApi.layout(), appearanceApi.menus()])
      .then(([layout, menuResult]) => {
        setConfig(layout.data.footer)
        setMenus(menuResult.data)
      })
      .catch((error) => setMessage(error.message))
  }, [])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    try {
      await appearanceApi.updateFooter(config)
      setMessage('Footer configuration tersimpan.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Gagal menyimpan')
    }
  }
  const addSocialLink = () => setConfig({ ...config, socialLinks: [...config.socialLinks, { label: '', url: '' }] })
  const updateSocialLink = (index: number, field: 'label' | 'url', value: string) => setConfig({
    ...config,
    socialLinks: config.socialLinks.map((link, linkIndex) => linkIndex === index ? { ...link, [field]: value } : link),
  })
  const removeSocialLink = (index: number) => setConfig({
    ...config,
    socialLinks: config.socialLinks.filter((_, linkIndex) => linkIndex !== index),
  })

  return <form onSubmit={submit} className="mx-auto max-w-3xl space-y-5 rounded-xl border bg-white p-6">
    <h2 className="text-lg font-semibold">Footer Builder</h2>
    <label className="block text-sm font-medium">Footer Menu<select value={config.menuSlug} onChange={(e) => setConfig({ ...config, menuSlug: e.target.value })} className="mt-1 w-full rounded-lg border bg-white px-3 py-2">{menus.map((menu) => <option key={menu.id} value={menu.slug}>{menu.name}</option>)}</select></label>
    <label className="flex items-center gap-3 rounded-lg border p-3 text-sm"><input type="checkbox" checked={config.showSiteName} onChange={(e) => setConfig({ ...config, showSiteName: e.target.checked })} />Tampilkan Nama Situs</label>
    <label className="block text-sm font-medium">Deskripsi<textarea rows={3} value={config.description} onChange={(e) => setConfig({ ...config, description: e.target.value })} className="mt-1 w-full rounded-lg border p-3" /></label>
    <label className="block text-sm font-medium">Copyright<input value={config.copyright} onChange={(e) => setConfig({ ...config, copyright: e.target.value })} placeholder="Kosongkan untuk copyright otomatis" className="mt-1 w-full rounded-lg border px-3 py-2" /></label>
    <label className="block text-sm font-medium">Jumlah Kolom<select value={config.columns} onChange={(e) => setConfig({ ...config, columns: Number(e.target.value) as FooterConfig['columns'] })} className="mt-1 w-full rounded-lg border bg-white px-3 py-2"><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option></select></label>
    <section className="space-y-3 rounded-lg border p-4">
      <div className="flex items-center justify-between"><h3 className="text-sm font-semibold">Social Links</h3><button type="button" onClick={addSocialLink} className="inline-flex items-center rounded-lg border px-3 py-2 text-sm"><Plus className="mr-1 h-4 w-4" />Tambah</button></div>
      {config.socialLinks.length === 0 && <p className="text-sm text-gray-500">Belum ada tautan sosial.</p>}
      {config.socialLinks.map((link, index) => <div key={index} className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
        <input required value={link.label} onChange={(e) => updateSocialLink(index, 'label', e.target.value)} placeholder="Nama, contoh: Instagram" className="rounded-lg border px-3 py-2 text-sm" />
        <input required type="url" value={link.url} onChange={(e) => updateSocialLink(index, 'url', e.target.value)} placeholder="https://..." className="rounded-lg border px-3 py-2 text-sm" />
        <button type="button" onClick={() => removeSocialLink(index)} aria-label={`Hapus ${link.label || 'social link'}`} className="rounded-lg border p-2 text-red-600"><Trash2 className="h-4 w-4" /></button>
      </div>)}
    </section>
    <button className="inline-flex items-center rounded-lg bg-blue-600 px-5 py-2 text-white"><Save className="mr-2 h-4 w-4" />Simpan Footer</button>
    {message && <p className="text-sm text-blue-700">{message}</p>}
  </form>
}
