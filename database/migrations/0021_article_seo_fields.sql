-- Migration number: 0021_article_seo_fields

ALTER TABLE posts ADD COLUMN meta_title TEXT;
ALTER TABLE posts ADD COLUMN meta_description TEXT;
ALTER TABLE posts ADD COLUMN focus_keyword TEXT;
