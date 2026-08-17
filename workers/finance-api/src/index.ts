import {
  handleCorsPreflight,
  rejectUntrustedStateChange,
  withCors,
} from '../../../shared/cors';
import { apiError } from './lib/http';
import { handleActivity } from './routes/activity';
import { handleFinanceAuth, type FinanceEnv } from './routes/auth';
import { handleDashboard } from './routes/dashboard';
import { handleLegacyImportReviewWrite } from './routes/legacy-import-review';
import { handleChangeLog } from './routes/operations';
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
      else if (pathname === '/api/activity') response = await handleActivity(request, env);
      else if (pathname === '/api/change-log') response = await handleChangeLog(request, env);
      else if (/^\/api\/import-review\/\d+$/.test(pathname) && request.method === 'PATCH') response = await handleLegacyImportReviewWrite(request, env, pathname);
      else if (pathname === '/api/trades' || /^\/api\/trades\/\d+$/.test(pathname)) response = await handleTrades(request, env);
      else if (pathname.startsWith('/api/monthly') || pathname === '/api/plan' || pathname.startsWith('/api/cash-flows') || pathname.startsWith('/api/account-events') || pathname.startsWith('/api/assets/')) {
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
      return withCors(apiError(500, 'internal_error', 'Finance request failed'), request, cors);
    }
  },

  async scheduled(_controller: ScheduledController, env: FinanceEnv): Promise<void> {
    try {
      await refreshMarketData(env);
    } catch (error) {
      logWorkerWarning('finance_scheduled_refresh_failed', {}, error);
    }
  },
};
