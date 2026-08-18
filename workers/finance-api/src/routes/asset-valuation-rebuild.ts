import { apiError, json, readJson } from '../lib/http';
import { requireFinanceRole, type FinanceEnv } from './auth';
import {
  projectRepoAssets,
  selectCashFactsAfterReconciliation,
  SYNTHETIC_RECONCILIATION_SOURCES,
  type RepoEventRow,
} from './account-state';

export const HISTORICAL_RECONSTRUCTION_START = '2026-06-03';
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const EPSILON = 0.000001;
const CASH_EVENT_TYPES = new Set(['dividend', 'dividend_tax', 'repo_start', 'repo_maturity', 'refund']);

type RebuildInput = { start_date?: unknown; end_date?: unknown };
type ReconciliationRow = { id: number; snapshot_date: string; snapshot_at: string; cash_value: number; source: string };
type HoldingRow = { ticker: string; quantity: number };
type TradeRow = { id: number; trade_date: string; trade_time: string | null; ticker: string; direction: 'buy' | 'sell'; quantity: number; net_cash_amount: number | null };
type CashFlowRow = { id: number; occurred_on: string; net_amount: number };
type AccountEventRow = { id: number; event_date: string; event_time: string | null; event_type: string; ticker: string | null; ticker_name: string | null; quantity: number | null; reference_value: number | null; amount: number | null };
type PriceRow = { ticker: string; price_date: string; close: number; source: string };
type ValuationRow = {
  valuation_date: string;
  securities_value: number;
  cash_value: number;
  other_assets_value: number;
  total_value: number;
  held_position_count: number;
  priced_position_count: number;
  is_complete: number;
  incomplete_reason: string | null;
  price_source: string | null;
  source: 'derived';
  calculated_at: string;
};
type PositionReverseFact = {
  date: string;
  time: string;
  key: string;
  kind: 'trade' | 'split';
  ticker: string;
  direction?: 'buy' | 'sell';
  quantity: number;
};

export async function handleAssetValuationRebuild(request: Request, env: FinanceEnv): Promise<Response> {
  if (request.method !== 'POST') return apiError(405, 'method_not_allowed', 'Method is not allowed');
  const session = await requireFinanceRole(request, env, ['admin']);
  if (session instanceof Response) return session;
  const body = await readJson<RebuildInput>(request);
  if (body instanceof Response) return body;

  const startDate = normalizeDay(body.start_date, HISTORICAL_RECONSTRUCTION_START);
  if (!startDate || startDate < HISTORICAL_RECONSTRUCTION_START) {
    return apiError(400, 'invalid_start_date', `Historical reconstruction starts at ${HISTORICAL_RECONSTRUCTION_START}`);
  }

  const reconciliation = await latestReconciliation(env);
  if (!reconciliation) return apiError(409, 'missing_reconciliation', 'A complete manual or broker reconciliation is required before rebuilding history');

  const maximumPriceDate = await env.DB.prepare('SELECT MAX(price_date) AS value FROM finance_security_prices').first<{ value: string | null }>();
  if (!maximumPriceDate?.value) return apiError(409, 'missing_raw_prices', 'No canonical raw historical prices are available');
  const defaultEnd = maximumPriceDate.value < reconciliation.snapshot_date ? maximumPriceDate.value : reconciliation.snapshot_date;
  const endDate = normalizeDay(body.end_date, defaultEnd);
  if (!endDate || endDate < startDate) return apiError(400, 'invalid_end_date', 'end_date must be on or after start_date');
  if (endDate > reconciliation.snapshot_date) return apiError(409, 'beyond_reconciliation', 'Historical valuation cannot extend beyond the reconciliation anchor');

  const result = await rebuildAssetValuations(env, { startDate, endDate, reconciliation, actor: session.username ?? undefined });
  if (result instanceof Response) return result;
  return json(result, 201);
}

