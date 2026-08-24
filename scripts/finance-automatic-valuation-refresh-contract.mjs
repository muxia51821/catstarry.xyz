import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { assetValuationRefreshAttempt, refreshAutomaticAssetValuations } from '../workers/finance-api/src/tasks/refresh-asset-valuations.ts';

class Statement {
  constructor(database, sql, values = []) { this.database = database; this.sql = sql; this.values = values; }
  bind(...values) { return new Statement(this.database, this.sql, values); }
  async first() { const row = this.database.prepare(this.sql).get(...this.values); return row ? { ...row } : null; }
  async all() { return { results: this.database.prepare(this.sql).all(...this.values).map((row) => ({ ...row })) }; }
  async run() { return this.execute(); }
  execute() { return this.database.prepare(this.sql).run(...this.values); }
}
class D1 {
  constructor(database) { this.database = database; }
  prepare(sql) { return new Statement(this.database, sql); }
  async batch(statements) {
    this.database.exec('BEGIN');
    try { const results = statements.map((statement) => statement.execute()); this.database.exec('COMMIT'); return results; }
    catch (error) { this.database.exec('ROLLBACK'); throw error; }
  }
}

async function fixture() {
  const database = new DatabaseSync(':memory:');
  for (const file of (await readdir('workers/finance-api/migrations')).filter((name) => name.endsWith('.sql')).sort()) {
    database.exec(await readFile(path.join('workers/finance-api/migrations', file), 'utf8'));
  }
  database.prepare(`INSERT INTO finance_asset_snapshots (
    snapshot_at, snapshot_date, holdings_value, cash_value, total_value, source, is_complete, created_at, created_by
  ) VALUES ('2026-07-31T08:00:00.000Z','2026-07-31',100,100,200,'broker-reconciliation',1,'2026-07-31T08:00:00.000Z','contract')`).run();
  database.prepare(`INSERT INTO holdings_snapshots (snapshot_date,ticker,quantity,avg_cost,position_category)
    VALUES ('2026-07-31','510300',10,10,'A股宽基指数底仓')`).run();
  database.prepare(`INSERT INTO finance_asset_valuations (
    valuation_date,securities_value,cash_value,other_assets_value,total_value,held_position_count,priced_position_count,is_complete,incomplete_reason,price_source,source,calculated_at
  ) VALUES ('2026-07-31',100,100,0,200,1,1,1,NULL,'contract','derived','2026-07-31T08:00:00.000Z')`).run();
  return { database, env: { DB: new D1(database) } };
}

function daily(days, close) {
  return { data: { sh000001: { day: days.map((date) => [date, '1', String(close), '1', '1']) }, sh510300: { day: days.map((date) => [date, '1', String(close), '1', '1']) } } };
}
function fetchFixture({ close = 12, missingCoverage = false } = {}) {
  return async (input) => {
    const url = String(input);
    if (url.includes('ifzq.gtimg.cn')) {
      const symbol = new URL(url).searchParams.get('param')?.split(',')[0] ?? '';
      const body = symbol === 'sh000001'
        ? { data: { sh000001: { day: [['2026-07-31', '1', '1', '1', '1'], ['2026-08-03', '1', '1', '1', '1']] } } }
        : { data: { sh510300: { day: [['2026-08-03', '1', String(close), '1', '1']] } } };
      return new Response(JSON.stringify(body), { status: 200 });
    }
    if (url.includes('10jqka.com.cn')) return new Response(missingCoverage ? 'cb({"data":""})' : 'cb({"data":"20260803,1,1,1"})', { status: 200 });
    throw new Error(`Unexpected source request: ${url}`);
  };
}

{
  const { database, env } = await fixture();
  const result = await refreshAutomaticAssetValuations(env, {
    triggerCron: '0,20 8,9,12 * * 1-5', attempt: 1, now: new Date('2026-08-03T08:20:00.000Z'), fetchImpl: fetchFixture(),
  });
  assert.deepEqual(result, { status: 'succeeded', business_date: '2026-08-03', price_rows_written: 1, valuation_rows_written: 1 });
  assert.equal(database.prepare("SELECT COUNT(*) AS count FROM finance_security_prices WHERE ticker='510300' AND price_date='2026-08-03'").get().count, 1);
  assert.equal(database.prepare("SELECT is_complete FROM finance_asset_valuations WHERE valuation_date='2026-08-03'").get().is_complete, 1);
  assert.equal(database.prepare('SELECT status FROM finance_asset_valuation_refresh_runs ORDER BY id DESC LIMIT 1').get().status, 'succeeded');
  database.close();
}

{
  const { database, env } = await fixture();
  const result = await refreshAutomaticAssetValuations(env, {
    triggerCron: '0,20 8,9,12 * * 1-5', attempt: 2, now: new Date('2026-08-03T09:00:00.000Z'), fetchImpl: fetchFixture({ missingCoverage: true }),
  });
  assert.equal(result.status, 'failed');
  assert.equal(database.prepare("SELECT COUNT(*) AS count FROM finance_security_prices WHERE price_date='2026-08-03'").get().count, 0, 'missing coverage must not write canonical raw closes');
  assert.equal(database.prepare("SELECT COUNT(*) AS count FROM finance_asset_valuations WHERE valuation_date='2026-08-03'").get().count, 0, 'missing coverage must not write a partial curve');
  database.close();
}

{
  const { database, env } = await fixture();
  database.prepare(`INSERT INTO finance_security_prices (ticker,price_date,close,source,adjustment,price_status,created_at,created_by)
    VALUES ('510300','2026-08-03',11,'existing','raw','observed','2026-08-03T00:00:00.000Z','contract')`).run();
  const result = await refreshAutomaticAssetValuations(env, {
    triggerCron: '0,20 8,9,12 * * 1-5', attempt: 3, now: new Date('2026-08-03T12:00:00.000Z'), fetchImpl: fetchFixture({ close: 12 }),
  });
  assert.equal(result.status, 'review_required');
  assert.equal(database.prepare("SELECT COUNT(*) AS count FROM finance_asset_valuations WHERE valuation_date='2026-08-03'").get().count, 0, 'a difference must never rebuild cache with a competing raw close');
  database.close();
}

assert.equal(assetValuationRefreshAttempt(new Date('2026-08-03T08:00:00.000Z')), null, 'the consolidated cron must not create an extra 16:00 run');
assert.equal(assetValuationRefreshAttempt(new Date('2026-08-03T08:20:00.000Z')), 1);
assert.equal(assetValuationRefreshAttempt(new Date('2026-08-03T09:00:00.000Z')), 2);
assert.equal(assetValuationRefreshAttempt(new Date('2026-08-03T09:20:00.000Z')), null, 'the consolidated cron must not create an extra 17:20 run');
assert.equal(assetValuationRefreshAttempt(new Date('2026-08-03T12:00:00.000Z')), 3);

console.log('Finance automatic valuation refresh, failure isolation, and canonical-price review contract passed.');
