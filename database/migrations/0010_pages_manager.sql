CREATE TABLE IF NOT EXISTS pages (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  template TEXT NOT NULL DEFAULT 'default' CHECK (template IN ('default', 'full-width', 'landing')),
  featured_image TEXT,
  meta_title TEXT,
  meta_description TEXT,
  meta_keywords TEXT,
  is_homepage INTEGER NOT NULL DEFAULT 0 CHECK (is_homepage IN (0, 1)),
  author_id TEXT NOT NULL,
  published_at DATETIME,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pages_slug ON pages(slug);
CREATE INDEX IF NOT EXISTS idx_pages_status ON pages(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pages_single_homepage ON pages(is_homepage) WHERE is_homepage = 1;
