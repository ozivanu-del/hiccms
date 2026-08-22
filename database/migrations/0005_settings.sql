-- 0005_settings.sql

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert default settings
INSERT INTO settings (key, value) VALUES 
('site_name', 'HICCMS'),
('site_description', 'Headless CMS Cepat dengan Cloudflare Worker'),
('theme_color', '#2563eb'),
('theme_mode', 'light')
ON CONFLICT(key) DO NOTHING;
