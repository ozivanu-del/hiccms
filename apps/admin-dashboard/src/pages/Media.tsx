import { useEffect, useState, useRef } from 'react';
import { UploadCloud, Image as ImageIcon, Trash2, Copy } from 'lucide-react';
import { API_URL } from '../lib/api';

export default function Media() {
  const [media, setMedia] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchMedia();
  }, []);

  const fetchMedia = async () => {
    try {
      const res = await fetch(`${API_URL}/api/media`);
      const data = await res.json();
      if (data.success) {
        setMedia(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch media', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('token='))
        ?.split('=')[1];

      const res = await fetch(`${API_URL}/api/media/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      const data = await res.json();
      if (data.success) {
        // Refresh media list
        fetchMedia();
      } else {
        alert('Upload failed: ' + data.message);
      }
    } catch (err) {
      alert('Upload failed due to network error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const copyToClipboard = (url: string) => {
    const fullUrl = `${API_URL}${url}`;
    navigator.clipboard.writeText(fullUrl);
    alert('URL copied to clipboard!');
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Media Library</h1>
          <p className="text-gray-500 mt-1">Kelola aset gambar dan file yang disimpan di Cloudflare R2.</p>
        </div>
        <div>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleUpload} 
            className="hidden" 
            accept="image/*" 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm disabled:opacity-50"
          >
            <UploadCloud className="w-4 h-4 mr-2" />
            {uploading ? 'Mengunggah...' : 'Unggah File'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        {loading ? (
          <div className="text-center py-12 text-gray-500">Memuat galeri...</div>
        ) : media.length === 0 ? (
          <div className="text-center py-16">
            <ImageIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">Belum ada media</h3>
            <p className="text-gray-500">Mulai unggah gambar untuk digunakan di artikel Anda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {media.map((item) => (
              <div key={item.id} className="group relative bg-gray-50 rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                <div className="aspect-square w-full bg-gray-200 relative overflow-hidden">
                  <img 
                    src={`${API_URL}${item.url}`}
                    alt={item.original_name}
                    className="w-full h-full object-cover"
                  />
                  {/* Overlay Actions */}
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity space-x-2">
                    <button 
                      onClick={() => copyToClipboard(item.url)}
                      className="p-2 bg-white text-gray-700 rounded-full hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      title="Copy URL"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button 
                      className="p-2 bg-white text-gray-700 rounded-full hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="p-3">
                  <p className="text-sm font-medium text-gray-900 truncate" title={item.original_name}>
                    {item.original_name}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {(item.size / 1024).toFixed(1)} KB • {new Date(item.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
