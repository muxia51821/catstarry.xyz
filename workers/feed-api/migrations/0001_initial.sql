CREATE TABLE IF NOT EXISTS feed_posts (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('note', 'clip')),
  content TEXT,
  media_json TEXT,
  link_url TEXT,
  link_title TEXT,
  link_summary TEXT,
  link_image TEXT,
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_feed_posts_created ON feed_posts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feed_posts_visibility ON feed_posts (visibility);
CREATE INDEX IF NOT EXISTS idx_feed_posts_type ON feed_posts (type);

CREATE TABLE IF NOT EXISTS public_footprints (
  id TEXT PRIMARY KEY,
  source_module TEXT NOT NULL CHECK (source_module IN ('blog', 'learn', 'projects')),
  source_ref TEXT NOT NULL,
  source_version TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('blog_published', 'learn_section_completed', 'project_updated')),
  snapshot_json TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
  idempotency_key TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_public_footprints_public
  ON public_footprints (visibility, occurred_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_public_footprints_source
  ON public_footprints (source_module, source_ref, source_version);

CREATE TABLE IF NOT EXISTS blog_views (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL,
  view_date TEXT NOT NULL,
  count INTEGER DEFAULT 1,
  UNIQUE (slug, view_date)
);

CREATE TABLE IF NOT EXISTS auth_sessions (
  token TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  ip TEXT
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires ON auth_sessions (expires_at);
