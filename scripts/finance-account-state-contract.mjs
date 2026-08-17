import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { projectCash, projectRepoAssets, readAccountState } from '../workers/finance-api/src/routes/account-state.ts';

const cash = projectCash(20_725.50, [
  { fact_key: 'trade:1', business_date: '2026-08-17', business_time: '10:00', kind: 'trade', subtype: 'buy', amount: -1_000.20, repo_key: null },
  { fact_key: 'cash-flow:1', business_date: '2026-08-17', business_time: null, kind: 'cash_flow', subtype: 'monthly_investment', amount: 5_000, repo_key: null },
  { fact_key: 'account-event:1', business_date: '2026-08-17', business_time: null, kind: 'account_event', subtype: 'dividend', amount: 50, repo_key: '300750' },
  { fact_key: 'account-event:2', business_date: '2026-08-17', business_time: '14:00', kind: 'account_event', subtype: 'repo_start', amount: -2_000.01, repo_key: 'R-001' },
  { fact_key: 'account-event:3', business_date: '2026-08-17', business_time: null, kind: 'account_event', subtype: 'split', amount: null, repo_key: '515880' },
]);
assert.deepEqual(cash, {
  value: 22_775.29,
  known_value: 22_775.29,
  status: 'projected',
  projected_delta: 2_049.79,
  replayed_facts: 4,
  problems: [],
});

const missing = projectCash(100, [
  { fact_key: 'trade:missing', business_date: '2026-08-18', business_time: null, kind: 'trade', subtype: 'buy', amount: null, repo_key: null },
]);
assert.equal(missing.value, null);
assert.equal(missing.known_value, 100);
assert.equal(missing.status, 'incomplete');
assert.match(missing.problems[0], /缺少明确现金影响/);

const ambiguous = projectCash(100, [
  { fact_key: 'account-event:other', business_date: '2026-08-18', business_time: null, kind: 'account_event', subtype: 'other', amount: 12.3, repo_key: null },
]);
assert.equal(ambiguous.value, null);
assert.match(ambiguous.problems[0], /未分类账户事件/);

const closedRepo = projectRepoAssets([
  { id: 1, event_date: '2026-06-01', event_time: '14:32', event_type: 'repo_start', repo_key: 'R-001', amount: -8_000.01 },
  { id: 2, event_date: '2026-06-02', event_time: null, event_type: 'repo_maturity', repo_key: 'R-001', amount: 8_000.30 },
]);
assert.deepEqual(closedRepo, { value: 0, known_value: 0, status: 'clear', open_repo_count: 0, problems: [] });

const openRepo = projectRepoAssets([
  { id: 3, event_date: '2026-07-29', event_time: '14:37', event_type: 'repo_start', repo_key: 'R-001', amount: -36_000.04 },
]);
assert.deepEqual(openRepo, { value: 36_000.04, known_value: 36_000.04, status: 'open_repo', open_repo_count: 1, problems: [] });

const maturedRepo = projectRepoAssets([
  { id: 3, event_date: '2026-07-29', event_time: '14:37', event_type: 'repo_start', repo_key: 'R-001', amount: -36_000.04 },
  { id: 4, event_date: '2026-07-30', event_time: null, event_type: 'repo_maturity', repo_key: 'R-001', amount: 36_001.39 },
]);
assert.deepEqual(maturedRepo, { value: 0, known_value: 0, status: 'clear', open_repo_count: 0, problems: [] });

const brokenRepo = projectRepoAssets([
  { id: 5, event_date: '2026-07-30', event_time: null, event_type: 'repo_maturity', repo_key: 'R-001', amount: 36_001.39 },
]);
assert.equal(brokenRepo.value, null);
assert.equal(brokenRepo.status, 'incomplete');
assert.match(brokenRepo.problems[0], /找不到对应/);

// Execute the full read model against the repository's actual migration schema.
const database = new DatabaseSync(':memory:');
for (const file of (await readdir('workers/finance-api/migrations')).filter((name) => name.endsWith('.sql')).sort()) {
  database.exec(await readFile(path.join('workers/finance-api/migrations', file), 'utf8'));
}

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

database.prepare(`INSERT INTO finance_asset_snapshots (
  snapshot_at, snapshot_date, holdings_value, cash_value, total_value, source, is_complete, created_at, created_by
) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`).run(
  '2026-08-16T02:29:00.000Z', '2026-08-16', 39_000, 1_000, 40_000, 'broker_reconciliation', '2026-08-16T02:29:00.000Z', 'muxia',
);
database.prepare(`INSERT INTO finance_asset_snapshots (
  snapshot_at, snapshot_date, holdings_value, cash_value, total_value, source, is_complete, created_at, created_by
) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`).run(
  '2026-08-17T01:00:00.000Z', '2026-08-17', 39_000, 1_100, 40_100, 'historical_backfill', '2026-08-17T01:00:00.000Z', 'system',
);
database.prepare(`INSERT INTO holdings_snapshots (snapshot_date, ticker, quantity, avg_cost, position_category)
  VALUES ('2026-08-17', '300750', 100, 380, '主动操作仓（A股）')`).run();
database.prepare(`INSERT INTO market_data (ticker, price, pe_ttm, fetched_at)
  VALUES ('300750', 393.93, 18.2, '2099-01-01T00:00:00.000Z')`).run();
database.prepare(`INSERT INTO trades (
  trade_date, trade_time, ticker, ticker_name, direction, quantity, price, fee, net_cash_amount,
  position_category, reason, needs_review, created_at, created_by
) VALUES ('2026-08-17', '10:00', '300750', '宁德时代', 'buy', 1, 100, 0.5, -100.5,
  '主动操作仓（A股）', 'fixture', 0, '2026-08-17T02:00:00.000Z', 'muxia')`).run();
database.prepare(`INSERT INTO finance_cash_flows (
  occurred_on, contributor, flow_type, baseline_amount, confirmed_amount, manager_share_offset, net_amount, note, created_at, created_by
) VALUES ('2026-08-17', 'muxia', 'monthly_investment', 500, 500, 0, 500, 'fixture', '2026-08-17T03:00:00.000Z', 'muxia')`).run();
database.prepare(`INSERT INTO finance_account_events (
  event_date, event_time, event_type, ticker, ticker_name, amount, note, created_at, created_by
) VALUES ('2026-08-17', '11:00', 'dividend', '300750', '宁德时代', 20, 'fixture', '2026-08-17T03:30:00.000Z', 'muxia')`).run();
database.prepare(`INSERT INTO finance_account_events (
  event_date, event_time, event_type, ticker_name, amount, note, created_at, created_by
) VALUES ('2026-08-17', '14:00', 'repo_start', 'R-001', -200.01, 'fixture', '2026-08-17T06:00:00.000Z', 'muxia')`).run();

const state = await readAccountState({ DB: new SqliteD1(database) });
assert.equal(state.reconciliation.through_date, '2026-08-16', 'synthetic backfill must not supersede the broker reconciliation anchor');
assert.equal(state.holdings.market_value, 39_393);
assert.equal(state.cash.status, 'projected');
assert.equal(state.cash.value, 1_219.49);
assert.equal(state.cash.projected_delta, 219.49);
assert.equal(state.other_assets.status, 'open_repo');
assert.equal(state.other_assets.value, 200.01);
assert.equal(state.total_assets, 40_812.5);

database.close();
console.log('Finance current cash, repo asset, and account-state SQL contract passed.');
