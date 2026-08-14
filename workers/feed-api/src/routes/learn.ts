import type {
  LearnPublicationRecord,
  LearnPublicationVisibility,
  PublicFootprintCandidate,
} from '../../../../shared/types';
import { timingSafeEqualText } from '../../../../shared/security';
import { logWorkerError } from '../../../../shared/worker-log';
import { apiError, json, readJson } from '../lib/http';
import { refreshActivitySignals } from '../modules/activity-signals';
import { parseFootprintCandidate } from '../modules/footprints';
import { requireMainSession } from './auth';

type LearnEnv = Env & { FOOTPRINT_INGEST_TOKEN?: string; LOCAL_PREVIEW_AUTH?: string };

interface LearnDeployEntry {
  slug?: unknown;
  title?: unknown;
  excerpt?: unknown;
  revised_at?: unknown;
}

interface NormalizedDeployEntry {
  slug: string;
  title: string;
  excerpt: string;
  revised_at: string | null;
}

export async function handleLearn(
  request: Request,
  env: LearnEnv,
  ctx: ExecutionContext,
  pathname: string,
): Promise<Response> {
  if (pathname === '/api/learn/publications' && request.method === 'GET') {
    const entries = await listPublications(env.DB, 'public');
    return json({ entries: entries.map(({ slug, published_at }) => ({ slug, published_at })) });
  }
  if (pathname === '/api/learn/admin/publications' && request.method === 'GET') {
    const session = await requireMainSession(request, env);
    if (session instanceof Response) return session;
    return json({ entries: await listPublications(env.DB) });
  }
  if (pathname === '/api/learn/admin/publications' && request.method === 'PATCH') {
    if (env.LOCAL_PREVIEW_AUTH === '1') {
      return apiError(403, 'local_preview_read_only', 'Local Learn preview does not manage publication lifecycle');
    }
    return updatePublication(request, env, ctx);
  }
  if (pathname === '/api/learn/internal/publications' && request.method === 'POST') {
    return syncDeployedMetadata(request, env, ctx);
  }
  if (pathname === '/api/learn/complete' && request.method === 'POST') {
    const session = await requireMainSession(request, env);
    if (session instanceof Response) return session;
    return apiError(410, 'legacy_writer_retired', 'Learn section completion no longer creates Feed activity');
  }
  return apiError(404, 'not_found', 'Learn route not found');
}

async function updatePublication(request: Request, env: LearnEnv, ctx: ExecutionContext): Promise<Response> {
  const session = await requireMainSession(request, env);
  if (session instanceof Response) return session;
  const body = await readJson<{
    slug?: unknown;
    visibility?: unknown;
    title?: unknown;
    excerpt?: unknown;
    revised_at?: unknown;
  }>(request, 8_192);
  if (body instanceof Response) return body;

  const slug = typeof body.slug === 'string' ? body.slug.trim() : '';
  const visibility = body.visibility as LearnPublicationVisibility;
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const excerpt = typeof body.excerpt === 'string' ? body.excerpt.trim() : '';
  const revisedAt = body.revised_at === null || body.revised_at === undefined
    ? null
    : normalizeTimestamp(body.revised_at);
  if (
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
    || (visibility !== 'public' && visibility !== 'hidden')
    || title.length > 200
    || excerpt.length > 2_000
    || (body.revised_at !== null && body.revised_at !== undefined && !revisedAt)
  ) {
    return apiError(400, 'invalid_publication', 'Learn publication request is invalid');
  }

  const existing = await getPublication(env.DB, slug);
  if (!existing) {
    if (visibility !== 'public' || !title) {
      return apiError(409, 'never_published', 'A never-published Learn note can only be published');
    }
    const now = new Date().toISOString();
    const candidate = firstPublicationCandidate(slug, title, excerpt, now);
    const [publicationWrite, footprintWrite] = await env.DB.batch([
      env.DB.prepare(`INSERT OR IGNORE INTO learn_publications (
        slug, visibility, published_at, last_revised_at, updated_at
      ) VALUES (?, 'public', ?, ?, ?)`).bind(slug, now, revisedAt, now),
      footprintInsert(env.DB, candidate, now),
    ]);
    const entry = await getPublication(env.DB, slug);
    if (!entry) throw new Error('Learn publication write was not persisted');
    const created = (publicationWrite.meta.changes ?? 0) > 0;
    if (created && (footprintWrite.meta.changes ?? 0) === 0) {
      throw new Error('Learn first-publication footprint was not persisted');
    }
    if (created) refreshAfterMutation(env, ctx);
    return json({ entry, created });
  }

  if (existing.visibility === visibility) return json({ entry: existing, created: false });
  const updatedAt = new Date().toISOString();
  await env.DB.prepare(
    'UPDATE learn_publications SET visibility = ?, updated_at = ? WHERE slug = ?',
  ).bind(visibility, updatedAt, slug).run();
  refreshAfterMutation(env, ctx);
  return json({ entry: await getPublication(env.DB, slug), created: false });
}

