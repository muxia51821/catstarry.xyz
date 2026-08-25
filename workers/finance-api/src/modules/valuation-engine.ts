import {
  latestReconciliation,
  latestSnapshotHoldings,
  type ReconciliationAnchorRow,
} from './snapshots';
import type { FinanceEnv } from '../routes/auth';
import {
  projectRepoAssets,
  type RepoEventRow,
} from '../routes/account-state';

const EPSILON = 0.000001;
const CASH_EVENT_TYPES = new Set(['dividend', 'dividend_tax', 'repo_start', 'repo_maturity', 'refund']);

export type HistoricalPriceRow = { ticker: string; price_date: string; close: number; source: string };
export type HoldingPositionRow = { ticker: string; quantity: number };
export type TradeFactRow = { id: number; trade_date: string; trade_time: string | null; ticker: string; direction: 'buy' | 'sell'; quantity: number; net_cash_amount: number | null };
export type CashFlowFactRow = { id: number; occurred_on: string; net_amount: number };
export type AccountEventFactRow = { id: number; event_date: string; event_time: string | null; event_type: string; ticker: string | null; ticker_name: string | null; quantity: number | null; reference_value: number | null; amount: number | null };
export type PositionReverseFact = {
  date: string;
  time: string;
  key: string;
  kind: 'trade' | 'split';
  ticker: string;
  direction?: 'buy' | 'sell';
  quantity: number;
};