export async function rebuildAssetValuations(
  env: FinanceEnv,
  options: { startDate: string; endDate: string; reconciliation?: ReconciliationRow; actor?: string },
) {
  if (!isCanonicalHistoricalDay(options.startDate) || options.startDate < HISTORICAL_RECONSTRUCTION_START) {
    return apiError(400, 'invalid_start_date', `Historical reconstruction starts at ${HISTORICAL_RECONSTRUCTION_START}`);
  }
  if (!isCanonicalHistoricalDay(options.endDate) || options.endDate < options.startDate) {
    return apiError(400, 'invalid_end_date', 'end_date must be on or after start_date');
  }

  const reconciliation = options.reconciliation ?? await latestReconciliation(env);
  if (!reconciliation) return apiError(409, 'missing_reconciliation', 'A complete manual or broker reconciliation is required before rebuilding history');
  if (options.endDate > reconciliation.snapshot_date) return apiError(409, 'beyond_reconciliation', 'Historical valuation cannot extend beyond the reconciliation anchor');

  const [holdings, trades, cashFlows, accountEvents, prices] = await Promise.all([
    holdingsAt(env, reconciliation.snapshot_date),
    activeTradesThrough(env, reconciliation.snapshot_date),
    activeCashFlowsThrough(env, reconciliation.snapshot_date),
    activeAccountEventsThrough(env, reconciliation.snapshot_date),
    rawPrices(env, options.startDate, options.endDate),
  ]);

  const unsafeAnchorFacts = selectCashFactsAfterReconciliation(reconciliation, [
    ...trades.filter((trade) => trade.trade_date === reconciliation.snapshot_date).map((trade) => ({
      fact_key: `trade:${trade.id}`,
      business_date: trade.trade_date,
      business_time: trade.trade_time,
      kind: 'trade' as const,
      subtype: trade.direction,
      amount: trade.net_cash_amount,
      repo_key: null,
    })),
    ...cashFlows.filter((flow) => flow.occurred_on === reconciliation.snapshot_date).map((flow) => ({
      fact_key: `cash-flow:${flow.id}`,
      business_date: flow.occurred_on,
      business_time: null,
      kind: 'cash_flow' as const,
      subtype: 'cash_flow',
      amount: flow.net_amount,
      repo_key: null,
    })),
    ...accountEvents.filter((event) => event.event_date === reconciliation.snapshot_date).map((event) => ({
      fact_key: `account-event:${event.id}`,
      business_date: event.event_date,
      business_time: event.event_time,
      kind: 'account_event' as const,
      subtype: event.event_type,
      amount: event.amount,
      repo_key: event.ticker || event.ticker_name || 'repo',
    })),
  ]);
  if (unsafeAnchorFacts.length) {
    return apiError(
      409,
      'unsafe_intraday_reconciliation',
      'Historical reconstruction requires a reconciliation with no later or time-ambiguous same-day financial facts; record a new reconciliation after those facts settle',
    );
  }

  const priceDates = [...new Set(prices.map((row) => row.price_date))].sort();
  if (!priceDates.length) return apiError(409, 'missing_raw_prices', 'No canonical raw historical prices exist in the requested range');

  const priceByDate = new Map<string, Map<string, PriceRow>>();
  for (const price of prices) {
    const day = priceByDate.get(price.price_date) ?? new Map<string, PriceRow>();
    day.set(price.ticker, price);
    priceByDate.set(price.price_date, day);
  }

  const reverseFacts = positionReverseFacts(trades, accountEvents);
  const repoEvents = accountEvents
    .filter((event) => event.event_type === 'repo_start' || event.event_type === 'repo_maturity')
    .map<RepoEventRow>((event) => ({
      id: event.id,
      event_date: event.event_date,
      event_time: event.event_time,
      event_type: event.event_type as 'repo_start' | 'repo_maturity',
      repo_key: event.ticker || event.ticker_name || 'repo',
      reference_value: event.reference_value,
      amount: event.amount,
    }));

  const calculatedAt = new Date().toISOString();
  const valuations = priceDates.map((valuationDate) => buildValuation({
    valuationDate,
    anchorCash: Number(reconciliation.cash_value),
    anchorHoldings: holdings,
    trades,
    cashFlows,
    accountEvents,
    reverseFacts,
    repoEvents,
    prices: priceByDate.get(valuationDate) ?? new Map(),
    calculatedAt,
  }));

  await replaceValuationRange(env, options.startDate, options.endDate, valuations);
  const incomplete = valuations.filter((row) => row.is_complete === 0);
  return {
    rebuilt: valuations.length,
    complete: valuations.length - incomplete.length,
    incomplete: incomplete.length,
    start_date: options.startDate,
    end_date: options.endDate,
    reconciliation: {
      id: reconciliation.id,
      snapshot_date: reconciliation.snapshot_date,
      snapshot_at: reconciliation.snapshot_at,
      source: reconciliation.source,
    },
    actor: options.actor ?? null,
    source_model: 'facts_plus_raw_close',
    cache: 'finance_asset_valuations',
    incomplete_dates: incomplete.map((row) => ({ date: row.valuation_date, reason: row.incomplete_reason })),
  };
}

