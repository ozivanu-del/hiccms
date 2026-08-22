import { useState, useEffect } from 'react';
import { X, Save, Settings, Link as LinkIcon, RefreshCw, Copy, Plus, Eye, Code, Lock, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import TiptapEditor from '../Editor/TiptapEditor';
import { SITE_URL, apiRequest } from '../../lib/api';
import MediaPicker from '../Media/MediaPicker';
import { createSeoSlug, normalizeSeoSlug, SEO_SLUG_MAX_LENGTH } from '../../lib/seo-slug';

const EMPTY_POST = {
  id: '', title: '', slug: '', excerpt: '', content: '',
  meta_title: '', meta_description: '', focus_keyword: '',
  meta_keywords: '', og_image: '', category_id: '', tags: '',
  status: 'draft', visibility: 'public', password: '', published_at: ''
};

const seoLengthClass = (length: number, idealMin: number, idealMax: number) => {
  if (length === 0) return 'text-slate-400';
  if (length > idealMax) return 'text-red-600';
  if (length < idealMin) return 'text-amber-600';
  return 'text-emerald-600';
};

export default function PostModal({ 
  isOpen, 
  onClose, 
  onSave, 
  categories,
  onAddCategory,
  initialData = null 
}: any) {
  const [formData, setFormData] = useState(EMPTY_POST);
  
  const [isPreview, setIsPreview] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [slugEdited, setSlugEdited] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...EMPTY_POST,
        ...initialData,
        excerpt: initialData.excerpt ?? '',
        content: initialData.content ?? '',
        meta_title: initialData.meta_title ?? '',
        meta_description: initialData.meta_description ?? '',
        focus_keyword: initialData.focus_keyword ?? '',
        meta_keywords: initialData.meta_keywords ?? '',
        og_image: initialData.og_image ?? '',
        category_id: initialData.category_id ?? '',
        tags: initialData.tags ?? '',
        password: initialData.password ?? '',
        published_at: initialData.published_at ?? '',
      });
    } else {
      setFormData(EMPTY_POST);
    }
    setSlugEdited(Boolean(initialData));
  }, [initialData, isOpen]);

  const handleTitleChange = (e: any) => {
    const newTitle = e.target.value;
    setFormData(prev => ({
      ...prev,
      title: newTitle,
      slug: !initialData && !slugEdited ? createSeoSlug(newTitle) : prev.slug
    }));
  };

  // Check Slug availability
  useEffect(() => {
    if (!formData.slug) {
      setSlugAvailable(null);
      return;
    }
    const checkSlug = async () => {
      setCheckingSlug(true);
      try {
        const data = await apiRequest<{ success: boolean; available: boolean; suggestedSlug: string }>(`/api/posts/check-slug/${formData.slug}`);
        // If editing existing post and slug is unchanged, it's valid
        if (initialData && initialData.slug === formData.slug) {
          setSlugAvailable(true);
        } else {
          setSlugAvailable(data.available);
          if (!data.available && data.suggestedSlug) setFormData((current) => current.slug === formData.slug ? { ...current, slug: data.suggestedSlug } : current)
        }
      } catch (err) {
        setSlugAvailable(null);
      } finally {
        setCheckingSlug(false);
      }
    };
    
    const timeout = setTimeout(checkSlug, 500); // Debounce
    return () => clearTimeout(timeout);
  }, [formData.slug, initialData]);

  const copySlug = () => {
    navigator.clipboard.writeText(`${SITE_URL}/blog/${formData.slug}`);
    alert('URL disalin!');
  };

  const regenerateSlug = () => {
    setFormData(prev => ({ ...prev, slug: createSeoSlug(prev.title) }));
    setSlugEdited(false);
  };

  const handleSaveCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const category = await onAddCategory(newCategoryName.trim());
      setFormData((current) => ({ ...current, category_id: category.id }));
      setNewCategoryName('');
      setShowAddCategory(false);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Gagal menambah kategori');
    }
  };

  if (!isOpen) return null;

  const effectiveSeoTitle = formData.meta_title.trim() || formData.title.trim() || 'Judul Artikel';
  const effectiveSeoDescription = formData.meta_description.trim() || formData.excerpt.trim() || 'Deskripsi artikel akan tampil di sini.';
  const articleUrl = `${SITE_URL.replace(/\/$/, '')}/blog/${formData.slug || 'slug-artikel'}`;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 transition-all">
      <div className={`bg-slate-50 rounded-2xl shadow-2xl w-full max-h-[95vh] overflow-hidden flex flex-col transition-all duration-300 ${isPreview ? 'max-w-7xl' : 'max-w-5xl'}`}>
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 sm:p-6 bg-white border-b border-slate-200 sticky top-0 z-10">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-bold text-slate-800">{initialData ? 'Edit Artikel' : 'Tulis Artikel Baru'}</h2>
            <button 
              onClick={() => setIsPreview(!isPreview)}
              className={`flex items-center px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${isPreview ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {isPreview ? <><Code className="w-4 h-4 mr-1.5" /> Kembali ke Editor</> : <><Eye className="w-4 h-4 mr-1.5" /> Live Preview</>}
            </button>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className={`grid gap-6 ${isPreview ? 'grid-cols-2' : 'grid-cols-3'}`}>
            
            {/* Kiri: Main Editor */}
            <div className={`${isPreview ? 'col-span-1' : 'col-span-2'} space-y-6`}>
              
              <div className="space-y-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Judul Artikel</label>
                  <input type="text" value={formData.title} onChange={handleTitleChange} className="w-full border border-slate-300 rounded-lg p-3 text-lg font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none" placeholder="Masukkan judul yang menarik..." />
                </div>
                
                {/* Advanced Slug Editor */}
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-slate-600 flex items-center">
                      <LinkIcon className="w-3 h-3 mr-1" /> Permalink (Slug)
                    </label>
                    <div className="flex space-x-2">
                      <button type="button" onClick={regenerateSlug} className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center" title="Generate Ulang dari Judul">
                        <RefreshCw className="w-3 h-3 mr-1" /> Regenerate
                      </button>
                      <button type="button" onClick={copySlug} className="text-xs text-slate-600 hover:text-slate-800 flex items-center" title="Salin URL">
                        <Copy className="w-3 h-3 mr-1" /> Salin
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center relative">
                    <span className="text-sm text-slate-400 bg-slate-100 border border-r-0 border-slate-300 rounded-l-md px-3 py-2 select-none hidden sm:inline-block">/blog/</span>
                    <input type="text" maxLength={SEO_SLUG_MAX_LENGTH} value={formData.slug} onChange={e => { setSlugEdited(true); setFormData({...formData, slug: normalizeSeoSlug(e.target.value)}) }} className={`flex-1 border border-slate-300 rounded-r-md sm:rounded-l-none rounded-l-md p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none ${slugAvailable === false ? 'border-red-500 text-red-600 bg-red-50' : 'text-slate-700'}`} placeholder="slug-artikel" />
                    
                    {/* Status Indicator */}
                    <div className="absolute right-3 flex items-center">
                      {checkingSlug && <RefreshCw className="w-4 h-4 text-slate-400 animate-spin" />}
                      {!checkingSlug && slugAvailable === true && <span title="Slug Tersedia"><CheckCircle className="w-4 h-4 text-emerald-500" /></span>}
                      {!checkingSlug && slugAvailable === false && <span title="Slug sudah digunakan!"><AlertTriangle className="w-4 h-4 text-red-500" /></span>}
                    </div>
                  </div>
                  {/* SEO Indikator */}
                  <div className="mt-2 flex justify-between text-[11px] text-slate-500"><span>Otomatis maksimal 6 kata. Edit bila kata kunci utama perlu disesuaikan.</span><span>{formData.slug.length}/{SEO_SLUG_MAX_LENGTH}</span></div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Kutipan Singkat (Excerpt)</label>
                  <textarea value={formData.excerpt} onChange={e => setFormData({...formData, excerpt: e.target.value})} className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none" rows={2} placeholder="Tulis rangkuman singkat untuk halaman depan..." />
                </div>
                
                <div>
                  <div className="flex justify-between items-end mb-1.5">
                    <label className="block text-sm font-semibold text-slate-700">Isi Artikel</label>
                    <span className="text-xs font-semibold text-slate-500">Gunakan <kbd className="font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">/</kbd> (garis miring) untuk perintah cepat</span>
                  </div>
                  <div className="min-h-[400px]">
                    <TiptapEditor content={formData.content} onChange={val => setFormData({...formData, content: val})} />
                  </div>
                </div>
              </div>
            </div>

            {/* Tengah: Live Preview (Hanya jika isPreview) */}
            {isPreview && (
              <div className="col-span-1 border-l border-slate-200 pl-6 hidden md:block">
                <div className="sticky top-6">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center"><Eye className="w-3 h-3 mr-1"/> Live Preview</h3>
                  <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm min-h-[600px] overflow-y-auto prose prose-slate">
                    <h1>{formData.title || 'Judul Artikel'}</h1>
                    {formData.excerpt && <p className="lead text-slate-500 italic border-l-4 border-indigo-500 pl-4">{formData.excerpt}</p>}
                    <div dangerouslySetInnerHTML={{ __html: formData.content || '<p class="text-slate-400">Konten akan muncul di sini...</p>' }}></div>
                  </div>
                </div>
              </div>
            )}

            {/* Kanan: Sidebar Metadata (Sembunyikan saat Preview di layar kecil) */}
            <div className={`col-span-1 space-y-6 ${isPreview ? 'hidden' : 'block'}`}>
              
              {/* Card: Status & Visibilitas */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="font-semibold text-slate-800 flex items-center pb-2 border-b border-slate-100">
                  <CheckCircle className="w-4 h-4 mr-2 text-indigo-500"/> Status & Publikasi
                </h3>
                
                {/* Status */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Status</label>
                  <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none">
                    <option value="draft">Draft (Konsep)</option>
                    <option value="published">Publish (Terbit)</option>
                    <option value="scheduled">Scheduled (Terjadwal)</option>
                  </select>
                </div>

                {/* Published / Scheduled DateTime */}
                {(formData.status === 'scheduled' || formData.status === 'published') && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                    <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center"><Clock className="w-3 h-3 mr-1"/> Tanggal & Jam Terbit</label>
                    <input type="datetime-local" value={formData.published_at ? formData.published_at.slice(0, 16) : ''} onChange={e => setFormData({...formData, published_at: e.target.value})} className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                    <p className="text-[10px] text-slate-500 mt-1">
                      {formData.status === 'scheduled' 
                        ? 'Artikel otomatis terbit pada waktu ini.' 
                        : 'Anda bisa mengubah tanggal untuk backdate (berlaku surut) - baik untuk SEO.'}
                    </p>
                  </div>
                )}

                {/* Visibility */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Visibilitas</label>
                  <select value={formData.visibility} onChange={e => setFormData({...formData, visibility: e.target.value})} className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none">
                    <option value="public">Public (Publik)</option>
                    <option value="private">Private (Pribadi)</option>
                    <option value="password">Password Protected</option>
                  </select>
                </div>

                {/* Password Input */}
                {formData.visibility === 'password' && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                    <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center"><Lock className="w-3 h-3 mr-1"/> Sandi (Password)</label>
                    <input type="text" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Masukkan sandi rahasia..." />
                  </div>
                )}
              </div>
              
              {/* Card: Taxonomy */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="font-semibold text-slate-800 flex items-center pb-2 border-b border-slate-100">
                  <Settings className="w-4 h-4 mr-2 text-indigo-500"/> Kategori & Tag
                </h3>
                
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Kategori</label>
                  <div className="flex space-x-2">
                    <select value={formData.category_id} onChange={e => setFormData({...formData, category_id: e.target.value})} className="flex-1 border border-slate-300 rounded-lg p-2 text-sm bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none">
                      <option value="">Pilih Kategori...</option>
                      {categories.map((cat: any) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                    <button type="button" onClick={() => setShowAddCategory(!showAddCategory)} className="p-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50" title="Tambah Kategori Baru">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {/* Inline Add Category */}
                  {showAddCategory && (
                    <div className="mt-2 flex space-x-2 animate-in fade-in slide-in-from-top-1">
                      <input type="text" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} className="flex-1 border border-slate-300 rounded-md p-1.5 text-xs focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Nama Kategori..." />
                      <button type="button" onClick={handleSaveCategory} className="px-3 py-1.5 bg-indigo-600 text-white rounded-md text-xs font-medium hover:bg-indigo-700">Simpan</button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Tags (Koma untuk memisah)</label>
                  <input type="text" value={formData.tags} onChange={e => setFormData({...formData, tags: e.target.value})} className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="tech, tutorial, blog" />
                  {/* Simple Chip UI for Tags */}
                  {formData.tags && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {formData.tags.split(',').map((t, i) => t.trim() ? (
                        <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] rounded-full border border-slate-200">#{t.trim()}</span>
                      ) : null)}
                    </div>
                  )}
                </div>
              </div>

              {/* Card: SEO Advanced */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="font-semibold text-slate-800 flex items-center pb-2 border-b border-slate-100">
                  <LinkIcon className="w-4 h-4 mr-2 text-indigo-500"/> SEO Lanjutan
                </h3>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">SEO Title</label>
                  <input type="text" value={formData.meta_title} onChange={e => setFormData({...formData, meta_title: e.target.value})} className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Kosong — otomatis menggunakan Judul Artikel" />
                  <div className="mt-1 flex items-center justify-between gap-2 text-[11px]">
                    <span className={formData.meta_title.trim() ? 'text-indigo-600' : 'text-slate-500'}>{formData.meta_title.trim() ? 'SEO title khusus aktif' : 'Fallback aktif: memakai judul artikel'}</span>
                    <span className={seoLengthClass(formData.meta_title.length, 30, 60)}>{formData.meta_title.length}/60</span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">Jika dikosongkan, HICCMS akan menggunakan Judul Artikel sebagai SEO Title.</p>
                  <p className="mt-1 text-[11px] text-slate-500">Nama situs tetap ditambahkan otomatis pada tab browser dan hasil pencarian.</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Meta Description</label>
                  <textarea value={formData.meta_description} onChange={e => setFormData({...formData, meta_description: e.target.value})} className="w-full resize-none border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" rows={4} placeholder="Kosong — otomatis menggunakan Kutipan Singkat (Excerpt)" />
                  <div className="mt-1 flex items-center justify-between gap-2 text-[11px]">
                    <span className={formData.meta_description.trim() ? 'text-indigo-600' : 'text-slate-500'}>{formData.meta_description.trim() ? 'Meta description khusus aktif' : 'Fallback aktif: menggunakan Kutipan Singkat'}</span>
                    <span className={seoLengthClass(formData.meta_description.length, 120, 160)}>{formData.meta_description.length}/160</span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">Jika dikosongkan, HICCMS akan menggunakan Excerpt sebagai meta description.</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Focus Keyword</label>
                  <input type="text" value={formData.focus_keyword} onChange={e => setFormData({...formData, focus_keyword: e.target.value})} className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Core Web Vitals hijau" />
                  <p className="mt-1 text-[11px] text-slate-500">Digunakan sebagai panduan editorial dan tidak mengubah slug otomatis.</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Meta Keywords (Opsional)</label>
                  <input type="text" value={formData.meta_keywords} onChange={e => setFormData({...formData, meta_keywords: e.target.value})} className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="kata kunci 1, kata kunci 2..." />
                  <p className="mt-1 text-[11px] text-slate-500">Pisahkan dengan koma. Field dipertahankan untuk kompatibilitas dan kebutuhan metadata.</p>
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label className="block text-xs font-medium text-slate-700">OG Image URL (Thumbnail)</label>
                    <button type="button" onClick={() => setShowMediaPicker(true)} className="text-xs font-medium text-indigo-600 hover:text-indigo-700">Pilih dari Media</button>
                  </div>
                  <input type="text" value={formData.og_image} onChange={e => setFormData({...formData, og_image: e.target.value})} className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="https://..." />
                  {formData.og_image && (
                    <div className="mt-2 rounded-lg overflow-hidden border border-slate-200 aspect-video bg-slate-50 flex items-center justify-center">
                      <img key={formData.og_image} src={formData.og_image} alt="OG Preview" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                    </div>
                  )}
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4" aria-label="Google search preview">
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Pratinjau Google</p>
                  <p className="truncate text-xs text-emerald-700">{articleUrl}</p>
                  <p className="mt-1 line-clamp-2 text-lg leading-6 text-blue-700">{effectiveSeoTitle}</p>
                  <p className="mt-1 line-clamp-3 text-xs leading-5 text-slate-600">{effectiveSeoDescription}</p>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end p-4 sm:p-6 bg-slate-50 border-t border-slate-200 gap-3 sticky bottom-0 z-10">
          <button onClick={onClose} className="px-5 py-2.5 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-100 font-medium transition-colors">
            Batal
          </button>
          <button 
            onClick={() => onSave(formData)} 
            disabled={slugAvailable === false || checkingSlug}
            className={`flex items-center px-6 py-2.5 rounded-xl font-medium shadow-sm transition-all text-white
              ${(slugAvailable === false || checkingSlug) ? 'bg-slate-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-md'}`}
          >
            <Save className="w-5 h-5 mr-2" /> 
            {formData.status === 'published' ? 'Publikasikan' : formData.status === 'scheduled' ? 'Jadwalkan' : 'Simpan Draft'}
          </button>
        </div>
      </div>
      <MediaPicker
        isOpen={showMediaPicker}
        onClose={() => setShowMediaPicker(false)}
        onSelect={(url) => {
          setFormData((current) => ({ ...current, og_image: url }));
          setShowMediaPicker(false);
        }}
      />
    </div>
  );
}
