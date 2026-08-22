import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import type { PageSummary } from '@hiccms/page-manager';
import { API_URL, apiRequest } from '../lib/api';

export default function Settings() {
  const [settings, setSettings] = useState({
    site_name: '',
    site_description: '',
    theme_color: '#2563eb',
    theme_mode: 'light',
    homepage_display: 'latest_posts',
    homepage_page_id: '',
    whatsapp_enabled: 'false',
    whatsapp_number: '',
    whatsapp_label: 'Hubungi via WhatsApp',
    whatsapp_message: ''
  });
  const [pages, setPages] = useState<PageSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
    apiRequest<{ data: PageSummary[] }>('/api/pages/published').then((result) => setPages(result.data)).catch(() => setPages([]));
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API_URL}/api/settings`);
      const data = await res.json();
      if (data.success && data.data) {
        setSettings(prev => ({ ...prev, ...data.data }));
      }
    } catch (err) {
      console.error('Failed to fetch settings', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const data = await apiRequest<{ success: boolean; message?: string }>('/api/settings', {
        method: 'POST',
        body: JSON.stringify(settings)
      });
      if (data.success) {
        alert('Pengaturan berhasil disimpan!');
      } else {
        alert('Gagal menyimpan: ' + data.message);
      }
    } catch (err) {
      alert('Gagal menyimpan karena kesalahan jaringan');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-gray-500">Memuat pengaturan...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Pengaturan Situs</h1>
        <p className="text-gray-500 mt-1">Kelola identitas dan preferensi visual HICCMS.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <form onSubmit={handleSave} className="p-6 space-y-6">
          
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Informasi Umum</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Situs</label>
                <input 
                  type="text" 
                  required
                  value={settings.site_name}
                  onChange={(e) => setSettings({...settings, site_name: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi Situs (SEO)</label>
                <textarea 
                  rows={3}
                  value={settings.site_description}
                  onChange={(e) => setSettings({...settings, site_description: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2 mt-8">Kontak WhatsApp</h2>
            <div className="space-y-4">
              <label className="flex items-center gap-3 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={settings.whatsapp_enabled === 'true'}
                  onChange={(e) => setSettings({ ...settings, whatsapp_enabled: e.target.checked ? 'true' : 'false' })}
                  className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                Tampilkan tombol WhatsApp di website
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm font-medium text-gray-700">
                  Nomor WhatsApp
                  <input
                    type="tel"
                    required={settings.whatsapp_enabled === 'true'}
                    value={settings.whatsapp_number}
                    onChange={(e) => setSettings({ ...settings, whatsapp_number: e.target.value })}
                    placeholder="Contoh: 081234567890 atau 6281234567890"
                    className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-green-500 focus:ring-2 focus:ring-green-500"
                  />
                  <span className="mt-1 block text-xs font-normal text-gray-500">Spasi dan tanda + diperbolehkan. Nomor 08 otomatis diubah menjadi format 62.</span>
                </label>
                <label className="block text-sm font-medium text-gray-700">
                  Label Tombol
                  <input
                    type="text"
                    maxLength={40}
                    value={settings.whatsapp_label}
                    onChange={(e) => setSettings({ ...settings, whatsapp_label: e.target.value })}
                    placeholder="Hubungi via WhatsApp"
                    className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-green-500 focus:ring-2 focus:ring-green-500"
                  />
                </label>
              </div>
              <label className="block text-sm font-medium text-gray-700">
                Pesan Pembuka
                <textarea
                  rows={3}
                  maxLength={300}
                  value={settings.whatsapp_message}
                  onChange={(e) => setSettings({ ...settings, whatsapp_message: e.target.value })}
                  placeholder="Contoh: Assalamu'alaikum, saya ingin memperoleh informasi tentang RA Hidayatul Muhibbin."
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-green-500 focus:ring-2 focus:ring-green-500"
                />
                <span className="mt-1 block text-xs font-normal text-gray-500">Pesan ini otomatis terisi ketika pengunjung membuka WhatsApp.</span>
              </label>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2 mt-8">Tampilan Beranda</h2>
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">Beranda menampilkan<select value={settings.homepage_display} onChange={(e) => setSettings({ ...settings, homepage_display: e.target.value, homepage_page_id: e.target.value === 'latest_posts' ? '' : settings.homepage_page_id })} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-4 py-2"><option value="latest_posts">Posting terbaru</option><option value="static_page">Halaman statis</option></select></label>
              {settings.homepage_display === 'static_page' && <label className="block text-sm font-medium text-gray-700">Halaman Beranda<select required value={settings.homepage_page_id} onChange={(e) => setSettings({ ...settings, homepage_page_id: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-4 py-2"><option value="">Pilih halaman published...</option>{pages.map((page) => <option key={page.id} value={page.id}>{page.title}</option>)}</select>{pages.length === 0 && <span className="mt-1 block text-xs text-amber-600">Terbitkan minimal satu halaman sebelum memilih halaman statis.</span>}</label>}
              <p className="text-xs text-gray-500">Posting terbaru mempertahankan homepage blog. Halaman statis menggunakan halaman published yang dipilih.</p>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2 mt-8">Tema (Theme Manager)</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Warna Utama (Aksen)</label>
                <div className="flex items-center space-x-3">
                  <input 
                    type="color" 
                    value={settings.theme_color}
                    onChange={(e) => setSettings({...settings, theme_color: e.target.value})}
                    className="w-10 h-10 border-0 rounded cursor-pointer"
                  />
                  <input 
                    type="text" 
                    value={settings.theme_color}
                    onChange={(e) => setSettings({...settings, theme_color: e.target.value})}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mode Tema</label>
                <select 
                  value={settings.theme_mode}
                  onChange={(e) => setSettings({...settings, theme_mode: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                >
                  <option value="light">Terang (Light)</option>
                  <option value="dark">Gelap (Dark)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t flex justify-end">
            <button 
              type="submit" 
              disabled={saving}
              className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors shadow-sm disabled:opacity-50"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
            </button>
          </div>

        </form>
      </div>

    </div>
  );
}
