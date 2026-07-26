import {
  handleCorsPreflight,
  rejectUntrustedStateChange,
  withCors,
} from '../../../shared/cors';
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

type FeedRuntimeEnv = Env & { SITE_ORIGIN?: string };

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
      console.error('feed-api request failed', { pathname, method: request.method, error });
      return withCors(apiError(500, 'internal_error', 'The request could not be completed'), request, cors);
    }
  },

  async scheduled(controller, env, ctx): Promise<void> {
    if (controller.cron !== '0 * * * *') return;

    ctx.waitUntil(Promise.all([
      refreshActivitySignals(env).catch((error: unknown) => {
        console.error('Activity Signal projection refresh failed', error);
      }),
      cleanUnreferencedMedia(env).catch((error: unknown) => {
        console.error('Temporary Feed media cleanup failed', error);
      }),
      cleanExpiredViewVisitors(env.DB).catch((error: unknown) => {
        console.error('Expired Blog view visitor cleanup failed', error);
      }),
    ]));
  },
} satisfies ExportedHandler<Env>;
