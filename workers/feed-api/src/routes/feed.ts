import type { FeedPostInput, PublicFootprint, PublicFootprintCandidate, TimelineEntry, Visibility } from '../../../../shared/types';
import { timingSafeEqualText } from '../../../../shared/security';
import { FeedStore, decodeCursor } from '../adapters/feed-store';
import { apiError, json, parseBoundedLimit, readJson } from '../lib/http';
import { readPublishedBlogSlugs } from '../modules/blog-publications';
import { recordPublicFootprint, parseFootprintCandidate } from '../modules/footprints';
import { refreshActivitySignals } from '../modules/activity-signals';
import { requireMainSession } from './auth';
import { logWorkerError } from '../../../../shared/worker-log';

const MAX_MEDIA_KEYS = 6;
const MEDIA_KEY_PATTERN = /^feed\/\d{4}-\d{2}\/[0-9a-f-]{36}\.(?:jpg|jpeg|png|webp|heic|mp4|webm|mov)$/;
const LIMITS = {
  content: 10_000,
  linkUrl: 2_048,
  linkTitle: 200,
  linkSummary: 2_000,
  linkImage: 2_048,
  footprintSourceRef: 256,
  footprintSourceVersion: 128,
  footprintSnapshot: 32_768,
  footprintIdempotencyKey: 128,
} as const;

type FeedEnv = Env & {
  FOOTPRINT_INGEST_TOKEN?: string;
  CLIP_PREVIEW_ALLOWED_HOSTS?: string;
};

export async function handleFeed(
  request: Request,
  env: FeedEnv,
  ctx: ExecutionContext,
  pathname: string,
): Promise<Response> {
  const store = new FeedStore(env.DB);
  if (pathname === '/api/feed' && request.method === 'GET') return listPublic(request, env, store);
  if (pathname === '/api/feed' && request.method === 'POST') return createPost(request, env, ctx, store);
  if (pathname === '/api/feed/admin' && request.method === 'GET') return listAdmin(request, env, store);
  if (pathname === '/api/feed/clip-preview' && request.method === 'POST') return previewClip(request, env);
  if (pathname === '/api/feed/internal/footprints' && request.method === 'POST') {
    return ingestFootprint(request, env, ctx);
  }
  if (pathname.startsWith('/api/feed/media/')) return handleMedia(request, env, pathname);
  if (pathname.startsWith('/api/feed/')) return mutatePost(request, env, ctx, store, pathname);
  return apiError(404, 'not_found', 'Feed route not found');
}

async function listPublic(request: Request, env: FeedEnv, store: FeedStore): Promise<Response> {
  const url = new URL(request.url);
  const limit = parseBoundedLimit(url.searchParams.get('limit'));
  if (limit === null) return apiError(400, 'invalid_limit', 'limit must be between 1 and 50');
  const rawCursor = url.searchParams.get('cursor');
  const cursor = rawCursor ? decodeCursor(rawCursor) ?? undefined : undefined;
  if (rawCursor && !cursor) return apiError(400, 'invalid_cursor', 'cursor is invalid');
  const [publishedBlogSlugs, publishedLearnSlugs] = await Promise.all([
    readPublishedBlogSlugs(env).catch((error: unknown) => {
      logWorkerError('public_feed_blog_publication_read_failed', {}, error);
      return [];
    }),
    loadPublishedLearnSlugs(env.DB),
  ]);
  return json(await store.listPublic(cursor, limit, publishedBlogSlugs, publishedLearnSlugs));
}

