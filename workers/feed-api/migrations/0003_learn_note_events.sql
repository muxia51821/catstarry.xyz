CREATE TABLE IF NOT EXISTS public_footprints_learn_v2 (
  id TEXT PRIMARY KEY,
  source_module TEXT NOT NULL CHECK (source_module IN ('blog', 'learn', 'projects')),
  source_ref TEXT NOT NULL,
  source_version TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'blog_published',
    'learn_section_completed',
    'learn_note_published',
    'learn_note_revised',
    'project_updated'
  )),
  snapshot_json TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
  idempotency_key TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);

INSERT OR IGNORE INTO public_footprints_learn_v2 (
  id, source_module, source_ref, source_version, event_type, snapshot_json,
  occurred_at, visibility, idempotency_key, created_at
)
SELECT
  id, source_module, source_ref, source_version, event_type, snapshot_json,
  occurred_at, visibility, idempotency_key, created_at
FROM public_footprints;

DROP TABLE public_footprints;
ALTER TABLE public_footprints_learn_v2 RENAME TO public_footprints;

CREATE INDEX IF NOT EXISTS idx_public_footprints_public
  ON public_footprints (visibility, occurred_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_public_footprints_source
  ON public_footprints (source_module, source_ref, source_version);
