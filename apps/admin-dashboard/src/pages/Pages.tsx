import { useEffect, useState } from 'react'
import { Edit2, Plus, Save, Trash2, X } from 'lucide-react'
import type { Page, PageInput, PageSummary } from '@hiccms/page-manager'
import TiptapEditor from '../components/Editor/TiptapEditor'
import MediaPicker from '../components/Media/MediaPicker'
import { apiRequest } from '../lib/api'

interface ApiResponse<T> { success: boolean; data: T; message?: string }
const EMPTY_PAGE: PageInput = {
  title: '', slug: '', excerpt: '', content: '', status: 'draft', template: 'default',
  featuredImage: '', metaTitle: '', metaDescription: '', metaKeywords: '', isHomepage: false, publishedAt: null,
}
const createSlug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

function PageEditor({ initial, onClose, onSaved }: { initial: Page | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<PageInput>(initial ? {
    title: initial.title, slug: initial.slug, excerpt: initial.excerpt, content: initial.content,
    status: initial.status, template: initial.template, featuredImage: initial.featuredImage,
    metaTitle: initial.metaTitle, metaDescription: initial.metaDescription, metaKeywords: initial.metaKeywords,
    isHomepage: initial.isHomepage, publishedAt: initial.publishedAt,
  } : EMPTY_PAGE)
  const [message, setMessage] = useState('')
  const [showMedia, setShowMedia] = useState(false)
  const save = async () => {
    try {
      await apiRequest(initial ? `/api/pages/${initial.id}` : '/api/pages', { method: initial ? 'PUT' : 'POST', body: JSON.stringify(form) })
      onSaved()
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Gagal menyimpan halaman') }
  }
  return <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-4">
    <div className="mx-auto my-4 max-w-6xl rounded-2xl bg-slate-50 shadow-2xl">
      <header className="flex items-center justify-between border-b bg-white p-5"><h2 className="text-xl font-bold">{initial ? 'Edit Halaman' : 'Tambah Halaman'}</h2><button onClick={onClose}><X /></button></header>
      <div className="grid gap-6 p-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-4">
          <label className="block text-sm font-medium">Judul<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value, slug: initial ? form.slug : createSlug(event.target.value) })} className="mt-1 w-full rounded-lg border px-3 py-2" /></label>
          <label className="block text-sm font-medium">Slug<input value={form.slug} onChange={(event) => setForm({ ...form, slug: createSlug(event.target.value) })} className="mt-1 w-full rounded-lg border px-3 py-2" /></label>
          <label className="block text-sm font-medium">Ringkasan<textarea rows={3} value={form.excerpt} onChange={(event) => setForm({ ...form, excerpt: event.target.value })} className="mt-1 w-full rounded-lg border p-3" /></label>
          <div><p className="mb-1 text-sm font-medium">Konten</p><TiptapEditor content={form.content} onChange={(content) => setForm((current) => ({ ...current, content }))} /></div>
        </div>
        <aside className="space-y-4">
          <section className="space-y-3 rounded-xl border bg-white p-4">
            <label className="block text-sm font-medium">Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as PageInput['status'], isHomepage: event.target.value === 'published' ? form.isHomepage : false })} className="mt-1 w-full rounded-lg border bg-white px-3 py-2"><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></label>
            <label className="block text-sm font-medium">Template<select value={form.template} onChange={(event) => setForm({ ...form, template: event.target.value as PageInput['template'] })} className="mt-1 w-full rounded-lg border bg-white px-3 py-2"><option value="default">Default</option><option value="full-width">Full Width</option><option value="landing">Landing Page</option></select></label>
            <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={form.isHomepage} disabled={form.status !== 'published'} onChange={(event) => setForm({ ...form, isHomepage: event.target.checked })} className="mt-1" /><span>Jadikan halaman beranda</span></label>
          </section>
          <section className="space-y-3 rounded-xl border bg-white p-4"><div className="flex justify-between"><h3 className="text-sm font-semibold">Gambar Utama</h3><button type="button" onClick={() => setShowMedia(true)} className="text-sm text-indigo-600">Pilih Media</button></div>{form.featuredImage && <img src={form.featuredImage} alt="Preview" className="aspect-video w-full rounded-lg object-cover" />}<input value={form.featuredImage} onChange={(event) => setForm({ ...form, featuredImage: event.target.value })} placeholder="https://..." className="w-full rounded-lg border px-3 py-2 text-sm" /></section>
          <section className="space-y-3 rounded-xl border bg-white p-4"><h3 className="text-sm font-semibold">SEO Dasar</h3><input value={form.metaTitle} onChange={(event) => setForm({ ...form, metaTitle: event.target.value })} placeholder="Meta title" className="w-full rounded-lg border px-3 py-2 text-sm" /><textarea value={form.metaDescription} onChange={(event) => setForm({ ...form, metaDescription: event.target.value })} placeholder="Meta description" className="w-full rounded-lg border p-2 text-sm" /><input value={form.metaKeywords} onChange={(event) => setForm({ ...form, metaKeywords: event.target.value })} placeholder="Meta keywords" className="w-full rounded-lg border px-3 py-2 text-sm" /></section>
          {message && <p className="text-sm text-red-600">{message}</p>}
          <button type="button" onClick={save} className="inline-flex w-full justify-center rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white"><Save className="mr-2 h-5 w-5" />Simpan Halaman</button>
        </aside>
      </div>
    </div>
    <MediaPicker isOpen={showMedia} onClose={() => setShowMedia(false)} onSelect={(url) => { setForm({ ...form, featuredImage: url }); setShowMedia(false) }} />
  </div>
}

