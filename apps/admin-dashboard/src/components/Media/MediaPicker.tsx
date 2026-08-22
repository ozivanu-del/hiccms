import { useEffect, useRef, useState } from 'react'
import { Image as ImageIcon, UploadCloud, X } from 'lucide-react'
import { API_URL, apiRequest } from '../../lib/api'

interface MediaItem { id: string; original_name: string; url: string }
interface MediaPickerProps { isOpen: boolean; onClose: () => void; onSelect: (url: string) => void }
interface MediaResponse { success: boolean; data: MediaItem[]; message?: string }
interface MediaUploadResponse { success: boolean; data: MediaItem; message?: string }

const resolveMediaUrl = (url: string) => url.startsWith('http') ? url : `${API_URL}${url}`

export default function MediaPicker({ isOpen, onClose, onSelect }: MediaPickerProps) {
  const [media, setMedia] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadMedia = async () => {
    setLoading(true)
    try {
      const response = await apiRequest<MediaResponse>('/api/media')
      setMedia(response.data)
      setMessage('')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Gagal memuat media')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (isOpen) void loadMedia() }, [isOpen])

  const upload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setMessage('File harus berupa gambar.')
      event.target.value = ''
      return
    }
    const body = new FormData()
    body.append('file', file)
    setLoading(true)
    try {
      const response = await apiRequest<MediaUploadResponse>('/api/media/upload', { method: 'POST', body })
      onSelect(resolveMediaUrl(response.data.url))
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Gagal mengunggah gambar')
    } finally {
      setLoading(false)
      event.target.value = ''
    }
  }

  if (!isOpen) return null

  return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
    <div className="flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
      <header className="flex items-center justify-between border-b p-5">
        <div><h3 className="font-semibold text-slate-900">Pilih Gambar</h3><p className="text-sm text-slate-500">Pilih media yang sudah ada atau unggah gambar baru.</p></div>
        <button type="button" onClick={onClose} aria-label="Tutup pemilih media" className="rounded-lg p-2 hover:bg-slate-100"><X className="h-5 w-5" /></button>
      </header>
      <div className="flex items-center justify-between border-b px-5 py-3">
        <input ref={fileInputRef} type="file" accept="image/*" onChange={upload} className="hidden" />
        <button type="button" disabled={loading} onClick={() => fileInputRef.current?.click()} className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"><UploadCloud className="mr-2 h-4 w-4" />Unggah Gambar</button>
        {message && <p className="text-sm text-red-600">{message}</p>}
      </div>
      <div className="overflow-y-auto p-5">
        {loading && media.length === 0 ? <p className="py-12 text-center text-slate-500">Memuat media...</p> : media.length === 0 ? <div className="py-12 text-center text-slate-500"><ImageIcon className="mx-auto mb-3 h-12 w-12 text-slate-300" />Belum ada gambar.</div> : <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {media.map((item) => <button type="button" key={item.id} onClick={() => onSelect(resolveMediaUrl(item.url))} className="overflow-hidden rounded-xl border text-left hover:border-indigo-500 hover:ring-2 hover:ring-indigo-100">
            <img src={resolveMediaUrl(item.url)} alt={item.original_name} className="aspect-square w-full object-cover" />
            <span className="block truncate p-2 text-xs text-slate-600">{item.original_name}</span>
          </button>)}
        </div>}
      </div>
    </div>
  </div>
}
