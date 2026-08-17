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
  return {
    built,
    rows: db.prepare(built.query).all(...built.values).map((row) => ({ ...row })),
  };
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
const position = { occurred_at: firstPage.rows[0].occurred_at, operation_key: firstPage.rows[0].operation_key };
const secondPage = rows({ cursor: position, limit: 1 });
assert.equal(secondPage.rows[0].operation_key, 'cash-flow:1', 'cursor page must continue after the exact global operation key without duplicates');

const encoded = encodeOperationCursor({ ...position, filter: emptyFilter });
assert.deepEqual(decodeOperationCursor(encoded, emptyFilter), position);
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

// All circuit creations are visible; human objections preserve their actor and old engine rows are labelled system-side.
db.prepare(`INSERT INTO circuit_breaker_log (level, reason, triggered_at) VALUES
  ('yellow', '{"metrics":{"loss":0.2},"action":"pause_active_additions"}', '2026-08-17T03:00:00.000Z'),
  ('black', '{"objection_by":"cati","reason":"pause now"}', '2026-08-17T03:01:00.000Z')`).run();
const circuits = rows({ filter: { ...emptyFilter, entity_type: 'circuit' } }).rows;
assert.deepEqual(circuits.map((row) => row.actor), ['cati', 'system:risk-engine']);

// Annual confirmation must remain append-only history even after a later recalculation clears current confirmation state.
db.prepare(`INSERT INTO annual_reviews (year, calculation_json, summary, calculated_at)
  VALUES (2026, '{"v":1}', 'first', '2026-12-31T01:00:00.000Z')`).run();
db.prepare(`UPDATE annual_reviews SET confirmed_by = 'cati', confirmed_at = '2026-12-31T02:00:00.000Z' WHERE year = 2026`).run();
db.prepare(`UPDATE annual_reviews SET calculation_json = '{"v":2}', summary = 'second', calculated_at = '2026-12-31T03:00:00.000Z', confirmed_by = NULL, confirmed_at = NULL WHERE year = 2026`).run();
const annual = rows({ filter: { ...emptyFilter, entity_type: 'annual_review' } }).rows;
assert.deepEqual(annual.map((row) => row.action), ['updated', 'confirmed', 'created']);
assert.equal(annual.find((row) => row.action === 'confirmed')?.actor, 'cati');

// Canonical Workbook Review operations are admin-only at the query-source boundary.
db.prepare(`INSERT INTO finance_workbook_review_audit (review_id, action, actor, occurred_at, before_json, after_json)
  VALUES (1, 'resolved', 'muxia', '2026-08-17T04:00:00.000Z', '{"status":"pending"}', '{"status":"resolved","resolution_note":"fixed"}')`).run();
assert.ok(!rows({ includeWorkbookReview: false }).rows.some((row) => row.entity_type === 'workbook_review'));
assert.ok(rows({ includeWorkbookReview: true }).rows.some((row) => row.entity_type === 'workbook_review'));

db.close();
console.log('Finance Operation History query and cursor contract passed.');
