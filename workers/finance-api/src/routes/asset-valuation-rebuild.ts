import { apiError, json, readJson } from '../lib/http';
import { latestReconciliation, type ReconciliationAnchorRow } from '../modules/snapshots';
import {
  activeAccountEventsThrough,
  activeCashFlowsThrough,
  activeTradesThrough,
  holdingsAt,
  positionReverseFacts,
  projectValuationRow,
  valuationReplacementStatements,
  type HistoricalPriceRow,
  type ValuationRow,
} from '../modules/valuation-engine';
import { requireFinanceRole, type FinanceEnv } from './auth';
import { selectCashFactsAfterReconciliation, type RepoEventRow } from './account-state';
import { previewForwardAssetValuations } from '../modules/valuation-engine';

export const HISTORICAL_RECONSTRUCTION_START = '2026-06-03';
const DAY = /^\d{4}-\d{2}-\d{2}$/;

type RebuildInput = { start_date?: unknown; end_date?: unknown };

export { previewForwardAssetValuations };

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
  options: { startDate: string; endDate: string; reconciliation?: ReconciliationAnchorRow; actor?: string },
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

  const priceByDate = new Map<string, Map<string, HistoricalPriceRow>>();
  for (const price of prices) {
    const day = priceByDate.get(price.price_date) ?? new Map<string, HistoricalPriceRow>();
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
  const valuations = priceDates.map((valuationDate) => projectValuationRow({
    direction: 'backward',
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

async function rawPrices(env: FinanceEnv, startDate: string, endDate: string) {
  const rows = await env.DB.prepare(`SELECT ticker, price_date, close, source FROM finance_security_prices
    WHERE adjustment = 'raw' AND price_date >= ? AND price_date <= ?
    ORDER BY price_date ASC, ticker ASC`).bind(startDate, endDate).all<HistoricalPriceRow>();
  return rows.results.map((row) => ({ ...row, close: Number(row.close) }));
}

async function replaceValuationRange(env: FinanceEnv, startDate: string, endDate: string, rows: ValuationRow[]) {
  await env.DB.batch(valuationReplacementStatements(env, startDate, endDate, rows));
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
