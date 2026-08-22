-- Migration number: 0008_theme_engine

CREATE TABLE IF NOT EXISTS themes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  author TEXT NOT NULL DEFAULT '',
  preview TEXT,
  config TEXT NOT NULL CHECK (json_valid(config)),
  is_active INTEGER NOT NULL DEFAULT 0 CHECK (is_active IN (0, 1)),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_themes_single_active
  ON themes(is_active) WHERE is_active = 1;

INSERT INTO themes (id, name, version, description, author, config, is_active)
VALUES (
  'trainer-pro', 'Trainer Pro', '1.1.0',
  'Tema bawaan HICCMS untuk blog dan situs profesional.', 'HICCMS',
  '{"mode":"light","colors":{"primary":"#2563eb","secondary":"#7e3af2","background":"#f9fafb","foreground":"#111827"},"font":{"family":"Inter","source":"google","url":"https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"},"customCss":"","customJavaScript":""}',
  1
)
ON CONFLICT(id) DO NOTHING;
