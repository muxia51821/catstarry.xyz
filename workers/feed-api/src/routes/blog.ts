import type { BlogLifecycleEntry, BlogLifecycleState } from '../../../../shared/types';
import { normalizePublicationReleaseIdentity } from '../../../../shared/publication-release';
import { timingSafeEqualText } from '../../../../shared/security';
import { logWorkerError } from '../../../../shared/worker-log';
import { FeedStore } from '../adapters/feed-store';
import { apiError, json, readJson } from '../lib/http';
import { refreshActivitySignals } from '../modules/activity-signals';
import {
  readBlogLifecycle,
  readPublishedBlogSlugs,
  reconcileBlogLifecycle,
  type StoredBlogLifecycleEntry,
  writeBlogLifecycle,
} from '../modules/blog-publications';
import { parseFootprintCandidate } from '../modules/footprints';
import { claimBlogSyncRelease } from '../modules/publication-release-guards';
import { requireMainSession } from './auth';

type BlogEnv = Env & { FOOTPRINT_INGEST_TOKEN?: string; LOCAL_PREVIEW_AUTH?: string };

interface PublicationEntry {
  slug?: unknown;
  title?: unknown;
  summary?: unknown;
  state?: unknown;
}

const LOCAL_PREVIEW_RELEASE = {
  sha: 'ffffffffffffffffffffffffffffffffffffffff',
  generation: 1,
} as const;

export async function handleBlog(
  request: Request,
  env: BlogEnv,
  ctx: ExecutionContext,
  pathname: string,
): Promise<Response> {
  if (pathname === '/api/blog/publications' && request.method === 'GET') {
    return json({ slugs: await readPublishedBlogSlugs(env) });
  }
  if (pathname === '/api/blog/admin/publications' && request.method === 'GET') {
    const session = await requireMainSession(request, env);
    if (session instanceof Response) return session;
    const entries = (await readBlogLifecycle(env)) ?? [];
    return json({ entries: entries.filter((entry) => entry.source_present !== false) });
  }
  if (pathname === '/api/blog/admin/publications' && request.method === 'PATCH') {
    return updateLifecycle(request, env, ctx);
  }
  if (pathname === '/api/blog/internal/publications' && request.method === 'POST') {
    return syncDeployManifest(request, env, ctx);
  }
  return apiError(404, 'not_found', 'Blog route not found');
}

async function syncDeployManifest(request: Request, env: BlogEnv, ctx: ExecutionContext): Promise<Response> {
  const authorization = request.headers.get('Authorization');
  if (!env.FOOTPRINT_INGEST_TOKEN || !(await timingSafeEqualText(authorization, `Bearer ${env.FOOTPRINT_INGEST_TOKEN}`))) {
    return apiError(env.FOOTPRINT_INGEST_TOKEN ? 401 : 503, 'unauthorized', 'Blog publication sync is not available');
  }
  const body = await readJson<{ release?: unknown; entries?: unknown; deployed_at?: unknown }>(request, 128 * 1_024);
  if (body instanceof Response) return body;
  const release = normalizePublicationReleaseIdentity(body.release)
    ?? (body.release === undefined && env.LOCAL_PREVIEW_AUTH === '1' ? LOCAL_PREVIEW_RELEASE : null);
  if (!release || !Array.isArray(body.entries) || body.entries.length > 500) {
    return apiError(400, 'invalid_manifest', 'Blog publication manifest is invalid');
  }
  const deployedAt = new Date(typeof body.deployed_at === 'string' ? body.deployed_at : '');
  if (!Number.isFinite(deployedAt.getTime())) {
    return apiError(400, 'invalid_manifest', 'deployed_at must be a valid timestamp');
  }
  const incoming = normalizeEntries(body.entries as PublicationEntry[]);
  if (!incoming) return apiError(400, 'invalid_manifest', 'Blog publication entries are invalid');

  const releaseGuard = await claimBlogSyncRelease(env.DB, release);
  if (!releaseGuard.ok) {
    return apiError(
      409,
      releaseGuard.state === 'stale' ? 'stale_release' : 'release_conflict',
      releaseGuard.state === 'stale'
        ? 'Blog publication sync release is older than the accepted release'
        : 'Blog publication sync release conflicts with the accepted release',
    );
  }

  const previous = await readBlogLifecycle(env);
  if (previous === null) {
    const initialized = incoming.map((entry) => ({
      ...entry,
      ever_published: entry.state === 'published',
      source_present: true,
    }));
    await writeBlogLifecycle(env, initialized);
    return json({ initialized: true, synced: incoming.length, created: 0 });
  }

  const reconciled = reconcileBlogLifecycle(previous, incoming);
  let created = 0;
  for (const entry of reconciled.first_publications) {
    created += await recordFirstPublication(env, entry, deployedAt.toISOString());
  }
  await writeBlogLifecycle(env, reconciled.entries);
  if (created > 0) refreshAfterMutation(env, ctx);
  return json({ initialized: false, synced: incoming.length, created });
}