export type ValuationRow = {
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

export async function holdingsAt(env: FinanceEnv, throughDate: string): Promise<HoldingPositionRow[]> {
  const rows = await latestSnapshotHoldings(env, { throughDate });
  return rows.map((row) => ({ ticker: row.ticker, quantity: row.quantity }));
}

export async function activeTradesThrough(env: FinanceEnv, throughDate: string): Promise<TradeFactRow[]> {
  const rows = await env.DB.prepare(`SELECT id, trade_date, trade_time, ticker, direction, quantity, net_cash_amount
    FROM trades WHERE deleted_at IS NULL AND trade_date <= ?
    ORDER BY trade_date ASC, COALESCE(trade_time, '12:00') ASC, id ASC`).bind(throughDate).all<TradeFactRow>();
  return rows.results.map((row) => ({ ...row, quantity: Number(row.quantity), net_cash_amount: row.net_cash_amount === null ? null : Number(row.net_cash_amount) }));
}

export async function activeCashFlowsThrough(env: FinanceEnv, throughDate: string): Promise<CashFlowFactRow[]> {
  const rows = await env.DB.prepare(`SELECT id, occurred_on, net_amount FROM finance_cash_flows
    WHERE deleted_at IS NULL AND occurred_on <= ? ORDER BY occurred_on ASC, id ASC`).bind(throughDate).all<CashFlowFactRow>();
  return rows.results.map((row) => ({ ...row, net_amount: Number(row.net_amount) }));
}

export async function activeAccountEventsThrough(env: FinanceEnv, throughDate: string): Promise<AccountEventFactRow[]> {
  const rows = await env.DB.prepare(`SELECT id, event_date, event_time, event_type, ticker, ticker_name, quantity, reference_value, amount
    FROM finance_account_events WHERE deleted_at IS NULL AND event_date <= ?
    ORDER BY event_date ASC, COALESCE(event_time, '00:00') ASC, id ASC`).bind(throughDate).all<AccountEventFactRow>();
  return rows.results.map((row) => ({
    ...row,
    quantity: row.quantity === null ? null : Number(row.quantity),
    reference_value: row.reference_value === null ? null : Number(row.reference_value),
    amount: row.amount === null ? null : Number(row.amount),
  }));
}

export function positionReverseFacts(trades: TradeFactRow[], events: AccountEventFactRow[]) {
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

export function projectValuationRow(input: {
  direction: 'forward' | 'backward';
  valuationDate: string;
  anchorCash: number;
  anchorHoldings: HoldingPositionRow[];
  trades: TradeFactRow[];
  cashFlows: CashFlowFactRow[];
  accountEvents: AccountEventFactRow[];
  reverseFacts?: PositionReverseFact[];
  repoEvents: RepoEventRow[];
  prices: Map<string, HistoricalPriceRow>;
  calculatedAt: string;
}): ValuationRow {
  const problems: string[] = [];
  const positions = new Map(input.anchorHoldings.map((row) => [row.ticker, Number(row.quantity)]));
  let cash = input.anchorCash;

  if (input.direction === 'forward') {
    for (const trade of input.trades) {
      if (trade.trade_date > input.valuationDate) continue;
      const previous = positions.get(trade.ticker) ?? 0;
      const next = trade.direction === 'buy' ? previous + trade.quantity : previous - trade.quantity;
      if (next < -EPSILON) problems.push(`trade:${trade.id} 正推后产生负持仓。`);
      if (Math.abs(next) < EPSILON) positions.delete(trade.ticker);
      else positions.set(trade.ticker, Math.max(0, next));
      if (trade.net_cash_amount === null || !Number.isFinite(trade.net_cash_amount)) problems.push(`trade:${trade.id} 缺少 net_cash_amount。`);
      else cash += trade.net_cash_amount;
    }
    for (const flow of input.cashFlows) {
      if (flow.occurred_on > input.valuationDate) continue;
      if (!Number.isFinite(flow.net_amount)) problems.push(`cash-flow:${flow.id} 缺少 net_amount。`);
      else cash += flow.net_amount;
    }
    for (const event of input.accountEvents) {
      if (event.event_date > input.valuationDate) continue;
      if (event.event_type === 'split') {
        problems.push(`account-event:${event.id} 包含拆分，需新的完整对账后才能自动正推。`);
        continue;
      }
      if (event.event_type === 'other') {
        problems.push(`account-event:${event.id} 是未分类事件，无法确定现金影响。`);
        continue;
      }
      if (!CASH_EVENT_TYPES.has(event.event_type)) continue;
      if (event.amount === null || !Number.isFinite(event.amount)) problems.push(`account-event:${event.id} 缺少明确现金影响。`);
      else cash += event.amount;
    }
  } else {
    for (const fact of input.reverseFacts ?? []) {
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
  }

  if (cash < -EPSILON) problems.push(`${input.direction === 'forward' ? '正推' : '反推'} Broker Cash 为负数 ${cash.toFixed(2)}。`);
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
  if (input.direction === 'backward') securitiesValue = normalizeMoney(securitiesValue);
  const uniqueProblems = [...new Set(problems)];
  const complete = uniqueProblems.length === 0 && pricedPositionCount === held.length;

  return {
    valuation_date: input.valuationDate,
    securities_value: input.direction === 'forward' ? normalizeMoney(securitiesValue) : securitiesValue,
    cash_value: cashValue,
    other_assets_value: otherAssetsValue,
    total_value: normalizeMoney(securitiesValue + cashValue + otherAssetsValue),
    held_position_count: held.length,
    priced_position_count: pricedPositionCount,
    is_complete: complete ? 1 : 0,
    incomplete_reason: complete ? null : uniqueProblems.join('；'),
    price_source: priceSources.size === 0 ? null : priceSources.size === 1 ? [...priceSources][0] : 'mixed_raw',
    source: 'derived',
    calculated_at: input.calculatedAt,
  };
}

function normalizeMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export async function previewForwardAssetValuations(
  env: FinanceEnv,
  options: { dates: string[]; prices: HistoricalPriceRow[]; calculatedAt?: string },
): Promise<{ reconciliation: ReconciliationAnchorRow; valuations: ValuationRow[] }> {
  const dates = [...new Set(options.dates)].sort();
  const reconciliation = await latestReconciliation(env);
  if (!reconciliation) throw new Error('A complete manual or broker reconciliation is required before refreshing history');
  if (!dates.length) return { reconciliation, valuations: [] };
  if (dates[0] <= reconciliation.snapshot_date) throw new Error('Automatic valuation refresh only projects dates after the reconciliation anchor');

  const endDate = dates.at(-1)!;
  const [anchorHoldings, allTrades, allCashFlows, allAccountEvents] = await Promise.all([
    holdingsAt(env, reconciliation.snapshot_date),
    activeTradesThrough(env, endDate),
    activeCashFlowsThrough(env, endDate),
    activeAccountEventsThrough(env, endDate),
  ]);
  const trades = allTrades.filter((row) => row.trade_date > reconciliation.snapshot_date);
  const cashFlows = allCashFlows.filter((row) => row.occurred_on > reconciliation.snapshot_date);
  const accountEvents = allAccountEvents.filter((row) => row.event_date > reconciliation.snapshot_date);
  const repoEvents = allAccountEvents
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
  const priceByDate = new Map<string, Map<string, HistoricalPriceRow>>();
  for (const price of options.prices) {
    const day = priceByDate.get(price.price_date) ?? new Map<string, HistoricalPriceRow>();
    day.set(price.ticker, price);
    priceByDate.set(price.price_date, day);
  }
  const calculatedAt = options.calculatedAt ?? new Date().toISOString();
  return {
    reconciliation,
    valuations: dates.map((valuationDate) => projectValuationRow({
      direction: 'forward',
      valuationDate,
      anchorCash: Number(reconciliation.cash_value),
      anchorHoldings,
      trades,
      cashFlows,
      accountEvents,
      repoEvents,
      prices: priceByDate.get(valuationDate) ?? new Map(),
      calculatedAt,
    })),
  };
}

export function valuationReplacementStatements(env: FinanceEnv, startDate: string, endDate: string, rows: ValuationRow[]) {
  const statements = [env.DB.prepare('DELETE FROM finance_asset_valuations WHERE valuation_date >= ? AND valuation_date <= ?').bind(startDate, endDate)];
  for (const row of rows) {
    statements.push(env.DB.prepare(`INSERT INTO finance_asset_valuations (
      valuation_date, securities_value, cash_value, other_assets_value, total_value,
      held_position_count, priced_position_count, is_complete, incomplete_reason,
      price_source, source, calculated_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).bind(
      row.valuation_date, row.securities_value, row.cash_value, row.other_assets_value, row.total_value,
      row.held_position_count, row.priced_position_count, row.is_complete, row.incomplete_reason,
      row.price_source, row.source, row.calculated_at,
    ));
  }
  return statements;
}
