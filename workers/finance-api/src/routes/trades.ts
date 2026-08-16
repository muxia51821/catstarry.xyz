import { apiError, json, readJson } from '../lib/http';
import { requireFinanceRole, type FinanceEnv } from './auth';

interface TradeInput {
  trade_date?: unknown;
  ticker?: unknown;
  ticker_name?: unknown;
  direction?: unknown;
  quantity?: unknown;
  price?: unknown;
  position_category?: unknown;
  reason?: unknown;
  trade_time?: unknown;
  fee?: unknown;
  net_cash_amount?: unknown;
}

interface HoldingSnapshot {
  quantity: number;
  avg_cost: number;
  snapshot_date: string;
  position_category: string;
}

interface TradeRow {
  id: number;
  trade_date: string;
  ticker: string;
  ticker_name: string | null;
  direction: 'buy' | 'sell';
  quantity: number;
  price: number;
  position_category: string;
  reason: string | null;
  trade_time: string | null;
  fee: number | null;
  net_cash_amount: number | null;
  created_by: string | null;
  deleted_at: string | null;
  memo_id?: number | null;
  memo_reason?: string | null;
  memo_reason_source?: string | null;
}

export const HOLDING_UPSERT_SQL = `WITH input (
    trade_date, ticker, direction, quantity, price, position_category
  ) AS (VALUES (?, ?, ?, ?, ?, ?)),
  current AS (
    SELECT h.quantity, h.avg_cost
    FROM holdings_snapshots h, input i
    WHERE h.ticker = i.ticker
    ORDER BY h.snapshot_date DESC, h.id DESC
    LIMIT 1
  ),
  calculated AS (
    SELECT i.*,
      COALESCE(c.quantity, 0) AS previous_quantity,
      COALESCE(c.avg_cost, 0) AS previous_cost
    FROM input i LEFT JOIN current c ON TRUE
  )
  INSERT INTO holdings_snapshots (
    snapshot_date, ticker, quantity, avg_cost, position_category
  )
  SELECT trade_date, ticker,
    previous_quantity + CASE direction WHEN 'buy' THEN quantity ELSE -quantity END,
    CASE
      WHEN direction = 'buy'
        THEN ((previous_quantity * previous_cost) + (quantity * price))
          / (previous_quantity + quantity)
      WHEN previous_quantity - quantity = 0 THEN 0
      ELSE previous_cost
    END,
    position_category
  FROM calculated
  WHERE TRUE
  ON CONFLICT(snapshot_date, ticker) DO UPDATE SET
    quantity = excluded.quantity,
    avg_cost = excluded.avg_cost,
    position_category = excluded.position_category`;

export async function handleTrades(request: Request, env: FinanceEnv): Promise<Response> {
  const pathname = new URL(request.url).pathname;
  if (pathname === '/api/trades' && request.method === 'GET') return listTrades(request, env);
  if (pathname === '/api/trades' && request.method === 'POST') return createTrade(request, env);
  const match = pathname.match(/^\/api\/trades\/(\d+)$/);
  if (!match) return apiError(405, 'method_not_allowed', 'Method is not allowed');
  const id = Number(match[1]);
  if (!Number.isSafeInteger(id) || id < 1) return apiError(400, 'invalid_id', 'Trade id is invalid');
  if (request.method === 'PATCH') return updateTrade(request, env, id);
  if (request.method === 'DELETE') return deleteTrade(request, env, id);
  return apiError(405, 'method_not_allowed', 'Method is not allowed');
}

