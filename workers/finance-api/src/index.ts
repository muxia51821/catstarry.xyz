import {
  handleCorsPreflight,
  rejectUntrustedStateChange,
  withCors,
} from '../../../shared/cors';
import { apiError } from './lib/http';
import { handleFinanceAuth, type FinanceEnv } from './routes/auth';
import { handleDashboard } from './routes/dashboard';
import { handleTrades } from './routes/trades';
import { refreshMarketData } from './tasks/refresh-market-data';

function corsFor(env: FinanceEnv) {
  const configured = env.FINANCE_SITE_ORIGIN?.replace(/\/$/, '');
  return {
    allowedOrigins: configured ? [configured] : ['https://f.catstarry.xyz'],
    allowedHeaders: ['Content-Type'],
  };
}

export default {
  async fetch(request, env: FinanceEnv): Promise<Response> {
    const cors = corsFor(env);
    const preflight = handleCorsPreflight(request, cors);
    if (preflight) return preflight;
    const originRejection = rejectUntrustedStateChange(request, cors);
    if (originRejection) return originRejection;
    const pathname = new URL(request.url).pathname;

    try {
      let response: Response;
      if (pathname.startsWith('/api/auth/')) response = await handleFinanceAuth(request, env, pathname);
      else if (pathname === '/api/trades') response = await handleTrades(request, env);
      else if (pathname.startsWith('/api/')) response = await handleDashboard(request, env, pathname);
      else response = apiError(404, 'not_found', 'Route not found');
      return withCors(response, request, cors);
    } catch (error) {
      console.error('finance-api request failed', { pathname, method: request.method, error });
      return withCors(apiError(500, 'internal_error', 'The request could not be completed'), request, cors);
    }
  },

  async scheduled(controller, env, ctx): Promise<void> {
    if (!['*/15 * * * *', '30 7 * * 1-5'].includes(controller.cron)) return;
    ctx.waitUntil(refreshMarketData(env).catch((error: unknown) => {
      console.error('Finance market refresh failed; last valid snapshot retained', error);
    }));
  },
} satisfies ExportedHandler<FinanceEnv>;