async function listAdmin(request: Request, env: FeedEnv, store: FeedStore): Promise<Response> {
  const session = await requireMainSession(request, env);
  if (session instanceof Response) return session;
  const url = new URL(request.url);
  const limit = parseBoundedLimit(url.searchParams.get('limit'));
  if (limit === null) return apiError(400, 'invalid_limit', 'limit must be between 1 and 50');
  const visibility = url.searchParams.get('visibility');
  if (visibility !== null && visibility !== 'public' && visibility !== 'private') {
    return apiError(400, 'invalid_visibility', 'visibility must be public or private');
  }
  const type = url.searchParams.get('type');
  if (type !== null && !['note', 'clip', 'system_footprint', 'blog', 'learn', 'projects'].includes(type)) {
    return apiError(400, 'invalid_type', 'type is not a supported admin filter');
  }
  const rawCursor = url.searchParams.get('cursor');
  const cursor = rawCursor ? decodeCursor(rawCursor) ?? undefined : undefined;
  if (rawCursor && !cursor) return apiError(400, 'invalid_cursor', 'cursor is invalid');
  const from = parseAdminDate(url.searchParams.get('from'), false);
  const to = parseAdminDate(url.searchParams.get('to'), true);
  if (from === null || to === null || (from && to && from >= to)) {
    return apiError(400, 'invalid_date_range', 'from and to must be valid dates with from before to');
  }
  const [page, publishedBlogSlugs, publishedLearnSlugs] = await Promise.all([store.listAdmin({
    visibility: visibility ?? undefined,
    type: type ?? undefined,
    from: from ?? undefined,
    to: to ?? undefined,
    cursor,
    limit,
  }), readPublishedBlogSlugs(env), loadPublishedLearnSlugs(env.DB)]);
  const publishedBlogSlugSet = new Set(publishedBlogSlugs);
  const publishedLearnSlugSet = new Set(publishedLearnSlugs);
  return json({
    ...page,
    items: page.items.map((entry) => withProjectionState(entry, publishedBlogSlugSet, publishedLearnSlugSet)),
  });
}

async function loadPublishedLearnSlugs(database: D1Database): Promise<string[]> {
  const result = await database.prepare(
    "SELECT slug FROM learn_publications WHERE visibility = 'public' ORDER BY slug",
  ).all<{ slug: string }>();
  return result.results.map((entry) => entry.slug);
}

function withProjectionState(
  entry: TimelineEntry,
  publishedBlogSlugs: Set<string>,
  publishedLearnSlugs: Set<string>,
): TimelineEntry {
  if (entry.visibility === 'private') return { ...entry, projection_state: 'own_private' };
  const footprint = entry.kind === 'system_footprint' ? entry.payload as PublicFootprint : null;
  if (footprint?.source_module === 'blog' && !publishedBlogSlugs.has(footprint.source_ref)) {
    return { ...entry, projection_state: 'source_hidden' };
  }
  if (
    footprint?.source_module === 'learn'
    && footprint.event_type !== 'learn_section_completed'
    && !publishedLearnSlugs.has(footprint.source_ref)
  ) {
    return { ...entry, projection_state: 'source_hidden' };
  }
  return { ...entry, projection_state: 'public' };
}

async function createPost(
  request: Request,
  env: FeedEnv,
  ctx: ExecutionContext,
  store: FeedStore,
): Promise<Response> {
  const session = await requireMainSession(request, env);
  if (session instanceof Response) return session;
  const input = await readJson<FeedPostInput>(request, 64 * 1_024);
  if (input instanceof Response) return input;
  const normalizedInput = normalizePost(input);
  const problem = await validatePost(normalizedInput, env);
  if (problem) return apiError(400, 'invalid_post', problem);

  const idempotencyKey = request.headers.get('Idempotency-Key');
  if (idempotencyKey && !/^[A-Za-z0-9_-]{8,128}$/.test(idempotencyKey)) {
    return apiError(400, 'invalid_idempotency_key', 'Idempotency-Key must contain 8 to 128 URL-safe characters');
  }
  const id = idempotencyKey ? await idForIdempotencyKey(session.username, idempotencyKey) : crypto.randomUUID();
  const existing = await store.getNativePost(id);
  if (existing) return json({ post: existing, duplicate: true }, 200);
  try {
    const post = await store.createPost(normalizedInput, new Date().toISOString(), id);
    refreshAfterMutation(env, ctx, 'feed post created');
    return json({ post }, 201);
  } catch (error) {
    const duplicate = await store.getNativePost(id);
    if (duplicate) return json({ post: duplicate, duplicate: true }, 200);
    throw error;
  }
}

