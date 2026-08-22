export default function RouteLoadingFallback() {
  return <div className="flex min-h-64 items-center justify-center" role="status" aria-live="polite">
    <div className="text-center">
      <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
      <p className="mt-3 text-sm text-slate-500">Memuat halaman...</p>
    </div>
  </div>
}
