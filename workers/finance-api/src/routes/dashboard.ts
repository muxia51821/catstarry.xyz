import {
  calculateExcessSplit,
  calculateModifiedDietz,
  circuitBreakerState,
  peTemperature,
  positionDeviation,
  type CircuitInput,
  type PeTemperatureBoundaries,
} from '../modules/calculations';
import { apiError, json, readJson } from '../lib/http';
import { buildXlsx, type WorkbookCell } from '../modules/xlsx';
import { financePeriodState } from '../modules/periods';
import { requireFinanceRole, type FinanceEnv } from './auth';

interface HoldingRow {
  ticker: string;
  ticker_name: string | null;
  quantity: number;
  avg_cost: number;
  position_category: string;
  price: number | null;
  fetched_at: string | null;
}

interface PositionLimitRow {
  position_category: string;
  target_ratio: number;
  lower_ratio: number;
  upper_ratio: number;
}

const CATEGORY_ALIASES: Record<string, string> = {
  '主动操作仓（A股）': '主动操作仓', '主动仓': '主动操作仓',
  'A股宽基指数底仓': 'A股宽基指数',
  '货币基金/现金': '机动仓', '机动仓（货币ETF）': '机动仓',
  '美股ETF（A股跨境ETF）': '美股 ETF', '美股宽基指数底仓': '美股 ETF',
  'A股总敞口（主动+宽基）': 'A股总敞口',
};
const POSITION_ORDER = ['主动操作仓', 'A股宽基指数', '美股 ETF', '黄金ETF', '机动仓', '其他', 'A股总敞口'];
const PE_INDEXES = [
  { symbol: 'CSI300_PE', display_name: '沪深 300 PE-TTM', aliases: ['CSI300_PE', 'SSE300_PE'], temperature: true },
  { symbol: 'CSI500_PE', display_name: '中证 500 PE-TTM', aliases: ['CSI500_PE', 'SSE500_PE'] },
  { symbol: 'CSI1000_PE', display_name: '中证 1000 PE-TTM', aliases: ['CSI1000_PE', 'SSE1000_PE'] },
  { symbol: 'STAR50_PE', display_name: '科创 50 PE-TTM', aliases: ['STAR50_PE', 'SSESTAR50_PE'] },
  { symbol: 'NASDAQ100_PE', display_name: '纳斯达克 100 PE', aliases: ['NASDAQ100_PE', 'NDX_PE'] },
] as const;
function normalizeCategory(category: string) { return CATEGORY_ALIASES[category] ?? category; }

export async function handleDashboard(
  request: Request,
  env: FinanceEnv,
  pathname: string,
): Promise<Response> {
  if (pathname === '/api/holdings' && request.method === 'GET') return holdings(request, env);
  if (pathname === '/api/market' && request.method === 'GET') return market(request, env);
  if (pathname === '/api/pe' && request.method === 'GET') return pe(request, env);
  if (pathname === '/api/risk/signals' && request.method === 'GET') return riskSignals(request, env);
  if (pathname === '/api/circuit' && request.method === 'GET') return circuit(request, env);
  if (pathname === '/api/circuit/evaluate' && request.method === 'POST') return evaluateCircuit(request, env);
  if (pathname === '/api/circuit/objection' && request.method === 'POST') return recordObjection(request, env);
  if (pathname === '/api/review/calculate' && request.method === 'POST') return calculateReview(request, env);
  if (pathname === '/api/review/confirm' && request.method === 'POST') return confirmReview(request, env);
  if (pathname === '/api/review' && request.method === 'GET') return listReviews(request, env);
  if (pathname === '/api/confirmations/monthly' && request.method === 'POST') return confirmMonth(request, env);
  if (pathname === '/api/notifications' && request.method === 'GET') return notifications(request, env);
  if (pathname === '/api/access-log' && request.method === 'GET') return accessLog(request, env);
  if (pathname === '/api/import-review' && request.method === 'GET') return listImportReview(request, env);
  if (/^\/api\/import-review\/\d+$/.test(pathname) && request.method === 'PATCH') {
    const id = Number(pathname.split('/')[3]);
    return Number.isSafeInteger(id) && id > 0
      ? resolveImportReview(request, env, id)
      : apiError(400, 'invalid_id', 'Import review id is invalid');
  }
  if (pathname === '/api/archive' && request.method === 'GET') return exportArchive(request, env);
  return apiError(404, 'not_found', 'Finance route not found');
}