async function mutatePost(
  request: Request,
  env: FeedEnv,
  ctx: ExecutionContext,
  store: FeedStore,
  pathname: string,
): Promise<Response> {
  const id = pathname.slice('/api/feed/'.length);
  if (!id || id.includes('/')) return apiError(404, 'not_found', 'Feed record not found');
  const session = await requireMainSession(request, env);
  if (session instanceof Response) return session;
  if (request.method === 'DELETE') {
    const deleted = await store.deleteNativePost(id);
    if (!deleted) return apiError(404, 'not_found', 'Native post not found; system footprints cannot be deleted');
    refreshAfterMutation(env, ctx, 'feed post deleted');
    return new Response(null, { status: 204 });
  }
  if (request.method !== 'PATCH') return apiError(405, 'method_not_allowed', 'Method is not allowed');
  const body = await readJson<{ kind?: string; visibility?: Visibility }>(request, 4_096);
  if (body instanceof Response) return body;
  if ((body.visibility !== 'public' && body.visibility !== 'private') || !body.kind) {
    return apiError(400, 'invalid_request', 'kind and visibility are required');
  }
  const updated = body.kind === 'native_post'
    ? await store.updateNativeVisibility(id, body.visibility, new Date().toISOString())
    : body.kind === 'system_footprint'
      ? await store.updateFootprintVisibility(id, body.visibility)
      : false;
  if (!updated) return apiError(404, 'not_found', 'Feed record not found');
  refreshAfterMutation(env, ctx, 'feed visibility changed');
  return json({ id, kind: body.kind, visibility: body.visibility });
}

