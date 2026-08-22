# HIC-CMS Community Core

HIC-CMS adalah CMS headless berbasis Cloudflare Workers, D1, R2, React, dan Astro. Repositori publik ini berisi Community Core untuk pengelolaan konten manual.

## Fitur Community Core

- Artikel manual: draft, jadwal, publish, arsip, kategori, tag, dan gambar utama.
- SEO dasar lengkap untuk input manual: meta title, meta description, meta keywords, canonical URL, Open Graph, dan pengaturan indeks yang tersedia di editor.
- Halaman statis dengan editor manual dan SEO dasar.
- Media Library berbasis Cloudflare R2.
- Theme, menu, header, footer, pengaturan situs, pengguna, dan keamanan akun.
- Plugin Manager dan kontrak permission/lifecycle untuk memasang add-on secara terkontrol.

## Add-on komersial

Add-on berikut adalah produk terpisah dan kode sumbernya tidak disertakan dalam repositori publik:

- **Automation Hub AI** — AI Writer, Content Queue, review/approval, penjadwalan otomatis, publisher, generate image, provider AI, dan audit pekerjaan.
- **Content Builder Pro** — editor blok lanjutan, slash command, embed media/video, dan alat penyusunan konten.
- **Page Builder Pro** — Template Library, section/hero builder, layout visual, site-kit import, dan renderer template khusus.

Mengaktifkan manifest di Plugin Manager tidak memberikan add-on komersial. Paket plugin yang sah dan lisensi aktif tetap diperlukan.

## Menjalankan secara lokal

Persyaratan: Node.js 20+, npm, dan akun Cloudflare untuk resource D1/R2.

```bash
npm install
cp .env.example .env
npm run dev
```

Perintah build:

```bash
npm run build:api
npm run build:admin
npm run build:web
```

Salin konfigurasi Cloudflare ke environment Anda sendiri sebelum deploy. Jangan commit JWT secret, API key, atau kredensial produksi.

## Struktur

```text
apps/admin-dashboard   Dashboard React
apps/web               Frontend Astro
packages/core-api      API Worker Hono
packages/page-manager  Kontrak halaman dasar
packages/plugin-manager Kontrak Plugin SDK
database/migrations    Skema Community Core
```

## Keamanan

Laporkan kerentanan mengikuti petunjuk pada [SECURITY.md](SECURITY.md). Jangan membuka issue publik yang berisi secret atau langkah eksploitasi aktif.

## Lisensi

Hak cipta HIC-CMS tetap dilindungi. Ketentuan lisensi Community Core dan lisensi komersial add-on akan dipublikasikan secara terpisah. Sampai lisensi eksplisit tersedia, jangan menganggap kode ini memberi izin untuk menjual ulang add-on komersial.
