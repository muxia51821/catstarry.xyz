import type { FinanceEnv } from '../routes/auth';

const SYNTHETIC_RECONCILIATION_SOURCES = ['auto_close', 'historical_backfill', 'history_import'];

export type ReconciliationAnchorRow = {
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

export type SnapshotHoldingRow = {
  ticker: string;
  quantity: number;
  position_category: string | null;
  avg_cost: number;
  ticker_name: string | null;
  price: number | null;
  fetched_at: string | null;
};

export async function latestReconciliation(env: FinanceEnv): Promise<ReconciliationAnchorRow | null> {
  return env.DB.prepare(`SELECT id, snapshot_at, snapshot_date, holdings_value, cash_value, other_assets_value, total_value, source, created_at, created_by
    FROM finance_asset_snapshots
    WHERE deleted_at IS NULL AND is_complete = 1
      AND lower(COALESCE(source, '')) NOT IN (${SYNTHETIC_RECONCILIATION_SOURCES.map(() => '?').join(', ')})
    ORDER BY snapshot_date DESC, julianday(snapshot_at) DESC, id DESC LIMIT 1`)
    .bind(...SYNTHETIC_RECONCILIATION_SOURCES).first<ReconciliationAnchorRow>();
}

export async function latestSnapshotHoldings(
  env: FinanceEnv,
  options: { throughDate?: string; quotes?: boolean; displayNames?: boolean } = {},
): Promise<SnapshotHoldingRow[]> {
  const columns = ['h.ticker', 'h.quantity', 'h.avg_cost', 'h.position_category'];
  if (options.displayNames) {
    columns.push(`(SELECT t.ticker_name FROM trades t
        WHERE t.ticker = h.ticker AND t.ticker_name IS NOT NULL AND t.ticker_name <> ''
        ORDER BY t.trade_date DESC, t.id DESC LIMIT 1) AS ticker_name`);
  }
  if (options.quotes) {
    columns.push('(SELECT price FROM market_data m WHERE m.ticker = h.ticker ORDER BY fetched_at DESC, id DESC LIMIT 1) AS price');
    columns.push('(SELECT fetched_at FROM market_data m WHERE m.ticker = h.ticker ORDER BY fetched_at DESC, id DESC LIMIT 1) AS fetched_at');
  }
  const rows = await env.DB.prepare(`WITH latest AS (
      SELECT ticker, MAX(snapshot_date || ':' || printf('%020d', id)) AS marker
      FROM holdings_snapshots ${options.throughDate ? 'WHERE snapshot_date <= ?' : ''} GROUP BY ticker
    )
    SELECT ${columns.join(', ')}
    FROM holdings_snapshots h
    JOIN latest l ON l.ticker = h.ticker AND l.marker = h.snapshot_date || ':' || printf('%020d', h.id)
    WHERE h.quantity > 0 ORDER BY h.ticker`)
    .bind(...(options.throughDate ? [options.throughDate] : []))
    .all<{
      ticker: string;
      quantity: number;
      avg_cost: number;
      position_category: string | null;
      ticker_name?: string | null;
      price?: number | null;
      fetched_at?: string | null;
    }>();
  return rows.results.map((row) => ({
    ticker: row.ticker,
    quantity: Number(row.quantity),
    position_category: row.position_category,
    avg_cost: Number(row.avg_cost),
    ticker_name: row.ticker_name ?? null,
    price: row.price ?? null,
    fetched_at: row.fetched_at ?? null,
  }));
}