export default function Pages() {
  const [pages, setPages] = useState<PageSummary[]>([])
  const [editor, setEditor] = useState<{ open: boolean; page: Page | null }>({ open: false, page: null })
  const [message, setMessage] = useState('')
  const load = async () => { try { const response = await apiRequest<ApiResponse<PageSummary[]>>('/api/pages'); setPages(response.data) } catch (error) { setMessage(error instanceof Error ? error.message : 'Gagal memuat halaman') } }
  useEffect(() => { void load() }, [])
  const edit = async (id: string) => { try { const response = await apiRequest<ApiResponse<Page>>(`/api/pages/admin/${id}`); setEditor({ open: true, page: response.data }) } catch (error) { setMessage(error instanceof Error ? error.message : 'Gagal memuat halaman') } }
  const archive = async (id: string) => { if (!confirm('Arsipkan halaman ini?')) return; await apiRequest(`/api/pages/${id}`, { method: 'DELETE' }); await load() }
  return <div className="space-y-6"><div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold">Pages Manager</h1><p className="text-slate-500">Kelola halaman statis dengan editor dan SEO dasar.</p></div><button onClick={() => setEditor({ open: true, page: null })} className="inline-flex rounded-lg bg-indigo-600 px-4 py-2 text-white"><Plus className="mr-2 h-5 w-5" />Tambah Halaman</button></div>
    {message && <p className="rounded-lg bg-red-50 p-3 text-red-700">{message}</p>}
    <div className="overflow-x-auto rounded-xl border bg-white"><table className="w-full min-w-[42rem] text-left text-sm"><thead className="bg-slate-50"><tr><th className="p-4">Judul</th><th>Template</th><th>Status</th><th className="p-4 text-right">Aksi</th></tr></thead><tbody>{pages.map((page) => <tr key={page.id} className="border-t"><td className="p-4"><div className="font-medium">{page.title}</div><span className="text-xs text-slate-400">/{page.slug}</span></td><td>{page.template}</td><td><span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{page.status}</span></td><td className="p-4"><div className="flex justify-end gap-2"><button onClick={() => void edit(page.id)} title="Edit Halaman" className="rounded-lg border p-2 text-indigo-600"><Edit2 className="h-4 w-4" /></button><button onClick={() => void archive(page.id)} title="Arsipkan" className="rounded-lg border p-2 text-red-600"><Trash2 className="h-4 w-4" /></button></div></td></tr>)}</tbody></table>{pages.length === 0 && <p className="p-8 text-center text-slate-500">Belum ada halaman.</p>}</div>
    {editor.open && <PageEditor initial={editor.page} onClose={() => setEditor({ open: false, page: null })} onSaved={() => { setEditor({ open: false, page: null }); void load() }} />}
  </div>
}