async function holdings(request: Request, env: FinanceEnv): Promise<Response> {
  const session = await requireFinanceRole(request, env);
  if (session instanceof Response) return session;
  const rows = await env.DB.prepare(`WITH latest AS (
      SELECT ticker, MAX(snapshot_date || ':' || printf('%020d', id)) AS marker
      FROM holdings_snapshots GROUP BY ticker
    )
    SELECT h.ticker,
      (SELECT t.ticker_name FROM trades t
        WHERE t.ticker = h.ticker AND t.ticker_name IS NOT NULL AND t.ticker_name <> ''
        ORDER BY t.trade_date DESC, t.id DESC LIMIT 1) AS ticker_name,
      h.quantity, h.avg_cost, h.position_category,
      (SELECT price FROM market_data m WHERE m.ticker = h.ticker ORDER BY fetched_at DESC, id DESC LIMIT 1) AS price,
      (SELECT fetched_at FROM market_data m WHERE m.ticker = h.ticker ORDER BY fetched_at DESC, id DESC LIMIT 1) AS fetched_at
    FROM holdings_snapshots h
    JOIN latest l ON l.ticker = h.ticker AND l.marker = h.snapshot_date || ':' || printf('%020d', h.id)
    WHERE h.quantity > 0 ORDER BY h.ticker`).all<HoldingRow>();
  const limits = await env.DB.prepare('SELECT * FROM position_limits ORDER BY position_category').all<PositionLimitRow>();
  const values = rows.results.map((row) => {
    const price = row.price === null ? null : Number(row.price);
    const marketValue = price === null ? null : Number(row.quantity) * price;
    const costValue = Number(row.quantity) * Number(row.avg_cost);
    return {
      ...row,
      quantity: Number(row.quantity),
      avg_cost: Number(row.avg_cost),
      price,
      stale: !row.fetched_at || Date.now() - Date.parse(row.fetched_at) > 30 * 60 * 1_000,
      market_value: marketValue,
      pnl: marketValue === null ? null : marketValue - costValue,
      pnl_ratio: marketValue === null || costValue === 0 ? null : (marketValue - costValue) / costValue,
    };
  });
  const marketDataComplete = values.every((row) => row.market_value !== null);
  const pricedTotal = values.reduce((sum, row) => sum + (row.market_value ?? 0), 0);
  const total = marketDataComplete ? pricedTotal : null;
  const byCategory = new Map<string, number>();
  for (const row of values) {
    const category = normalizeCategory(row.position_category);
    byCategory.set(category, (byCategory.get(category) ?? 0) + (row.market_value ?? 0));
  }
  const configured = new Map(limits.results.map((limit) => [normalizeCategory(limit.position_category), limit]));
  const positions = [...new Set([...byCategory.keys(), ...configured.keys(), '其他'])]
    .sort((left, right) => POSITION_ORDER.indexOf(left) - POSITION_ORDER.indexOf(right)).map((category) => {
    const limit = configured.get(category);
    const categoryValue = category === 'A股总敞口'
      ? (byCategory.get('主动操作仓') ?? 0) + (byCategory.get('A股宽基指数') ?? 0)
      : byCategory.get(category) ?? 0;
    if (total === null || total <= 0) {
      return {
        position_category: category,
        current_ratio: null,
        ...(limit ? {
          target_ratio: Number(limit.target_ratio),
          lower_ratio: Number(limit.lower_ratio),
          upper_ratio: Number(limit.upper_ratio),
          status: 'unavailable',
          deviation: null,
          suggestedChange: null,
          target_value_change: null,
        } : { status: 'unconfigured', deviation: null, suggestedChange: null, target_value_change: null }),
      };
    }
    const current = categoryValue / total;
    const deviation = limit ? positionDeviation({
      current,
      target: Number(limit.target_ratio),
      lower: Number(limit.lower_ratio),
      upper: Number(limit.upper_ratio),
    }) : null;
    return {
      position_category: category,
      current_ratio: current,
      ...(limit ? {
        target_ratio: Number(limit.target_ratio),
        lower_ratio: Number(limit.lower_ratio),
        upper_ratio: Number(limit.upper_ratio),
        ...deviation,
        target_value_change: total * (deviation?.suggestedChange ?? 0),
      } : { status: 'unconfigured', deviation: null, suggestedChange: null, target_value_change: null }),
    };
  });
  const marketOverview = await env.DB.prepare(`SELECT display_name, current_value, previous_close, change_value, change_percent, market_status, market_time, trading_date, fetched_at
    FROM finance_market_indexes WHERE symbol = 'SSE_COMPOSITE' ORDER BY fetched_at DESC, id DESC LIMIT 1`).first<Record<string, unknown>>();
  return json({ holdings: values, total_market_value: total, priced_market_value: pricedTotal, market_data_complete: marketDataComplete, positions,
    market_overview: marketOverview ? { label: marketOverview.display_name, current_value: marketOverview.current_value, previous_close: marketOverview.previous_close, change: marketOverview.change_value, change_pct: marketOverview.change_percent, market_status: marketOverview.market_status, market_time: marketOverview.market_time, trading_date: marketOverview.trading_date, fetched_at: marketOverview.fetched_at } : null });
}

async function market(request: Request, env: FinanceEnv): Promise<Response> {
  const session = await requireFinanceRole(request, env);
  if (session instanceof Response) return session;
  const tickers = (new URL(request.url).searchParams.get('tickers') ?? '')
    .split(',').map((ticker) => ticker.trim().toUpperCase()).filter(Boolean);
  if (tickers.length > 100 || tickers.some((ticker) => !/^[A-Z0-9._-]{2,32}$/.test(ticker))) {
    return apiError(400, 'invalid_tickers', 'tickers must contain at most 100 valid symbols');
  }
  const filters = [tickers.length ? `ticker IN (${tickers.map(() => '?').join(', ')})` : null,
    `NOT EXISTS (
      SELECT 1 FROM market_data newer WHERE newer.ticker = m.ticker
      AND (newer.fetched_at > m.fetched_at OR (newer.fetched_at = m.fetched_at AND newer.id > m.id))
    )`].filter(Boolean);
  const result = await env.DB.prepare(`SELECT ticker, price, pe_ttm, fetched_at FROM market_data m
    WHERE ${filters.join(' AND ')} ORDER BY ticker`)
    .bind(...tickers).all();
  return json({ market: result.results });
}

