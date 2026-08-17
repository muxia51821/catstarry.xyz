import { apiError, json } from '../lib/http';
import { requireFinanceRole, type FinanceEnv } from './auth';

type ReconciliationRow = {
  id: number;
  snapshot_at: string;
  snapshot_date: string;
  holdings_value: number;
  cash_value: number;
  other_assets_value: number;
  total_value: number;
  source: string;
  created_at: string;
  created_by: string;
};

type CashFactRow = {
  fact_key: string;
  business_date: string;
  business_time: string | null;
  kind: 'trade' | 'cash_flow' | 'account_event';
  subtype: string;
  amount: number | null;
  repo_key: string | null;
  timing_status?: 'after' | 'ambiguous';
};

export type RepoEventRow = {
  id: number;
  event_date: string;
  event_time: string | null;
  event_type: 'repo_start' | 'repo_maturity';
  repo_key: string;
  reference_value: number | null;
  amount: number | null;
};

type CurrentHoldingRow = {
  ticker: string;
  quantity: number;
  price: number | null;
};

export const SYNTHETIC_RECONCILIATION_SOURCES = ['auto_close', 'historical_backfill', 'history_import'];
const CASH_ACCOUNT_EVENT_TYPES = new Set(['dividend', 'dividend_tax', 'repo_start', 'repo_maturity', 'refund']);
const CASH_TOLERANCE = 0.000001;
const SHANGHAI_OFFSET_MS = 8 * 60 * 60 * 1000;

export async function handleAccountState(request: Request, env: FinanceEnv): Promise<Response> {
  if (request.method !== 'GET') return apiError(405, 'method_not_allowed', 'Method is not allowed');
  const session = await requireFinanceRole(request, env);
  if (session instanceof Response) return session;
  return json(await readAccountState(env));
}

export async function readAccountState(env: FinanceEnv) {
  const reconciliation = await latestReconciliation(env);
  const holdings = await currentHoldings(env);
  const repoState = projectRepoAssets(await allRepoEvents(env));

  if (!reconciliation) {
    return {
      reconciliation: null,
      holdings,
      cash: {
        value: null,
        known_value: null,
        status: 'unreconciled',
        projected_delta: null,
        replayed_facts: 0,
        problems: ['尚无完整的人工或券商现金余额对账。'],
      },
      other_assets: repoState,
      total_assets: null,
      total_status: 'incomplete',
    };
  }

  const candidateFacts = await cashFactsOnOrAfter(env, reconciliation.snapshot_date);
  const cashFacts = selectCashFactsAfterReconciliation(reconciliation, candidateFacts);
  const cash = projectCash(reconciliation.cash_value, cashFacts);
  const totalAssets = holdings.complete && cash.status !== 'incomplete' && repoState.status !== 'incomplete'
    ? Number(holdings.market_value) + Number(cash.value) + Number(repoState.value)
    : null;

  return {
    reconciliation: {
      id: reconciliation.id,
      observed_at: reconciliation.snapshot_at,
      through_date: reconciliation.snapshot_date,
      holdings_value: Number(reconciliation.holdings_value),
      cash_value: Number(reconciliation.cash_value),
      other_assets_value: Number(reconciliation.other_assets_value ?? 0),
      observed_total_value: Number(reconciliation.total_value),
      source: reconciliation.source,
      created_at: reconciliation.created_at,
      created_by: reconciliation.created_by,
    },
    holdings,
    cash,
    other_assets: repoState,
    total_assets: totalAssets,
    total_status: totalAssets === null ? 'incomplete' : cash.status,
  };
}

async function latestReconciliation(env: FinanceEnv) {
  return env.DB.prepare(`SELECT id, snapshot_at, snapshot_date, holdings_value, cash_value, other_assets_value, total_value, source, created_at, created_by
    FROM finance_asset_snapshots
    WHERE deleted_at IS NULL AND is_complete = 1
      AND lower(COALESCE(source, '')) NOT IN (${SYNTHETIC_RECONCILIATION_SOURCES.map(() => '?').join(', ')})
    ORDER BY snapshot_date DESC, julianday(snapshot_at) DESC, id DESC LIMIT 1`)
    .bind(...SYNTHETIC_RECONCILIATION_SOURCES).first<ReconciliationRow>();
}

