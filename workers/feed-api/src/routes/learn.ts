import { apiError, json, readJson } from '../lib/http';
import { requireMainSession } from './auth';
import { timingSafeEqualText } from '../../../../shared/security';

type LearnEnv = Env & {
  FOOTPRINT_INGEST_TOKEN?: string;
  LEARN_PUBLISH_WEBHOOK_URL?: string;
  LEARN_PUBLISH_WEBHOOK_TOKEN?: string;
};

export async function handleLearn(
  request: Request,
  env: LearnEnv,
  _ctx: ExecutionContext,
  pathname: string,
): Promise<Response> {
  if (pathname === '/api/learn/internal/publications' && request.method === 'POST') {
    return syncPublishedManifest(request, env);
  }
  const session = await requireMainSession(request, env);
  if (session instanceof Response) return session;
  if (pathname === '/api/learn/publish' && request.method === 'POST') return requestPublication(request, env, session.username);
  if (pathname === '/api/learn/complete' && request.method === 'POST') {
    return apiError(410, 'legacy_writer_retired', 'Learn section completion no longer creates Feed activity');
  }
  return apiError(404, 'not_found', 'Learn route not found');
}

async function requestPublication(request: Request, env: LearnEnv, username: string | null): Promise<Response> {
  const body = await readJson<{ slug?: unknown; action?: unknown }>(request, 4_096);
  if (body instanceof Response) return body;
  const slug = typeof body.slug === 'string' ? body.slug.trim() : '';
  const action = body.action;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || (action !== 'publish' && action !== 'retract')) {
    return apiError(400, 'invalid_publication', 'slug and publication action are invalid');
  }
  if (!env.LEARN_PUBLISH_WEBHOOK_URL || !env.LEARN_PUBLISH_WEBHOOK_TOKEN) {
    return apiError(503, 'not_configured', 'Learn publication webhook is not configured');
  }
  let url: URL;
  try { url = new URL(env.LEARN_PUBLISH_WEBHOOK_URL); }
  catch { return apiError(503, 'not_configured', 'Learn publication webhook is invalid'); }
  if (url.protocol !== 'https:') return apiError(503, 'not_configured', 'Learn publication webhook must use HTTPS');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.LEARN_PUBLISH_WEBHOOK_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, action, requested_by: username }),
      redirect: 'error',
      signal: controller.signal,
    });
    if (!response.ok) return apiError(502, 'publication_failed', 'Learn publication adapter rejected the request');
    return json({ accepted: true, slug, action }, 202);
  } catch {
    return apiError(502, 'publication_failed', 'Learn publication adapter could not be reached');
  } finally { clearTimeout(timeout); }
}

async function syncPublishedManifest(request: Request, env: LearnEnv): Promise<Response> {
  const authorization = request.headers.get('Authorization');
  if (!env.FOOTPRINT_INGEST_TOKEN || !(await timingSafeEqualText(authorization, `Bearer ${env.FOOTPRINT_INGEST_TOKEN}`))) {
    return apiError(env.FOOTPRINT_INGEST_TOKEN ? 401 : 503, 'unauthorized', 'Publication manifest sync is not available');
  }
  const body = await readJson<{ slugs?: unknown }>(request, 64 * 1_024);
  if (body instanceof Response) return body;
  if (!Array.isArray(body.slugs) || body.slugs.length > 500) return apiError(400, 'invalid_manifest', 'Published slug manifest is invalid');
  const slugs = [...new Set(body.slugs)];
  if (slugs.some((slug) => typeof slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))) {
    return apiError(400, 'invalid_manifest', 'Published slug manifest is invalid');
  }
  await env.AUTH_KV.put('learn:published-manifest', JSON.stringify(slugs));
  return json({ synced: slugs.length });
}
