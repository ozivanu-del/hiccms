-- Migration number: 0009_appearance_manager

CREATE TABLE IF NOT EXISTS menus (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  location TEXT NOT NULL CHECK (location IN ('primary', 'footer', 'custom')),
  is_enabled INTEGER NOT NULL DEFAULT 1 CHECK (is_enabled IN (0, 1)),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS menu_items (
  id TEXT PRIMARY KEY,
  menu_id TEXT NOT NULL,
  parent_id TEXT,
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  target TEXT NOT NULL DEFAULT '_self' CHECK (target IN ('_self', '_blank')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_enabled INTEGER NOT NULL DEFAULT 1 CHECK (is_enabled IN (0, 1)),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (menu_id) REFERENCES menus(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES menu_items(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS layout_sections (
  section TEXT PRIMARY KEY CHECK (section IN ('header', 'footer')),
  config TEXT NOT NULL CHECK (json_valid(config)),
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_menu_items_tree ON menu_items(menu_id, parent_id, sort_order);

INSERT INTO menus (id, name, slug, location) VALUES
  ('menu-primary', 'Primary Menu', 'primary', 'primary'),
  ('menu-footer', 'Footer Menu', 'footer', 'footer')
ON CONFLICT(id) DO NOTHING;

INSERT INTO menu_items (id, menu_id, label, url, sort_order) VALUES
  ('menu-item-home', 'menu-primary', 'Home', '/', 0),
  ('menu-item-about', 'menu-primary', 'About', '/about', 1),
  ('menu-item-blog', 'menu-primary', 'Blog', '/blog', 2),
  ('menu-item-footer-home', 'menu-footer', 'Home', '/', 0),
  ('menu-item-footer-blog', 'menu-footer', 'Blog', '/blog', 1)
ON CONFLICT(id) DO NOTHING;

INSERT INTO layout_sections (section, config) VALUES
  ('header', '{"menuSlug":"primary","showLogo":true,"showSiteName":true,"sticky":true,"ctaLabel":"","ctaUrl":"","alignment":"space-between"}'),
  ('footer', '{"menuSlug":"footer","showSiteName":true,"description":"","copyright":"","columns":2,"socialLinks":[]}')
ON CONFLICT(section) DO NOTHING;
