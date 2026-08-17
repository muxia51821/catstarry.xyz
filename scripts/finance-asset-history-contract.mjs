import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync(':memory:');
for (const file of (await readdir('workers/finance-api/migrations')).filter((name) => name.endsWith('.sql')).sort()) {
  db.exec(await readFile(path.join('workers/finance-api/migrations', file), 'utf8'));
}

// Historical prices are one canonical raw/unadjusted close per security/day.
db.prepare(`INSERT INTO finance_security_prices (ticker, price_date, close, source, adjustment, created_at, created_by)
  VALUES ('515880', '2026-06-30', 1.7948, 'mootdx', 'raw', '2026-08-17T00:00:00.000Z', 'contract')`).run();
assert.deepEqual({ ...db.prepare(`SELECT ticker, price_date, close, source, adjustment FROM finance_security_prices`).get() }, {
  ticker: '515880', price_date: '2026-06-30', close: 1.7948, source: 'mootdx', adjustment: 'raw',
});
assert.throws(() => db.prepare(`INSERT INTO finance_security_prices (ticker, price_date, close, source, adjustment, created_at, created_by)
  VALUES ('515880', '2026-06-30', 0.8974, 'web-crosscheck', 'raw', '2026-08-17T00:00:00.000Z', 'contract')`).run(), /UNIQUE constraint failed/, 'cross-check sources must not create competing canonical closes for the same security/day');
assert.throws(() => db.prepare(`INSERT INTO finance_security_prices (ticker, price_date, close, source, adjustment, created_at, created_by)
  VALUES ('515880', '2026-06-29', 0.8974, 'bad-adjusted-source', 'split_adjusted', '2026-08-17T00:00:00.000Z', 'contract')`).run(), /CHECK constraint failed/);

function valuation(date, securities, cash, other = 0, complete = 1, reason = null) {
  db.prepare(`INSERT INTO finance_asset_valuations (
    valuation_date, securities_value, cash_value, other_assets_value, total_value,
    held_position_count, priced_position_count, is_complete, incomplete_reason, price_source, source, calculated_at
  ) VALUES (?, ?, ?, ?, ?, 10, ?, ?, ?, 'mootdx', 'derived', ?)`)
    .run(date, securities, cash, other, securities + cash + other, complete ? 10 : 9, complete, reason, `${date}T08:00:00.000Z`);
}

valuation('2026-06-26', 120_000, 14_861.23);
valuation('2026-06-30', 130_327.22, 14_861.23);
valuation('2026-07-03', 129_000, 14_861.23);
valuation('2026-07-31', 110_428.30, 15_383.36);
valuation('2026-08-07', 108_000, 24_654.76);
valuation('2026-08-14', 109_698.70, 20_725.50);
valuation('2026-08-15', 1, 1, 0, 0, 'price coverage incomplete');

const monthRows = db.prepare(`WITH ranked AS (
    SELECT valuation_date, total_value,
      ROW_NUMBER() OVER (PARTITION BY substr(valuation_date, 1, 7) ORDER BY valuation_date DESC) AS rn
    FROM finance_asset_valuations WHERE is_complete = 1
  ) SELECT valuation_date, total_value FROM ranked WHERE rn = 1 ORDER BY valuation_date`).all().map((row) => ({ ...row }));
assert.deepEqual(monthRows.map((row) => row.valuation_date), ['2026-06-30', '2026-07-31', '2026-08-14']);
assert.equal(monthRows[0].total_value, 145_188.45);
assert.equal(monthRows[2].total_value, 130_424.20);

const weekRows = db.prepare(`WITH ranked AS (
    SELECT valuation_date, total_value,
      ROW_NUMBER() OVER (PARTITION BY strftime('%Y-W%W', valuation_date) ORDER BY valuation_date DESC) AS rn
    FROM finance_asset_valuations WHERE is_complete = 1
  ) SELECT valuation_date FROM ranked WHERE rn = 1 ORDER BY valuation_date`).all().map((row) => row.valuation_date);
assert.ok(weekRows.includes('2026-06-26'));
assert.ok(weekRows.includes('2026-08-14'));
assert.ok(!weekRows.includes('2026-08-15'), 'incomplete valuations must never become chart points');

// Reconciliation observations are evidence; they are not copied into the derived valuation cache.
db.prepare(`INSERT INTO finance_asset_snapshots (
  snapshot_at, snapshot_date, holdings_value, cash_value, other_assets_value, total_value, source, is_complete, created_at, created_by
) VALUES ('2026-08-16T02:29:00.000Z', '2026-08-16', 109698.70, 20725.50, 0, 130424.20, 'broker_reconciliation', 1, '2026-08-16T02:29:00.000Z', 'muxia')`).run();
assert.equal(db.prepare(`SELECT COUNT(*) AS count FROM finance_asset_valuations WHERE valuation_date = '2026-08-16'`).get().count, 0);

db.close();
console.log('Finance derived historical price and valuation cache contract passed.');
await import('./finance-raw-price-import-contract.mjs');
await import('./finance-security-reference-contract.mjs');
await import('./finance-asset-reconciliation-contract.mjs');
await import('./finance-portfolio-wiring-contract.mjs');