async function pe(request: Request, env: FinanceEnv): Promise<Response> {
  const session = await requireFinanceRole(request, env);
  if (session instanceof Response) return session;
  const [rows, temperatureRule] = await Promise.all([
    Promise.all(PE_INDEXES.map(async (index) => ({ index, row: await env.DB.prepare(`SELECT ticker, pe_ttm, fetched_at FROM market_data
      WHERE ticker IN (${index.aliases.map(() => '?').join(', ')}) ORDER BY fetched_at DESC, id DESC LIMIT 1`)
      .bind(...index.aliases).first<{ ticker: string; pe_ttm: number | null; fetched_at: string }>() }))),
    env.DB.prepare(`SELECT value_json FROM finance_investment_rules WHERE rule_key = 'temperature'`).first<{ value_json: string }>(),
  ]);
  const boundaries = storedTemperatureBoundaries(temperatureRule?.value_json);
  return json({ indexes: rows.map(({ index, row }) => ({
    ticker: index.symbol, display_name: index.display_name, source_ticker: row?.ticker ?? null,
    pe_ttm: row?.pe_ttm === null || row?.pe_ttm === undefined ? null : Number(row.pe_ttm),
    fetched_at: row?.fetched_at ?? null,
    stale: !row?.fetched_at || Date.now() - Date.parse(row.fetched_at) > 36 * 60 * 60 * 1_000,
    temperature: 'temperature' in index && index.temperature && row?.pe_ttm !== null && row?.pe_ttm !== undefined ? peTemperature(Number(row.pe_ttm), boundaries) : null,
  })) });
}

async function riskSignals(request: Request, env: FinanceEnv): Promise<Response> {
  const session = await requireFinanceRole(request, env); if (session instanceof Response) return session;
  const rows = await env.DB.prepare(`WITH latest AS (
      SELECT ticker, MAX(snapshot_date || ':' || printf('%020d', id)) AS marker FROM holdings_snapshots GROUP BY ticker
    ) SELECT h.ticker, h.avg_cost,
      (SELECT t.ticker_name FROM trades t WHERE t.ticker = h.ticker AND t.ticker_name IS NOT NULL AND t.ticker_name <> '' ORDER BY t.trade_date DESC, t.id DESC LIMIT 1) AS ticker_name,
      (SELECT price FROM market_data m WHERE m.ticker = h.ticker ORDER BY fetched_at DESC, id DESC LIMIT 1) AS price,
      (SELECT fetched_at FROM market_data m WHERE m.ticker = h.ticker ORDER BY fetched_at DESC, id DESC LIMIT 1) AS fetched_at
    FROM holdings_snapshots h JOIN latest l ON l.ticker = h.ticker AND l.marker = h.snapshot_date || ':' || printf('%020d', h.id)
    WHERE h.quantity > 0`).all<{ ticker: string; ticker_name: string | null; avg_cost: number; price: number | null; fetched_at: string | null }>();
  const priced = rows.results.map((row) => ({ ...row, loss_ratio: row.price === null || Number(row.avg_cost) <= 0 ? null : (Number(row.price) - Number(row.avg_cost)) / Number(row.avg_cost) }));
  const usable = priced.filter((row) => row.loss_ratio !== null && row.fetched_at && Date.now() - Date.parse(row.fetched_at) <= 30 * 60 * 1_000);
  const worst = usable.sort((left, right) => Number(left.loss_ratio) - Number(right.loss_ratio))[0] ?? null;
  const snapshotCount = await env.DB.prepare(`SELECT COUNT(*) AS count FROM finance_asset_snapshots WHERE deleted_at IS NULL AND is_complete = 1`).first<{ count: number }>();
  const signals = [] as { level: 'yellow' | 'stop_loss'; reason: string }[];
  if (worst && Number(worst.loss_ratio) < -0.3) signals.push({ level: 'stop_loss', reason: `${worst.ticker_name || worst.ticker} 单标的亏损超过 30%` });
  if (worst && Number(worst.loss_ratio) < -0.2) signals.push({ level: 'yellow', reason: `${worst.ticker_name || worst.ticker} 单标的亏损超过 20%` });
  return json({
    single_position_loss: worst ? Number(worst.loss_ratio) : null,
    worst_ticker: worst ? { ticker: worst.ticker, ticker_name: worst.ticker_name } : null,
    monthly_drawdown: null, annual_drawdown: null,
    data_complete: false,
    missing_reasons: Number(snapshotCount?.count ?? 0) < 2 ? ['完整资产快照不足，组合回撤数据积累中。'] : ['现金流调整净值序列尚未完成核验。'],
    signals,
  });
}

