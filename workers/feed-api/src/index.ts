import { handleCorsPreflight, withCors } from '../../../shared/cors';
import { refreshActivitySignals } from './modules/activity-signals';

const cors = {
  allowedOrigins: ['https://catstarry.xyz', 'https://catstarry-xyz.pages.dev'],
} as const;

export default {
  async fetch(request): Promise<Response> {
    const preflight = handleCorsPreflight(request, cors);
    if (preflight) return preflight;

    return withCors(new Response('Not found', { status: 404 }), request, cors);
  },

  async scheduled(controller, env, ctx): Promise<void> {
    if (controller.cron !== '0 * * * *') return;

    ctx.waitUntil(
      refreshActivitySignals(env).catch((error: unknown) => {
        console.error('Activity Signal projection refresh failed', error);
        throw error;
      }),
    );
  },
} satisfies ExportedHandler<Env>;
