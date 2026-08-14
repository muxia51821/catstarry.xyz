CREATE TABLE IF NOT EXISTS learn_publications (
  slug TEXT PRIMARY KEY,
  visibility TEXT NOT NULL CHECK (visibility IN ('public', 'hidden')),
  published_at TEXT NOT NULL,
  last_revised_at TEXT,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_learn_publications_visibility
  ON learn_publications (visibility, published_at DESC);
