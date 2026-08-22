-- Migration number: 0007_post_visibility
-- Tambahan untuk Advanced Status, Visibility, Password, dan Auto-Redirect

-- 1. Tambah kolom ke posts
ALTER TABLE posts ADD COLUMN visibility TEXT DEFAULT 'public';
ALTER TABLE posts ADD COLUMN password TEXT;

-- 2. Buat tabel redirects (untuk 301 SEO redirects)
CREATE TABLE IF NOT EXISTS redirects (
  id TEXT PRIMARY KEY,
  old_slug TEXT NOT NULL UNIQUE,
  new_slug TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indeks pencarian
CREATE INDEX IF NOT EXISTS idx_redirects_old_slug ON redirects(old_slug);
