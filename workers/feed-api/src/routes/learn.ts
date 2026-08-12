import { FeedStore } from '../adapters/feed-store';
import { apiError, json, readJson } from '../lib/http';
import { parseFootprintCandidate } from '../modules/footprints';
import { refreshActivitySignals } from '../modules/activity-signals';
import { timingSafeEqualText } from '../../../../shared/security';
import { logWorkerError } from '../../../../shared/worker-log';
import { requireMainSession } from './auth';

type LearnEnv = Env & { FOOTPRINT_INGEST_TOKEN?: string };

interface LearnPublicationEntry {
  slug?: unknown;
  title?: unknown;
  excerpt?: unknown;
  published_at?: unknown;
  revised_at?: unknown;
}

interface LearnPublicationManifest {
  schema_version: 2;
  deployed_at: string;
  entries: NormalizedEntry[];
}

interface NormalizedEntry {
  slug: string;
  title: string;
  excerpt: string;
  published_at: string;
  revised_at: string | null;
}

export async function handleLearn(
  request: Request,
  env: LearnEnv,
  ctx: ExecutionContext,
  pathname: string,
): Promise<Response> {
  if (pathname === '/api/learn/internal/publications' && request.method === 'POST') {
    return syncPublishedManifest(request, env, ctx);
  }
  if (pathname === '/api/learn/complete' && request.method === 'POST') {
    const session = await requireMainSession(request, env);
    if (session instanceof Response) return session;
    return apiError(410, 'legacy_writer_retired', 'Learn section completion no longer creates Feed activity');
  }
  return apiError(404, 'not_found', 'Learn route not found');
}

async function syncPublishedManifest(request: Request, env: LearnEnv, ctx: ExecutionContext): Promise<Response> {
  const authorization = request.headers.get('Authorization');
  if (!env.FOOTPRINT_INGEST_TOKEN || !(await timingSafeEqualText(authorization, `Bearer ${env.FOOTPRINT_INGEST_TOKEN}`))) {
    return apiError(env.FOOTPRINT_INGEST_TOKEN ? 401 : 503, 'unauthorized', 'Publication manifest sync is not available');
  }
  const body = await readJson<{ schema_version?: unknown; entries?: unknown; deployed_at?: unknown }>(request, 128 * 1_024);
  if (body instanceof Response) return body;
  if (body.schema_version !== 2 || !Array.isArray(body.entries) || body.entries.length > 500) {
    return apiError(400, 'invalid_manifest', 'Learn publication manifest is invalid');
  }
  const deployedAt = normalizeTimestamp(body.deployed_at);
  const entries = normalizeEntries(body.entries as LearnPublicationEntry[]);
  if (!deployedAt || !entries) return apiError(400, 'invalid_manifest', 'Learn publication manifest is invalid');

  const manifestKey = 'learn:published-manifest';
  const previousValue = await env.AUTH_KV.get<unknown>(manifestKey, 'json');
  const previous = isManifestV2(previousValue) ? previousValue : null;
  const next: LearnPublicationManifest = { schema_version: 2, deployed_at: deployedAt, entries };

  // A legacy slug array or missing key is a v2 baseline, never a publication backfill.
  if (!previous) {
    await env.AUTH_KV.put(manifestKey, JSON.stringify(next));
    return json({ initialized: true, synced: entries.length, created: 0 });
  }

  const previousBySlug = new Map(previous.entries.map((entry) => [entry.slug, entry]));
  for (const entry of entries) {
    const oldEntry = previousBySlug.get(entry.slug);
    if (!oldEntry) continue;
    const revisedAtRegressed = oldEntry.revised_at !== null
      && (entry.revised_at === null || Date.parse(entry.revised_at) < Date.parse(oldEntry.revised_at));
    if (entry.published_at !== oldEntry.published_at || revisedAtRegressed) {
      return apiError(409, 'lifecycle_regression', 'Learn publication lifecycle cannot move backward');
    }
  }
  const store = new FeedStore(env.DB);
  let created = 0;
  for (const entry of entries) {
    const oldEntry = previousBySlug.get(entry.slug);
    const event = !oldEntry
      ? { type: 'learn_note_published' as const, marker: entry.published_at, prefix: 'p' }
      : entry.revised_at && entry.revised_at !== oldEntry.revised_at
        ? { type: 'learn_note_revised' as const, marker: entry.revised_at, prefix: 'r' }
        : null;
    if (!event) continue;
    const sourceVersion = `${event.prefix}:${Math.floor(Date.parse(event.marker) / 1_000)}`;
    const candidate = parseFootprintCandidate({
      source_module: 'learn',
      source_ref: entry.slug,
      source_version: sourceVersion,
      event_type: event.type,
      snapshot_json: JSON.stringify({
        title: entry.title,
        ...(entry.excerpt ? { summary: entry.excerpt } : {}),
        link: `/learn/notes/${entry.slug}/`,
      }),
      occurred_at: deployedAt,
      idempotency_key: `learn:${entry.slug}:${sourceVersion}`,
    });
    if (!candidate) return apiError(400, 'invalid_manifest', 'Learn publication entry could not be normalized');
    const result = await store.recordFootprint(candidate, new Date().toISOString());
    if (result.created) created += 1;
  }
  await env.AUTH_KV.put(manifestKey, JSON.stringify(next));
  if (created > 0) ctx.waitUntil(refreshActivitySignals(env).catch((error: unknown) => {
    logWorkerError('activity_signal_refresh_after_learn_publication_sync_failed', {}, error);
  }));
  return json({ initialized: false, synced: entries.length, created });
}

function normalizeEntries(entries: LearnPublicationEntry[]): NormalizedEntry[] | null {
  const normalized = entries.map((entry) => ({
    slug: typeof entry.slug === 'string' ? entry.slug.trim() : '',
    title: typeof entry.title === 'string' ? entry.title.trim() : '',
    excerpt: typeof entry.excerpt === 'string' ? entry.excerpt.trim() : '',
    published_at: normalizeTimestamp(entry.published_at) ?? '',
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
      || !entry.published_at
      || entry.revised_at === undefined
      || (entry.revised_at !== null && Date.parse(entry.revised_at) < Date.parse(entry.published_at))
    ))
    || new Set(normalized.map((entry) => entry.slug)).size !== normalized.length
  ) return null;
  return normalized as NormalizedEntry[];
}

function normalizeTimestamp(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function isManifestV2(value: unknown): value is LearnPublicationManifest {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const candidate = value as Partial<LearnPublicationManifest>;
  return candidate.schema_version === 2
    && typeof candidate.deployed_at === 'string'
    && Array.isArray(candidate.entries)
    && normalizeEntries(candidate.entries) !== null;
}
