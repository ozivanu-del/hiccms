# Appearance Manager v1.1

Appearance Manager memisahkan konfigurasi navigasi dan layout dari Theme Engine.
Theme tetap bertanggung jawab atas presentasi Astro, sedangkan menu, header, dan
footer disimpan sebagai data di Cloudflare D1.

## Modul

- `packages/appearance-manager`: kontrak dan validasi TypeScript bersama.
- `packages/core-api/src/routes/navigation.ts`: API publik dan API administrasi.
- `apps/admin-dashboard/src/pages/appearance`: Menu Manager, Header Builder, dan Footer Builder.
- `apps/web/src/themes`: renderer Astro yang menggunakan konfigurasi Appearance.
- `database/migrations/0009_appearance_manager.sql`: tabel, indeks, dan data awal.

## Database

Migration menambahkan tabel berikut tanpa mengubah tabel yang sudah ada:

- `menus`: identitas dan lokasi menu.
- `menu_items`: tautan menu, urutan, target, status, dan relasi parent untuk submenu.
- `layout_sections`: konfigurasi JSON untuk header dan footer.

Jalankan migration secara lokal:

```bash
npx wrangler d1 migrations apply hiccms-db --local
```

Ganti `--local` dengan `--remote` hanya ketika siap menerapkan perubahan ke D1 produksi.

## API

Endpoint publik:

- `GET /api/navigation/public`

Endpoint yang memerlukan autentikasi administrator:

- `GET|POST /api/navigation/menus`
- `PUT|DELETE /api/navigation/menus/:id`
- `POST /api/navigation/menus/:menuId/items`
- `PUT|DELETE /api/navigation/items/:id`
- `PUT /api/navigation/menus/:menuId/reorder`
- `GET /api/navigation/layout`
- `PUT /api/navigation/layout/header`
- `PUT /api/navigation/layout/footer`

## Dashboard

Buka menu **Appearance** untuk mengakses:

- Themes dan Theme Settings;
- Menu Manager;
- Header Builder;
- Footer Builder, termasuk tautan sosial.

## Perilaku Astro

Web saat ini menggunakan output Astro statis. Konfigurasi Appearance diambil saat
proses build dan memiliki fallback bawaan ketika API tidak tersedia. Setelah menu,
header, atau footer diubah melalui Dashboard, jalankan build dan deploy ulang web
agar hasil statis Cloudflare Pages diperbarui:

```bash
npm run build:web
npx wrangler pages deploy apps/web/dist --project-name hiccms-web
```

Rebuild otomatis melalui webhook/deploy hook dapat ditambahkan pada tahap berikutnya.

## Keamanan

- Endpoint perubahan dilindungi middleware autentikasi.
- URL menu hanya menerima path relatif atau protokol HTTP/HTTPS.
- API menolak relasi parent yang membentuk siklus.
- Tautan yang membuka tab baru menggunakan `noopener` pada renderer Astro.
