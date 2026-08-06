import {
  handleCorsPreflight,
  rejectUntrustedStateChange,
  withCors,
} from '../../../shared/cors';
import { apiError } from './lib/http';
import { handleFinanceAuth, type FinanceEnv } from './routes/auth';
import { handleDashboard } from './routes/dashboard';
import { handleRecords } from './routes/records';
import { handleStewardship } from './routes/stewardship';
import { handleTrades } from './routes/trades';
import { refreshMarketData } from './tasks/refresh-market-data';
import { logWorkerError, logWorkerWarning } from '../../../shared/worker-log';

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
      else if (pathname === '/api/trades' || /^\/api\/trades\/\d+$/.test(pathname)) response = await handleTrades(request, env);
      else if (pathname.startsWith('/api/monthly') || pathname === '/api/plan' || pathname.startsWith('/api/cash-flows') || pathname.startsWith('/api/assets/')) {
        response = await handleRecords(request, env, pathname);
      }
      else if (pathname === '/api/risk-rules' || pathname.startsWith('/api/memos') || pathname.startsWith('/api/rebalances') || pathname.startsWith('/api/workbook-review') || /^\/api\/circuit\/\d+\/confirm-resolve$/.test(pathname)) {
        response = await handleStewardship(request, env, pathname);
      }
      else if (pathname.startsWith('/api/')) response = await handleDashboard(request, env, pathname);
      else response = apiError(404, 'not_found', 'Route not found');
      return withCors(response, request, cors);
    } catch (error) {
      logWorkerError('finance_request_failed', { pathname, method: request.method }, error);
      return withCors(apiError(500, 'internal_error', 'The request could not be completed'), request, cors);
    }
  },

  async scheduled(controller, env, ctx): Promise<void> {
    if (!['*/15 * * * *', '30 7 * * 1-5'].includes(controller.cron)) return;
    ctx.waitUntil(refreshMarketData(env).then((result) => {
      const missing = result.missing;
      if (missing && (missing.indexes.length > 0 || missing.holdings.length > 0)) {
        logWorkerWarning('finance_market_refresh_partial', {
          missing_indexes: missing.indexes,
          missing_holdings: missing.holdings,
        });
      }
    }).catch((error: unknown) => {
      logWorkerError('finance_market_refresh_failed_last_valid_snapshot_retained', {}, error);
    }));
  },
} satisfies ExportedHandler<FinanceEnv>;