async function syncDeployedMetadata(request: Request, env: LearnEnv, ctx: ExecutionContext): Promise<Response> {
  const authorization = request.headers.get('Authorization');
  if (!env.FOOTPRINT_INGEST_TOKEN || !(await timingSafeEqualText(authorization, `Bearer ${env.FOOTPRINT_INGEST_TOKEN}`))) {
    return apiError(env.FOOTPRINT_INGEST_TOKEN ? 401 : 503, 'unauthorized', 'Publication metadata sync is not available');
  }
  const body = await readJson<{ schema_version?: unknown; entries?: unknown; deployed_at?: unknown }>(request, 128 * 1_024);
  if (body instanceof Response) return body;
  if (body.schema_version !== 3 || !Array.isArray(body.entries) || body.entries.length > 500) {
    return apiError(400, 'invalid_manifest', 'Learn publication metadata manifest is invalid');
  }
  const deployedAt = normalizeTimestamp(body.deployed_at);
  const entries = normalizeDeployEntries(body.entries as LearnDeployEntry[]);
  if (!deployedAt || !entries) return apiError(400, 'invalid_manifest', 'Learn publication metadata manifest is invalid');

  const publications = await listPublications(env.DB);
  const publicationBySlug = new Map(publications.map((entry) => [entry.slug, entry]));
  for (const entry of entries) {
    const publication = publicationBySlug.get(entry.slug);
    if (!publication?.last_revised_at) continue;
    if (!entry.revised_at || Date.parse(entry.revised_at) < Date.parse(publication.last_revised_at)) {
      return apiError(409, 'lifecycle_regression', 'Learn revision metadata cannot move backward');
    }
  }

  let created = 0;
  for (const entry of entries) {
    const publication = publicationBySlug.get(entry.slug);
    if (!publication || entry.revised_at === publication.last_revised_at) continue;
    if (!entry.revised_at) continue;
    if (publication.visibility === 'hidden') {
      await env.DB.prepare(
        'UPDATE learn_publications SET last_revised_at = ?, updated_at = ? WHERE slug = ?',
      ).bind(entry.revised_at, deployedAt, entry.slug).run();
      continue;
    }
    const candidate = revisionCandidate(entry, deployedAt);
    const [footprintWrite] = await env.DB.batch([
      footprintInsert(env.DB, candidate, deployedAt),
      env.DB.prepare(
        'UPDATE learn_publications SET last_revised_at = ?, updated_at = ? WHERE slug = ?',
      ).bind(entry.revised_at, deployedAt, entry.slug),
    ]);
    if ((footprintWrite.meta.changes ?? 0) > 0) created += 1;
  }
  if (created > 0) refreshAfterMutation(env, ctx);
  return json({ synced: entries.length, created });
}

