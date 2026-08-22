import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { error: Error | null }

const CHUNK_RETRY_KEY = 'hiccms-admin-chunk-retry'
const chunkErrorPattern = /chunk|dynamically imported|module script/i

export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Admin interface failed to render', error, info)
    if (chunkErrorPattern.test(error.message) && sessionStorage.getItem(CHUNK_RETRY_KEY) !== window.location.pathname) {
      sessionStorage.setItem(CHUNK_RETRY_KEY, window.location.pathname)
      window.location.reload()
    }
  }

  private reload = () => {
    sessionStorage.removeItem(CHUNK_RETRY_KEY)
    window.location.reload()
  }

  render() {
    if (!this.state.error) return this.props.children
    return <main className="grid min-h-screen place-items-center bg-slate-50 p-6">
      <section className="w-full max-w-lg rounded-2xl border bg-white p-6 text-center shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">Halaman gagal dimuat</h1>
        <p className="mt-2 text-sm text-slate-600">Asset antarmuka mungkin berubah setelah pembaruan. Muat ulang untuk mengambil versi terbaru.</p>
        <p className="mt-4 rounded-lg bg-red-50 p-3 text-left text-xs text-red-700">{this.state.error.message || 'Kesalahan antarmuka tidak diketahui'}</p>
        <div className="mt-5 flex justify-center gap-3">
          <a href="/" className="rounded-lg border px-4 py-2 text-sm font-semibold text-slate-700">Ke Dashboard</a>
          <button type="button" onClick={this.reload} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Muat Ulang</button>
        </div>
      </section>
    </main>
  }
}