async function currentHoldings(env: FinanceEnv) {
  const rows = await env.DB.prepare(`WITH latest AS (
      SELECT ticker, MAX(snapshot_date || ':' || printf('%020d', id)) AS marker
      FROM holdings_snapshots GROUP BY ticker
    )
    SELECT h.ticker, h.quantity,
      (SELECT price FROM market_data m WHERE m.ticker = h.ticker ORDER BY fetched_at DESC, id DESC LIMIT 1) AS price
    FROM holdings_snapshots h
    JOIN latest l ON l.ticker = h.ticker AND l.marker = h.snapshot_date || ':' || printf('%020d', h.id)
    WHERE h.quantity > 0 ORDER BY h.ticker`).all<CurrentHoldingRow>();

  const normalized = rows.results.map((row) => ({
    ...row,
    quantity: Number(row.quantity),
    price: row.price === null ? null : Number(row.price),
  }));
  const missing = normalized.filter((row) => row.price === null).map((row) => row.ticker);
  const priced = normalized.reduce((sum, row) => sum + (row.price === null ? 0 : row.quantity * row.price), 0);
  return {
    market_value: missing.length ? null : priced,
    priced_market_value: priced,
    complete: missing.length === 0,
    missing_tickers: missing,
  };
}

async function cashFactsOnOrAfter(env: FinanceEnv, throughDate: string) {
  const rows = await env.DB.prepare(`SELECT * FROM (
      SELECT 'trade:' || t.id AS fact_key, t.trade_date AS business_date, t.trade_time AS business_time,
        'trade' AS kind, t.direction AS subtype, t.net_cash_amount AS amount, NULL AS repo_key
        FROM trades t WHERE t.deleted_at IS NULL AND t.trade_date >= ?
      UNION ALL
      SELECT 'cash-flow:' || f.id, f.occurred_on, NULL, 'cash_flow', f.flow_type, f.net_amount, NULL
        FROM finance_cash_flows f WHERE f.deleted_at IS NULL AND f.occurred_on >= ?
      UNION ALL
      SELECT 'account-event:' || e.id, e.event_date, e.event_time, 'account_event', e.event_type, e.amount,
        COALESCE(NULLIF(e.ticker, ''), NULLIF(e.ticker_name, ''), 'repo')
        FROM finance_account_events e WHERE e.deleted_at IS NULL AND e.event_date >= ?
    ) facts ORDER BY business_date ASC, COALESCE(business_time, '00:00') ASC, fact_key ASC`)
    .bind(throughDate, throughDate, throughDate).all<CashFactRow>();
  return rows.results.map((row) => ({ ...row, amount: row.amount === null ? null : Number(row.amount) }));
}

export function selectCashFactsAfterReconciliation(
  reconciliation: { snapshot_at: string; snapshot_date: string },
  facts: CashFactRow[],
) {
  const cutoff = shanghaiCutoff(reconciliation.snapshot_at);
  return facts.flatMap<CashFactRow>((fact) => {
    if (fact.business_date > reconciliation.snapshot_date) return [{ ...fact, timing_status: 'after' }];
    if (fact.business_date < reconciliation.snapshot_date) return [];
    if (fact.kind === 'account_event' && fact.subtype === 'split') return [];
    if (!cutoff || cutoff.date !== reconciliation.snapshot_date) return [{ ...fact, timing_status: 'ambiguous' }];
    const factMinute = normalizeMinute(fact.business_time);
    if (!factMinute) return [{ ...fact, timing_status: 'ambiguous' }];
    if (factMinute > cutoff.minute) return [{ ...fact, timing_status: 'after' }];
    if (factMinute < cutoff.minute) return [];
    return [{ ...fact, timing_status: 'ambiguous' }];
  });
}

async function allRepoEvents(env: FinanceEnv) {
  const rows = await env.DB.prepare(`SELECT id, event_date, event_time, event_type,
      COALESCE(NULLIF(ticker, ''), NULLIF(ticker_name, ''), 'repo') AS repo_key, reference_value, amount
    FROM finance_account_events
    WHERE deleted_at IS NULL AND event_type IN ('repo_start', 'repo_maturity')
    ORDER BY event_date ASC, COALESCE(event_time, '00:00') ASC, id ASC`).all<RepoEventRow>();
  return rows.results.map((row) => ({
    ...row,
    reference_value: row.reference_value === null ? null : Number(row.reference_value),
    amount: row.amount === null ? null : Number(row.amount),
  }));
}

