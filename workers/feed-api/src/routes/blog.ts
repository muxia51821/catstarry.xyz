import { FeedStore } from '../adapters/feed-store';
import { apiError, json, readJson } from '../lib/http';
import { refreshActivitySignals } from '../modules/activity-signals';
import { parseFootprintCandidate } from '../modules/footprints';

type BlogEnv = Env & { FOOTPRINT_INGEST_TOKEN?: string };

interface PublicationEntry {
  slug?: unknown;
  title?: unknown;
  summary?: unknown;
}

export async function handleBlog(
  request: Request,
  env: BlogEnv,
  ctx: ExecutionContext,
  pathname: string,
): Promise<Response> {
  if (pathname !== '/api/blog/internal/publications' || request.method !== 'POST') {
    return apiError(404, 'not_found', 'Blog route not found');
  }
  const authorization = request.headers.get('Authorization');
  if (!env.FOOTPRINT_INGEST_TOKEN || authorization !== `Bearer ${env.FOOTPRINT_INGEST_TOKEN}`) {
    return apiError(env.FOOTPRINT_INGEST_TOKEN ? 401 : 503, 'unauthorized', 'Blog publication sync is not available');
  }
  const body = await readJson<{ entries?: unknown; deployed_at?: unknown }>(request, 128 * 1_024);
  if (body instanceof Response) return body;
  if (!Array.isArray(body.entries) || body.entries.length > 500) {
    return apiError(400, 'invalid_manifest', 'Blog publication manifest is invalid');
  }
  const deployedAt = new Date(typeof body.deployed_at === 'string' ? body.deployed_at : '');
  if (!Number.isFinite(deployedAt.getTime())) {
    return apiError(400, 'invalid_manifest', 'deployed_at must be a valid timestamp');
  }
  const entries = normalizeEntries(body.entries as PublicationEntry[]);
  if (!entries) return apiError(400, 'invalid_manifest', 'Blog publication entries are invalid');

  const manifestKey = 'blog:published-manifest';
  const previous = await env.AUTH_KV.get<string[]>(manifestKey, 'json');
  const slugs = entries.map((entry) => entry.slug);
  if (!previous) {
    await env.AUTH_KV.put(manifestKey, JSON.stringify(slugs));
    return json({ initialized: true, synced: slugs.length, created: 0 });
  }

  const known = new Set(previous);
  const store = new FeedStore(env.DB);
  let created = 0;
  for (const entry of entries) {
    if (known.has(entry.slug)) continue;
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
      occurred_at: deployedAt.toISOString(),
      idempotency_key: `blog:${entry.slug}:first-production-v1`,
    });
    if (!candidate) return apiError(400, 'invalid_manifest', 'Blog publication entry could not be normalized');
    const result = await store.recordFootprint(candidate, new Date().toISOString());
    if (result.created) created += 1;
  }
  await env.AUTH_KV.put(manifestKey, JSON.stringify(slugs));
  if (created > 0) {
    ctx.waitUntil(refreshActivitySignals(env).catch((error: unknown) => {
      console.error('Activity Signal refresh failed after Blog publication sync', error);
    }));
  }
  return json({ initialized: false, synced: slugs.length, created });
}

function normalizeEntries(entries: PublicationEntry[]) {
  const normalized = entries.map((entry) => ({
    slug: typeof entry.slug === 'string' ? entry.slug.trim() : '',
    title: typeof entry.title === 'string' ? entry.title.trim() : '',
    summary: typeof entry.summary === 'string' ? entry.summary.trim() : '',
  })).sort((a, b) => a.slug.localeCompare(b.slug));
  if (
    normalized.some((entry) => (
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.slug)
      || !entry.title
      || entry.title.length > 200
      || entry.summary.length > 2_000
    ))
    || new Set(normalized.map((entry) => entry.slug)).size !== normalized.length
  ) return null;
  return normalized;
}
