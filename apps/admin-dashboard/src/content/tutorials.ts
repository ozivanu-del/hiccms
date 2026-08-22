export type TutorialGroup = 'Dasar' | 'Konten' | 'Appearance' | 'Sistem'

export interface TutorialTopic {
  id: string
  title: string
  group: TutorialGroup
  path?: string
  summary: string
  steps: string[]
  tips?: string[]
  screenshot?: { src: string; alt: string }
}

export const tutorialTopics: TutorialTopic[] = [
  {
    id: 'login', title: 'Login Admin', group: 'Dasar', path: '/login',
    summary: 'Masuk ke Dashboard HIC-CMS menggunakan akun yang telah terdaftar.',
    steps: ['Buka alamat Admin HIC-CMS.', 'Masukkan email dan password.', 'Tekan Login.'],
    tips: ['Jangan membagikan password atau token login.'],
  },
  {
    id: 'posts', title: 'Artikel Manual', group: 'Konten', path: '/posts',
    summary: 'Membuat, mengedit, menjadwalkan, dan memublikasikan artikel secara manual dengan SEO dasar lengkap.',
    steps: ['Buka Artikel.', 'Tambah atau edit artikel.', 'Isi judul, slug, ringkasan, konten, kategori, tag, dan gambar.', 'Lengkapi meta title, meta description, meta keywords, canonical URL, dan pengaturan SEO lain yang tersedia.', 'Pilih status lalu simpan.'],
    tips: ['Periksa tampilan artikel dan metadata sebelum dipublikasikan.', 'Gunakan slug singkat dan deskriptif.'],
  },
  {
    id: 'pages', title: 'Halaman', group: 'Konten', path: '/pages',
    summary: 'Mengelola halaman statis dengan editor manual dan metadata SEO dasar.',
    steps: ['Buka Halaman.', 'Tambah atau edit halaman.', 'Isi judul, slug, ringkasan, konten, gambar utama, dan metadata SEO.', 'Simpan sebagai draft atau publish.'],
  },
  {
    id: 'media', title: 'Media', group: 'Konten', path: '/media',
    summary: 'Mengunggah dan mengelola gambar yang disimpan di Cloudflare R2.',
    steps: ['Buka Media.', 'Pilih file gambar.', 'Tunggu unggahan selesai.', 'Gunakan gambar pada artikel atau halaman.'],
    tips: ['Kompres gambar sebelum upload dan gunakan nama file yang mudah dikenali.'],
  },
  {
    id: 'themes', title: 'Theme Settings', group: 'Appearance', path: '/appearance/themes',
    summary: 'Memilih theme aktif dan mengatur warna, mode tampilan, font, CSS, serta JavaScript kustom.',
    steps: ['Buka Appearance lalu Themes.', 'Pilih theme dan atur tampilannya.', 'Simpan lalu periksa website.'],
  },
  {
    id: 'menus', title: 'Menu Manager', group: 'Appearance', path: '/appearance/menus',
    summary: 'Mengatur item navigasi, urutan, label, URL, dan status tampil.',
    steps: ['Buka Appearance lalu Menu Manager.', 'Tambahkan atau ubah item.', 'Atur urutan lalu simpan.'],
  },
  {
    id: 'header', title: 'Header', group: 'Appearance', path: '/appearance/header',
    summary: 'Mengatur logo, navigasi, dan elemen header dasar.',
    steps: ['Buka Appearance lalu Header.', 'Atur konfigurasi yang diperlukan.', 'Simpan dan periksa desktop serta mobile.'],
  },
  {
    id: 'footer', title: 'Footer', group: 'Appearance', path: '/appearance/footer',
    summary: 'Mengatur teks, tautan, dan informasi pada bagian bawah website.',
    steps: ['Buka Appearance lalu Footer.', 'Atur konten footer.', 'Simpan dan periksa website.'],
  },
  {
    id: 'settings', title: 'Pengaturan CMS', group: 'Sistem', path: '/settings',
    summary: 'Mengatur identitas situs, homepage, dan konfigurasi umum.',
    steps: ['Buka Pengaturan.', 'Periksa identitas dan homepage.', 'Simpan lalu periksa website.'],
  },
  {
    id: 'plugin-manager', title: 'Plugin Manager', group: 'Sistem', path: '/plugins',
    summary: 'Mendaftarkan manifest plugin, meninjau kompatibilitas serta izin, dan mengelola lifecycle plugin.',
    steps: ['Buka Plugin Manager sebagai Super Admin.', 'Periksa nama, pembuat, versi, kompatibilitas, capability, dan hook plugin.', 'Setujui hanya izin yang diperlukan.', 'Pasang plugin dalam kondisi nonaktif.', 'Lengkapi konfigurasi yang diwajibkan lalu aktifkan.', 'Nonaktifkan plugin sebelum mengubah izin atau menghapusnya.', 'Gunakan audit lifecycle untuk meninjau perubahan.'],
    tips: ['Jangan memasang manifest dari pembuat yang tidak dikenal.', 'Status aktif hanya diberikan setelah pemeriksaan kompatibilitas dan izin lulus.'],
  },
  {
    id: 'security', title: 'Keamanan Akun', group: 'Sistem', path: '/account/security',
    summary: 'Mengelola password dan memeriksa keamanan akun admin.',
    steps: ['Buka Keamanan Akun.', 'Gunakan password yang kuat dan unik.', 'Simpan perubahan lalu login ulang jika diminta.'],
  },
  {
    id: 'logout', title: 'Logout', group: 'Sistem',
    summary: 'Mengakhiri sesi Admin pada browser yang sedang digunakan.',
    steps: ['Tekan Logout pada bagian bawah sidebar.', 'Pastikan halaman kembali ke Login.'],
  },
]

export const tutorialToMarkdown = (topic: TutorialTopic) => [
  `# ${topic.title}`, '', topic.summary, '', '## Langkah-langkah', '',
  ...topic.steps.map((step, index) => `${index + 1}. ${step}`),
  ...(topic.tips?.length ? ['', '## Tips', '', ...topic.tips.map((tip) => `- ${tip}`)] : []),
].join('\n')

export const allTutorialsToMarkdown = (topics: TutorialTopic[] = tutorialTopics) => topics.map(tutorialToMarkdown).join('\n\n---\n\n')
