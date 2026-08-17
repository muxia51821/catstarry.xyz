import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { handleTrades } from '../workers/finance-api/src/routes/trades.ts';

class SqliteD1Statement {
  constructor(database, sql, values = []) { this.database = database; this.sql = sql; this.values = values; }
  bind(...values) { return new SqliteD1Statement(this.database, this.sql, values); }
  async first() { const row = this.database.prepare(this.sql).get(...this.values); return row ? { ...row } : null; }
  async all() { return { results: this.database.prepare(this.sql).all(...this.values).map((row) => ({ ...row })) }; }
  async run() { const result = this.database.prepare(this.sql).run(...this.values); return { success: true, meta: { changes: Number(result.changes), last_row_id: Number(result.lastInsertRowid ?? 0) } }; }
}
class SqliteD1 {
  constructor(database) { this.database = database; }
  prepare(sql) { return new SqliteD1Statement(this.database, sql); }
  async batch(statements) {
    this.database.exec('BEGIN');
    try {
      const rows = [];
      for (const statement of statements) rows.push(await statement.run());
      this.database.exec('COMMIT');
      return rows;
    } catch (error) {
      this.database.exec('ROLLBACK');
      throw error;
    }
  }
}
class SessionKv {
  async get(key, type) {
    if (key !== 'session:classification-contract') return null;
    const session = { username: 'muxia', role: 'admin', expires_at: '2099-01-01T00:00:00.000Z' };
    return type === 'json' ? session : JSON.stringify(session);
  }
  async put() {}
  async delete() {}
}

const database = new DatabaseSync(':memory:');
for (const file of (await readdir('workers/finance-api/migrations')).filter((name) => name.endsWith('.sql')).sort()) {
  database.exec(await readFile(path.join('workers/finance-api/migrations', file), 'utf8'));
}

database.exec(`
INSERT INTO finance_securities (ticker,instrument_type,security_attribute,attribute_source,updated_at,updated_by) VALUES
 ('000021','stock','消费电子','contract','2026-08-17T00:00:00.000Z','contract'),
 ('300750','stock','电池','contract','2026-08-17T00:00:00.000Z','contract'),
 ('510330','etf','沪深300','contract','2026-08-17T00:00:00.000Z','contract');
INSERT INTO trades (trade_date,ticker,ticker_name,direction,quantity,price,position_category,reason,needs_review,created_at,created_by) VALUES
 ('2026-08-13','000021','深科技','buy',100,40.23,'主动操作仓（A股）',NULL,0,'2026-08-13T00:00:00.000Z','contract'),
 ('2026-08-07','300750','宁德时代','buy',100,393.93,'主动操作仓（A股）',NULL,0,'2026-08-07T00:00:00.000Z','contract'),
 ('2026-07-01','510330','沪深300ETF','buy',1000,5.1,'A股宽基指数底仓',NULL,0,'2026-07-01T00:00:00.000Z','contract');
`);

const env = { DB: new SqliteD1(database), FINANCE_AUTH_KV: new SessionKv() };
function request(query) {
  return new Request(`https://finance.test/api/trades?${query}`, { headers: { Cookie: 'token=classification-contract' } });
}

const filteredResponse = await handleTrades(request(`limit=50&position_category=${encodeURIComponent('主动操作仓（A股）')}&security_attribute=${encodeURIComponent('消费电子')}`), env);
assert.equal(filteredResponse.status, 200);
const filtered = await filteredResponse.json();
assert.equal(filtered.trades.length, 1);
assert.deepEqual({
  ticker: filtered.trades[0].ticker,
  role: filtered.trades[0].position_category,
  attribute: filtered.trades[0].security_attribute,
  instrument: filtered.trades[0].instrument_type,
}, { ticker: '000021', role: '主动操作仓（A股）', attribute: '消费电子', instrument: 'stock' });

const firstPageResponse = await handleTrades(request(`limit=1&position_category=${encodeURIComponent('主动操作仓（A股）')}`), env);
assert.equal(firstPageResponse.status, 200);
const firstPage = await firstPageResponse.json();
assert.equal(firstPage.trades.length, 1);
assert.ok(firstPage.nextCursor);

const secondPageResponse = await handleTrades(request(`limit=1&position_category=${encodeURIComponent('主动操作仓（A股）')}&cursor=${encodeURIComponent(firstPage.nextCursor)}`), env);
assert.equal(secondPageResponse.status, 200);
const secondPage = await secondPageResponse.json();
assert.equal(secondPage.trades[0].ticker, '300750');

const mismatchedCursor = await handleTrades(request(`limit=1&position_category=${encodeURIComponent('主动操作仓（A股）')}&security_attribute=${encodeURIComponent('消费电子')}&cursor=${encodeURIComponent(firstPage.nextCursor)}`), env);
assert.equal(mismatchedCursor.status, 400, 'cursor must stay bound to the active role/security filters');

database.close();
console.log('Finance server-side trade classification filter contract passed.');
