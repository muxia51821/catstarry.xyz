import type {
  LearnPublicationRecord,
  LearnPublicationVisibility,
  PublicFootprintCandidate,
} from '../../../../shared/types';
import type { PublicationReleaseIdentity } from '../../../../shared/publication-release';
import {
  comparePublicationRelease,
  normalizePublicationReleaseIdentity,
  samePublicationRelease,
} from '../../../../shared/publication-release';
import {
  assertValidLearnPublicRelations,
  type LearnRelationEntry,
} from '../../../../shared/learn-relations';
import { logWorkerError } from '../../../../shared/worker-log';
import { footprintInsertStatement } from '../adapters/feed-store';
import { apiError, json, readJson } from '../lib/http';
import { refreshActivitySignals } from '../modules/activity-signals';
import { parseFootprintCandidate } from '../modules/footprints';
import {
  abortLearnRelease,
  activateLearnRelease,
  prepareLearnRelease,
  readLearnActiveRelease,
  readLearnPendingRelease,
} from '../modules/publication-release-guards';
import { requireIngestAuth, requireMainSession } from './auth';

type LearnEnv = Env & { FOOTPRINT_INGEST_TOKEN?: string; LOCAL_PREVIEW_AUTH?: string };

interface LearnDeployEntry {
  slug?: unknown;
  title?: unknown;
  excerpt?: unknown;
  revised_at?: unknown;
  links?: unknown;
}

interface NormalizedDeployEntry {
  slug: string;
  title: string;
  excerpt: string;
  revised_at: string | null;
  links: string[];
}

interface LearnRelationAuthority {
  release: PublicationReleaseIdentity | null;
  entries: LearnRelationEntry[];
}

const LEARN_RELATION_MANIFEST_KEY = 'learn:relation-manifest';

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
  if (pathname === '/api/learn/internal/release/prepare' && request.method === 'POST') {
    return updateReleaseBarrier(request, env, 'prepare');
  }
  if (pathname === '/api/learn/internal/release/abort' && request.method === 'POST') {
    return updateReleaseBarrier(request, env, 'abort');
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
  if (existing?.visibility === visibility) return json({ entry: existing, created: false });
  if (await readLearnPendingRelease(env.DB)) {
    return apiError(503, 'publication_release_pending', 'Learn publication lifecycle is temporarily unavailable during production release activation');
  }
  const relationFailure = await validateProposedPublicRelations(env, slug, visibility);
  if (relationFailure) return relationFailure;
  if (!existing) {
    if (visibility !== 'public' || !title) {
      return apiError(409, 'never_published', 'A never-published Learn note can only be published');
    }
    const now = new Date().toISOString();
    const candidate = firstPublicationCandidate(slug, title, excerpt, now);
    const [publicationWrite, footprintWrite] = await env.DB.batch([
      env.DB.prepare(`INSERT OR IGNORE INTO learn_publications (
          slug, visibility, published_at, last_revised_at, updated_at
        ) SELECT ?, 'public', ?, ?, ?
        WHERE NOT EXISTS (
          SELECT 1 FROM publication_release_guards WHERE guard_key = 'learn-pending'
        )`).bind(slug, now, revisedAt, now),
      footprintInsertStatement(env.DB, candidate, now, { pendingReleaseGuardKey: 'learn-pending' }),
    ]);
    const created = (publicationWrite.meta.changes ?? 0) > 0;
    if (!created && await readLearnPendingRelease(env.DB)) {
      return apiError(503, 'publication_release_pending', 'Learn publication lifecycle is temporarily unavailable during production release activation');
    }
    const entry = await getPublication(env.DB, slug);
    if (!entry) throw new Error('Learn publication write was not persisted');
    if (created && (footprintWrite.meta.changes ?? 0) === 0) {
      throw new Error('Learn first-publication footprint was not persisted');
    }
    if (created) refreshAfterMutation(env, ctx);
    return json({ entry, created });
  }

  const updatedAt = new Date().toISOString();
  const result = await env.DB.prepare(`UPDATE learn_publications
    SET visibility = ?, updated_at = ?
    WHERE slug = ? AND NOT EXISTS (
      SELECT 1 FROM publication_release_guards WHERE guard_key = 'learn-pending'
    )`).bind(visibility, updatedAt, slug).run();
  if ((result.meta.changes ?? 0) === 0) {
    if (await readLearnPendingRelease(env.DB)) {
      return apiError(503, 'publication_release_pending', 'Learn publication lifecycle is temporarily unavailable during production release activation');
    }
    return apiError(409, 'publication_changed', 'Learn publication changed while the lifecycle request was being applied');
  }
  refreshAfterMutation(env, ctx);
  return json({ entry: await getPublication(env.DB, slug), created: false });
}

