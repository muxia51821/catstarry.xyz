CREATE TABLE IF NOT EXISTS publication_release_guards (
  guard_key TEXT PRIMARY KEY CHECK (guard_key IN ('blog-sync', 'learn-active', 'learn-pending')),
  release_sha TEXT NOT NULL CHECK (length(release_sha) = 40),
  release_generation INTEGER NOT NULL CHECK (release_generation > 0),
  updated_at TEXT NOT NULL
);