export function projectCash(anchorCash: number, facts: CashFactRow[]) {
  let value = Number(anchorCash);
  let projectedDelta = 0;
  let replayed = 0;
  const problems: string[] = [];

  for (const fact of facts) {
    if (fact.kind === 'account_event' && fact.subtype === 'split') continue;
    if (fact.timing_status === 'ambiguous') {
      problems.push(`${fact.fact_key} 与对账发生在同一财务日，但缺少足够时间精度，无法判断是否已包含在 Broker Cash 对账中。`);
      continue;
    }
    if (fact.kind === 'account_event') {
      if (fact.subtype === 'other') {
        problems.push(`${fact.fact_key} 是未分类账户事件，无法确定是否影响 Broker Cash。`);
        continue;
      }
      if (!CASH_ACCOUNT_EVENT_TYPES.has(fact.subtype)) continue;
    }
    if (fact.amount === null || !Number.isFinite(fact.amount)) {
      problems.push(`${fact.fact_key} 缺少明确现金影响。`);
      continue;
    }
    value += fact.amount;
    projectedDelta += fact.amount;
    replayed += 1;
  }

  return {
    value: problems.length ? null : normalizeMoney(value),
    known_value: normalizeMoney(value),
    status: problems.length ? 'incomplete' : replayed ? 'projected' : 'reconciled',
    projected_delta: normalizeMoney(projectedDelta),
    replayed_facts: replayed,
    problems,
  };
}

export function projectRepoAssets(events: RepoEventRow[]) {
  const open = new Map<string, Array<number | null>>();
  const problems: string[] = [];
  let value = 0;

  for (const event of events) {
    if (event.amount === null || !Number.isFinite(event.amount)) {
      problems.push(`account-event:${event.id} 缺少逆回购现金金额。`);
      continue;
    }
    const queue = open.get(event.repo_key) ?? [];
    const explicitPrincipal = event.reference_value !== null
      && Number.isFinite(event.reference_value)
      && event.reference_value > 0
      ? Number(event.reference_value)
      : null;

    if (event.event_type === 'repo_start') {
      if (event.amount >= 0) {
        problems.push(`account-event:${event.id} 的逆回购发生金额应为负数。`);
        continue;
      }
      queue.push(explicitPrincipal);
      open.set(event.repo_key, queue);
      if (explicitPrincipal !== null) value += explicitPrincipal;
      continue;
    }

    if (event.amount <= 0) {
      problems.push(`account-event:${event.id} 的逆回购回款金额应为正数。`);
      continue;
    }
    const carryingPrincipal = queue.shift();
    if (carryingPrincipal === undefined) {
      problems.push(`account-event:${event.id} 找不到对应的未到期逆回购。`);
      continue;
    }
    if (carryingPrincipal !== null) {
      if (explicitPrincipal !== null && Math.abs(explicitPrincipal - carryingPrincipal) > CASH_TOLERANCE) {
        problems.push(`account-event:${event.id} 的逆回购本金与发生记录不一致。`);
      }
      value -= carryingPrincipal;
    }
    if (queue.length) open.set(event.repo_key, queue); else open.delete(event.repo_key);
  }

  const missingOpenPrincipal = [...open.entries()]
    .flatMap(([key, queue]) => queue.filter((principal) => principal === null).map(() => key));
  for (const key of missingOpenPrincipal) problems.push(`未到期逆回购 ${key} 缺少明确本金，不能计入其他账户资产。`);

  if (Math.abs(value) < CASH_TOLERANCE) value = 0;
  return {
    value: problems.length ? null : normalizeMoney(value),
    known_value: normalizeMoney(value),
    status: problems.length ? 'incomplete' : open.size ? 'open_repo' : 'clear',
    open_repo_count: [...open.values()].reduce((sum, queue) => sum + queue.length, 0),
    problems,
  };
}

function shanghaiCutoff(snapshotAt: string) {
  const timestamp = new Date(snapshotAt).getTime();
  if (!Number.isFinite(timestamp)) return null;
  const localIso = new Date(timestamp + SHANGHAI_OFFSET_MS).toISOString();
  return { date: localIso.slice(0, 10), minute: localIso.slice(11, 16) };
}

function normalizeMinute(value: string | null) {
  if (!value) return null;
  const match = value.trim().match(/^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d(?:\.\d{1,3})?)?$/);
  return match ? `${match[1]}:${match[2]}` : null;
}

function normalizeMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