async function previewClip(request: Request, env: FeedEnv): Promise<Response> {
  const session = await requireMainSession(request, env);
  if (session instanceof Response) return session;
  const previewRate = await limitPreview(env, session.username ?? 'unknown');
  if (!previewRate) return apiError(429, 'rate_limited', 'Too many preview requests; try again later');
  const input = await readJson<{ link_url?: string }>(request, 4_096);
  if (input instanceof Response) return input;
  const url = safeExternalUrl(input.link_url);
  if (!url) return apiError(400, 'invalid_url', 'link_url must be a public http(s) URL');
  const allowedHosts = new Set((env.CLIP_PREVIEW_ALLOWED_HOSTS ?? '').split(',').map((host) => host.trim().toLowerCase()).filter(Boolean));
  if (!allowedHosts.has(url.hostname.toLowerCase())) {
    return apiError(422, 'preview_unavailable', 'The link host is not available for previews');
  }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5_000);
    let response: Response;
    try {
      response = await fetch(url, {
        headers: { Accept: 'text/html,application/xhtml+xml' },
        redirect: 'manual',
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
    const length = Number(response.headers.get('content-length') ?? '0');
    if (!response.ok || !response.headers.get('content-type')?.toLowerCase().includes('text/html') || (Number.isFinite(length) && length > 524_288)) {
      return apiError(422, 'preview_unavailable', 'The link did not return an HTML preview');
    }
    const html = await readLimitedText(response, 524_288);
    return json({
      link_url: url.toString(),
      link_title: metaContent(html, 'og:title') ?? titleContent(html),
      link_summary: metaContent(html, 'og:description') ?? metaContent(html, 'description'),
      link_image: metaContent(html, 'og:image'),
    });
  } catch {
    return apiError(422, 'preview_unavailable', 'The link preview could not be fetched');
  }
}

async function ingestFootprint(request: Request, env: FeedEnv, ctx: ExecutionContext): Promise<Response> {
  const secret = env.FOOTPRINT_INGEST_TOKEN;
  const authorization = request.headers.get('Authorization');
  if (!secret || !(await timingSafeEqualText(authorization, `Bearer ${secret}`))) {
    return apiError(secret ? 401 : 503, secret ? 'unauthorized' : 'not_configured', 'Footprint ingestion is not available');
  }
  const value = await readJson<Record<string, unknown>>(request, 40 * 1_024);
  if (value instanceof Response) return value;
  const candidate = parseFootprintCandidate(value);
  if (!candidate) return apiError(400, 'invalid_footprint', 'Footprint candidate is invalid');
  if (candidate.event_type === 'learn_section_completed') {
    return apiError(410, 'legacy_event_retired', 'learn_section_completed is read-only legacy history');
  }
  const result = await recordPublicFootprint(env.DB, candidate);
  if (result.created) refreshAfterMutation(env, ctx, 'public footprint recorded');
  return json(result, result.created ? 201 : 200);
}

async function handleMedia(request: Request, env: FeedEnv, pathname: string): Promise<Response> {
  const rawKey = pathname.slice('/api/feed/media/'.length);
  let key: string;
  try {
    key = decodeURIComponent(rawKey);
  } catch {
    return apiError(404, 'not_found', 'Media object not found');
  }
  if (!MEDIA_KEY_PATTERN.test(key)) return apiError(404, 'not_found', 'Media object not found');
  if (request.method === 'GET') {
    const object = await env.MEDIA_BUCKET.get(key);
    if (!object) return apiError(404, 'not_found', 'Media object not found');
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('ETag', object.httpEtag);
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('Content-Disposition', 'inline');
    return new Response(object.body, { headers });
  }
  if (request.method === 'DELETE') {
    const session = await requireMainSession(request, env);
    if (session instanceof Response) return session;
    const store = new FeedStore(env.DB);
    if (await store.isMediaReferenced(key)) {
      return apiError(409, 'media_in_use', 'Media is referenced by a published post');
    }
    await env.MEDIA_BUCKET.delete(key);
    return new Response(null, { status: 204 });
  }
  return apiError(405, 'method_not_allowed', 'Method is not allowed');
}

async function validatePost(input: FeedPostInput, env: FeedEnv): Promise<string | null> {
  if (!input || (input.type !== 'note' && input.type !== 'clip')) return 'type must be note or clip';
  if (input.content !== undefined && input.content !== null && typeof input.content !== 'string') return 'content must be text';
  if (input.content && input.content.length > LIMITS.content) return `content must not exceed ${LIMITS.content} characters`;
  if (input.link_url && input.link_url.length > LIMITS.linkUrl) return `link_url must not exceed ${LIMITS.linkUrl} characters`;
  if (input.link_title && input.link_title.length > LIMITS.linkTitle) return `link_title must not exceed ${LIMITS.linkTitle} characters`;
  if (input.link_summary && input.link_summary.length > LIMITS.linkSummary) return `link_summary must not exceed ${LIMITS.linkSummary} characters`;
  if (input.link_image && input.link_image.length > LIMITS.linkImage) return `link_image must not exceed ${LIMITS.linkImage} characters`;
  const mediaKeys = input.media_keys ?? [];
  if (!Array.isArray(mediaKeys) || mediaKeys.length > MAX_MEDIA_KEYS || mediaKeys.some((key) => typeof key !== 'string' || !MEDIA_KEY_PATTERN.test(key))) {
    return 'media_keys are invalid';
  }
  const videoKeys = mediaKeys.filter((key) => /\.(mp4|webm|mov)$/.test(key));
  if (videoKeys.length > 1 || (videoKeys.length === 1 && mediaKeys.length > 1)) {
    return 'media must be up to 6 images or one video';
  }
  if (mediaKeys.length && (await Promise.all(mediaKeys.map((key) => env.MEDIA_BUCKET.head(key)))).some((object) => object === null)) {
    return 'one or more media objects do not exist';
  }
  if (input.type === 'note' && !(input.content?.trim() || mediaKeys.length)) return 'note requires text or media';
  const link = input.link_url ? safeExternalUrl(input.link_url) : null;
  if (input.type === 'clip' && !link) return 'clip requires a valid link_url';
  if (input.type === 'clip' && !input.link_title?.trim()) return 'clip requires link_title';
  if (input.link_image && !safeExternalUrl(input.link_image)) return 'link_image must be a valid URL';
  return null;
}

function normalizePost(input: FeedPostInput): FeedPostInput {
  const trim = (value: string | null | undefined): string | null => {
    if (typeof value !== 'string') return null;
    return value.trim() || null;
  };
  return {
    type: input.type,
    content: trim(input.content),
    media_keys: input.media_keys?.map((key) => key.trim()).filter(Boolean),
    link_url: trim(input.link_url),
    link_title: trim(input.link_title),
    link_summary: trim(input.link_summary),
    link_image: trim(input.link_image),
  };
}

function parseAdminDate(value: string | null, exclusiveEnd: boolean): string | undefined | null {
  if (value === null || value === '') return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  if (exclusiveEnd) date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString();
}

async function limitPreview(env: FeedEnv, username: string): Promise<boolean> {
  const key = `ratelimit:preview:${username}`;
  const current = Number(await env.AUTH_KV.get(key) ?? '0');
  if (!Number.isFinite(current) || current >= 10) return false;
  await env.AUTH_KV.put(key, String(current + 1), { expirationTtl: 60 });
  return true;
}

async function readLimitedText(response: Response, maximumBytes: number): Promise<string> {
  if (!response.body) return '';

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let output = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maximumBytes) throw new RangeError('preview_too_large');
      output += decoder.decode(value, { stream: true });
    }
    output += decoder.decode();
    return output;
  } finally {
    reader.releaseLock();
  }
}