async function circuit(request: Request, env: FinanceEnv): Promise<Response> {
  const session = await requireFinanceRole(request, env);
  if (session instanceof Response) return session;
  const active = await env.DB.prepare('SELECT * FROM circuit_breaker_log WHERE resolved_at IS NULL ORDER BY triggered_at DESC, id DESC LIMIT 1').first();
  return json({ active });
}

async function evaluateCircuit(request: Request, env: FinanceEnv): Promise<Response> {
  const session = await requireFinanceRole(request, env, ['admin']);
  if (session instanceof Response) return session;
  const body = await readJson<CircuitInput>(request);
  if (body instanceof Response) return body;
  let state;
  try { state = circuitBreakerState(body); } catch { return apiError(400, 'invalid_metrics', 'Circuit metrics are invalid'); }
  if (state.level === 'none') return json({ created: false, state });
  const reason = JSON.stringify({ metrics: body, action: state.action });
  return recordCircuit(env.DB, state.level, state.action, reason);
}

async function recordObjection(request: Request, env: FinanceEnv): Promise<Response> {
  const session = await requireFinanceRole(request, env);
  if (session instanceof Response) return session;
  const body = await readJson<{ reason?: unknown }>(request, 4_096);
  if (body instanceof Response) return body;
  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
  if (!reason || reason.length > 2_000) return apiError(400, 'invalid_reason', 'A bounded objection reason is required');
  return recordCircuit(env.DB, 'black', 'pause_all', JSON.stringify({ objection_by: session.username, reason }));
}

async function calculateReview(request: Request, env: FinanceEnv): Promise<Response> {
  const session = await requireFinanceRole(request, env, ['admin']);
  if (session instanceof Response) return session;
  const body = await readJson<{
    year?: unknown;
    summary?: unknown;
  }>(request);
  if (body instanceof Response) return body;
  const year = Number(body.year);
  const summary = typeof body.summary === 'string' ? body.summary.trim() : '';
  if (!Number.isInteger(year) || year < 2000 || year > 2200 || summary.length > 20_000) {
    return apiError(400, 'invalid_review', 'Review input is invalid');
  }
  try {
    const derived = await deriveAnnualReview(env, year);
    if ('missing' in derived) return apiError(409, 'missing_annual_data', derived.missing);
    const { dietz, currentValue, historicalMaximumValue, plan } = derived;
    const contributionRule = await env.DB.prepare(`SELECT value_json FROM finance_investment_rules WHERE rule_key = 'contributions'`).first<{ value_json: string }>();
    const contribution = parseStoredJson(contributionRule?.value_json) as { muxia_bonus_year1?: number; muxia_bonus_later?: number } | null;
    const managerBonusCap = plan && contribution ? Number(year === Number(plan.start_year) ? contribution.muxia_bonus_year1 : contribution.muxia_bonus_later) : 0;
    const split = calculateExcessSplit({
       currentValue,
       historicalMaximumValue,
      weightedCapital: dietz.weightedCapital,
      portfolioReturn: dietz.returnRate,
      managerBonusCap,
    });
    const calculatedAt = new Date().toISOString();
    const calculation = { method: 'modified_dietz', source: 'monthly_records', dietz, split };
    await env.DB.prepare(`INSERT INTO annual_reviews (year, calculation_json, summary, calculated_at)
      VALUES (?, ?, ?, ?) ON CONFLICT(year) DO UPDATE SET
      calculation_json = excluded.calculation_json, summary = excluded.summary,
      calculated_at = excluded.calculated_at, confirmed_by = NULL, confirmed_at = NULL`)
      .bind(year, JSON.stringify(calculation), summary || null, calculatedAt).run();
    return json({ year, calculation, summary: summary || null, calculated_at: calculatedAt });
  } catch {
    return apiError(400, 'invalid_review', 'Review calculation input is invalid');
  }
}

async function deriveAnnualReview(env: FinanceEnv, year: number): Promise<
  | { missing: string }
  | { dietz: ReturnType<typeof calculateModifiedDietz>; currentValue: number; historicalMaximumValue: number; plan: { start_year: number } }
