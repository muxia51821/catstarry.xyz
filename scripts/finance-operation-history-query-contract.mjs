import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import {
  buildOperationsQuery,
  decodeOperationCursor,
  encodeOperationCursor,
} from '../workers/finance-api/src/routes/operations.ts';

const db = new DatabaseSync(':memory:');
for (const file of (await readdir('workers/finance-api/migrations')).filter((name) => name.endsWith('.sql')).sort()) {
  db.exec(await readFile(path.join('workers/finance-api/migrations', file), 'utf8'));
}

const emptyFilter = { entity_type: null, action: null, actor: null, from: null, to: null };
function rows({ includeWorkbookReview = false, filter = emptyFilter, cursor = null, limit = 50 } = {}) {
  const built = buildOperationsQuery({ includeWorkbookReview, filter, cursor, limit });
  return { built, rows: db.prepare(built.query).all(...built.values).map((row) => ({ ...row })) };
}

const sameTime = '2026-08-17T01:00:00.000Z';
db.prepare(`INSERT INTO finance_trade_audit (trade_id, action, actor, occurred_at, after_json)
  VALUES (1, 'created', 'muxia', ?, '{"trade_date":"2026-08-17","ticker":"510300","direction":"buy","quantity":100,"price":4}')`).run(sameTime);
db.prepare(`INSERT INTO finance_cash_flow_audit (cash_flow_id, action, actor, occurred_at, after_json)
  VALUES (1, 'created', 'muxia', ?, '{"occurred_on":"2026-08-17","net_amount":5000}')`).run(sameTime);

const firstPage = rows({ limit: 1 });
assert.doesNotMatch(firstPage.built.query, /\bOFFSET\b/i, 'Operation History must use keyset cursor pagination, not offset pagination');
assert.equal(firstPage.rows.length, 2, 'query asks for limit + 1 so the route can decide whether a cursor exists');
assert.equal(firstPage.rows[0].operation_key, 'trade:1', 'same-timestamp operations need a deterministic global secondary key');
assert.equal(firstPage.rows[0].audit_strength, 'audit');
const position = { occurred_at: firstPage.rows[0].occurred_at, operation_key: firstPage.rows[0].operation_key };
const secondPage = rows({ cursor: position, limit: 1 });
assert.equal(secondPage.rows[0].operation_key, 'cash-flow:1', 'cursor page must continue after the exact global operation key without duplicates');

const encoded = encodeOperationCursor({ ...position, filter: emptyFilter });
assert.deepEqual(decodeOperationCursor(encoded, emptyFilter), position);
const unicodeFilter = { ...emptyFilter, actor: '用户甲' };
const unicodeCursor = encodeOperationCursor({ ...position, filter: unicodeFilter });
assert.deepEqual(decodeOperationCursor(unicodeCursor, unicodeFilter), position, 'cursor codec must remain UTF-8 safe even if an actor filter is non-ASCII');
assert.throws(() => decodeOperationCursor(encoded, { ...emptyFilter, actor: 'cati' }), /invalid cursor/, 'cursor must be bound to its filters');
assert.throws(() => decodeOperationCursor('x'.repeat(2_049), emptyFilter), /invalid cursor/, 'oversized cursors must be rejected');

// Shanghai date boundary: 2026-08-17 begins at 2026-08-16T16:00:00Z.
db.prepare(`INSERT INTO finance_trade_audit (trade_id, action, actor, occurred_at, after_json)
  VALUES (2, 'created', 'muxia', '2026-08-16T15:59:59.000Z', '{"trade_date":"2026-08-16","ticker":"A"}')`).run();
db.prepare(`INSERT INTO finance_trade_audit (trade_id, action, actor, occurred_at, after_json)
  VALUES (3, 'created', 'muxia', '2026-08-16T16:00:00.000Z', '{"trade_date":"2026-08-17","ticker":"B"}')`).run();
const shanghaiDay = rows({ filter: { ...emptyFilter, entity_type: 'trade', from: '2026-08-17', to: '2026-08-17' } }).rows;
assert.ok(shanghaiDay.some((row) => row.operation_key === 'trade:3'));
assert.ok(!shanghaiDay.some((row) => row.operation_key === 'trade:2'), 'date filters must use Asia/Shanghai rather than UTC calendar days');

// Security access logs remain a separate administrative signal and must never leak into the product timeline.
db.prepare(`INSERT INTO finance_access_log (username, action, occurred_at) VALUES ('muxia', 'session', '2026-08-17T02:00:00.000Z')`).run();
assert.doesNotMatch(rows().built.query, /finance_access_log/, 'security access logs must stay out of Operation History');

// All circuit creations are visible and state resolution is a separate domain event.
db.prepare(`INSERT INTO circuit_breaker_log (level, reason, triggered_at) VALUES
  ('yellow', '{"metrics":{"loss":0.2},"action":"pause_active_additions"}', '2026-08-17T03:00:00.000Z'),
  ('black', '{"objection_by":"cati","reason":"pause now"}', '2026-08-17T03:01:00.000Z')`).run();
const blackCircuitId = Number(db.prepare("SELECT id FROM circuit_breaker_log WHERE level = 'black'").get().id);
db.prepare('UPDATE circuit_breaker_log SET resolved_at = ? WHERE id = ?').run('2026-08-17T03:05:00.000Z', blackCircuitId);
const circuits = rows({ filter: { ...emptyFilter, entity_type: 'circuit' } }).rows;
assert.deepEqual(circuits.map((row) => [row.action, row.actor, row.audit_strength]), [
  ['resolved', 'system:circuit-state', 'domain'],
  ['created', 'cati', 'domain'],
  ['created', 'system:risk-engine', 'domain'],
]);
assert.ok(circuits.every((row) => row.business_date === null), 'operational circuit timestamps must not be mislabeled as a financial business date');