async function listTrades(request: Request, env: FinanceEnv): Promise<Response> {
  const session = await requireFinanceRole(request, env);
  if (session instanceof Response) return session;
  const url = new URL(request.url); const limit = Number(url.searchParams.get('limit') ?? '50');
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) return apiError(400, 'invalid_limit', 'limit must be between 1 and 50');
  const start = optionalDate(url.searchParams.get('start')); const end = optionalDate(url.searchParams.get('end'));
  const ticker = (url.searchParams.get('ticker') ?? '').trim().toUpperCase(); const direction = url.searchParams.get('direction') ?? '';
  if (start === undefined || end === undefined || (start && end && start > end) || (ticker && !/^[A-Z0-9.-]{2,24}$/.test(ticker)) || (direction && !['buy', 'sell'].includes(direction))) return apiError(400, 'invalid_filter', 'Trade filters are invalid');
  const filter = { start: start ?? null, end: end ?? null, ticker: ticker || null, direction: direction || null };
  const cursor = decodeCursor(url.searchParams.get('cursor'), filter);
  if (cursor instanceof Response) return cursor;
  const clauses = ['t.deleted_at IS NULL']; const values: unknown[] = [];
  if (filter.start) { clauses.push('t.trade_date >= ?'); values.push(filter.start); }
  if (filter.end) { clauses.push('t.trade_date <= ?'); values.push(filter.end); }
  if (filter.ticker) { clauses.push('t.ticker = ?'); values.push(filter.ticker); }
  if (filter.direction) { clauses.push('t.direction = ?'); values.push(filter.direction); }
  if (cursor) { clauses.push('(t.trade_date < ? OR (t.trade_date = ? AND t.id < ?))'); values.push(cursor.sort, cursor.sort, cursor.id); }
  const rows = await env.DB.prepare(`SELECT t.*, m.id AS memo_id, m.reason AS memo_reason, m.reason_source AS memo_reason_source
    FROM trades t LEFT JOIN finance_memos m ON m.trade_id = t.id AND m.deleted_at IS NULL
    WHERE ${clauses.join(' AND ')} ORDER BY t.trade_date DESC, t.id DESC LIMIT ?`).bind(...values, limit + 1).all<TradeRow>();
  const items = rows.results.slice(0, limit); const last = items.at(-1);
  return json({ trades: items, items, nextCursor: rows.results.length > limit && last ? encodeCursor({ sort: last.trade_date, id: last.id, filter }) : null });
}

function optionalDate(value: string | null): string | null | undefined { return value === null || value === '' ? null : validDate(value) ? value : undefined; }
function encodeCursor(value: { sort: string; id: number; filter: unknown }): string { return btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, ''); }
function decodeCursor(value: string | null, filter: unknown): { sort: string; id: number } | null | Response {
  if (!value) return null;
  try { const source = value.replace(/-/g, '+').replace(/_/g, '/'); const parsed = JSON.parse(atob(source + '='.repeat((4 - source.length % 4) % 4))); if (!validDate(parsed.sort) || !Number.isSafeInteger(parsed.id) || parsed.id < 1 || JSON.stringify(parsed.filter) !== JSON.stringify(filter)) throw new Error(); return { sort: parsed.sort, id: parsed.id }; }
  catch { return apiError(400, 'invalid_cursor', 'Trade cursor is invalid'); }
}

async function createTrade(request: Request, env: FinanceEnv): Promise<Response> {
  const session = await requireFinanceRole(request, env, ['admin']);
  if (session instanceof Response) return session;
  if (await hasActiveBlackCircuit(env)) return apiError(409, 'black_circuit_active', 'All trades remain paused until both roles confirm recovery');
  const raw = await readJson<TradeInput>(request);
  if (raw instanceof Response) return raw;
  const input = normalizeTrade(raw);
  if (!input) return apiError(400, 'invalid_trade', 'Trade fields are invalid');

  const current = await latestHolding(env, input.ticker);
  if (current && input.trade_date < current.snapshot_date) {
    return apiError(409, 'backdated_trade', 'Backdated trades must be imported through the reviewed migration workflow');
  }
  if (input.direction === 'sell' && Number(current?.quantity ?? 0) < input.quantity) {
    return apiError(409, 'insufficient_holding', 'Sell quantity exceeds the current holding');
  }
  const now = new Date().toISOString();
  const results = await env.DB.batch([
    env.DB.prepare(HOLDING_UPSERT_SQL).bind(input.trade_date, input.ticker, input.direction, input.quantity, input.price, input.position_category),
    env.DB.prepare(`INSERT INTO trades (
      trade_date, trade_time, ticker, ticker_name, direction, quantity, price, fee, net_cash_amount, position_category, reason, needs_review, created_at, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`)
      .bind(input.trade_date, input.trade_time, input.ticker, input.ticker_name, input.direction, input.quantity, input.price, input.fee, input.net_cash_amount, input.position_category, input.reason, now, session.username),
  ]);
  const id = Number(results[1]?.meta.last_row_id);
  await env.DB.prepare(`INSERT INTO finance_trade_audit (trade_id, action, actor, occurred_at, after_json)
    VALUES (?, 'created', ?, ?, ?)`).bind(id, session.username, now, JSON.stringify(input)).run();
  return json({
    trade: { id, ...input, created_at: now, created_by: session.username },
    holding: await latestHolding(env, input.ticker),
  }, 201);
}