> {
  const plan = await env.DB.prepare('SELECT start_year, initial_capital FROM plan_params WHERE id = 1').first<{ start_year: number; initial_capital: number }>();
  if (!plan) return { missing: 'The Finance plan baseline is missing' };
  const records = await env.DB.prepare(`SELECT year_month, muxia_invest, cati_invest, end_total FROM monthly_records
    WHERE year_month >= ? AND year_month < ? AND deleted_at IS NULL ORDER BY year_month`).bind(`${year}-01`, `${year + 1}-01`).all<{ year_month: string; muxia_invest: number; cati_invest: number; end_total: number | null }>();
  const ending = records.results.find((row) => row.year_month === `${year}-12` && row.end_total !== null);
  if (!ending) return { missing: `Missing ${year}-12 month-end value` };
  const prior = await env.DB.prepare('SELECT end_total FROM monthly_records WHERE year_month = ? AND deleted_at IS NULL AND end_total IS NOT NULL').bind(`${year - 1}-12`).first<{ end_total: number }>();
  const beginningValue = prior ? Number(prior.end_total) : year === Number(plan.start_year) ? Number(plan.initial_capital) : null;
  if (beginningValue === null || !Number.isFinite(beginningValue)) return { missing: `Missing beginning net value for ${year}` };
  const periodDays = isLeapYear(year) ? 366 : 365;
  const cashFlows = records.results.map((row) => {
    const amount = Number(row.muxia_invest ?? 0) + Number(row.cati_invest ?? 0);
    const month = Number(row.year_month.slice(5, 7));
    return { amount, day: Math.max(0, Math.min(periodDays, Math.floor((Date.UTC(year, month - 1, 20) - Date.UTC(year, 0, 1)) / 86_400_000))) };
  }).filter((flow) => Number.isFinite(flow.amount) && flow.amount !== 0);
  const history = await env.DB.prepare('SELECT calculation_json FROM annual_reviews WHERE year < ? ORDER BY year').bind(year).all<{ calculation_json: string }>();
  const historicalMaximumValue = history.results.reduce((maximum, row) => {
    const calculation = parseStoredJson(row.calculation_json) as { dietz?: { endingValue?: number } } | null;
    return Math.max(maximum, Number(calculation?.dietz?.endingValue) || 0);
  }, beginningValue);
  return { dietz: calculateModifiedDietz({ beginningValue, endingValue: Number(ending.end_total), periodDays, cashFlows }), currentValue: Number(ending.end_total), historicalMaximumValue, plan };
}

function isLeapYear(year: number) { return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0); }

async function confirmReview(request: Request, env: FinanceEnv): Promise<Response> {
  const session = await requireFinanceRole(request, env, ['viewer']);
  if (session instanceof Response) return session;
  const body = await readJson<{ year?: unknown }>(request, 1_024);
  if (body instanceof Response) return body;
  const year = Number(body.year);
  if (!Number.isInteger(year) || year < 2000 || year > 2200) {
    return apiError(400, 'invalid_year', 'year must be between 2000 and 2200');
  }
  const confirmedAt = new Date().toISOString();
  const result = await env.DB.prepare(`UPDATE annual_reviews SET confirmed_by = ?, confirmed_at = ?
    WHERE year = ? AND confirmed_at IS NULL`).bind(session.username, confirmedAt, year).run();
  return (result.meta.changes ?? 0) > 0
    ? json({ year, confirmed_by: session.username, confirmed_at: confirmedAt })
    : apiError(409, 'not_confirmable', 'Review does not exist or was already confirmed');
}

async function listReviews(request: Request, env: FinanceEnv): Promise<Response> {
  const session = await requireFinanceRole(request, env);
  if (session instanceof Response) return session;
  const result = await env.DB.prepare('SELECT * FROM annual_reviews ORDER BY year DESC').all();
  return json({ reviews: result.results.map((row) => ({
    ...row,
    calculation: parseStoredJson(row.calculation_json),
    calculation_json: undefined,
  })) });
}

async function confirmMonth(request: Request, env: FinanceEnv): Promise<Response> {
  const session = await requireFinanceRole(request, env, ['viewer']);
  if (session instanceof Response) return session;
  const body = await readJson<{ period?: unknown }>(request, 1_024);
  if (body instanceof Response) return body;
  const period = typeof body.period === 'string' ? body.period : '';
  if (!/^\d{4}-(?:0[1-9]|1[0-2])$/.test(period)) {
    return apiError(400, 'invalid_period', 'period must be a valid YYYY-MM value');
  }
  if (period !== financePeriodState(new Date()).previousPeriod) {
    return apiError(409, 'period_not_confirmable', 'Only the previous Shanghai calendar month can be confirmed');
  }
  const confirmedAt = new Date().toISOString();
  const result = await env.DB.prepare(`INSERT OR IGNORE INTO monthly_confirmations (period, username, confirmed_at)
    VALUES (?, ?, ?)`).bind(period, session.username, confirmedAt).run();
  return json({ created: (result.meta.changes ?? 0) > 0, period, username: session.username, confirmed_at: confirmedAt });
}

async function notifications(request: Request, env: FinanceEnv): Promise<Response> {
  const session = await requireFinanceRole(request, env);
  if (session instanceof Response) return session;
  const activeCircuit = await env.DB.prepare('SELECT * FROM circuit_breaker_log WHERE resolved_at IS NULL ORDER BY triggered_at DESC, id DESC LIMIT 1').first();
  const now = financePeriodState(new Date());
  const period = now.previousPeriod;
  let monthlyConfirmation: { period: string; confirmed: boolean } | null = null;
  let unconfirmedViewers: string[] = [];
  if (session.role === 'viewer') {
    const confirmed = await env.DB.prepare('SELECT 1 AS found FROM monthly_confirmations WHERE period = ? AND username = ?')
      .bind(period, session.username).first<{ found: number }>();
    monthlyConfirmation = { period, confirmed: Boolean(confirmed) };
  }
  if (session.role === 'admin' && now.adminReminderDue) {
    const users = await env.FINANCE_AUTH_KV.list({ prefix: 'user:' });
    const viewers = [];
    for (const key of users.keys) {
      const record = await env.FINANCE_AUTH_KV.get<{ role?: string }>(key.name, 'json');
      if (record?.role === 'viewer') viewers.push(key.name.slice('user:'.length));
    }
    if (viewers.length) {
      const placeholders = viewers.map(() => '?').join(', ');
      const confirmed = await env.DB.prepare(`SELECT username FROM monthly_confirmations WHERE period = ? AND username IN (${placeholders})`)
        .bind(period, ...viewers).all<{ username: string }>();
      const known = new Set(confirmed.results.map((row) => row.username));
      unconfirmedViewers = viewers.filter((username) => !known.has(username));
    }
  }
  return json({
    active_circuit: activeCircuit,
    monthly_confirmation: monthlyConfirmation,
    unconfirmed_viewers: unconfirmedViewers,
    annual_review_due: session.role === 'admin' && now.annualReviewDue,
  });
}