// Annual confirmation must remain append-only history even after a later recalculation clears current confirmation state.
db.prepare(`INSERT INTO annual_reviews (year, calculation_json, summary, calculated_at)
  VALUES (2026, '{"v":1}', 'first', '2026-12-31T01:00:00.000Z')`).run();
db.prepare(`UPDATE annual_reviews SET confirmed_by = 'cati', confirmed_at = '2026-12-31T02:00:00.000Z' WHERE year = 2026`).run();
db.prepare(`UPDATE annual_reviews SET calculation_json = '{"v":2}', summary = 'second', calculated_at = '2026-12-31T03:00:00.000Z', confirmed_by = NULL, confirmed_at = NULL WHERE year = 2026`).run();
const annual = rows({ filter: { ...emptyFilter, entity_type: 'annual_review' } }).rows;
assert.deepEqual(annual.map((row) => row.action), ['updated', 'confirmed', 'created']);
assert.equal(annual.find((row) => row.action === 'confirmed')?.actor, 'cati');
assert.ok(annual.every((row) => row.audit_strength === 'audit'));

// Old non-atomic audited paths get an honest row-provenance fallback only when the corresponding audit is missing.
db.prepare(`INSERT INTO trades (id, trade_date, trade_time, ticker, ticker_name, direction, quantity, price, fee, net_cash_amount, position_category, reason, needs_review, created_at, created_by)
  VALUES (1001, '2026-08-17', '10:30', 'ROWFALLBACK', 'Fallback Trade', 'buy', 1, 10, 0, -10, '其他', NULL, 0, '2026-08-17T05:00:00.000Z', 'muxia')`).run();
let tradeFallback = rows({ filter: { ...emptyFilter, entity_type: 'trade', actor: 'muxia' } }).rows.find((row) => row.operation_key === 'trade-provenance-created:1001');
assert.equal(tradeFallback?.audit_strength, 'provenance');
db.prepare(`INSERT INTO finance_trade_audit (trade_id, action, actor, occurred_at, after_json)
  VALUES (1001, 'created', 'muxia', '2026-08-17T05:00:00.000Z', '{"trade_date":"2026-08-17","ticker":"ROWFALLBACK"}')`).run();
tradeFallback = rows({ filter: { ...emptyFilter, entity_type: 'trade', actor: 'muxia' } }).rows.find((row) => row.operation_key === 'trade-provenance-created:1001');
assert.equal(tradeFallback, undefined, 'trade provenance must disappear when the actual audit evidence exists');

// Cash Flow and Account Event use the same evidence rule, so each gets an executable fixture too.
db.prepare(`INSERT INTO finance_cash_flows (id, occurred_on, contributor, flow_type, baseline_amount, confirmed_amount, manager_share_offset, net_amount, note, created_at, created_by)
  VALUES (2001, '2026-08-17', 'muxia', 'monthly_investment', 5000, 5000, 0, 5000, 'fallback flow', '2026-08-17T05:10:00.000Z', 'muxia')`).run();
assert.equal(rows({ filter: { ...emptyFilter, entity_type: 'cash_flow', actor: 'muxia' } }).rows.find((row) => row.operation_key === 'cash-flow-provenance-created:2001')?.audit_strength, 'provenance');

db.prepare(`INSERT INTO finance_account_events (id, event_date, event_time, event_type, ticker, ticker_name, quantity, reference_value, amount, position_category, note, created_at, created_by)
  VALUES (3001, '2026-08-17', '11:00', 'dividend', '000001', 'Fallback Event', NULL, NULL, 10, '其他', 'fallback event', '2026-08-17T05:20:00.000Z', 'muxia')`).run();
assert.equal(rows({ filter: { ...emptyFilter, entity_type: 'account_event', actor: 'muxia' } }).rows.find((row) => row.operation_key === 'account-event-provenance-created:3001')?.audit_strength, 'provenance');

// Accepted historical and old legacy-import rows must not be manufactured into user operation history.
db.prepare(`INSERT INTO trades (id, trade_date, ticker, direction, quantity, price, position_category, created_at, created_by)
  VALUES (1002, '2026-06-01', 'LEGACYROW', 'buy', 1, 1, '其他', '2026-06-01T00:00:00.000Z', 'legacy-import')`).run();
assert.ok(!rows({ filter: { ...emptyFilter, entity_type: 'trade' } }).rows.some((row) => row.operation_key === 'trade-provenance-created:1002'));

// Canonical and legacy Import Review audits are both admin-only and carry no invented business date.
db.prepare(`INSERT INTO finance_workbook_review_audit (review_id, action, actor, occurred_at, before_json, after_json)
  VALUES (1, 'resolved', 'muxia', '2026-08-17T06:00:00.000Z', '{"status":"pending"}', '{"status":"resolved","resolution_note":"fixed"}')`).run();
db.prepare(`INSERT INTO finance_legacy_import_review_audit (review_id, action, actor, occurred_at, before_json, after_json)
  VALUES (2, 'resolved', 'muxia', '2026-08-17T06:01:00.000Z', '{"status":"pending"}', '{"status":"resolved","resolution_note":"legacy fixed"}')`).run();
assert.ok(!rows({ includeWorkbookReview: false }).rows.some((row) => row.entity_type === 'workbook_review'));
const adminReviewRows = rows({ includeWorkbookReview: true }).rows.filter((row) => row.entity_type === 'workbook_review');
assert.equal(adminReviewRows.length, 2);
assert.ok(adminReviewRows.every((row) => row.audit_strength === 'audit'));
assert.ok(adminReviewRows.every((row) => row.business_date === null));

db.close();
console.log('Finance Operation History query and cursor contract passed.');
