# HIC-CMS Plugin SDK v1

Plugin SDK v1 mendefinisikan manifest, compatibility range, capability consent, hook registry, dan konfigurasi bertipe. Runtime saat ini tidak memuat atau mengeksekusi kode eksternal.

```json
{
  "slug": "seo-assistant",
  "name": "SEO Assistant",
  "version": "1.0.0",
  "description": "Contoh manifest plugin HIC-CMS.",
  "author": "HIC-CMS",
  "capabilities": ["content.read", "content.write"],
  "hooks": ["content.beforeSave"],
  "hiccms": {
    "minVersion": "1.2.0"
  },
  "configSchema": {
    "enabled": {
      "type": "boolean",
      "label": "Aktifkan pemeriksaan SEO",
      "default": true
    }
  }
}
```

## Aturan keamanan

- Hanya capability dan hook dalam whitelist SDK yang diterima.
- Semua capability harus disetujui Super Admin.
- Plugin dipasang dalam keadaan nonaktif.
- Plugin tidak dapat diaktifkan jika tidak kompatibel, permission belum lengkap, atau konfigurasi wajib belum diisi.
- Audit instalasi, permission, konfigurasi, aktivasi, dan penghapusan disimpan permanen.
- Hook pada v1 adalah deklarasi metadata dan tidak menjalankan kode plugin.
