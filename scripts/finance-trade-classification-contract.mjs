import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { SqliteD1 } from './lib/sqlite-d1.mjs';
import { handleTrades } from '../workers/finance-api/src/routes/trades.ts';

const SESSION_TOKEN = '11111111-1111-4111-8111-111111111111';

class SessionKv {
  async get(key, type) {
    if (key !== `session:${SESSION_TOKEN}`) return null;
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
  return new Request(`https://finance.test/api/trades?${query}`, { headers: { Cookie: `token=${SESSION_TOKEN}` } });
}

const filteredResponse = await handleTrades(request(`limit=50&position_category=${encodeURIComponent('主动操作仓（A股）')}&security_attribute=${encodeURIComponent('消费电子')}`), env);
assert.equal(filteredResponse.status, 200);
const filtered = await filteredResponse.json();
assert.equal(filtered.trades.length, 1);
assert.deepEqual({
  ticker: filtered.trades[0].ticker,
  role: filtered.trades[0].position_category,
}, { ticker: '000021', role: '主动操作仓（A股）' });
assert.ok(!('security_attribute' in filtered.trades[0]), 'Trade facts stay independent of the security-reference projection');

const nameFilteredResponse = await handleTrades(request(`limit=50&ticker=${encodeURIComponent('深科技')}`), env);
assert.equal(nameFilteredResponse.status, 200, 'security name is a valid trade filter');
const nameFiltered = await nameFilteredResponse.json();
assert.deepEqual(nameFiltered.trades.map((row) => row.ticker), ['000021']);

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
