import { useMemo, useState } from 'react'
import { BookOpen, Check, Copy, ExternalLink, Image as ImageIcon, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import { allTutorialsToMarkdown, tutorialToMarkdown, tutorialTopics } from '../content/tutorials'

const copyText = async (value: string) => {
  if (!navigator.clipboard) throw new Error('Clipboard tidak tersedia pada browser ini')
  await navigator.clipboard.writeText(value)
}

export default function Help() {
  const [query, setQuery] = useState('')
  const [activeId, setActiveId] = useState(tutorialTopics[0].id)
  const [copied, setCopied] = useState('')
  const availableTopics = tutorialTopics
  const filtered = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase('id-ID')
    return keyword ? availableTopics.filter((topic) => `${topic.title} ${topic.group} ${topic.summary}`.toLocaleLowerCase('id-ID').includes(keyword)) : availableTopics
  }, [availableTopics, query])
  const active = filtered.find((topic) => topic.id === activeId) ?? filtered[0] ?? availableTopics[0]

  const copy = async (id: string, value: string) => {
    try {
      await copyText(value)
      setCopied(id)
      window.setTimeout(() => setCopied((current) => current === id ? '' : current), 2000)
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Gagal menyalin tutorial')
    }
  }

  return <div className="space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900"><BookOpen className="h-7 w-7 text-blue-600" />Panduan HIC-CMS</h1><p className="mt-1 text-gray-500">Tutorial setiap menu Admin yang dapat dibaca atau disalin sebagai Markdown.</p></div>
      <button type="button" onClick={() => void copy('all', allTutorialsToMarkdown(availableTopics))} className="inline-flex items-center rounded-lg border border-blue-600 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50">{copied === 'all' ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}{copied === 'all' ? 'Semua tersalin' : 'Salin semua tutorial'}</button>
    </header>

    <div className="grid gap-6 xl:grid-cols-[300px_1fr]">
      <aside className="rounded-xl border bg-white p-4 shadow-sm">
        <label className="relative block"><Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari tutorial..." className="w-full rounded-lg border py-2 pl-9 pr-3 text-sm" /></label>
        <nav className="mt-4 max-h-[70vh] space-y-1 overflow-y-auto">
          {filtered.map((topic) => <button type="button" key={topic.id} onClick={() => setActiveId(topic.id)} className={`w-full rounded-lg px-3 py-2 text-left ${active.id === topic.id ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'}`}><span className="block text-sm font-medium">{topic.title}</span><span className={`text-xs ${active.id === topic.id ? 'text-blue-100' : 'text-gray-500'}`}>{topic.group}</span></button>)}
          {!filtered.length && <p className="p-4 text-center text-sm text-gray-500">Tutorial tidak ditemukan.</p>}
        </nav>
      </aside>

      <article className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
          <div><p className="text-xs font-semibold uppercase tracking-wide text-blue-600">{active.group}</p><h2 className="mt-1 text-2xl font-bold text-gray-900">{active.title}</h2><p className="mt-2 max-w-3xl text-gray-600">{active.summary}</p></div>
          <div className="flex gap-2">{active.path && <Link to={active.path} className="inline-flex items-center rounded-lg border px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"><ExternalLink className="mr-2 h-4 w-4" />Buka menu</Link>}<button type="button" onClick={() => void copy(active.id, tutorialToMarkdown(active))} className="inline-flex items-center rounded-lg bg-blue-600 px-3 py-2 text-sm text-white">{copied === active.id ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}{copied === active.id ? 'Tersalin' : 'Salin'}</button></div>
        </div>

        {active.screenshot ? <figure className="mt-6 overflow-hidden rounded-xl border bg-gray-50"><img src={active.screenshot.src} alt={active.screenshot.alt} className="w-full" /><figcaption className="p-3 text-xs text-gray-500">{active.screenshot.alt}</figcaption></figure> : <div className="mt-6 flex items-center gap-3 rounded-xl border border-dashed bg-gray-50 p-4 text-sm text-gray-500"><ImageIcon className="h-5 w-5" /><span>Screenshot aktual belum tersedia. Struktur tutorial sudah siap menerima gambar tanpa mengubah halaman.</span></div>}

        <section className="mt-6"><h3 className="text-lg font-semibold text-gray-900">Langkah-langkah</h3><ol className="mt-3 space-y-3">{active.steps.map((step, index) => <li key={`${active.id}-${index}`} className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">{index + 1}</span><p className="pt-1 text-gray-700">{step}</p></li>)}</ol></section>
        {active.tips?.length && <section className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4"><h3 className="font-semibold text-amber-900">Tips</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-800">{active.tips.map((tip) => <li key={tip}>{tip}</li>)}</ul></section>}
      </article>
    </div>
  </div>
}
