-- D1 schema for feed-api Worker
-- Run with: wrangler d1 execute feed-db --file=workers/feed-api/schema.sql

CREATE TABLE IF NOT EXISTS blog_views (
  slug TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0
);
