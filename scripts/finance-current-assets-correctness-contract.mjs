import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { MARKET_FRESHNESS_SLA_MS, isAStockTradingWindow, isPersistedMarketSnapshotUsable } from '../workers/finance-api/src/modules/market-authority.ts';
import { readAccountState } from '../workers/finance-api/src/routes/account-state.ts';

const refreshSource = await readFile('workers/finance-api/src/tasks/refresh-market-data.ts', 'utf8');
assert.equal(MARKET_FRESHNESS_SLA_MS, 30 * 60 * 1000);
assert.match(refreshSource, /MARKET_FRESHNESS_SLA_MS, isAStockTradingWindow.*market-authority/, 'market refresh and current-account reads must share the same freshness authority');
assert.doesNotMatch(refreshSource, /const STALE_QUOTE_SLA_MS|function isTradingTime/, 'market refresh must not retain a second freshness SLA or trading-window implementation');

const TRADING_NOW = new Date('2026-07-31T06:00:00.000Z'); // 14:00 Asia/Shanghai
const AFTER_CLOSE = new Date('2026-07-31T12:00:00.000Z'); // 20:00 Asia/Shanghai
const WEEKEND = new Date('2026-08-01T06:00:00.000Z'); // Saturday 14:00 Asia/Shanghai
const FRESH_FETCH = '2026-07-31T05:50:00.000Z';
const STALE_FETCH = '2026-07-31T01:30:00.000Z';

assert.equal(isAStockTradingWindow(TRADING_NOW), true);
assert.equal(isAStockTradingWindow(AFTER_CLOSE), false);
assert.equal(isAStockTradingWindow(WEEKEND), false);
assert.equal(isPersistedMarketSnapshotUsable(FRESH_FETCH, TRADING_NOW), true);
assert.equal(isPersistedMarketSnapshotUsable(STALE_FETCH, TRADING_NOW), false);
assert.equal(isPersistedMarketSnapshotUsable(STALE_FETCH, AFTER_CLOSE), true);
assert.equal(isPersistedMarketSnapshotUsable(STALE_FETCH, WEEKEND), true);

class SqliteD1Prepared {
  constructor(db, sql, values = []) { this.db = db; this.sql = sql; this.values = values; }
  bind(...values) { return new SqliteD1Prepared(this.db, this.sql, values); }
  async first() { return this.db.prepare(this.sql).get(...this.values) ?? null; }
  async all() { return { results: this.db.prepare(this.sql).all(...this.values) }; }
}
class SqliteD1 {
  constructor(db) { this.db = db; }
  prepare(sql) { return new SqliteD1Prepared(this.db, sql); }
}

async function accountStateWithQuote(fetchedAt, now) {
  const database = new DatabaseSync(':memory:');
  for (const file of (await readdir('workers/finance-api/migrations')).filter((name) => name.endsWith('.sql')).sort()) {
    database.exec(await readFile(path.join('workers/finance-api/migrations', file), 'utf8'));
  }
  database.prepare(`INSERT INTO finance_asset_snapshots (
    snapshot_at, snapshot_date, holdings_value, cash_value, other_assets_value, total_value, source, is_complete, created_at, created_by
  ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`).run(
    '2026-07-31T00:00:00.000Z', '2026-07-31', 1_000, 1_000, 0, 2_000,
    'broker_reconciliation', '2026-07-31T00:00:00.000Z', 'muxia',
  );
  database.prepare(`INSERT INTO holdings_snapshots (snapshot_date, ticker, quantity, avg_cost, position_category)
    VALUES ('2026-07-31', '510300', 100, 9, 'A股宽基指数底仓')`).run();
  database.prepare(`INSERT INTO market_data (ticker, price, pe_ttm, fetched_at)
    VALUES ('510300', 10, NULL, ?)`).run(fetchedAt);
  const state = await readAccountState({ DB: new SqliteD1(database) }, now);
  database.close();
  return state;
}

const freshState = await accountStateWithQuote(FRESH_FETCH, TRADING_NOW);
assert.equal(freshState.holdings.complete, true);
assert.deepEqual(freshState.holdings.stale_tickers, []);
assert.equal(freshState.holdings.market_value, 1_000);
assert.equal(freshState.total_assets, 2_000);

const staleState = await accountStateWithQuote(STALE_FETCH, TRADING_NOW);
assert.equal(staleState.holdings.complete, false);
assert.deepEqual(staleState.holdings.stale_tickers, ['510300']);
assert.equal(staleState.holdings.market_value, null);
assert.equal(staleState.total_assets, null, 'stale intraday quotes must not produce an exact current total asset value');
assert.match(staleState.holdings.problems.join(' '), /freshness SLA/);

const afterCloseState = await accountStateWithQuote(STALE_FETCH, AFTER_CLOSE);
assert.equal(afterCloseState.holdings.complete, true, 'the last accepted quote remains usable outside the A-share trading window');
assert.equal(afterCloseState.total_assets, 2_000);

const weekendState = await accountStateWithQuote(STALE_FETCH, WEEKEND);
assert.equal(weekendState.holdings.complete, true, 'weekend reads retain the last accepted quote instead of applying a mechanical 30-minute expiry');
assert.equal(weekendState.total_assets, 2_000);

console.log('Finance current Total Assets market freshness authority regression passed.');
