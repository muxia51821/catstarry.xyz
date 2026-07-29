import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';

import { HOLDING_UPSERT_SQL } from '../workers/finance-api/src/routes/trades.ts';

const database = new DatabaseSync(':memory:');
for (const file of (await readdir('workers/finance-api/migrations')).filter((name) => name.endsWith('.sql')).sort()) {
  database.exec(await readFile(path.join('workers/finance-api/migrations', file), 'utf8'));
}

const upsertHolding = database.prepare(HOLDING_UPSERT_SQL);
const insertTrade = database.prepare(`INSERT INTO trades (
  trade_date, ticker, ticker_name, direction, quantity, price, position_category, reason, needs_review, created_at, created_by
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`);

function trade(direction, quantity, price) {
  database.exec('BEGIN');
  try {
    upsertHolding.run('2026-07-26', '510300', direction, quantity, price, 'A股宽基指数底仓');
    insertTrade.run('2026-07-26', '510300', '沪深300ETF', direction, quantity, price, 'A股宽基指数底仓', 'contract', '2026-07-26T00:00:00.000Z', 'contract-admin');
    database.exec('COMMIT');
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
}

trade('buy', 10, 100);
trade('buy', 20, 120);
let holding = database.prepare(`SELECT quantity, avg_cost FROM holdings_snapshots
  WHERE ticker = ? ORDER BY snapshot_date DESC, id DESC LIMIT 1`).get('510300');
assert.equal(holding.quantity, 30);
assert.ok(Math.abs(holding.avg_cost - (3_400 / 30)) < 1e-10);

trade('sell', 20, 130);
assert.throws(() => trade('sell', 20, 130), /holding_quantity_cannot_be_negative/);
holding = database.prepare(`SELECT quantity, avg_cost FROM holdings_snapshots
  WHERE ticker = ? ORDER BY snapshot_date DESC, id DESC LIMIT 1`).get('510300');
assert.equal(holding.quantity, 10);
assert.equal(database.prepare('SELECT COUNT(*) AS count FROM trades').get().count, 3);

database.close();
console.log('Finance serialized holding update contract passed.');
