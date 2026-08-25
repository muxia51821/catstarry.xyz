import { apiError, json } from '../lib/http';
import { isPersistedMarketSnapshotUsable } from '../modules/market-authority';
import { latestReconciliation, latestSnapshotHoldings } from '../modules/snapshots';
import { requireFinanceRole, type FinanceEnv } from './auth';

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

type PositionLimitRow = {
  position_category: string;
  target_ratio: number;
  lower_ratio: number;
  upper_ratio: number;
};

type ContributionBasis = {
  initial_capital: number | null;
  net_cash_flows: number;
  cash_flow_count: number;
};

const CASH_ACCOUNT_EVENT_TYPES = new Set(['dividend', 'dividend_tax', 'repo_start', 'repo_maturity', 'refund']);
const CASH_TOLERANCE = 0.000001;
const SHANGHAI_OFFSET_MS = 8 * 60 * 60 * 1000;

export async function handleAccountState(request: Request, env: FinanceEnv): Promise<Response> {
  if (request.method !== 'GET') return apiError(405, 'method_not_allowed', 'Method is not allowed');
  const session = await requireFinanceRole(request, env);
  if (session instanceof Response) return session;
  return json(await readAccountState(env));
}

export async function readAccountState(env: FinanceEnv, now: Date = new Date()) {
  const [reconciliation, holdings, repoEvents, positionLimits, contributionBasis] = await Promise.all([
    latestReconciliation(env),
    currentHoldings(env, now),
    allRepoEvents(env),
    readPositionLimits(env),
    readContributionBasis(env),
  ]);
  const repoState = projectRepoAssets(repoEvents);

  if (!reconciliation) {
    const state = {
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
      performance: projectCumulativePnl(null, contributionBasis),
    };
    return { ...state, portfolio_roles: projectPortfolioRoles(state, positionLimits) };
  }

  const candidateFacts = await cashFactsOnOrAfter(env, reconciliation.snapshot_date);
  const cashFacts = selectCashFactsAfterReconciliation(reconciliation, candidateFacts);
  const cash = projectCash(reconciliation.cash_value, cashFacts);
  const totalAssets = holdings.complete && cash.status !== 'incomplete' && repoState.status !== 'incomplete'
    ? Number(holdings.market_value) + Number(cash.value) + Number(repoState.value)
    : null;

  const state = {
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
    performance: projectCumulativePnl(totalAssets, contributionBasis),
  };
  return { ...state, portfolio_roles: projectPortfolioRoles(state, positionLimits) };
}

async function readContributionBasis(env: FinanceEnv): Promise<ContributionBasis> {
  const [plan, cashFlows] = await Promise.all([
    env.DB.prepare('SELECT initial_capital FROM plan_params WHERE id = 1').first<{ initial_capital: number | null }>(),
    env.DB.prepare('SELECT net_amount FROM finance_cash_flows WHERE deleted_at IS NULL').all<{ net_amount: number }>(),
  ]);
  const initialCapital = plan?.initial_capital === null || plan?.initial_capital === undefined
    ? null
    : Number(plan.initial_capital);
  return {
    initial_capital: initialCapital !== null && Number.isFinite(initialCapital) && initialCapital >= 0 ? initialCapital : null,
    net_cash_flows: cashFlows.results.reduce((sum, row) => sum + Number(row.net_amount), 0),
    cash_flow_count: cashFlows.results.length,
  };
}

export function projectCumulativePnl(totalAssets: number | null, basis: ContributionBasis) {
  if (basis.initial_capital === null || totalAssets === null || !Number.isFinite(totalAssets)) {
    return {
      status: 'unavailable' as const,
      initial_capital: basis.initial_capital,
      net_cash_flows: basis.net_cash_flows,
      cash_flow_count: basis.cash_flow_count,
      total_contributions: null,
      pnl: null,
    };
  }
  const totalContributions = normalizeMoney(basis.initial_capital + basis.net_cash_flows);
  return {
    status: 'available' as const,
    initial_capital: basis.initial_capital,
    net_cash_flows: normalizeMoney(basis.net_cash_flows),
    cash_flow_count: basis.cash_flow_count,
    total_contributions: totalContributions,
    pnl: normalizeMoney(totalAssets - totalContributions),
  };
}

async function readPositionLimits(env: FinanceEnv) {
  const rows = await env.DB.prepare(`SELECT position_category, target_ratio, lower_ratio, upper_ratio
    FROM position_limits ORDER BY position_category`).all<PositionLimitRow>();
  return rows.results.filter((row) => row.position_category !== 'A股总敞口（主动+宽基）').map((row) => ({
    position_category: row.position_category,
    target_ratio: Number(row.target_ratio),
    lower_ratio: Number(row.lower_ratio),
    upper_ratio: Number(row.upper_ratio),
  }));
}

