import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import {
  buildActivityQuery,
  decodeActivityCursor,
  encodeActivityCursor,
  humanizeActivity,
} from '../workers/finance-api/src/routes/activity.ts';

const db = new DatabaseSync(':memory:');
for (const file of (await readdir('workers/finance-api/migrations')).filter((name) => name.endsWith('.sql')).sort()) {
  db.exec(await readFile(path.join('workers/finance-api/migrations', file), 'utf8'));
}

const emptyFilter = { kind: null, ticker: null, from: null, to: null };
function rows({ filter = emptyFilter, cursor = null, limit = 50 } = {}) {
  const built = buildActivityQuery({ filter, cursor, limit });
  return { built, rows: db.prepare(built.query).all(...built.values).map((row) => ({ ...row })) };
}

// Historical-imported facts remain business activity; Activity is not an audit trail.
db.prepare(`INSERT INTO trades (
  id, trade_date, trade_time, ticker, ticker_name, direction, quantity, price, fee, net_cash_amount,
  position_category, reason, needs_review, created_at, created_by
) VALUES (100, '2026-08-14', '14:55', '300750', '宁德时代', 'buy', 100, 393.93, 0.2, -39393.2,
  '主动操作仓（A股）', 'activity fixture', 0, '2026-08-16T02:29:00.000Z', 'historical-import:fixture')`).run();
db.prepare(`INSERT INTO finance_cash_flows (
  id, occurred_on, contributor, flow_type, baseline_amount, confirmed_amount, manager_share_offset, net_amount, note, created_at, created_by
) VALUES (101, '2026-08-14', 'muxia', 'monthly_investment', 5000, 5000, 0, 5000, 'monthly contribution', '2026-08-14T01:00:00.000Z', 'muxia')`).run();
db.prepare(`INSERT INTO finance_account_events (
  id, event_date, event_time, event_type, ticker, ticker_name, amount, note, created_at, created_by
) VALUES (102, '2026-08-14', '10:30', 'dividend', '300750', '宁德时代', 141.1, 'dividend', '2026-08-14T02:30:00.000Z', 'muxia')`).run();
db.prepare(`INSERT INTO finance_account_events (
  id, event_date, event_time, event_type, ticker, ticker_name, quantity, note, created_at, created_by
) VALUES (105, '2026-07-03', '09:00', 'split', '515880', '通信ETF', 6400, '1:2 份额分拆', '2026-08-16T00:00:00.000Z', 'historical-import:fixture')`).run();
db.prepare(`INSERT INTO finance_asset_snapshots (
  id, snapshot_at, snapshot_date, holdings_value, cash_value, other_assets_value, total_value, source, is_complete, created_at, created_by
) VALUES (103, '2026-08-16T02:29:00.000Z', '2026-08-16', 109698.70, 20725.50, 36000, 166424.20, 'broker_reconciliation', 1, '2026-08-16T02:29:00.000Z', 'muxia')`).run();
db.prepare(`INSERT INTO finance_asset_snapshots (
  id, snapshot_at, snapshot_date, holdings_value, cash_value, total_value, source, is_complete, created_at, created_by
) VALUES (104, '2026-08-15T07:00:00.000Z', '2026-08-15', 100000, 20000, 120000, 'historical_backfill', 1, '2026-08-15T07:00:00.000Z', 'system')`).run();
db.prepare(`INSERT INTO finance_asset_snapshots (
  id, snapshot_at, snapshot_date, holdings_value, cash_value, total_value, source, is_complete, incomplete_reason, created_at, created_by
) VALUES (106, '2026-08-17T02:00:00.000Z', '2026-08-17', 100000, 20000, 120000, 'broker_reconciliation', 0, 'price coverage incomplete', '2026-08-17T02:00:00.000Z', 'muxia')`).run();

