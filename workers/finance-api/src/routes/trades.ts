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
}

interface HoldingSnapshot {
  quantity: number;
  avg_cost: number;
  snapshot_date: string;
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
  if (request.method === 'GET') return listTrades(request, env);
  if (request.method === 'POST') return createTrade(request, env);
  return apiError(405, 'method_not_allowed', 'Method is not allowed');
}

async function listTrades(request: Request, env: FinanceEnv): Promise<Response> {
  const session = await requireFinanceRole(request, env);
  if (session instanceof Response) return session;
  const limit = Number(new URL(request.url).searchParams.get('limit') ?? '100');
  if (!Number.isInteger(limit) || limit < 1 || limit > 500) return apiError(400, 'invalid_limit', 'limit must be between 1 and 500');
  const rows = await env.DB.prepare('SELECT * FROM trades ORDER BY trade_date DESC, id DESC LIMIT ?').bind(limit).all();
  return json({ trades: rows.results });
}

async function createTrade(request: Request, env: FinanceEnv): Promise<Response> {
  const session = await requireFinanceRole(request, env, ['admin']);
  if (session instanceof Response) return session;
  const raw = await readJson<TradeInput>(request);
  if (raw instanceof Response) return raw;
  const input = normalizeTrade(raw);
  if (!input) return apiError(400, 'invalid_trade', 'Trade fields are invalid');

  const current = await env.DB.prepare(`SELECT quantity, avg_cost, snapshot_date FROM holdings_snapshots
    WHERE ticker = ? ORDER BY snapshot_date DESC, id DESC LIMIT 1`)
    .bind(input.ticker).first<HoldingSnapshot>();
  if (current && input.trade_date < current.snapshot_date) {
    return apiError(409, 'backdated_trade', 'Backdated trades must be imported through the reviewed migration workflow');
  }
  const previousQuantity = Number(current?.quantity ?? 0);
  if (input.direction === 'sell' && previousQuantity < input.quantity) {
    return apiError(409, 'insufficient_holding', 'Sell quantity exceeds the current holding');
  }

  const statements = [
    env.DB.prepare(HOLDING_UPSERT_SQL)
      .bind(
        input.trade_date,
        input.ticker,
        input.direction,
        input.quantity,
        input.price,
        input.position_category,
      ),
    env.DB.prepare(`INSERT INTO trades (
      trade_date, ticker, ticker_name, direction, quantity, price, position_category, reason, needs_review
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`)
      .bind(input.trade_date, input.ticker, input.ticker_name, input.direction, input.quantity, input.price, input.position_category, input.reason),
  ];
  let results;
  try {
    results = await env.DB.batch(statements);
  } catch (error) {
    if (input.direction === 'sell') {
      const latest = await env.DB.prepare(`SELECT quantity, avg_cost, snapshot_date FROM holdings_snapshots
        WHERE ticker = ? ORDER BY snapshot_date DESC, id DESC LIMIT 1`)
        .bind(input.ticker).first<HoldingSnapshot>();
      if (Number(latest?.quantity ?? 0) < input.quantity) {
        return apiError(409, 'insufficient_holding', 'Sell quantity exceeds the current holding');
      }
    }
    throw error;
  }
  const holding = await env.DB.prepare(`SELECT quantity, avg_cost, snapshot_date FROM holdings_snapshots
    WHERE ticker = ? ORDER BY snapshot_date DESC, id DESC LIMIT 1`)
    .bind(input.ticker).first<HoldingSnapshot>();
  const id = results[1]?.meta.last_row_id;
  return json({
    trade: { id, ...input },
    holding: {
      quantity: Number(holding?.quantity ?? 0),
      avg_cost: Number(holding?.avg_cost ?? 0),
    },
  }, 201);
}

function normalizeTrade(value: TradeInput) {
  const tradeDate = typeof value.trade_date === 'string' ? value.trade_date.trim() : '';
  const ticker = typeof value.ticker === 'string' ? value.ticker.trim().toUpperCase() : '';
  const tickerName = typeof value.ticker_name === 'string' ? value.ticker_name.trim() : null;
  const direction = value.direction;
  const quantity = Number(value.quantity);
  const price = Number(value.price);
  const category = typeof value.position_category === 'string' ? value.position_category.trim() : '';
  const reason = typeof value.reason === 'string' ? value.reason.trim() || null : null;
  if (!validDate(tradeDate)) return null;
  if (!/^[A-Z0-9.-]{2,24}$/.test(ticker) || !['buy', 'sell'].includes(String(direction))) return null;
  if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 1e15 || !Number.isFinite(price) || price <= 0 || price > 1e12) return null;
  if (!Number.isFinite(quantity * price)) return null;
  if (!category || category.length > 64 || (tickerName?.length ?? 0) > 100 || (reason?.length ?? 0) > 2_000) return null;
  return {
    trade_date: tradeDate,
    ticker,
    ticker_name: tickerName,
    direction: direction as 'buy' | 'sell',
    quantity,
    price,
    position_category: category,
    reason,
  };
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}