async function updateReleaseBarrier(
  request: Request,
  env: LearnEnv,
  action: 'prepare' | 'abort',
): Promise<Response> {
  const authFailure = await requireIngestAuth(request, env, 'Learn production release barrier is not available');
  if (authFailure) return authFailure;
  const body = await readJson<{ release?: unknown }>(request, 4_096);
  if (body instanceof Response) return body;
  const release = normalizePublicationReleaseIdentity(body.release);
  if (!release) return apiError(400, 'invalid_release', 'Publication release identity is invalid');

  if (action === 'abort') {
    if (!await abortLearnRelease(env.DB, release)) {
      return apiError(409, 'release_not_pending', 'The exact Learn publication release is not pending');
    }
    return json({ release, pending: false });
  }

  const result = await prepareLearnRelease(env.DB, release);
  if (result.ok) return json({ release, pending: true });
  if (result.state === 'stale') {
    return apiError(409, 'stale_release', 'Learn production release is older than the active release');
  }
  if (result.state === 'pending') {
    return apiError(409, 'release_pending', 'A different Learn production release is already pending');
  }
  return apiError(409, 'release_conflict', 'Learn production release conflicts with the active release');
}

async function syncDeployedMetadata(request: Request, env: LearnEnv, ctx: ExecutionContext): Promise<Response> {
  const authFailure = await requireIngestAuth(request, env, 'Publication metadata sync is not available');
  if (authFailure) return authFailure;
  const body = await readJson<{
    schema_version?: unknown;
    release?: unknown;
    entries?: unknown;
    deployed_at?: unknown;
  }>(request, 128 * 1_024);
  if (body instanceof Response) return body;
  const release = normalizePublicationReleaseIdentity(body.release);
  if (body.schema_version !== 3 || !release || !Array.isArray(body.entries) || body.entries.length > 500) {
    return apiError(400, 'invalid_manifest', 'Learn publication metadata manifest is invalid');
  }
  const deployedAt = normalizeTimestamp(body.deployed_at);
  const entries = normalizeDeployEntries(body.entries as LearnDeployEntry[]);
  if (!deployedAt || !entries) return apiError(400, 'invalid_manifest', 'Learn publication metadata manifest is invalid');

  const releaseMode = await validateLearnSyncRelease(env.DB, release);
  if (releaseMode instanceof Response) return releaseMode;

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
      footprintInsertStatement(env.DB, candidate, deployedAt),
      env.DB.prepare(
        'UPDATE learn_publications SET last_revised_at = ?, updated_at = ? WHERE slug = ?',
      ).bind(entry.revised_at, deployedAt, entry.slug),
    ]);
    if ((footprintWrite.meta.changes ?? 0) > 0) created += 1;
  }

  const relationEntries = entries.map(({ slug, links }) => ({ slug, links }));
  await env.AUTH_KV.put(LEARN_RELATION_MANIFEST_KEY, JSON.stringify({
    schema_version: 2,
    release,
    entries: relationEntries,
  }));
  if (releaseMode === 'pending' && !await activateLearnRelease(env.DB, release)) {
    return apiError(409, 'release_activation_failed', 'Learn publication release could not be activated; lifecycle remains unavailable');
  }
  if (created > 0) refreshAfterMutation(env, ctx);
  return json({ synced: entries.length, created });
}

