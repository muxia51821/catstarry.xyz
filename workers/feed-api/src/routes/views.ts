import { apiError, json, readJson } from '../lib/http';
import { logWorkerError } from '../../../../shared/worker-log';

const MAX_SLUGS = 50;
const MAX_RECORDS_PER_MINUTE = 120;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function handleViews(request: Request, env: Env): Promise<Response> {
  if (request.method === 'GET') return readViews(request, env.DB);
  if (request.method === 'POST') return recordView(request, env);
  return apiError(405, 'method_not_allowed', 'Method is not allowed');
}

async function readViews(request: Request, database: D1Database): Promise<Response> {
  const url = new URL(request.url);
  const single = url.searchParams.get('slug');
  const multiple = url.searchParams.get('slugs');
  if ((single && multiple) || (!single && !multiple)) {
    return apiError(400, 'invalid_query', 'Provide exactly one of slug or slugs');
  }

  if (single) {
    const slug = parseSlug(single);
    if (!slug) return apiError(400, 'invalid_slug', 'slug must be a lowercase ASCII slug');
    return json({ slug, count: await totalViews(database, slug) });
  }

  const slugs = [...new Set((multiple ?? '').split(',').map((slug) => parseSlug(slug)).filter(Boolean))] as string[];
  if (slugs.length === 0 || slugs.length > MAX_SLUGS) {
    return apiError(400, 'invalid_slugs', `slugs must contain between 1 and ${MAX_SLUGS} lowercase ASCII slugs`);
  }
  const placeholders = slugs.map(() => '?').join(', ');
  const rows = await database
    .prepare(`SELECT slug, COALESCE(SUM(count), 0) AS count FROM blog_views WHERE slug IN (${placeholders}) GROUP BY slug`)
    .bind(...slugs)
    .all<{ slug: string; count: number }>();
  const counts = new Map(rows.results.map((row) => [row.slug, Number(row.count)]));
  return json({ views: slugs.map((slug) => ({ slug, count: counts.get(slug) ?? 0 })) });
}

async function recordView(request: Request, env: Env): Promise<Response> {
  const body = await readJson<{ slug?: unknown }>(request, 1_024);
  if (body instanceof Response) return body;
  const slug = parseSlug(body.slug);
  if (!slug) return apiError(400, 'invalid_slug', 'slug must be a lowercase ASCII slug');

  const viewDate = shanghaiDate(new Date());
  const visitorHash = await hashVisitor(request);
  if (!await allowViewRecord(env.VIEW_KV, visitorHash)) {
    return apiError(429, 'rate_limited', 'Too many view records; try again later');
  }
  const cacheKey = `view:${viewDate}:${slug}:${visitorHash}`;
  const alreadyCounted = await env.VIEW_KV.get(cacheKey);
  if (alreadyCounted) return json({ slug, count: await totalViews(env.DB, slug) });

  await env.DB
    .prepare('INSERT OR IGNORE INTO blog_view_visitors (slug, view_date, visitor_hash, created_at) VALUES (?, ?, ?, ?)')
    .bind(slug, viewDate, visitorHash, new Date().toISOString())
    .run();
  try {
    await env.VIEW_KV.put(cacheKey, '1', { expirationTtl: 86_400 });
  } catch (error) {
    logWorkerError('blog_view_cache_marker_failed_after_durable_record', { slug }, error);
  }
  return json({ slug, count: await totalViews(env.DB, slug) });
}

async function allowViewRecord(cache: KVNamespace, visitorHash: string): Promise<boolean> {
  const minute = Math.floor(Date.now() / 60_000);
  const key = `ratelimit:views:${minute}:${visitorHash}`;
  const current = Number(await cache.get(key) ?? '0');
  if (!Number.isFinite(current) || current >= MAX_RECORDS_PER_MINUTE) return false;
  await cache.put(key, String(current + 1), { expirationTtl: 120 });
  return true;
}

async function totalViews(database: D1Database, slug: string): Promise<number> {
  const row = await database
    .prepare('SELECT COALESCE(SUM(count), 0) AS count FROM blog_views WHERE slug = ?')
    .bind(slug)
    .first<{ count: number }>();
  return Number(row?.count ?? 0);
}

function parseSlug(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const slug = value.trim();
  return slug.length <= 128 && SLUG_PATTERN.test(slug) ? slug : null;
}

function shanghaiDate(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

async function hashVisitor(request: Request): Promise<string> {
  const address = request.headers.get('CF-Connecting-IP') ?? 'unknown';
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(address));
  return Array.from(new Uint8Array(digest).slice(0, 16), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
