-- Migration number: 0006_seo_fields

ALTER TABLE posts ADD COLUMN meta_keywords TEXT;
ALTER TABLE posts ADD COLUMN og_image TEXT;
