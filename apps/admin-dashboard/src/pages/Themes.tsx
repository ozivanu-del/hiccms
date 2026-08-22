import { useEffect, useState } from 'react'
import { Check, Palette, RefreshCw, Save } from 'lucide-react'
import type { ThemeConfig, ThemeSummary } from '@hiccms/theme-engine'
import { apiRequest } from '../lib/api'

interface ApiResponse<T> { success: boolean; data: T; message?: string }

const FONT_PRESETS: ThemeConfig['font'][] = [
  { family: 'Inter', source: 'google', url: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap' },
  { family: 'Roboto', source: 'google', url: 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap' },
  { family: 'Open Sans', source: 'google', url: 'https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;500;600;700&display=swap' },
  { family: 'Lato', source: 'google', url: 'https://fonts.googleapis.com/css2?family=Lato:wght@400;700&display=swap' },
  { family: 'Poppins', source: 'google', url: 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap' },
  { family: 'Montserrat', source: 'google', url: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap' },
  { family: 'Nunito', source: 'google', url: 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700&display=swap' },
  { family: 'Raleway', source: 'google', url: 'https://fonts.googleapis.com/css2?family=Raleway:wght@400;500;600;700&display=swap' },
  { family: 'Merriweather', source: 'google', url: 'https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700&display=swap' },
  { family: 'Playfair Display', source: 'google', url: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&display=swap' },
  { family: 'Source Sans 3', source: 'google', url: 'https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;500;600;700&display=swap' },
  { family: 'system-ui', source: 'system' },
]

export default function Themes() {
  const [themes, setThemes] = useState<ThemeSummary[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [draft, setDraft] = useState<ThemeConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [message, setMessage] = useState('')

  const selected = themes.find((theme) => theme.id === selectedId)

  const loadThemes = async () => {
    setLoading(true)
    try {
      const response = await apiRequest<ApiResponse<ThemeSummary[]>>('/api/themes')
      setThemes(response.data)
      const nextId = selectedId || response.data.find((theme) => theme.isActive)?.id || response.data[0]?.id || ''
      setSelectedId(nextId)
      setDraft(structuredClone(response.data.find((theme) => theme.id === nextId)?.config ?? null))
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Gagal memuat tema')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void loadThemes() }, [])

  const chooseTheme = (theme: ThemeSummary) => {
    setSelectedId(theme.id)
    setDraft(structuredClone(theme.config))
    setMessage('')
  }

  const updateConfig = (next: Partial<ThemeConfig>) => {
    if (draft) setDraft({ ...draft, ...next })
  }

  const saveConfig = async () => {
    if (!draft || !selected) return
    setWorking(true)
    setMessage('')
    try {
      await apiRequest(`/api/themes/${selected.id}/config`, {
        method: 'PUT', body: JSON.stringify(draft),
      })
      setMessage('Konfigurasi tema berhasil disimpan.')
      await loadThemes()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Gagal menyimpan tema')
    } finally { setWorking(false) }
  }

  const activateTheme = async () => {
    if (!selected) return
    setWorking(true)
    setMessage('')
    try {
      await apiRequest(`/api/themes/${selected.id}/activate`, { method: 'POST' })
      setMessage('Tema berhasil diaktifkan. Build ulang web diperlukan untuk template Astro statis.')
      await loadThemes()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Gagal mengaktifkan tema')
    } finally { setWorking(false) }
  }

  if (loading) return <div className="p-8 text-gray-500">Memuat Theme Engine...</div>

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Theme Manager</h1>
          <p className="mt-1 text-gray-500">Aktifkan tema Astro dan atur tampilan situs tanpa mengubah backend.</p>
        </div>
        <button onClick={() => void loadThemes()} className="rounded-lg border border-gray-300 p-2 text-gray-600 hover:bg-gray-50" aria-label="Muat ulang tema">
          <RefreshCw className="h-5 w-5" />
        </button>
      </div>

      {message && <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">{message}</div>}

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="space-y-3">
          {themes.map((theme) => (
            <button key={theme.id} onClick={() => chooseTheme(theme)} className={`w-full rounded-xl border p-4 text-left transition ${selectedId === theme.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold text-gray-900">{theme.name}</span>
                {theme.isActive && <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700"><Check className="h-3 w-3" /> Aktif</span>}
              </div>
              <p className="mt-2 text-xs text-gray-500">v{theme.version} · {theme.author}</p>
              <p className="mt-2 text-sm text-gray-600">{theme.description}</p>
            </button>
          ))}
          {!themes.length && <p className="rounded-xl border border-dashed p-6 text-center text-sm text-gray-500">Belum ada tema terpasang.</p>}
        </aside>

        {selected && draft && (
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-3"><Palette className="h-5 w-5 text-blue-600" /><h2 className="text-lg font-semibold">Konfigurasi {selected.name}</h2></div>
              {!selected.isActive && <button disabled={working} onClick={() => void activateTheme()} className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">Aktifkan Tema</button>}
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <label className="text-sm font-medium text-gray-700">Mode
                <select value={draft.mode} onChange={(event) => updateConfig({ mode: event.target.value as ThemeConfig['mode'] })} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2">
                  <option value="light">Light</option><option value="dark">Dark</option><option value="system">System</option>
                </select>
              </label>
              <label className="text-sm font-medium text-gray-700">Font
                <select
                  value={draft.font.family}
                  onChange={(event) => {
                    const font = FONT_PRESETS.find((preset) => preset.family === event.target.value)
                    if (font) updateConfig({ font })
                  }}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2"
                >
                  {FONT_PRESETS.map((font) => <option key={font.family} value={font.family}>{font.family}</option>)}
                </select>
              </label>
              {Object.entries(draft.colors).map(([key, value]) => (
                <label key={key} className="text-sm font-medium capitalize text-gray-700">{key}
                  <div className="mt-1 flex gap-2"><input type="color" value={value} onChange={(event) => updateConfig({ colors: { ...draft.colors, [key]: event.target.value } })} className="h-10 w-12 rounded border" /><input value={value} onChange={(event) => updateConfig({ colors: { ...draft.colors, [key]: event.target.value } })} className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 font-mono" /></div>
                </label>
              ))}
            </div>

            <div className="mt-6 space-y-5">
              <label className="block text-sm font-medium text-gray-700">Custom CSS
                <textarea rows={7} value={draft.customCss} onChange={(event) => updateConfig({ customCss: event.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 p-3 font-mono text-sm" placeholder=".site-header { ... }" />
              </label>
              <label className="block text-sm font-medium text-gray-700">Custom JavaScript
                <textarea rows={7} value={draft.customJavaScript} onChange={(event) => updateConfig({ customJavaScript: event.target.value })} className="mt-1 w-full rounded-lg border border-amber-300 bg-amber-50 p-3 font-mono text-sm" placeholder="console.log('Theme loaded')" />
                <span className="mt-1 block text-xs text-amber-700">JavaScript dijalankan pada pengunjung situs. Gunakan hanya kode dari sumber tepercaya.</span>
              </label>
            </div>

            <div className="mt-6 flex justify-end border-t pt-5"><button disabled={working} onClick={() => void saveConfig()} className="inline-flex items-center rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"><Save className="mr-2 h-4 w-4" />{working ? 'Memproses...' : 'Simpan Konfigurasi'}</button></div>
          </section>
        )}
      </div>
    </div>
  )
}
