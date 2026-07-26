CREATE TABLE IF NOT EXISTS blog_view_visitors (
  slug TEXT NOT NULL,
  view_date TEXT NOT NULL,
  visitor_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (slug, view_date, visitor_hash)
);

CREATE INDEX IF NOT EXISTS idx_blog_view_visitors_created
  ON blog_view_visitors (created_at);

CREATE INDEX IF NOT EXISTS idx_feed_posts_public_timeline
  ON feed_posts (visibility, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_feed_posts_type_timeline
  ON feed_posts (type, created_at DESC, id DESC);

CREATE TRIGGER IF NOT EXISTS trg_blog_view_visitor_count
AFTER INSERT ON blog_view_visitors
BEGIN
  INSERT INTO blog_views (slug, view_date, count)
  VALUES (NEW.slug, NEW.view_date, 1)
  ON CONFLICT(slug, view_date) DO UPDATE SET count = count + 1;
END;