const all = rows();
assert.doesNotMatch(all.built.query, /finance_.*_audit|finance_access_log|circuit_breaker_log|monthly_confirmations|finance_rebalance_records/, 'Activity must be built from business facts, not audit/security/risk workflow tables');
assert.equal(all.rows[0].event_key, 'reconciliation:103', 'latest complete real reconciliation should lead the activity stream');
assert.ok(all.rows.some((row) => row.event_key === 'trade:100'), 'accepted historical trades remain real business activity');
assert.ok(!all.rows.some((row) => row.event_key === 'reconciliation:104'), 'synthetic historical-backfill snapshots must not appear as user activity');
assert.ok(!all.rows.some((row) => row.event_key === 'reconciliation:106'), 'incomplete observations must not be presented as completed reconciliations');

const reconciliation = humanizeActivity(all.rows.find((row) => row.event_key === 'reconciliation:103'));
assert.equal(reconciliation.title, '资产对账');
assert.match(reconciliation.summary, /总资产 ¥166,424\.2.*Broker Cash ¥20,725\.5.*其他账户资产 ¥36,000/);
assert.equal(reconciliation.details.other_assets_value, 36000, 'Activity must preserve the observed other-assets component of reconciliation evidence');

const trade = all.rows.find((row) => row.event_key === 'trade:100');
assert.deepEqual(humanizeActivity(trade), {
  key: 'trade:100', business_date: '2026-08-14', business_time: '14:55', kind: 'trade', ticker: '300750', ticker_name: '宁德时代',
  title: '买入 · 宁德时代', summary: '100 股 × ¥393.93',
  details: { direction: 'buy', quantity: 100, price: 393.93, fee: 0.2, net_cash_amount: -39393.2, position_category: '主动操作仓（A股）', reason: 'activity fixture' },
});

const tickerRows = rows({ filter: { ...emptyFilter, ticker: '300750' } }).rows;
assert.deepEqual(tickerRows.map((row) => row.event_key), ['trade:100', 'account-event:102'], 'ticker filter should naturally exclude non-security cash/reconciliation events');
const dividend = rows({ filter: { ...emptyFilter, kind: 'account_event' } }).rows.find((row) => row.event_key === 'account-event:102');
assert.equal(humanizeActivity(dividend).title, '现金分红 · 宁德时代');
assert.match(humanizeActivity(dividend).summary, /\+¥141\.1/);
const split = rows({ filter: { ...emptyFilter, ticker: '515880' } }).rows[0];
assert.equal(humanizeActivity(split).title, '份额分拆 · 通信ETF');
assert.equal(humanizeActivity(split).summary, '1:2 份额分拆', 'split Activity must use explicit explanatory evidence instead of guessing the meaning of quantity');

// Deleted facts leave Activity; the immutable audit remains available separately in Data Change Log.
db.prepare(`UPDATE finance_cash_flows SET deleted_at = '2026-08-17T00:00:00.000Z', deleted_by = 'muxia' WHERE id = 101`).run();
assert.ok(!rows().rows.some((row) => row.event_key === 'cash-flow:101'));

// Stable cursor uses business date/time rather than record mutation timestamps.
const firstPage = rows({ limit: 1 });
assert.equal(firstPage.rows.length, 2);
assert.doesNotMatch(firstPage.built.query, /\bOFFSET\b/i);
const position = {
  business_date: firstPage.rows[0].business_date,
  sort_time: firstPage.rows[0].sort_time,
  event_key: firstPage.rows[0].event_key,
};
const encoded = encodeActivityCursor({ ...position, filter: emptyFilter });
assert.deepEqual(decodeActivityCursor(encoded, emptyFilter), position);
assert.throws(() => decodeActivityCursor(encoded, { ...emptyFilter, kind: 'trade' }), /invalid cursor/);
const secondPage = rows({ cursor: position, limit: 1 });
assert.notEqual(secondPage.rows[0].event_key, firstPage.rows[0].event_key);

db.close();
console.log('Finance account activity query contract passed.');
