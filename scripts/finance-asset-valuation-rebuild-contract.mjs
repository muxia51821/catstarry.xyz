import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import {
  HISTORICAL_RECONSTRUCTION_START,
  isCanonicalHistoricalDay,
  rebuildAssetValuations,
} from '../workers/finance-api/src/routes/asset-valuation-rebuild.ts';

class SqliteD1Statement {
  constructor(database, sql, values = []) { this.database = database; this.sql = sql; this.values = values; }
  bind(...values) { return new SqliteD1Statement(this.database, this.sql, values); }
  async first() { return plain(this.database.prepare(this.sql).get(...this.values)) ?? null; }
  async all() { return { results: this.database.prepare(this.sql).all(...this.values).map(plain) }; }
  async run() { return this.execute(); }
  execute() {
    assert.ok(this.values.length <= 100, `D1 permits at most 100 bound parameters per statement; received ${this.values.length}`);
    const result = this.database.prepare(this.sql).run(...this.values);
    return { success: true, meta: { changes: Number(result.changes), last_row_id: Number(result.lastInsertRowid ?? 0) } };
  }
}
class SqliteD1 {
  constructor(database) { this.database = database; }
  prepare(sql) { return new SqliteD1Statement(this.database, sql); }
  async batch(statements) {
    this.database.exec('BEGIN');
    try {
      const results = statements.map((statement) => statement.execute());
      this.database.exec('COMMIT');
      return results;
    } catch (error) {
      this.database.exec('ROLLBACK');
      throw error;
    }
  }
}
function plain(row) { return row ? { ...row } : row; }

async function freshDatabase() {
  const database = new DatabaseSync(':memory:');
  for (const file of (await readdir('workers/finance-api/migrations')).filter((name) => name.endsWith('.sql')).sort()) {
    database.exec(await readFile(path.join('workers/finance-api/migrations', file), 'utf8'));
  }
  return { database, env: { DB: new SqliteD1(database) } };
}

function seedReconciliation(database, { cash = 100, holdings = 190, total = holdings + cash } = {}) {
  database.prepare(`INSERT INTO finance_asset_snapshots (
    snapshot_at, snapshot_date, holdings_value, cash_value, total_value, source, is_complete, incomplete_reason, created_at, created_by
  ) VALUES ('2026-07-31T08:00:00.000Z', '2026-07-31', ?, ?, ?, 'broker-reconciliation', 1, NULL, '2026-07-31T08:00:00.000Z', 'muxia')`).run(holdings, cash, total);
}
function seedPrice(database, ticker, date, close) {
  database.prepare(`INSERT INTO finance_security_prices (ticker, price_date, close, source, adjustment, observed_at, created_at, created_by)
    VALUES (?, ?, ?, 'mootdx', 'raw', NULL, '2026-08-17T00:00:00.000Z', 'contract')`).run(ticker, date, close);
}

assert.equal(isCanonicalHistoricalDay('2026-06-30'), true);
assert.equal(isCanonicalHistoricalDay('2026-06-31'), false);
assert.equal(isCanonicalHistoricalDay('2026-02-29'), false);
assert.equal(isCanonicalHistoricalDay('2028-02-29'), true);