async function validateLearnSyncRelease(
  database: D1Database,
  release: PublicationReleaseIdentity,
): Promise<'pending' | 'active_retry' | Response> {
  const pending = await readLearnPendingRelease(database);
  if (pending) {
    if (samePublicationRelease(release, pending)) return 'pending';
    const comparison = comparePublicationRelease(release, pending);
    if (comparison === 'stale') {
      return apiError(409, 'stale_release', 'Learn publication sync release is older than the pending release');
    }
    return apiError(409, 'release_pending', 'Learn publication sync does not match the pending release');
  }

  const active = await readLearnActiveRelease(database);
  if (active && samePublicationRelease(release, active)) return 'active_retry';
  if (active) {
    const comparison = comparePublicationRelease(release, active);
    if (comparison === 'stale') {
      return apiError(409, 'stale_release', 'Learn publication sync release is older than the active release');
    }
    if (comparison === 'conflict') {
      return apiError(409, 'release_conflict', 'Learn publication sync release conflicts with the active release');
    }
  }
  return apiError(409, 'release_not_prepared', 'Learn publication sync release was not prepared before Site deployment');
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
    links: normalizeLinks(entry.links),
  })).sort((a, b) => a.slug.localeCompare(b.slug));
  if (
    normalized.some((entry) => (
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.slug)
      || !entry.title
      || entry.title.length > 200
      || entry.excerpt.length > 2_000
      || entry.revised_at === undefined
      || entry.links === null
    ))
    || new Set(normalized.map((entry) => entry.slug)).size !== normalized.length
  ) return null;
  return normalized as NormalizedDeployEntry[];
}

function normalizeLinks(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length > 500) return null;
  const links = value.map((entry) => typeof entry === 'string' ? entry.trim() : '');
  if (links.some((entry) => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry))) return null;
  return [...new Set(links)].sort((a, b) => a.localeCompare(b, 'en'));
}

async function validateProposedPublicRelations(
  env: LearnEnv,
  slug: string,
  visibility: LearnPublicationVisibility,
): Promise<Response | null> {
  const authority = normalizeRelationAuthority(
    await env.AUTH_KV.get<unknown>(LEARN_RELATION_MANIFEST_KEY, 'json'),
  );
  if (!authority) {
    return apiError(503, 'relation_manifest_unavailable', 'Learn relation metadata is unavailable');
  }

  const activeRelease = await readLearnActiveRelease(env.DB);
  if (
    (activeRelease && !samePublicationRelease(activeRelease, authority.release))
    || (!activeRelease && authority.release)
  ) {
    return apiError(503, 'relation_manifest_unavailable', 'Learn relation metadata does not match the active Site release');
  }

  const publicSlugs = new Set((await listPublications(env.DB, 'public')).map((entry) => entry.slug));
  if (visibility === 'public') publicSlugs.add(slug);
  else publicSlugs.delete(slug);
  const bySlug = new Map(authority.entries.map((entry) => [entry.slug, entry]));
  const proposed: LearnRelationEntry[] = [];
  for (const publicSlug of publicSlugs) {
    const entry = bySlug.get(publicSlug);
    if (!entry) {
      return apiError(409, 'broken_public_relation', 'Learn publication metadata does not cover the proposed public set');
    }
    proposed.push(entry);
  }
  try {
    assertValidLearnPublicRelations(proposed);
    return null;
  } catch (error) {
    return apiError(409, 'broken_public_relation', error instanceof Error ? error.message : 'Broken public Learn relation');
  }
}

function normalizeRelationAuthority(value: unknown): LearnRelationAuthority | null {
  if (Array.isArray(value)) {
    const entries = normalizeRelationEntries(value);
    return entries ? { release: null, entries } : null;
  }
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  if (record.schema_version !== 2 || !Array.isArray(record.entries)) return null;
  const release = normalizePublicationReleaseIdentity(record.release);
  const entries = normalizeRelationEntries(record.entries);
  return release && entries ? { release, entries } : null;
}

function normalizeRelationEntries(value: unknown[]): LearnRelationEntry[] | null {
  if (value.length > 500) return null;
  const entries = value.map((candidate) => {
    if (!candidate || typeof candidate !== 'object') return null;
    const record = candidate as Record<string, unknown>;
    const slug = typeof record.slug === 'string' ? record.slug.trim() : '';
    const links = normalizeLinks(record.links);
    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && links ? { slug, links } : null;
  });
  if (entries.some((entry) => entry === null)) return null;
  const normalized = entries as LearnRelationEntry[];
  return new Set(normalized.map((entry) => entry.slug)).size === normalized.length ? normalized : null;
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