function safeExternalUrl(value: unknown): URL | null {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    if (url.username || url.password) return null;
    if (isPrivateHost(host)) return null;
    return url;
  } catch {
    return null;
  }
}

function isPrivateHost(host: string): boolean {
  const normalized = host.replace(/^\[|\]$/g, '');
  if (normalized === 'localhost' || normalized.endsWith('.localhost') || normalized === '::' || normalized === '::1' || normalized === '0.0.0.0') return true;
  if (/^(?:fc|fd)[0-9a-f]{2}:/i.test(normalized) || /^fe[89ab][0-9a-f]:/i.test(normalized) || normalized.startsWith('::ffff:')) return true;
  const mappedIpv4 = normalized.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i)?.[1];
  const octets = (mappedIpv4 ?? normalized).split('.').map((part) => Number(part));
  if (octets.length !== 4 || octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [first, second] = octets;
  return first === 10
    || first === 127
    || first === 0
    || (first === 169 && second === 254)
    || (first === 172 && second >= 16 && second <= 31)
    || (first === 192 && second === 168);
}

function metaContent(html: string, name: string): string | null {
  const expression = new RegExp(`<meta[^>]+(?:property|name)=["']${name.replace(':', '\\:')}["'][^>]+content=["']([^"']+)["']`, 'i');
  const reversed = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${name.replace(':', '\\:')}["']`, 'i');
  return html.match(expression)?.[1]?.trim() ?? html.match(reversed)?.[1]?.trim() ?? null;
}

function titleContent(html: string): string | null {
  return html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ?? null;
}

async function idForIdempotencyKey(username: string | null, key: string): Promise<string> {
  const material = new TextEncoder().encode(`${username ?? 'unknown'}:${key}`);
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', material));
  const hex = Array.from(digest.slice(0, 16), (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20)}`;
}

function refreshAfterMutation(env: FeedEnv, ctx: ExecutionContext, operation: string): void {
  ctx.waitUntil(refreshActivitySignals(env).catch((error: unknown) => {
    logWorkerError('activity_signal_projection_refresh_after_mutation_failed', { operation }, error);
  }));
}
