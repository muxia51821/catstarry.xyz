import { apiError, json } from '../lib/http';
import { requireFinanceRole, type FinanceEnv } from './auth';

type ValuationRow = {
  valuation_date: string;
  securities_value: number;
  cash_value: number;
  other_assets_value: number;
  total_value: number;
  source: string;
  calculated_at: string;
};

export async function handleAssetHistory(request: Request, env: FinanceEnv): Promise<Response> {
  if (request.method !== 'GET') return apiError(405, 'method_not_allowed', 'Method is not allowed');
  const session = await requireFinanceRole(request, env);
  if (session instanceof Response) return session;

  const view = new URL(request.url).searchParams.get('view') ?? 'month';
  if (view !== 'week' && view !== 'month') return apiError(400, 'invalid_view', 'Asset history view must be week or month');

  const bucket = view === 'month'
    ? "substr(valuation_date, 1, 7)"
    : "strftime('%Y-W%W', valuation_date)";
  const rows = await env.DB.prepare(`WITH ranked AS (
      SELECT valuation_date, securities_value, cash_value, other_assets_value, total_value, source, calculated_at,
        ROW_NUMBER() OVER (PARTITION BY ${bucket} ORDER BY valuation_date DESC) AS rn
      FROM finance_asset_valuations
      WHERE is_complete = 1
    )
    SELECT valuation_date, securities_value, cash_value, other_assets_value, total_value, source, calculated_at
    FROM ranked WHERE rn = 1 ORDER BY valuation_date ASC`).all<ValuationRow>();

  return json({
    view,
    series: rows.results.map((row) => ({
      snapshot_date: row.valuation_date,
      holdings_value: Number(row.securities_value),
      cash_value: Number(row.cash_value),
      other_assets_value: Number(row.other_assets_value),
      total_value: Number(row.total_value),
      source: row.source,
      created_at: row.calculated_at,
    })),
    source_model: 'derived_valuation',
    coverage: {
      note: '历史曲线只读取由金融事实与 raw close 计算出的完整估值；人工/券商 snapshot 仅作为对账证据，不再直接构成历史曲线。',
    },
  });
}
