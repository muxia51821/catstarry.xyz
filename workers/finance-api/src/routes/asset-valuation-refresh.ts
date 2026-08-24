import { apiError, json } from '../lib/http';
import { requireFinanceRole, type FinanceEnv } from './auth';

type RefreshRun = {
  business_date: string | null;
  status: 'succeeded' | 'failed' | 'skipped' | 'review_required';
  ticker_count: number;
  price_rows_written: number;
  valuation_rows_written: number;
  missing_tickers_json: string | null;
  finished_at: string;
  error_summary: string | null;
};

export async function handleAssetValuationRefreshStatus(request: Request, env: FinanceEnv): Promise<Response> {
  if (request.method !== 'GET') return apiError(405, 'method_not_allowed', 'Method is not allowed');
  const session = await requireFinanceRole(request, env);
  if (session instanceof Response) return session;
  const run = await env.DB.prepare(`SELECT business_date, status, ticker_count, price_rows_written,
    valuation_rows_written, missing_tickers_json, finished_at, error_summary
    FROM finance_asset_valuation_refresh_runs ORDER BY id DESC LIMIT 1`).first<RefreshRun>();
  if (!run) return json({ status: 'unavailable', latest: null });
  let missingTickers: string[] = [];
  try {
    const parsed = JSON.parse(run.missing_tickers_json ?? '[]');
    if (Array.isArray(parsed)) missingTickers = parsed.filter((item) => typeof item === 'string').slice(0, 20);
  } catch { /* Retained audit input is optional detail. */ }
  return json({
    status: run.status,
    latest: {
      business_date: run.business_date,
      ticker_count: run.ticker_count,
      price_rows_written: run.price_rows_written,
      valuation_rows_written: run.valuation_rows_written,
      missing_tickers: missingTickers,
      finished_at: run.finished_at,
      error_summary: run.error_summary,
    },
  });
}
