import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Globe, Lock, Key, Clock } from 'lucide-react';
import PostModal from '../components/Posts/PostModal';
import { apiRequest } from '../lib/api';

interface ApiResponse<T> { success: boolean; data: T; message?: string }
interface Category { id: string; name: string; slug: string }

function toLocalDateTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

export default function Posts() {
  const [posts, setPosts] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<any>(null);

  useEffect(() => {
    fetchPosts();
    fetchCategories();
  }, []);

  const fetchPosts = async () => {
    try {
      const data = await apiRequest<ApiResponse<any[]>>('/api/posts/admin');
      setPosts(data.data);
    } catch (err) {
      console.error('Failed to fetch posts', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await apiRequest<ApiResponse<Category[]>>('/api/categories');
      setCategories(data.data);
    } catch (err) {
      console.error('Failed to fetch categories', err);
    }
  };

  const handleAddCategory = async (name: string): Promise<Category> => {
    try {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      const response = await apiRequest<ApiResponse<{ id: string }>>('/api/categories', {
        method: 'POST',
        body: JSON.stringify({ name, slug })
      });
      const category = { id: response.data.id, name, slug };
      setCategories((current) => [...current, category].sort((a, b) => a.name.localeCompare(b.name)));
      return category;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gagal menambah kategori';
      throw new Error(message);
    }
  };

  const handleSavePost = async (formData: any) => {
    try {
      if (formData.status === 'scheduled' && !formData.published_at) {
        throw new Error('Tanggal dan jam terbit wajib diisi untuk artikel terjadwal')
      }
      const parsedTags = formData.tags.split(',').map((t: string) => t.trim()).filter((t: string) => t !== '');

      const payload = {
        title: formData.title,
        slug: formData.slug,
        excerpt: formData.excerpt,
        content: formData.content,
        meta_title: formData.meta_title?.trim() || null,
        meta_description: formData.meta_description?.trim() || null,
        focus_keyword: formData.focus_keyword?.trim() || null,
        meta_keywords: formData.meta_keywords,
        og_image: formData.og_image?.trim() || null,
        category_id: formData.category_id,
        tags: parsedTags,
        status: formData.status,
        visibility: formData.visibility,
        password: formData.password,
        published_at: formData.published_at ? new Date(formData.published_at).toISOString() : null
      };

      const url = editingPost ? `/api/posts/${editingPost.id}` : '/api/posts';
      
      const method = editingPost ? 'PUT' : 'POST';

      await apiRequest(url, {
        method,
        body: JSON.stringify(payload)
      });
      setIsModalOpen(false);
      setEditingPost(null);
      fetchPosts();
    } catch (err) {
      alert('Gagal menyimpan artikel: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Yakin ingin menghapus artikel ini?')) return;
    try {
      await apiRequest(`/api/posts/${id}`, { method: 'DELETE' });
      fetchPosts();
    } catch (error) {
      alert('Gagal menghapus artikel');
    }
  };

  const handleEdit = async (post: any) => {
    try {
      const response = await apiRequest<ApiResponse<any>>(`/api/posts/${post.id}/edit`);
      setEditingPost({
        ...response.data,
        tags: Array.isArray(response.data.tags) ? response.data.tags.join(', ') : '',
        published_at: response.data.published_at ? toLocalDateTime(response.data.published_at) : ''
      });
      setIsModalOpen(true);
    } catch (error) {
      alert('Gagal memuat isi artikel: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const renderVisibilityIcon = (vis: string) => {
    if (vis === 'private') return <span title="Private"><Lock className="w-3 h-3 text-red-500" /></span>;
    if (vis === 'password') return <span title="Password Protected"><Key className="w-3 h-3 text-amber-500" /></span>;
    return <span title="Public"><Globe className="w-3 h-3 text-emerald-500" /></span>;
  };

  const renderStatus = (status: string) => {
    if (status === 'scheduled') {
      return (
        <span className="bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full text-xs font-medium flex items-center w-fit">
          <Clock className="w-3 h-3 mr-1" /> Terjadwal
        </span>
      );
    }
    if (status === 'draft') {
      return (
        <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full text-xs font-medium w-fit">
          Draft
        </span>
      );
    }
    if (status === 'archived') {
      return <span className="w-fit rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700">Arsip</span>;
    }
    return (
      <span className="bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full text-xs font-medium w-fit">
        Terbit
      </span>
    );
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Manajemen Artikel</h1>
          <p className="text-slate-500 mt-1">Kelola publikasi blog, SEO, dan visibilitas.</p>
        </div>
        <button 
          onClick={() => { setEditingPost(null); setIsModalOpen(true); }} 
          className="flex items-center bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-sm hover:shadow"
        >
          <Plus className="w-5 h-5 mr-2" />
          Tulis Artikel Baru
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Judul Artikel</th>
                <th className="px-6 py-4">Kategori</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Visibilitas</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">Memuat data...</td>
                </tr>
              ) : posts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center">Belum ada artikel.</td>
                </tr>
              ) : (
                posts.map((post) => (
                  <tr key={post.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{post.title}</div>
                      <div className="text-xs text-slate-400 mt-0.5">/{post.slug}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md text-xs">{post.category || '-'}</span>
                    </td>
                    <td className="px-6 py-4">
                      {renderStatus(post.status)}
                      {post.status === 'scheduled' && post.published_at && <div className="mt-1 text-xs text-amber-700">{new Date(post.published_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB</div>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-1.5">
                        {renderVisibilityIcon(post.visibility)}
                        <span className="capitalize text-xs font-medium">{post.visibility || 'Public'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end space-x-3">
                        <button 
                          onClick={() => void handleEdit(post)}
                          className="text-slate-400 hover:text-indigo-600 transition-colors p-1"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(post.id)}
                          className="text-slate-400 hover:text-red-600 transition-colors p-1"
                          title="Hapus"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <PostModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleSavePost}
        categories={categories}
        onAddCategory={handleAddCategory}
        initialData={editingPost}
      />
    </div>
  );
}
