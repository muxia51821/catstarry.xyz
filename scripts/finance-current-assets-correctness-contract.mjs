import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { MARKET_FRESHNESS_SLA_MS, isAStockTradingWindow, isPersistedMarketSnapshotUsable } from '../workers/finance-api/src/modules/market-authority.ts';
import { SqliteD1 } from './lib/sqlite-d1.mjs';
import { readAccountState } from '../workers/finance-api/src/routes/account-state.ts';
import { handleDashboard } from '../workers/finance-api/src/routes/dashboard.ts';

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

class MemoryKv {
  values = new Map();
  async get(key, type) {
    const value = this.values.get(key);
    if (value === undefined) return null;
    if (type === 'json') return typeof value === 'string' ? JSON.parse(value) : value;
    return typeof value === 'string' ? value : JSON.stringify(value);
  }
  async put(key, value) { this.values.set(key, value); }
  async delete(key) { this.values.delete(key); }
}

function dashboardRequest(pathname, token) {
  return new Request(`https://finance.test${pathname}`, { headers: { Cookie: `token=${token}` } });
}

async function dashboardWithQuote(fetchedAt, now, { omitQuote = false, avgCost = 15 } = {}) {
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
    VALUES ('2026-07-31', '510300', 100, ?, 'A股宽基指数底仓')`).run(avgCost);
  if (!omitQuote) {
    database.prepare(`INSERT INTO market_data (ticker, price, pe_ttm, fetched_at)
      VALUES ('510300', 10, NULL, ?)`).run(fetchedAt);
  }
  const token = randomUUID();
  const kv = new MemoryKv();
  kv.values.set(`session:${token}`, {
    username: 'admin',
    role: 'admin',
    expires_at: '2099-01-01T00:00:00.000Z',
  });
  const env = { FINANCE_AUTH_KV: kv, DB: new SqliteD1(database) };
  const holdingsResponse = await handleDashboard(dashboardRequest('/api/holdings', token), env, '/api/holdings', now);
  const riskResponse = await handleDashboard(dashboardRequest('/api/risk/signals', token), env, '/api/risk/signals', now);
  assert.equal(holdingsResponse.status, 200);
  assert.equal(riskResponse.status, 200);
  const holdings = await holdingsResponse.json();
  const risk = await riskResponse.json();
  database.close();
  return { holdings, risk };
}

const dashboardFresh = await dashboardWithQuote(FRESH_FETCH, TRADING_NOW);
assert.equal(dashboardFresh.holdings.holdings[0].price, 10);
assert.equal(dashboardFresh.holdings.holdings[0].stale, false);
assert.equal(dashboardFresh.holdings.holdings[0].market_value, 1_000);
assert.equal(dashboardFresh.holdings.total_market_value, 1_000);
assert.equal(dashboardFresh.holdings.market_data_complete, true);
assert.ok(dashboardFresh.risk.single_position_loss !== null, 'fresh intraday quotes must still produce quote-based risk signals');
assert.ok(dashboardFresh.risk.signals.some((signal) => signal.level === 'stop_loss'));

const dashboardStaleIntraday = await dashboardWithQuote(STALE_FETCH, TRADING_NOW);
assert.equal(dashboardStaleIntraday.holdings.holdings[0].price, null, 'stale intraday quote must not expose an exact price in /api/holdings');
assert.equal(dashboardStaleIntraday.holdings.holdings[0].stale, true);
assert.equal(dashboardStaleIntraday.holdings.holdings[0].market_value, null, 'stale intraday quote must not expose market_value');
assert.equal(dashboardStaleIntraday.holdings.holdings[0].pnl, null);
assert.equal(dashboardStaleIntraday.holdings.holdings[0].pnl_ratio, null);
assert.equal(dashboardStaleIntraday.holdings.total_market_value, null, 'stale intraday quotes must not expose an exact total market value in /api/holdings');
assert.equal(dashboardStaleIntraday.holdings.market_data_complete, false);
assert.equal(dashboardStaleIntraday.risk.single_position_loss, null, 'stale intraday quotes must not produce quote-based risk signals');

const dashboardAfterClose = await dashboardWithQuote(STALE_FETCH, AFTER_CLOSE);
assert.equal(dashboardAfterClose.holdings.holdings[0].price, 10, 'the last accepted quote remains usable in /api/holdings after close');
assert.equal(dashboardAfterClose.holdings.holdings[0].stale, false);
assert.equal(dashboardAfterClose.holdings.total_market_value, 1_000);
assert.ok(dashboardAfterClose.risk.single_position_loss !== null, 'quote-based risk signals remain after close');

const dashboardWeekend = await dashboardWithQuote(STALE_FETCH, WEEKEND);
assert.equal(dashboardWeekend.holdings.holdings[0].price, 10, 'weekend /api/holdings retains the last accepted quote instead of applying a mechanical 30-minute expiry');
assert.equal(dashboardWeekend.holdings.holdings[0].stale, false);
assert.equal(dashboardWeekend.holdings.total_market_value, 1_000);
assert.ok(dashboardWeekend.risk.single_position_loss !== null, 'quote-based risk signals remain on weekends');

const dashboardMissingPrice = await dashboardWithQuote(null, TRADING_NOW, { omitQuote: true });
assert.equal(dashboardMissingPrice.holdings.holdings[0].price, null);
assert.equal(dashboardMissingPrice.holdings.holdings[0].stale, false, 'a missing price must not be labelled stale');
assert.equal(dashboardMissingPrice.holdings.holdings[0].missing_price, true, 'a missing price must be marked missing_price');
assert.equal(dashboardMissingPrice.holdings.holdings[0].market_value, null);
assert.equal(dashboardMissingPrice.holdings.market_data_complete, false);
assert.equal(dashboardMissingPrice.risk.single_position_loss, null);

console.log('Finance current Total Assets market freshness authority regression passed.');