function firstPublicationCandidate(slug: string, title: string, excerpt: string, occurredAt: string): PublicFootprintCandidate {
  const candidate = parseFootprintCandidate({
    source_module: 'learn',
    source_ref: slug,
    source_version: 'first-production-v1',
    event_type: 'learn_note_published',
    snapshot_json: JSON.stringify({
      title,
      ...(excerpt ? { summary: excerpt } : {}),
      link: `/learn/notes/${slug}/`,
    }),
    occurred_at: occurredAt,
    idempotency_key: `learn:${slug}:first-production-v1`,
  });
  if (!candidate) throw new Error('Learn publication entry could not be normalized');
  return candidate;
}

function revisionCandidate(entry: NormalizedDeployEntry, deployedAt: string): PublicFootprintCandidate {
  const sourceVersion = `r:${Math.floor(Date.parse(entry.revised_at ?? '') / 1_000)}`;
  const candidate = parseFootprintCandidate({
    source_module: 'learn',
    source_ref: entry.slug,
    source_version: sourceVersion,
    event_type: 'learn_note_revised',
    snapshot_json: JSON.stringify({
      title: entry.title,
      ...(entry.excerpt ? { summary: entry.excerpt } : {}),
      link: `/learn/notes/${entry.slug}/`,
    }),
    occurred_at: deployedAt,
    idempotency_key: `learn:${entry.slug}:${sourceVersion}`,
  });
  if (!candidate) throw new Error('Learn revision entry could not be normalized');
  return candidate;
}

function footprintInsert(database: D1Database, candidate: PublicFootprintCandidate, createdAt: string): D1PreparedStatement {
  return database.prepare(`INSERT OR IGNORE INTO public_footprints (
    id, source_module, source_ref, source_version, event_type, snapshot_json,
    occurred_at, visibility, idempotency_key, created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, 'public', ?, ?)`).bind(
    crypto.randomUUID(),
    candidate.source_module,
    candidate.source_ref,
    candidate.source_version,
    candidate.event_type,
    candidate.snapshot_json,
    candidate.occurred_at,
    candidate.idempotency_key,
    createdAt,
  );
}

async function getPublication(database: D1Database, slug: string): Promise<LearnPublicationRecord | null> {
  return database.prepare(`SELECT slug, visibility, published_at, last_revised_at, updated_at
    FROM learn_publications WHERE slug = ?`).bind(slug).first<LearnPublicationRecord>();
}

async function listPublications(
  database: D1Database,
  visibility?: LearnPublicationVisibility,
): Promise<LearnPublicationRecord[]> {
  const statement = visibility
    ? database.prepare(`SELECT slug, visibility, published_at, last_revised_at, updated_at
      FROM learn_publications WHERE visibility = ? ORDER BY slug`).bind(visibility)
    : database.prepare(`SELECT slug, visibility, published_at, last_revised_at, updated_at
      FROM learn_publications ORDER BY slug`);
  return (await statement.all<LearnPublicationRecord>()).results;
}

function normalizeDeployEntries(entries: LearnDeployEntry[]): NormalizedDeployEntry[] | null {
  const normalized = entries.map((entry) => ({
    slug: typeof entry.slug === 'string' ? entry.slug.trim() : '',
    title: typeof entry.title === 'string' ? entry.title.trim() : '',
    excerpt: typeof entry.excerpt === 'string' ? entry.excerpt.trim() : '',
    revised_at: entry.revised_at === null || entry.revised_at === undefined
      ? null
      : normalizeTimestamp(entry.revised_at),
  })).sort((a, b) => a.slug.localeCompare(b.slug));
  if (
    normalized.some((entry) => (
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.slug)
      || !entry.title
      || entry.title.length > 200
      || entry.excerpt.length > 2_000
      || entry.revised_at === undefined
    ))
    || new Set(normalized.map((entry) => entry.slug)).size !== normalized.length
  ) return null;
  return normalized as NormalizedDeployEntry[];
}

function normalizeTimestamp(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function refreshAfterMutation(env: LearnEnv, ctx: ExecutionContext): void {
  ctx.waitUntil(refreshActivitySignals(env).catch((error: unknown) => {
    logWorkerError('activity_signal_refresh_after_learn_publication_change_failed', {}, error);
  }));
}
