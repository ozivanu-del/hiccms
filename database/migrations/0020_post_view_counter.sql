-- Migration number: 0020_post_view_counter

ALTER TABLE posts ADD COLUMN view_count INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_posts_related
  ON posts(category_id, status, published_at);