function buildValuation(input: {
  valuationDate: string;
  anchorCash: number;
  anchorHoldings: HoldingRow[];
  trades: TradeRow[];
  cashFlows: CashFlowRow[];
  accountEvents: AccountEventRow[];
  reverseFacts: PositionReverseFact[];
  repoEvents: RepoEventRow[];
  prices: Map<string, PriceRow>;
  calculatedAt: string;
}): ValuationRow {
  const problems: string[] = [];
  const positions = new Map(input.anchorHoldings.map((row) => [row.ticker, Number(row.quantity)]));

  for (const fact of input.reverseFacts) {
    if (fact.date <= input.valuationDate) continue;
    if (fact.kind === 'split') {
      if (!fact.ticker || !Number.isFinite(fact.quantity) || fact.quantity < 0) {
        problems.push(`${fact.key} 缺少可用的拆分前持仓数量。`);
        continue;
      }
      positions.set(fact.ticker, fact.quantity);
      continue;
    }
    const current = positions.get(fact.ticker) ?? 0;
    const previous = fact.direction === 'buy' ? current - fact.quantity : current + fact.quantity;
    if (previous < -EPSILON) problems.push(`${fact.key} 反推后产生负持仓。`);
    if (Math.abs(previous) < EPSILON) positions.delete(fact.ticker);
    else positions.set(fact.ticker, Math.max(0, previous));
  }

  let cash = input.anchorCash;
  for (const trade of input.trades) {
    if (trade.trade_date <= input.valuationDate) continue;
    if (trade.net_cash_amount === null || !Number.isFinite(trade.net_cash_amount)) {
      problems.push(`trade:${trade.id} 缺少 net_cash_amount。`);
      continue;
    }
    cash -= trade.net_cash_amount;
  }
  for (const flow of input.cashFlows) {
    if (flow.occurred_on <= input.valuationDate) continue;
    if (!Number.isFinite(flow.net_amount)) {
      problems.push(`cash-flow:${flow.id} 缺少 net_amount。`);
      continue;
    }
    cash -= flow.net_amount;
  }
  for (const event of input.accountEvents) {
    if (event.event_date <= input.valuationDate || event.event_type === 'split') continue;
    if (event.event_type === 'other') {
      problems.push(`account-event:${event.id} 是未分类事件，无法确定历史现金影响。`);
      continue;
    }
    if (!CASH_EVENT_TYPES.has(event.event_type)) continue;
    if (event.amount === null || !Number.isFinite(event.amount)) {
      problems.push(`account-event:${event.id} 缺少明确现金影响。`);
      continue;
    }
    cash -= event.amount;
  }
  if (cash < -EPSILON) problems.push(`反推 Broker Cash 为负数 ${cash.toFixed(2)}。`);
  const cashValue = normalizeMoney(Math.max(0, cash));

  const repoState = projectRepoAssets(input.repoEvents.filter((event) => event.event_date <= input.valuationDate));
  problems.push(...repoState.problems);
  const otherAssetsValue = normalizeMoney(Math.max(0, Number(repoState.known_value ?? 0)));

  let securitiesValue = 0;
  let pricedPositionCount = 0;
  const priceSources = new Set<string>();
  const held = [...positions.entries()].filter(([, quantity]) => quantity > EPSILON).sort(([left], [right]) => left.localeCompare(right));
  for (const [ticker, quantity] of held) {
    const price = input.prices.get(ticker);
    if (!price) {
      problems.push(`${ticker} 在 ${input.valuationDate} 缺少 canonical raw close。`);
      continue;
    }
    securitiesValue += quantity * Number(price.close);
    pricedPositionCount += 1;
    priceSources.add(price.source);
  }
  securitiesValue = normalizeMoney(securitiesValue);
  const totalValue = normalizeMoney(securitiesValue + cashValue + otherAssetsValue);
  const uniqueProblems = [...new Set(problems)];
  const complete = uniqueProblems.length === 0 && pricedPositionCount === held.length;

  return {
    valuation_date: input.valuationDate,
    securities_value: securitiesValue,
    cash_value: cashValue,
    other_assets_value: otherAssetsValue,
    total_value: totalValue,
    held_position_count: held.length,
    priced_position_count: pricedPositionCount,
    is_complete: complete ? 1 : 0,
    incomplete_reason: complete ? null : uniqueProblems.join('；'),
    price_source: priceSources.size === 0 ? null : priceSources.size === 1 ? [...priceSources][0] : 'mixed_raw',
    source: 'derived',
    calculated_at: input.calculatedAt,
  };
}