async function currentHoldings(env: FinanceEnv, now: Date) {
  const rows = await latestSnapshotHoldings(env, { quotes: true });

  const normalized = rows.map((row) => {
    const numericPrice = row.price === null ? null : Number(row.price);
    const hasPrice = numericPrice !== null && Number.isFinite(numericPrice);
    const stale = hasPrice && !isPersistedMarketSnapshotUsable(row.fetched_at, now);
    return {
      ticker: row.ticker,
      quantity: Number(row.quantity),
      position_category: typeof row.position_category === 'string' && row.position_category.trim() ? row.position_category.trim() : null,
      price: hasPrice && !stale ? numericPrice : null,
      fetched_at: row.fetched_at,
      stale,
      missing_price: !hasPrice,
      market_value: hasPrice && !stale ? Number(row.quantity) * numericPrice : null,
    };
  });
  const unavailable = normalized.filter((row) => row.price === null).map((row) => row.ticker);
  const stale = normalized.filter((row) => row.stale).map((row) => row.ticker);
  const missingPrice = normalized.filter((row) => row.missing_price).map((row) => row.ticker);
  const priced = normalized.reduce((sum, row) => sum + (row.market_value ?? 0), 0);
  const problems = [
    ...(missingPrice.length ? [`持仓 ${missingPrice.join('、')} 缺少当前市场价格。`] : []),
    ...(stale.length ? [`开市期间持仓 ${stale.join('、')} 的最后成功行情刷新已超过当前 market authority 的 freshness SLA。`] : []),
  ];
  return {
    market_value: unavailable.length ? null : priced,
    priced_market_value: priced,
    complete: unavailable.length === 0,
    items: normalized.map(({ ticker, position_category, market_value }) => ({ ticker, position_category, market_value })),
    missing_tickers: unavailable,
    stale_tickers: stale,
    problems,
  };
}

type PortfolioRoleProjectionInput = {
  holdings: { items: Array<{ ticker: string; position_category: string | null; market_value: number | null }> };
  cash: { value: number | null };
  other_assets: { value: number | null; status: string };
  total_assets: number | null;
  total_status: string;
};

type PortfolioRoleSource = 'security_holding' | 'broker_cash' | 'open_reverse_repo';

export function projectPortfolioRoles(state: PortfolioRoleProjectionInput, positionLimits: PositionLimitRow[] = []) {
  const roles = new Map<string, { value: number; sources: Set<PortfolioRoleSource> }>();
  const composition = new Map<string, { value: number; sources: Set<PortfolioRoleSource>; rawRoles: Set<string> }>();
  const unclassified: Array<{ source: 'security_holding'; ticker: string; value: number | null }> = [];
  const add = (role: string, value: number | null, source: PortfolioRoleSource) => {
    if (value === null || !Number.isFinite(value) || value <= 0) return;
    const current = roles.get(role) ?? { value: 0, sources: new Set<PortfolioRoleSource>() };
    current.value += value;
    current.sources.add(source);
    roles.set(role, current);
  };
  const addComposition = (role: string, value: number | null, source: PortfolioRoleSource, rawRole?: string) => {
    const hasValue = value !== null && Number.isFinite(value) && value > 0;
    if (!hasValue && !rawRole) return;
    const key = normalizePortfolioRole(role);
    const current = composition.get(key) ?? { value: 0, sources: new Set<PortfolioRoleSource>(), rawRoles: new Set<string>() };
    if (hasValue) current.value += value;
    current.sources.add(source);
    if (rawRole) current.rawRoles.add(rawRole);
    composition.set(key, current);
  };

  for (const holding of state.holdings.items) {
    const role = holding.position_category?.trim() || null;
    if (role === null) {
      unclassified.push({ source: 'security_holding', ticker: holding.ticker, value: holding.market_value });
      continue;
    }
    add(role, holding.market_value, 'security_holding');
    addComposition(role, holding.market_value, 'security_holding', role);
  }
  add('机动仓', state.cash.value, 'broker_cash');
  addComposition('机动仓', state.cash.value, 'broker_cash');
  if (state.other_assets.status === 'open_repo') {
    add('机动仓', state.other_assets.value, 'open_reverse_repo');
    addComposition('机动仓', state.other_assets.value, 'open_reverse_repo');
  }

  const total = state.total_assets !== null && Number.isFinite(state.total_assets) && state.total_assets > 0
    ? state.total_assets
    : null;
  const limits = new Map(positionLimits
    .filter((limit) => limit.position_category !== 'A股总敞口（主动+宽基）')
    .map((limit) => [normalizePortfolioRole(limit.position_category), limit]));
  for (const role of limits.keys()) {
    if (!composition.has(role)) composition.set(role, { value: 0, sources: new Set<PortfolioRoleSource>(), rawRoles: new Set<string>() });
  }
  const unclassifiedValue = unclassified.reduce((sum, item) => sum + (item.value ?? 0), 0);
  if (unclassifiedValue > 0) composition.set('unclassified', {
    value: unclassifiedValue,
    sources: new Set<PortfolioRoleSource>(['security_holding']),
    rawRoles: new Set<string>(),
  });

  return {
    total_assets: state.total_assets,
    total_status: state.total_status,
    percentage_available: total !== null,
    roles: [...roles.entries()].map(([role, entry]) => ({
      role,
      value: entry.value,
      percentage: total === null ? null : entry.value / total,
      sources: [...entry.sources],
    })),
    composition: [...composition.entries()].map(([role, entry]) => {
      const limit = limits.get(role) ?? null;
      const percentage = total === null ? null : entry.value / total;
      return {
        role,
        value: entry.value,
        percentage,
        sources: [...entry.sources],
        raw_roles: [...entry.rawRoles],
        target_ratio: limit ? limit.target_ratio : null,
        lower_ratio: limit ? limit.lower_ratio : null,
        upper_ratio: limit ? limit.upper_ratio : null,
        deviation: percentage === null || !limit ? null : percentage - limit.target_ratio,
      };
    }),
    unclassified,
  };
}

function normalizePortfolioRole(role: string) {
  const aliases: Record<string, string> = {
    '主动操作仓（A股）': '主动操作仓',
    '主动仓': '主动操作仓',
    'A股宽基指数底仓': 'A股宽基指数',
    '机动仓（货币ETF）': '机动仓',
    '货币基金/现金': '机动仓',
    '美股ETF（A股跨境ETF）': '美股 ETF',
    '美股宽基指数底仓': '美股 ETF',
  };
  return aliases[role] ?? role;
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