async function updateTrade(request: Request, env: FinanceEnv, id: number): Promise<Response> {
  const session = await requireFinanceRole(request, env, ['admin']);
  if (session instanceof Response) return session;
  if (await hasActiveBlackCircuit(env)) return apiError(409, 'black_circuit_active', 'All trades remain paused until both roles confirm recovery');
  const raw = await readJson<TradeInput>(request);
  if (raw instanceof Response) return raw;
  const input = normalizeTrade(raw);
  if (!input) return apiError(400, 'invalid_trade', 'Trade fields are invalid');
  const existing = await editableTrade(env, id);
  if (existing instanceof Response) return existing;
  if (input.ticker !== existing.ticker || input.trade_date !== existing.trade_date) {
    return apiError(409, 'immutable_trade_identity', 'Ticker and date stay fixed when editing an audited trade');
  }
  const previous = await previousHolding(env, existing.ticker, existing.trade_date);
  const next = calculateHolding(previous, input);
  if (!next) return apiError(409, 'insufficient_holding', 'The edited sell quantity exceeds the holding before this trade');
  const now = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare(`UPDATE trades SET ticker_name = ?, direction = ?, quantity = ?, price = ?, trade_time = ?, fee = ?, net_cash_amount = ?, position_category = ?, reason = ?,
      updated_at = ?, updated_by = ? WHERE id = ? AND deleted_at IS NULL`)
      .bind(input.ticker_name, input.direction, input.quantity, input.price, input.trade_time, input.fee, input.net_cash_amount, input.position_category, input.reason, now, session.username, id),
    env.DB.prepare(`UPDATE holdings_snapshots SET quantity = ?, avg_cost = ?, position_category = ?
      WHERE ticker = ? AND snapshot_date = ?`)
      .bind(next.quantity, next.avg_cost, input.position_category, existing.ticker, existing.trade_date),
    env.DB.prepare(`INSERT INTO finance_trade_audit (trade_id, action, actor, occurred_at, before_json, after_json)
      VALUES (?, 'updated', ?, ?, ?, ?)`)
      .bind(id, session.username, now, JSON.stringify(existing), JSON.stringify(input)),
  ]);
  return json({ trade: { id, ...input, updated_at: now, updated_by: session.username }, holding: await latestHolding(env, existing.ticker) });
}

async function deleteTrade(request: Request, env: FinanceEnv, id: number): Promise<Response> {
  const session = await requireFinanceRole(request, env, ['admin']);
  if (session instanceof Response) return session;
  if (await hasActiveBlackCircuit(env)) return apiError(409, 'black_circuit_active', 'All trades remain paused until both roles confirm recovery');
  const existing = await editableTrade(env, id);
  if (existing instanceof Response) return existing;
  const previous = await previousHolding(env, existing.ticker, existing.trade_date);
  const now = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare('UPDATE trades SET deleted_at = ?, deleted_by = ? WHERE id = ? AND deleted_at IS NULL').bind(now, session.username, id),
    env.DB.prepare(`UPDATE holdings_snapshots SET quantity = ?, avg_cost = ?, position_category = ?
      WHERE ticker = ? AND snapshot_date = ?`)
      .bind(Number(previous?.quantity ?? 0), Number(previous?.avg_cost ?? 0), previous?.position_category ?? existing.position_category, existing.ticker, existing.trade_date),
    env.DB.prepare(`INSERT INTO finance_trade_audit (trade_id, action, actor, occurred_at, before_json)
      VALUES (?, 'deleted', ?, ?, ?)`)
      .bind(id, session.username, now, JSON.stringify(existing)),
  ]);
  return json({ deleted: true, holding: await latestHolding(env, existing.ticker) });
}