async function accessLog(request: Request, env: FinanceEnv): Promise<Response> {
  const session = await requireFinanceRole(request, env, ['admin']);
  if (session instanceof Response) return session;
  const url = new URL(request.url); const limit = Number(url.searchParams.get('limit') ?? '50');
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) return apiError(400, 'invalid_limit', 'limit must be between 1 and 50');
  const start = optionalAccessTime(url.searchParams.get('start')); const endInput = optionalAccessTime(url.searchParams.get('end')); const end = endInput && /^\d{4}-\d{2}-\d{2}$/.test(endInput) ? `${endInput}T23:59:59.999Z` : endInput; const username = (url.searchParams.get('username') ?? '').trim(); const action = (url.searchParams.get('action') ?? '').trim();
  if (start === undefined || end === undefined || (start && end && start > end) || username.length > 64 || action.length > 64) return apiError(400, 'invalid_filter', 'Access filters are invalid');
  const filter = { start: start ?? null, end: end ?? null, username: username || null, action: action || null };
  const cursor = decodeAccessCursor(url.searchParams.get('cursor'), filter); if (cursor instanceof Response) return cursor;
  const clauses = ['1 = 1']; const values: unknown[] = [];
  if (filter.start) { clauses.push('occurred_at >= ?'); values.push(filter.start); }
  if (filter.end) { clauses.push('occurred_at <= ?'); values.push(filter.end); }
  if (filter.username) { clauses.push('username = ?'); values.push(filter.username); }
  if (filter.action) { clauses.push('action = ?'); values.push(filter.action); }
  if (cursor) { clauses.push('(occurred_at < ? OR (occurred_at = ? AND id < ?))'); values.push(cursor.sort, cursor.sort, cursor.id); }
  const result = await env.DB.prepare(`SELECT id, username, action, occurred_at FROM finance_access_log WHERE ${clauses.join(' AND ')} ORDER BY occurred_at DESC, id DESC LIMIT ?`).bind(...values, limit + 1).all<{ id: number; occurred_at: string }>();
  const items = result.results.slice(0, limit); const last = items.at(-1);
  return json({ access_log: items, items, nextCursor: result.results.length > limit && last ? encodeAccessCursor({ sort: last.occurred_at, id: last.id, filter }) : null });
}

function optionalAccessTime(value: string | null): string | null | undefined { return value === null || value === '' ? null : /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z)?$/.test(value) ? value : undefined; }
function encodeAccessCursor(value: { sort: string; id: number; filter: unknown }): string { return btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, ''); }
function decodeAccessCursor(value: string | null, filter: unknown): { sort: string; id: number } | null | Response {
  if (!value) return null;
  try { const source = value.replace(/-/g, '+').replace(/_/g, '/'); const parsed = JSON.parse(atob(source + '='.repeat((4 - source.length % 4) % 4))); if (typeof parsed.sort !== 'string' || !Number.isSafeInteger(parsed.id) || parsed.id < 1 || JSON.stringify(parsed.filter) !== JSON.stringify(filter)) throw new Error(); return { sort: parsed.sort, id: parsed.id }; }
  catch { return apiError(400, 'invalid_cursor', 'Access cursor is invalid'); }
}

async function listImportReview(request: Request, env: FinanceEnv): Promise<Response> {
  const session = await requireFinanceRole(request, env, ['admin']);
  if (session instanceof Response) return session;
  const url = new URL(request.url);
  const status = url.searchParams.get('status') ?? 'pending';
  const limit = Number(url.searchParams.get('limit') ?? '100');
  if (!['pending', 'resolved', 'all'].includes(status)) {
    return apiError(400, 'invalid_status', 'status must be pending, resolved, or all');
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
    return apiError(400, 'invalid_limit', 'limit must be between 1 and 500');
  }
  const filter = status === 'all' ? '' : 'WHERE status = ?';
  const statement = env.DB.prepare(`SELECT id, batch_id, row_number, record_kind, raw_json,
      status, resolution_note, resolved_at
    FROM finance_import_review ${filter}
    ORDER BY id DESC LIMIT ?`);
  const result = status === 'all'
    ? await statement.bind(limit).all<Record<string, unknown>>()
    : await statement.bind(status, limit).all<Record<string, unknown>>();
  return json({
    review: result.results.map((row) => ({
      ...row,
      raw: parseStoredJson(row.raw_json),
      raw_json: undefined,
    })),
  });
}

