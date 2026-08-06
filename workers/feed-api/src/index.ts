import {
  handleCorsPreflight,
  rejectUntrustedStateChange,
  withCors,
} from '../../../shared/cors';
import { logWorkerError } from '../../../shared/worker-log';
import { apiError } from './lib/http';
import { refreshActivitySignals } from './modules/activity-signals';
import { handleAuth } from './routes/auth';
import { handleFeed } from './routes/feed';
import { handleUpload } from './routes/upload';
import { handleViews } from './routes/views';
import { handleLearn } from './routes/learn';
import { handleBlog } from './routes/blog';
import { handleActivitySignals } from './routes/activity-signals';
import { cleanUnreferencedMedia } from './tasks/clean-media';
import { cleanExpiredViewVisitors } from './tasks/clean-view-visitors';

type FeedRuntimeEnv = Env & {
  LOCAL_PREVIEW_AUTH?: string;
  LOCAL_PREVIEW_AUTH_PASSWORD_HASH?: string;
  LOCAL_PREVIEW_AUTH_USERNAME?: string;
  SITE_ORIGIN?: string;
};

async function ensureLocalPreviewUser(env: FeedRuntimeEnv): Promise<void> {
  if (env.LOCAL_PREVIEW_AUTH !== '1') return;
  const username = env.LOCAL_PREVIEW_AUTH_USERNAME?.trim();
  const passwordHash = env.LOCAL_PREVIEW_AUTH_PASSWORD_HASH;
  if (!username || !/^[A-Za-z0-9._-]{1,64}$/.test(username) || !passwordHash) {
    throw new Error('LOCAL_PREVIEW_AUTH configuration is invalid');
  }
  const key = `user:${username}`;
  if (!(await env.AUTH_KV.get(key))) {
    await env.AUTH_KV.put(key, JSON.stringify({ password_hash: passwordHash, role: 'admin' }));
  }
}

function corsFor(env: FeedRuntimeEnv) {
  const stagingOrigin = env.SITE_ORIGIN?.replace(/\/$/, '');
  return {
    allowedOrigins: stagingOrigin
      ? [stagingOrigin]
      : ['https://catstarry.xyz', 'https://catstarry-xyz.pages.dev'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
  };
}

export default {
  async fetch(request, env: FeedRuntimeEnv, ctx): Promise<Response> {
    const pathname = new URL(request.url).pathname;
    const cors = corsFor(env);
    const preflight = handleCorsPreflight(request, cors);
    if (preflight) return preflight;

    const isProtectedProducer = request.method === 'POST' && (
      pathname === '/api/feed/internal/footprints'
      || pathname === '/api/learn/internal/publications'
      || pathname === '/api/blog/internal/publications'
    );
    const originRejection = isProtectedProducer ? null : rejectUntrustedStateChange(request, cors);
    if (originRejection) return originRejection;

    try {
      await ensureLocalPreviewUser(env);
      let response: Response;
      if (pathname === '/activity-signals.json') response = await handleActivitySignals(request, env);
      else if (pathname.startsWith('/api/auth/')) response = await handleAuth(request, env, pathname);
      else if (pathname === '/api/views') response = await handleViews(request, env);
      else if (pathname.startsWith('/api/blog/')) response = await handleBlog(request, env, ctx, pathname);
      else if (pathname.startsWith('/api/learn/')) response = await handleLearn(request, env, ctx, pathname);
      else if (pathname === '/api/feed/upload') response = await handleUpload(request, env);
      else if (pathname === '/api/feed' || pathname.startsWith('/api/feed/')) {
        response = await handleFeed(request, env, ctx, pathname);
      } else response = apiError(404, 'not_found', 'Route not found');
      return withCors(response, request, cors);
    } catch (error) {
      logWorkerError('feed_request_failed', { pathname, method: request.method }, error);
      return withCors(apiError(500, 'internal_error', 'The request could not be completed'), request, cors);
    }
  },

  async scheduled(controller, env, ctx): Promise<void> {
    if (controller.cron !== '0 * * * *') return;

    ctx.waitUntil(Promise.all([
      refreshActivitySignals(env).catch((error: unknown) => {
        logWorkerError('activity_signal_projection_refresh_failed', {}, error);
      }),
      cleanUnreferencedMedia(env).catch((error: unknown) => {
        logWorkerError('temporary_feed_media_cleanup_failed', {}, error);
      }),
      cleanExpiredViewVisitors(env.DB).catch((error: unknown) => {
        logWorkerError('expired_blog_view_visitor_cleanup_failed', {}, error);
      }),
    ]));
  },
} satisfies ExportedHandler<Env>;
