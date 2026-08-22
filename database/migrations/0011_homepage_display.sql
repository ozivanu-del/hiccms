INSERT INTO settings (key, value) VALUES
  ('homepage_display', 'latest_posts'),
  ('homepage_page_id', '')
ON CONFLICT(key) DO NOTHING;