function positionReverseFacts(trades: TradeRow[], events: AccountEventRow[]) {
  const facts: PositionReverseFact[] = trades.map((trade) => ({
    date: trade.trade_date,
    time: trade.trade_time ?? '12:00',
    key: `trade:${trade.id}`,
    kind: 'trade',
    ticker: trade.ticker,
    direction: trade.direction,
    quantity: Number(trade.quantity),
  }));
  for (const event of events) {
    if (event.event_type !== 'split') continue;
    facts.push({
      date: event.event_date,
      time: event.event_time ?? '23:59',
      key: `account-event:${event.id}`,
      kind: 'split',
      ticker: event.ticker ?? '',
      quantity: event.quantity === null ? Number.NaN : Number(event.quantity),
    });
  }
  return facts.sort((left, right) => right.date.localeCompare(left.date) || right.time.localeCompare(left.time) || right.key.localeCompare(left.key));
}

async function latestReconciliation(env: FinanceEnv) {
  return env.DB.prepare(`SELECT id, snapshot_date, snapshot_at, cash_value, source
    FROM finance_asset_snapshots
    WHERE deleted_at IS NULL AND is_complete = 1
      AND lower(COALESCE(source, '')) NOT IN (${SYNTHETIC_RECONCILIATION_SOURCES.map(() => '?').join(', ')})
    ORDER BY snapshot_date DESC, julianday(snapshot_at) DESC, id DESC LIMIT 1`)
    .bind(...SYNTHETIC_RECONCILIATION_SOURCES).first<ReconciliationRow>();
}

async function holdingsAt(env: FinanceEnv, throughDate: string) {
  const rows = await env.DB.prepare(`WITH latest AS (
      SELECT ticker, MAX(snapshot_date || ':' || printf('%020d', id)) AS marker
      FROM holdings_snapshots WHERE snapshot_date <= ? GROUP BY ticker
    )
    SELECT h.ticker, h.quantity FROM holdings_snapshots h
    JOIN latest l ON l.ticker = h.ticker AND l.marker = h.snapshot_date || ':' || printf('%020d', h.id)
    WHERE h.quantity > 0 ORDER BY h.ticker`).bind(throughDate).all<HoldingRow>();
  return rows.results.map((row) => ({ ticker: row.ticker, quantity: Number(row.quantity) }));
}

