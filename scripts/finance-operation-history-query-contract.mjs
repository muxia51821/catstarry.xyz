import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import {
  buildChangeLogQuery,
  decodeChangeLogCursor,
  encodeChangeLogCursor,
  humanizeChange,
} from '../workers/finance-api/src/routes/operations.ts';

const db = new DatabaseSync(':memory:');
for (const file of (await readdir('workers/finance-api/migrations')).filter((name) => name.endsWith('.sql')).sort()) {
  db.exec(await readFile(path.join('workers/finance-api/migrations', file), 'utf8'));
}

const emptyFilter = { entity_type: null, action: null, actor: null, from: null, to: null };
function rows({ filter = emptyFilter, cursor = null, limit = 50 } = {}) {
  const built = buildChangeLogQuery({ filter, cursor, limit });
  const records = built.queries.flatMap(({ query, values }) => db.prepare(query).all(...values).map((row) => ({ ...row })))
    .sort((left, right) => right.occurred_at.localeCompare(left.occurred_at) || right.change_key.localeCompare(left.change_key));
  return { built, rows: records };
}

const sameTime = '2026-08-17T01:00:00.000Z';
db.prepare(`INSERT INTO finance_trade_audit (trade_id, action, actor, occurred_at, after_json)
  VALUES (1, 'created', 'muxia', ?, '{"trade_date":"2026-08-17","ticker":"510300","direction":"buy","quantity":100,"price":4}')`).run(sameTime);
db.prepare(`INSERT INTO finance_cash_flow_audit (cash_flow_id, action, actor, occurred_at, after_json)
  VALUES (1, 'created', 'muxia', ?, '{"occurred_on":"2026-08-17","net_amount":5000}')`).run(sameTime);

const firstPage = rows({ limit: 1 });
assert.doesNotMatch(firstPage.built.queries.map((item) => item.query).join('\n'), /\bOFFSET\b/i, 'change log must use keyset cursor pagination');
assert.equal(firstPage.rows.length, 2, 'query asks for limit + 1 so the route can decide whether a cursor exists');
assert.equal(firstPage.rows[0].change_key, 'trade:1', 'same-timestamp changes need a deterministic global secondary key');
const humanizedFirst = humanizeChange(firstPage.rows[0]);
assert.equal(humanizedFirst.before, null);
assert.deepEqual(humanizedFirst.after, { trade_date: '2026-08-17', ticker: '510300', direction: 'buy', quantity: 100, price: 4 });
assert.ok(!('audit_strength' in humanizedFirst), 'internal evidence taxonomy must not be part of the user-facing change-log contract');

const position = { occurred_at: firstPage.rows[0].occurred_at, change_key: firstPage.rows[0].change_key };
const secondPage = rows({ cursor: position, limit: 1 });
assert.equal(secondPage.rows[0].change_key, 'cash-flow:1');

const encoded = encodeChangeLogCursor({ ...position, filter: emptyFilter });
assert.deepEqual(decodeChangeLogCursor(encoded, emptyFilter), position);
const unicodeFilter = { ...emptyFilter, actor: '用户甲' };
const unicodeCursor = encodeChangeLogCursor({ ...position, filter: unicodeFilter });
assert.deepEqual(decodeChangeLogCursor(unicodeCursor, unicodeFilter), position);
assert.throws(() => decodeChangeLogCursor(encoded, { ...emptyFilter, actor: 'cati' }), /invalid cursor/);
assert.throws(() => decodeChangeLogCursor('x'.repeat(2_049), emptyFilter), /invalid cursor/);

// Shanghai date boundary: 2026-08-17 begins at 2026-08-16T16:00:00Z.
db.prepare(`INSERT INTO finance_trade_audit (trade_id, action, actor, occurred_at, after_json)
  VALUES (2, 'created', 'muxia', '2026-08-16T15:59:59.000Z', '{"trade_date":"2026-08-16","ticker":"A"}')`).run();
db.prepare(`INSERT INTO finance_trade_audit (trade_id, action, actor, occurred_at, after_json)
  VALUES (3, 'created', 'muxia', '2026-08-16T16:00:00.000Z', '{"trade_date":"2026-08-17","ticker":"B"}')`).run();