async function resolveImportReview(request: Request, env: FinanceEnv, id: number): Promise<Response> {
  const session = await requireFinanceRole(request, env, ['admin']);
  if (session instanceof Response) return session;
  const body = await readJson<{ resolution_note?: unknown }>(request, 4_096);
  if (body instanceof Response) return body;
  const resolutionNote = typeof body.resolution_note === 'string' ? body.resolution_note.trim() : '';
  if (!resolutionNote || resolutionNote.length > 2_000) {
    return apiError(400, 'invalid_resolution_note', 'A bounded resolution note is required');
  }
  const resolvedAt = new Date().toISOString();
  const result = await env.DB.prepare(`UPDATE finance_import_review
    SET status = 'resolved', resolution_note = ?, resolved_at = ?
    WHERE id = ? AND status = 'pending'`).bind(resolutionNote, resolvedAt, id).run();
  if ((result.meta.changes ?? 0) === 0) {
    return apiError(409, 'not_resolvable', 'Review item does not exist or was already resolved');
  }
  return json({ id, status: 'resolved', resolution_note: resolutionNote, resolved_at: resolvedAt });
}

async function exportArchive(request: Request, env: FinanceEnv): Promise<Response> {
  const session = await requireFinanceRole(request, env, ['admin']);
  if (session instanceof Response) return session;
  const year = Number(new URL(request.url).searchParams.get('year'));
  if (!Number.isInteger(year) || year < 2000 || year > 2200) return apiError(400, 'invalid_year', 'year must be between 2000 and 2200');
  const start = `${year}-01-01`;
  const end = `${year + 1}-01-01`;
  const [trades, snapshots, accountEvents, cashFlows, assets, memos, monthlyRecords, monthly, rebalances, review, confirmations] = await Promise.all([
    env.DB.prepare('SELECT trade_date, trade_time, ticker, ticker_name, direction, quantity, price, fee, net_cash_amount, position_category, reason, needs_review FROM trades WHERE trade_date >= ? AND trade_date < ? ORDER BY trade_date, id')
      .bind(start, end).all<Record<string, unknown>>(),
    env.DB.prepare('SELECT snapshot_date, ticker, quantity, avg_cost, position_category FROM holdings_snapshots WHERE snapshot_date >= ? AND snapshot_date < ? ORDER BY snapshot_date, ticker, id')
      .bind(start, end).all<Record<string, unknown>>(),
    env.DB.prepare('SELECT event_date, event_time, event_type, ticker, ticker_name, quantity, reference_value, amount, position_category, note FROM finance_account_events WHERE deleted_at IS NULL AND event_date >= ? AND event_date < ? ORDER BY event_date, id')
      .bind(start, end).all<Record<string, unknown>>(),
    env.DB.prepare('SELECT occurred_on, contributor, flow_type, bonus_source_year, baseline_amount, confirmed_amount, manager_share_offset, net_amount, note FROM finance_cash_flows WHERE deleted_at IS NULL AND occurred_on >= ? AND occurred_on < ? ORDER BY occurred_on, id')
      .bind(start, end).all<Record<string, unknown>>(),
    env.DB.prepare('SELECT snapshot_at, snapshot_date, holdings_value, cash_value, total_value, source, is_complete, incomplete_reason FROM finance_asset_snapshots WHERE deleted_at IS NULL AND snapshot_date >= ? AND snapshot_date < ? ORDER BY snapshot_at, id')
      .bind(start, end).all<Record<string, unknown>>(),
    env.DB.prepare('SELECT trade_id, memo_date, ticker, operation_type, reason, reason_source, note, stop_loss_triggered FROM finance_memos WHERE deleted_at IS NULL AND memo_date >= ? AND memo_date < ? ORDER BY memo_date, id')
      .bind(start, end).all<Record<string, unknown>>(),
    env.DB.prepare('SELECT year_month, muxia_invest, cati_invest, end_total, sse300_pe, sse500_pe, sse1000_pe, blue_chip_temp, summary, remark FROM monthly_records WHERE deleted_at IS NULL AND year_month >= ? AND year_month < ? ORDER BY year_month')
      .bind(`${year}-01`, `${year + 1}-01`).all<Record<string, unknown>>(),
    env.DB.prepare(`SELECT substr(trade_date, 1, 7) AS period,
        SUM(CASE WHEN direction = 'buy' THEN quantity * price ELSE 0 END) AS buy_value,
        SUM(CASE WHEN direction = 'sell' THEN quantity * price ELSE 0 END) AS sell_value,
        COUNT(*) AS trade_count
      FROM trades WHERE trade_date >= ? AND trade_date < ? GROUP BY period ORDER BY period`)
      .bind(start, end).all<Record<string, unknown>>(),
    env.DB.prepare('SELECT year, executed_on, adjustments, reason, created_at, created_by, confirmed_by, confirmed_at FROM finance_rebalance_records WHERE year = ? ORDER BY id').bind(year).all<Record<string, unknown>>(),
    env.DB.prepare('SELECT year, calculation_json, summary, calculated_at, confirmed_by, confirmed_at FROM annual_reviews WHERE year = ?')
      .bind(year).all<Record<string, unknown>>(),
    env.DB.prepare('SELECT period, username, confirmed_at FROM monthly_confirmations WHERE period >= ? AND period < ? ORDER BY period, username')
      .bind(`${year}-01`, `${year + 1}-01`).all<Record<string, unknown>>(),
  ]);
  const workbook = buildXlsx([
    sheet('Trades', ['trade_date', 'trade_time', 'ticker', 'ticker_name', 'direction', 'quantity', 'price', 'fee', 'net_cash_amount', 'position_category', 'reason', 'needs_review'], trades.results),
    sheet('Holding Snapshots', ['snapshot_date', 'ticker', 'quantity', 'avg_cost', 'position_category'], snapshots.results),
    sheet('Account Events', ['event_date', 'event_time', 'event_type', 'ticker', 'ticker_name', 'quantity', 'reference_value', 'amount', 'position_category', 'note'], accountEvents.results),
    sheet('Cash Flows', ['occurred_on', 'contributor', 'flow_type', 'bonus_source_year', 'baseline_amount', 'confirmed_amount', 'manager_share_offset', 'net_amount', 'note'], cashFlows.results),
    sheet('Asset Snapshots', ['snapshot_at', 'snapshot_date', 'holdings_value', 'cash_value', 'total_value', 'source', 'is_complete', 'incomplete_reason'], assets.results),
    sheet('Investment Memos', ['trade_id', 'memo_date', 'ticker', 'operation_type', 'reason', 'reason_source', 'note', 'stop_loss_triggered'], memos.results),
    sheet('Monthly Records', ['year_month', 'muxia_invest', 'cati_invest', 'end_total', 'sse300_pe', 'sse500_pe', 'sse1000_pe', 'blue_chip_temp', 'summary', 'remark'], monthlyRecords.results),
    sheet('Monthly Trade Summary', ['period', 'buy_value', 'sell_value', 'trade_count'], monthly.results),
    sheet('Rebalances', ['year', 'executed_on', 'adjustments', 'reason', 'created_at', 'created_by', 'confirmed_by', 'confirmed_at'], rebalances.results),
    sheet('Annual Review', ['year', 'calculation_json', 'summary', 'calculated_at', 'confirmed_by', 'confirmed_at'], review.results),
    sheet('Confirmations', ['period', 'username', 'confirmed_at'], confirmations.results),
  ]);
  return new Response(workbook, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="finance-archive-${year}.xlsx"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

function sheet(name: string, headers: string[], rows: Record<string, unknown>[]) {
  return {
    name,
    rows: [headers, ...rows.map((row) => headers.map((header) => archiveCell(row[header])))],
  };
}

function archiveCell(value: unknown): WorkbookCell {
  if (value === null || value === undefined || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  return JSON.stringify(value);
}

function parseStoredJson(value: unknown): unknown {
  try {
    return JSON.parse(String(value));
  } catch {
    return null;
  }
}

function storedTemperatureBoundaries(value: unknown): PeTemperatureBoundaries | undefined {
  const parsed = parseStoredJson(value);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return undefined;
  const record = parsed as Record<string, unknown>;
  const boundaries = { freeze: Number(record.freeze), low: Number(record.low), normal: Number(record.normal), high: Number(record.high) };
  return Object.values(boundaries).every((number) => Number.isFinite(number) && number >= 0)
    && boundaries.freeze < boundaries.low && boundaries.low < boundaries.normal && boundaries.normal < boundaries.high
    ? boundaries
    : undefined;
}

async function recordCircuit(database: D1Database, level: 'yellow' | 'red' | 'black', action: string, reason: string) {
  const active = await database.prepare('SELECT id, level FROM circuit_breaker_log WHERE resolved_at IS NULL ORDER BY triggered_at DESC, id DESC LIMIT 1')
    .first<{ id: number; level: 'yellow' | 'red' | 'black' }>();
  const severity = { yellow: 1, red: 2, black: 3 } as const;
  if (active && severity[active.level] >= severity[level]) {
    return json({ created: false, id: active.id, state: { level: active.level, action: circuitAction(active.level) } });
  }
  const now = new Date().toISOString();
  if (active) {
    const results = await database.batch([
      database.prepare('UPDATE circuit_breaker_log SET resolved_at = ? WHERE id = ? AND resolved_at IS NULL').bind(now, active.id),
      database.prepare('INSERT INTO circuit_breaker_log (level, reason, triggered_at) VALUES (?, ?, ?)').bind(level, reason, now),
    ]);
    return json({ created: true, escalated_from: active.level, id: results[1]?.meta.last_row_id, state: { level, action } }, 201);
  }
  const result = await database.prepare('INSERT INTO circuit_breaker_log (level, reason, triggered_at) VALUES (?, ?, ?)')
    .bind(level, reason, now).run();
  return json({ created: true, id: result.meta.last_row_id, state: { level, action } }, 201);
}

function circuitAction(level: 'yellow' | 'red' | 'black') {
  return ({
    yellow: 'pause_active_additions',
    red: 'route_dca_to_cash',
    black: 'pause_all',
  } as const)[level];
}