// Full reconstruction: reverse a post-split anchor, keep repo principal in other assets,
// and refuse to make an incomplete price day chart-eligible.
{
  const { database, env } = await freshDatabase();
  seedReconciliation(database);
  database.prepare(`INSERT INTO holdings_snapshots (snapshot_date, ticker, quantity, avg_cost, position_category) VALUES
    ('2026-07-31','515880',14,10,'其他'),
    ('2026-07-31','000001',1,50,'主动操作仓（A股）')`).run();
  database.prepare(`INSERT INTO trades (trade_date, trade_time, ticker, ticker_name, direction, quantity, price, fee, net_cash_amount, position_category, reason, needs_review, created_at, created_by)
    VALUES ('2026-07-10','10:00','515880','通信ETF','buy',4,10,0,-40,'其他',NULL,0,'2026-07-10T02:00:00.000Z','contract')`).run();
  database.prepare(`INSERT INTO finance_account_events (event_date,event_time,event_type,ticker,ticker_name,quantity,reference_value,amount,position_category,note,created_at,created_by) VALUES
    ('2026-07-05',NULL,'split','515880','通信ETF',5,0,NULL,'其他','quantity is pre-event holding boundary','2026-07-05T00:00:00.000Z','contract'),
    ('2026-07-20','14:30','repo_start','R-001','R-001',NULL,30,-30,'机动仓（货币ETF）',NULL,'2026-07-20T06:30:00.000Z','contract'),
    ('2026-07-21',NULL,'repo_maturity','R-001','R-001',NULL,30,31,'机动仓（货币ETF）',NULL,'2026-07-21T00:00:00.000Z','contract')`).run();
  seedPrice(database, '515880', '2026-07-04', 20); seedPrice(database, '000001', '2026-07-04', 50);
  seedPrice(database, '515880', '2026-07-20', 10); // Deliberately omit 000001 on this day.
  seedPrice(database, '515880', '2026-07-21', 10); seedPrice(database, '000001', '2026-07-21', 50);

  const snapshotsBefore = database.prepare('SELECT COUNT(*) AS count FROM finance_asset_snapshots').get().count;
  const result = await rebuildAssetValuations(env, { startDate: '2026-07-04', endDate: '2026-07-21', actor: 'contract' });
  assert.ok(!(result instanceof Response));
  assert.deepEqual({ rebuilt: result.rebuilt, complete: result.complete, incomplete: result.incomplete }, { rebuilt: 3, complete: 2, incomplete: 1 });

  const beforeSplit = plain(database.prepare(`SELECT * FROM finance_asset_valuations WHERE valuation_date='2026-07-04'`).get());
  assert.deepEqual(
    { securities: beforeSplit.securities_value, cash: beforeSplit.cash_value, other: beforeSplit.other_assets_value, total: beforeSplit.total_value, held: beforeSplit.held_position_count, priced: beforeSplit.priced_position_count, complete: beforeSplit.is_complete },
    { securities: 150, cash: 139, other: 0, total: 289, held: 2, priced: 2, complete: 1 },
    'split.quantity must restore the pre-event position instead of inventing a split ratio',
  );

  const openRepo = plain(database.prepare(`SELECT * FROM finance_asset_valuations WHERE valuation_date='2026-07-20'`).get());
  assert.equal(openRepo.cash_value, 69);
  assert.equal(openRepo.other_assets_value, 30, 'repo cash outflow must remain represented as another account asset while open');
  assert.equal(openRepo.total_value, 239, 'incomplete rows may hold known partial value but must not become chart truth');
  assert.equal(openRepo.is_complete, 0);
  assert.match(openRepo.incomplete_reason, /000001.*缺少 canonical raw close/);

  const matured = plain(database.prepare(`SELECT * FROM finance_asset_valuations WHERE valuation_date='2026-07-21'`).get());
  assert.deepEqual(
    { securities: matured.securities_value, cash: matured.cash_value, other: matured.other_assets_value, total: matured.total_value, complete: matured.is_complete },
    { securities: 190, cash: 100, other: 0, total: 290, complete: 1 },
    'repo maturity should clear other assets and leave only its realized net cash effect in history',
  );
  assert.equal(database.prepare('SELECT COUNT(*) AS count FROM finance_asset_snapshots').get().count, snapshotsBefore, 'rebuildable valuation cache must never mutate reconciliation evidence');

  await rebuildAssetValuations(env, { startDate: '2026-07-04', endDate: '2026-07-21', actor: 'contract' });
  assert.equal(database.prepare('SELECT COUNT(*) AS count FROM finance_asset_valuations').get().count, 3, 'rebuild must replace the requested cache range idempotently');

  const tooEarly = await rebuildAssetValuations(env, { startDate: '2026-06-02', endDate: '2026-07-04', actor: 'contract' });
  assert.ok(tooEarly instanceof Response);
  assert.equal(tooEarly.status, 400);
  assert.match(await tooEarly.text(), new RegExp(HISTORICAL_RECONSTRUCTION_START));

  const impossibleStart = await rebuildAssetValuations(env, { startDate: '2026-06-31', endDate: '2026-07-04', actor: 'contract' });
  assert.ok(impossibleStart instanceof Response);
  assert.equal(impossibleStart.status, 400);
  assert.match(await impossibleStart.text(), /invalid_start_date/);

  const impossibleEnd = await rebuildAssetValuations(env, { startDate: '2026-07-04', endDate: '2026-07-32', actor: 'contract' });
  assert.ok(impossibleEnd instanceof Response);
  assert.equal(impossibleEnd.status, 400);
  assert.match(await impossibleEnd.text(), /invalid_end_date/);
  database.close();
}

// Missing exact cash effect is a fidelity failure, never an estimated cash balance.
{
  const { database, env } = await freshDatabase();
  seedReconciliation(database, { cash: 100, holdings: 100, total: 200 });
  database.prepare(`INSERT INTO holdings_snapshots (snapshot_date, ticker, quantity, avg_cost, position_category)
    VALUES ('2026-07-31','510300',10,10,'A股宽基指数底仓')`).run();
  database.prepare(`INSERT INTO trades (trade_date, ticker, ticker_name, direction, quantity, price, fee, net_cash_amount, position_category, reason, needs_review, created_at, created_by)
    VALUES ('2026-07-10','510300','沪深300ETF','buy',5,10,0,NULL,'A股宽基指数底仓',NULL,0,'2026-07-10T00:00:00.000Z','contract')`).run();
  seedPrice(database, '510300', '2026-07-04', 10);
  const result = await rebuildAssetValuations(env, { startDate: '2026-07-04', endDate: '2026-07-04', actor: 'contract' });
  assert.ok(!(result instanceof Response));
  assert.equal(result.incomplete, 1);
  const row = plain(database.prepare(`SELECT * FROM finance_asset_valuations WHERE valuation_date='2026-07-04'`).get());
  assert.equal(row.is_complete, 0);
  assert.match(row.incomplete_reason, /trade:1.*net_cash_amount/);
  database.close();
}

// D1 has a 100-bound-parameter limit per statement. A multi-day rebuild must
// preserve its single batch while keeping every valuation write below that limit.
{
  const { database, env } = await freshDatabase();
  seedReconciliation(database, { cash: 100, holdings: 100, total: 200 });
  database.prepare(`INSERT INTO holdings_snapshots (snapshot_date, ticker, quantity, avg_cost, position_category)
    VALUES ('2026-07-31','510300',10,10,'A股宽基指数底仓')`).run();
  const dates = ['2026-06-03', '2026-06-04', '2026-06-05', '2026-06-06', '2026-06-07', '2026-06-08', '2026-06-09', '2026-06-10', '2026-06-11'];
  for (const date of dates) seedPrice(database, '510300', date, 10);
  const result = await rebuildAssetValuations(env, { startDate: dates[0], endDate: dates.at(-1), actor: 'contract' });
  assert.ok(!(result instanceof Response));
  assert.deepEqual({ rebuilt: result.rebuilt, complete: result.complete, incomplete: result.incomplete }, { rebuilt: 9, complete: 9, incomplete: 0 });
  database.close();
}

console.log('Finance facts-to-derived-valuation rebuild and strict calendar-date contract passed.');
await import('./finance-asset-reconciliation-contract.mjs');