async function activeTradesThrough(env: FinanceEnv, throughDate: string) {
  const rows = await env.DB.prepare(`SELECT id, trade_date, trade_time, ticker, direction, quantity, net_cash_amount
    FROM trades WHERE deleted_at IS NULL AND trade_date <= ?
    ORDER BY trade_date ASC, COALESCE(trade_time, '12:00') ASC, id ASC`).bind(throughDate).all<TradeRow>();
  return rows.results.map((row) => ({ ...row, quantity: Number(row.quantity), net_cash_amount: row.net_cash_amount === null ? null : Number(row.net_cash_amount) }));
}

async function activeCashFlowsThrough(env: FinanceEnv, throughDate: string) {
  const rows = await env.DB.prepare(`SELECT id, occurred_on, net_amount FROM finance_cash_flows
    WHERE deleted_at IS NULL AND occurred_on <= ? ORDER BY occurred_on ASC, id ASC`).bind(throughDate).all<CashFlowRow>();
  return rows.results.map((row) => ({ ...row, net_amount: Number(row.net_amount) }));
}

async function activeAccountEventsThrough(env: FinanceEnv, throughDate: string) {
  const rows = await env.DB.prepare(`SELECT id, event_date, event_time, event_type, ticker, ticker_name, quantity, reference_value, amount
    FROM finance_account_events WHERE deleted_at IS NULL AND event_date <= ?
    ORDER BY event_date ASC, COALESCE(event_time, '00:00') ASC, id ASC`).bind(throughDate).all<AccountEventRow>();
  return rows.results.map((row) => ({
    ...row,
    quantity: row.quantity === null ? null : Number(row.quantity),
    reference_value: row.reference_value === null ? null : Number(row.reference_value),
    amount: row.amount === null ? null : Number(row.amount),
  }));
}

async function rawPrices(env: FinanceEnv, startDate: string, endDate: string) {
  const rows = await env.DB.prepare(`SELECT ticker, price_date, close, source FROM finance_security_prices
    WHERE adjustment = 'raw' AND price_date >= ? AND price_date <= ?
    ORDER BY price_date ASC, ticker ASC`).bind(startDate, endDate).all<PriceRow>();
  return rows.results.map((row) => ({ ...row, close: Number(row.close) }));
}

async function replaceValuationRange(env: FinanceEnv, startDate: string, endDate: string, rows: ValuationRow[]) {
  const statements = [env.DB.prepare('DELETE FROM finance_asset_valuations WHERE valuation_date >= ? AND valuation_date <= ?').bind(startDate, endDate)];
  if (rows.length) {
    const values = rows.map(() => '(?,?,?,?,?,?,?,?,?,?,?,?)').join(',');
    const bindings: unknown[] = [];
    for (const row of rows) bindings.push(
      row.valuation_date, row.securities_value, row.cash_value, row.other_assets_value, row.total_value,
      row.held_position_count, row.priced_position_count, row.is_complete, row.incomplete_reason,
      row.price_source, row.source, row.calculated_at,
    );
    statements.push(env.DB.prepare(`INSERT INTO finance_asset_valuations (
      valuation_date, securities_value, cash_value, other_assets_value, total_value,
      held_position_count, priced_position_count, is_complete, incomplete_reason,
      price_source, source, calculated_at
    ) VALUES ${values}`).bind(...bindings));
  }
  await env.DB.batch(statements);
}

export function isCanonicalHistoricalDay(value: unknown): value is string {
  if (typeof value !== 'string' || !DAY.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}

function normalizeDay(value: unknown, fallback: string) {
  const day = value === undefined || value === null || value === '' ? fallback : typeof value === 'string' ? value.trim() : '';
  return isCanonicalHistoricalDay(day) ? day : null;
}

function normalizeMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