async function editableTrade(env: FinanceEnv, id: number): Promise<TradeRow | Response> {
  const trade = await env.DB.prepare('SELECT * FROM trades WHERE id = ? AND deleted_at IS NULL').bind(id).first<TradeRow>();
  if (!trade) return apiError(404, 'not_found', 'Trade not found');
  const latest = await env.DB.prepare(`SELECT id FROM trades WHERE ticker = ? AND deleted_at IS NULL
    ORDER BY trade_date DESC, id DESC LIMIT 1`).bind(trade.ticker).first<{ id: number }>();
  const sameDay = await env.DB.prepare(`SELECT COUNT(*) AS count FROM trades
    WHERE ticker = ? AND trade_date = ? AND deleted_at IS NULL`).bind(trade.ticker, trade.trade_date).first<{ count: number }>();
  const holding = await latestHolding(env, trade.ticker);
  if (latest?.id !== id || Number(sameDay?.count ?? 0) !== 1 || holding?.snapshot_date !== trade.trade_date) {
    return apiError(409, 'trade_locked_by_history', 'Only the latest standalone online trade can be changed without rewriting reviewed history');
  }
  return trade;
}

async function latestHolding(env: FinanceEnv, ticker: string): Promise<HoldingSnapshot | null> {
  return env.DB.prepare(`SELECT quantity, avg_cost, snapshot_date, position_category FROM holdings_snapshots
    WHERE ticker = ? ORDER BY snapshot_date DESC, id DESC LIMIT 1`).bind(ticker).first<HoldingSnapshot>();
}

async function previousHolding(env: FinanceEnv, ticker: string, beforeDate: string): Promise<HoldingSnapshot | null> {
  return env.DB.prepare(`SELECT quantity, avg_cost, snapshot_date, position_category FROM holdings_snapshots
    WHERE ticker = ? AND snapshot_date < ? ORDER BY snapshot_date DESC, id DESC LIMIT 1`).bind(ticker, beforeDate).first<HoldingSnapshot>();
}

function calculateHolding(previous: HoldingSnapshot | null, input: ReturnType<typeof normalizeTrade>) {
  if (!input) return null;
  const previousQuantity = Number(previous?.quantity ?? 0);
  const previousCost = Number(previous?.avg_cost ?? 0);
  const quantity = input.direction === 'buy' ? previousQuantity + input.quantity : previousQuantity - input.quantity;
  if (quantity < 0) return null;
  const avg_cost = input.direction === 'buy'
    ? ((previousQuantity * previousCost) + (input.quantity * input.price)) / quantity
    : quantity === 0 ? 0 : previousCost;
  return { quantity, avg_cost };
}

function normalizeTrade(value: TradeInput) {
  const trade_date = typeof value.trade_date === 'string' ? value.trade_date.trim() : '';
  const ticker = typeof value.ticker === 'string' ? value.ticker.trim().toUpperCase() : '';
  const ticker_name = typeof value.ticker_name === 'string' ? value.ticker_name.trim() || null : null;
  const direction = value.direction;
  const quantity = Number(value.quantity);
  const price = Number(value.price);
  const position_category = typeof value.position_category === 'string' ? value.position_category.trim() : '';
  const reason = typeof value.reason === 'string' ? value.reason.trim() || null : null;
  const trade_time = value.trade_time === undefined || value.trade_time === null || value.trade_time === '' ? null : typeof value.trade_time === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value.trade_time.trim()) ? value.trade_time.trim() : undefined;
  const fee = optionalFinite(value.fee);
  const net_cash_amount = optionalFinite(value.net_cash_amount);
  if (!validDate(trade_date) || !/^[A-Z0-9.-]{2,24}$/.test(ticker) || !['buy', 'sell'].includes(String(direction))) return null;
  if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 1e15 || !Number.isFinite(price) || price <= 0 || price > 1e12 || !Number.isFinite(quantity * price)) return null;
  if (!position_category || position_category.length > 64 || (ticker_name?.length ?? 0) > 100 || (reason?.length ?? 0) > 2_000 || trade_time === undefined || fee === undefined || net_cash_amount === undefined || (fee !== null && fee < 0)) return null;
  return { trade_date, trade_time, ticker, ticker_name, direction: direction as 'buy' | 'sell', quantity, price, fee, net_cash_amount, position_category, reason };
}

function optionalFinite(value: unknown): number | null | undefined {
  if (value === undefined || value === null || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) && Math.abs(number) <= 1e15 ? number : undefined;
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

async function hasActiveBlackCircuit(env: FinanceEnv) {
  return env.DB.prepare(`SELECT id FROM circuit_breaker_log
    WHERE level = 'black' AND resolved_at IS NULL ORDER BY triggered_at DESC, id DESC LIMIT 1`).first();
}