async function updateLifecycle(request: Request, env: BlogEnv, ctx: ExecutionContext): Promise<Response> {
  const session = await requireMainSession(request, env);
  if (session instanceof Response) return session;
  const body = await readJson<{ slug?: unknown; state?: unknown }>(request, 4_096);
  if (body instanceof Response) return body;
  if (typeof body.slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(body.slug)
    || (body.state !== 'published' && body.state !== 'withdrawn')) {
    return apiError(400, 'invalid_lifecycle', 'slug and a published or withdrawn state are required');
  }
  const entries = (await readBlogLifecycle(env)) ?? [];
  const index = entries.findIndex((entry) => entry.slug === body.slug);
  if (index < 0) return apiError(404, 'not_found', 'Blog entry not found');
  const entry = entries[index];
  if (entry.source_present === false) {
    return apiError(409, 'source_missing', 'Blog source is not deployed');
  }
  if (body.state === 'withdrawn' && entry.state !== 'published') {
    return apiError(409, 'invalid_transition', 'Only a published Blog entry can be withdrawn');
  }
  if (body.state === 'published' && entry.state === 'published') {
    return json({ entry, created: false });
  }

  let created = 0;
  const updated: StoredBlogLifecycleEntry = { ...entry, state: body.state };
  if (body.state === 'published' && !entry.ever_published) {
    created = await recordFirstPublication(env, updated, new Date().toISOString());
    updated.ever_published = true;
  }
  entries[index] = updated;
  await writeBlogLifecycle(env, entries);
  refreshAfterMutation(env, ctx);
  return json({ entry: updated, created: created === 1 });
}

async function recordFirstPublication(
  env: BlogEnv,
  entry: Pick<StoredBlogLifecycleEntry, 'slug' | 'title' | 'summary'>,
  occurredAt: string,
): Promise<number> {
  const candidate = parseFootprintCandidate({
    source_module: 'blog',
    source_ref: entry.slug,
    source_version: 'first-production-v1',
    event_type: 'blog_published',
    snapshot_json: JSON.stringify({
      title: entry.title,
      ...(entry.summary ? { summary: entry.summary } : {}),
      link: `/blog/${entry.slug}/`,
    }),
    occurred_at: occurredAt,
    idempotency_key: `blog:${entry.slug}:first-production-v1`,
  });
  if (!candidate) throw new Error('Blog publication entry could not be normalized');
  const result = await new FeedStore(env.DB).recordFootprint(candidate, new Date().toISOString());
  return result.created ? 1 : 0;
}

function normalizeEntries(entries: PublicationEntry[]): BlogLifecycleEntry[] | null {
  const normalized = entries.map((entry) => ({
    slug: typeof entry.slug === 'string' ? entry.slug.trim() : '',
    title: typeof entry.title === 'string' ? entry.title.trim() : '',
    summary: typeof entry.summary === 'string' ? entry.summary.trim() : '',
    state: entry.state as BlogLifecycleState,
  })).sort((a, b) => a.slug.localeCompare(b.slug));
  if (normalized.some((entry) => (
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.slug)
    || !entry.title
    || !['draft', 'published', 'withdrawn'].includes(entry.state)
    || entry.title.length > 200
    || entry.summary.length > 2_000
  )) || new Set(normalized.map((entry) => entry.slug)).size !== normalized.length) return null;
  return normalized;
}

function refreshAfterMutation(env: BlogEnv, ctx: ExecutionContext): void {
  ctx.waitUntil(refreshActivitySignals(env).catch((error: unknown) => {
    logWorkerError('activity_signal_refresh_after_blog_lifecycle_change_failed', {}, error);
  }));
}