const shanghaiDay = rows({ filter: { ...emptyFilter, entity_type: 'trade', from: '2026-08-17', to: '2026-08-17' } }).rows;
assert.ok(shanghaiDay.some((row) => row.change_key === 'trade:3'));
assert.ok(!shanghaiDay.some((row) => row.change_key === 'trade:2'));

// Business facts belong to Activity, not the administrator data-change log.
db.prepare(`INSERT INTO circuit_breaker_log (level, reason, triggered_at) VALUES
  ('yellow', '{"action":"pause_active_additions"}', '2026-08-17T03:00:00.000Z')`).run();
db.prepare(`INSERT INTO monthly_confirmations (period, username, confirmed_at)
  VALUES ('2026-08', 'cati', '2026-09-01T01:00:00.000Z')`).run();
const auditSql = rows().built.queries.map((item) => item.query).join('\n');
assert.doesNotMatch(auditSql, /circuit_breaker_log|monthly_confirmations|finance_asset_snapshots|finance_workbook_imports|finance_rebalance_records/, 'business activity must not leak into data-change history');
assert.doesNotMatch(auditSql, /finance_access_log/, 'security access logs remain separate');
assert.doesNotMatch(auditSql, /provenance/i, 'row-provenance fallback is not a product change-log source after core audit atomicity');

// Annual review confirmation remains durable audit history even after recalculation clears current confirmation state.
db.prepare(`INSERT INTO annual_reviews (year, calculation_json, summary, calculated_at)
  VALUES (2026, '{"v":1}', 'first', '2026-12-31T01:00:00.000Z')`).run();
db.prepare(`UPDATE annual_reviews SET confirmed_by = 'cati', confirmed_at = '2026-12-31T02:00:00.000Z' WHERE year = 2026`).run();
db.prepare(`UPDATE annual_reviews SET calculation_json = '{"v":2}', summary = 'second', calculated_at = '2026-12-31T03:00:00.000Z', confirmed_by = NULL, confirmed_at = NULL WHERE year = 2026`).run();
const annual = rows({ filter: { ...emptyFilter, entity_type: 'annual_review' } }).rows;
assert.deepEqual(annual.map((row) => row.action), ['updated', 'confirmed', 'created']);
assert.equal(annual.find((row) => row.action === 'confirmed')?.actor, 'cati');
assert.ok(annual.every((row) => row.business_date === null));

// Monthly reporting periods stay in payload instead of being fabricated as business dates.
db.prepare(`INSERT INTO monthly_records (year_month, summary, created_at, created_by)
  VALUES ('2026-08', 'monthly fixture', '2026-08-31T08:00:00.000Z', 'muxia')`).run();
const monthly = rows({ filter: { ...emptyFilter, entity_type: 'monthly_record' } }).rows;
assert.equal(monthly[0].business_date, null);
assert.equal(JSON.parse(monthly[0].after_json).year_month, '2026-08');

// Canonical and legacy Import Review audit evidence both remain admin change-log sources.
db.prepare(`INSERT INTO finance_workbook_review_audit (review_id, action, actor, occurred_at, before_json, after_json)
  VALUES (1, 'resolved', 'muxia', '2026-08-17T06:00:00.000Z', '{"status":"pending"}', '{"status":"resolved","resolution_note":"fixed"}')`).run();
db.prepare(`INSERT INTO finance_legacy_import_review_audit (review_id, action, actor, occurred_at, before_json, after_json)
  VALUES (2, 'resolved', 'muxia', '2026-08-17T06:01:00.000Z', '{"status":"pending"}', '{"status":"resolved","resolution_note":"legacy fixed"}')`).run();
const reviewRows = rows({ filter: { ...emptyFilter, entity_type: 'workbook_review' } }).rows;
assert.equal(reviewRows.length, 2);
assert.ok(reviewRows.every((row) => row.business_date === null));

db.close();
console.log('Finance data change-log query and cursor contract passed.');
await import('./finance-trade-classification-contract.mjs');
