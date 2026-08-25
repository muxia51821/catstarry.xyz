import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { hash } from 'bcryptjs';

import { applyFinanceMigrations, SqliteD1 } from './lib/sqlite-d1.mjs';
import worker from '../workers/finance-api/src/index.ts';

const fixtureNow = new Date();
const fixtureNowIso = fixtureNow.toISOString();
function fixtureDayYearsAgo(years) {
  const date = new Date(fixtureNow);
  date.setUTCFullYear(date.getUTCFullYear() - years);
  return date.toISOString().slice(0, 10);
}

class MemoryKv {
  values = new Map();
  async get(key, type) {
    const value = this.values.get(key);
    if (value === undefined) return null;
    if (type === 'json') return typeof value === 'string' ? JSON.parse(value) : value;
    return typeof value === 'string' ? value : JSON.stringify(value);
  }
  async put(key, value) { this.values.set(key, value); }
  async delete(key) { this.values.delete(key); }
  async list({ prefix = '' } = {}) { return { keys: [...this.values.keys()].filter((name) => name.startsWith(prefix)).map((name) => ({ name })), list_complete: true }; }
}

const database = new DatabaseSync(':memory:');
await applyFinanceMigrations(database);
const env = { FINANCE_AUTH_KV: new MemoryKv(), DB: new SqliteD1(database) };

database.prepare(`INSERT INTO finance_import_review (batch_id, row_number, record_kind, raw_json)
  VALUES ('fixture-batch', 3, 'trade', '{"ticker":"BAD"}')`).run();
const insertMarketQuote = database.prepare('INSERT INTO market_data (ticker, pe_ttm, fetched_at) VALUES (?, ?, ?)');
insertMarketQuote.run('CSI300_PE', 12.5, fixtureNowIso);
insertMarketQuote.run('CSI500_PE', 23.5, fixtureNowIso);
const insertIndexHistory = database.prepare(`INSERT INTO finance_index_valuation_history
  (symbol, observation_date, pe_ttm, source, imported_at, imported_by) VALUES (?, ?, ?, 'CSI', ?, 'contract')`);
for (const [yearsAgo, peTtm] of [[4, 10], [3, 12], [2, 14], [1, 16], [0, 18]]) {
  insertIndexHistory.run('CSI300_PE', fixtureDayYearsAgo(yearsAgo), peTtm, fixtureNowIso);
}

const password = `isolated-${crypto.randomUUID()}`;
env.FINANCE_AUTH_KV.values.set('user:admin', { password_hash: await hash(password, 4), role: 'admin' });
env.FINANCE_AUTH_KV.values.set('user:viewer', { password_hash: await hash(password, 4), role: 'viewer' });

const fetchWorker = (pathname, init = {}) => worker.fetch(new Request(`https://finance.test${pathname}`, init), env, {});
const trusted = { Origin: 'https://f.catstarry.xyz', 'Content-Type': 'application/json' };

env.FINANCE_SITE_ORIGIN = 'https://f-staging.catstarry.xyz';
assert.equal((await fetchWorker('/api/auth/login', {
  method: 'POST',
  headers: trusted,
  body: '{}',
})).status, 403, 'configured Finance staging Worker must reject the production Origin');
assert.equal((await fetchWorker('/api/auth/login', {
  method: 'POST',
  headers: { Origin: env.FINANCE_SITE_ORIGIN, 'Content-Type': 'application/json' },
  body: '{}',
})).status, 400, 'configured Finance staging Origin must reach request validation');
delete env.FINANCE_SITE_ORIGIN;

assert.equal((await fetchWorker('/api/auth/login', { method: 'POST', body: '{}' })).status, 403);
assert.equal((await fetchWorker('/api/auth/login', { method: 'POST', headers: trusted, body: JSON.stringify({ username: 'admin', password: 'wrong-password-value' }) })).status, 401);
assert.deepEqual(await fetchWorker('/api/auth/session', { headers: { Cookie: 'token=%GG' } }).then((response) => response.json()), { authenticated: false, username: null });
assert.equal((await fetchWorker('/api/auth/login', { method: 'POST', headers: trusted, body: JSON.stringify({ username: 'admin', password: 'x'.repeat(5_000) }) })).status, 413);
for (const invalidBody of ['null', '[]', '"credentials"']) {
  assert.equal((await fetchWorker('/api/auth/login', {
    method: 'POST',
    headers: trusted,
    body: invalidBody,
  })).status, 400, 'non-object Finance JSON must be rejected as a client error');
}

async function login(username) {
  const response = await fetchWorker('/api/auth/login', { method: 'POST', headers: trusted, body: JSON.stringify({ username, password }) });
  assert.equal(response.status, 200);
  assert.match(response.headers.get('set-cookie') ?? '', /HttpOnly; Secure; SameSite=Strict/);
  return (response.headers.get('set-cookie') ?? '').split(';')[0];
}

const viewerCookie = await login('viewer');
assert.equal((await fetchWorker('/api/trades', { headers: { Cookie: viewerCookie } })).status, 200);
assert.equal((await fetchWorker('/api/trades', { method: 'POST', headers: { ...trusted, Cookie: viewerCookie }, body: '{}' })).status, 403);
assert.equal((await fetchWorker('/api/archive?year=2026', { headers: { Cookie: viewerCookie } })).status, 403);
assert.equal((await fetchWorker('/api/access-log', { headers: { Cookie: viewerCookie } })).status, 403);
assert.equal((await fetchWorker('/api/import-review', { headers: { Cookie: viewerCookie } })).status, 403);
assert.equal((await fetchWorker('/api/notifications', { headers: { Cookie: viewerCookie } })).status, 200);
assert.equal((await fetchWorker('/api/confirmations/monthly', {
  method: 'POST',
  headers: { ...trusted, Cookie: viewerCookie },
  body: JSON.stringify({ period: '2026-13' }),
})).status, 400);
assert.equal((await fetchWorker('/api/confirmations/monthly', {
  method: 'POST',
  headers: { ...trusted, Cookie: viewerCookie },
  body: JSON.stringify({ period: '2000-01' }),
})).status, 409);
const confirmablePeriod = (await fetchWorker('/api/notifications', {
  headers: { Cookie: viewerCookie },
}).then((response) => response.json())).monthly_confirmation.period;
assert.equal((await fetchWorker('/api/confirmations/monthly', {
  method: 'POST',
  headers: { ...trusted, Cookie: viewerCookie },
  body: JSON.stringify({ period: confirmablePeriod }),
})).status, 200);

const adminCookie = await login('admin');
assert.equal((await fetchWorker('/api/account-events', { headers: { Cookie: viewerCookie } })).status, 200, 'viewers can read account events');
assert.equal((await fetchWorker('/api/account-events', { method: 'POST', headers: { ...trusted, Cookie: viewerCookie }, body: '{}' })).status, 403, 'viewers cannot write account events');
const accountEventCreated = await fetchWorker('/api/account-events', { method: 'POST', headers: { ...trusted, Cookie: adminCookie }, body: JSON.stringify({ event_date: '2026-07-25', event_time: '09:30', event_type: 'dividend', ticker: '510300', ticker_name: '沪深300ETF', amount: 10, note: 'contract' }) });
assert.equal(accountEventCreated.status, 201, 'administrator can create an internal account event');
assert.equal((await fetchWorker('/api/account-events/1', { method: 'PATCH', headers: { ...trusted, Cookie: adminCookie }, body: JSON.stringify({ event_date: '2026-07-25', event_type: 'dividend_tax', ticker: '510300', amount: -1, note: 'tax' }) })).status, 200, 'administrator can update an internal account event');
assert.equal((await fetchWorker('/api/account-events/1', { method: 'DELETE', headers: { ...trusted, Cookie: adminCookie }, body: '{}' })).status, 200, 'administrator can soft-delete an internal account event');
assert.equal((await fetchWorker('/api/trades', { method: 'POST', headers: { ...trusted, Cookie: adminCookie }, body: '{}' })).status, 400);
assert.equal((await fetchWorker('/api/circuit/evaluate', {
  method: 'POST',
  headers: { ...trusted, Cookie: adminCookie },
  body: '{}',
})).status, 400, 'incomplete circuit metrics must not be accepted');
assert.equal((await fetchWorker('/api/circuit/999999999999999999999/confirm-resolve', {
  method: 'PATCH',
  headers: { ...trusted, Cookie: adminCookie },
  body: '{}',
})).status, 404, 'direct circuit resolution is retired in favour of two-role confirmation');
assert.equal((await fetchWorker('/api/import-review/999999999999999999999', {
  method: 'PATCH',
  headers: { ...trusted, Cookie: adminCookie },
  body: JSON.stringify({ resolution_note: 'bounded' }),
})).status, 400);
const created = await fetchWorker('/api/trades', {
  method: 'POST',
  headers: { ...trusted, Cookie: adminCookie },
  body: JSON.stringify({
    trade_date: '2026-07-25',
    ticker: '510300',
    ticker_name: '沪深300ETF',
    direction: 'buy',
    quantity: 100,
    price: 4.25,
    trade_time: '09:30',
    fee: 0.12,
    net_cash_amount: -425.12,
    position_category: 'broad-index',
    reason: 'contract',
  }),
});
assert.equal(created.status, 201, await created.clone().text());
assert.deepEqual((await created.clone().json()).trade.fee, 0.12, 'optional online trade fee is persisted');
assert.equal((await fetchWorker('/api/memos', {
  method: 'POST', headers: { ...trusted, Cookie: adminCookie }, body: JSON.stringify({ reason: 'linked investment decision' }),
})).status, 400, 'a memo must select a trade');
assert.equal((await fetchWorker('/api/memos', {
  method: 'POST', headers: { ...trusted, Cookie: adminCookie }, body: JSON.stringify({ trade_id: 999, reason: 'missing trade' }),
})).status, 404, 'a memo trade must exist and remain active');
const memoCreated = await fetchWorker('/api/memos', {
  method: 'POST', headers: { ...trusted, Cookie: adminCookie }, body: JSON.stringify({
    trade_id: 1,
    memo_date: '1999-01-01',
    ticker: 'CLIENT-SUPPLIED',
    position_category: 'client-category',
    operation_type: 'client-operation',
    reason: 'linked investment decision',
    stop_loss_triggered: true,
    note: 'memo note',
  }),
});
assert.equal(memoCreated.status, 201, await memoCreated.clone().text());
const memoSnapshot = (await memoCreated.json()).memo;
assert.deepEqual(
  { trade_id: memoSnapshot.trade_id, memo_date: memoSnapshot.memo_date, ticker: memoSnapshot.ticker, position_category: memoSnapshot.position_category, operation_type: memoSnapshot.operation_type },
  { trade_id: 1, memo_date: '2026-07-25', ticker: '510300', position_category: 'broad-index', operation_type: 'buy' },
  'memo trade fields must be copied from the active trade, not trusted from the client',
);
assert.equal((await fetchWorker('/api/memos/1', {
  method: 'PUT', headers: { ...trusted, Cookie: adminCookie }, body: JSON.stringify({
    trade_id: 1, reason: 'updated investment decision', stop_loss_triggered: false, note: 'updated memo note', ticker: 'untrusted',
  }),
})).status, 200, 'PUT memo updates retain a server-derived snapshot');
assert.equal((await fetchWorker('/api/memos', {
  method: 'POST', headers: { ...trusted, Cookie: adminCookie }, body: JSON.stringify({ trade_id: 1, reason: 'duplicate memo' }),
})).status, 409, 'one active trade must have at most one active memo');
assert.equal((await fetchWorker('/api/memos/1', {
  method: 'PATCH', headers: { ...trusted, Cookie: adminCookie }, body: JSON.stringify({ trade_id: 999, reason: 'reassign memo', stop_loss_triggered: false }),
})).status, 409, 'editing a memo must not reassign its linked trade');
database.prepare(`INSERT INTO circuit_breaker_log (level, reason, triggered_at) VALUES ('black', 'contract', ?)`).run(fixtureNowIso);
for (const [method, pathname, body] of [
  ['POST', '/api/trades', { trade_date: '2026-07-26', ticker: '510500', direction: 'buy', quantity: 1, price: 5, position_category: 'broad-index' }],
  ['PATCH', '/api/trades/1', { trade_date: '2026-07-25', ticker: '510300', direction: 'buy', quantity: 120, price: 4.3, position_category: 'broad-index' }],
  ['DELETE', '/api/trades/1', {}],
]) {
  const response = await fetchWorker(pathname, { method, headers: { ...trusted, Cookie: adminCookie }, body: JSON.stringify(body) });
  assert.equal(response.status, 409, `active black circuit must block ${method} ${pathname}`);
  assert.equal((await response.json()).error.code, 'black_circuit_active');
}
database.prepare('DELETE FROM circuit_breaker_log').run();
assert.equal((await fetchWorker('/api/trades', {
  method: 'POST', headers: { ...trusted, Cookie: adminCookie }, body: JSON.stringify({
    trade_date: '2026-07-24', ticker: '510300', direction: 'buy', quantity: 1, price: 4.2, position_category: 'broad-index',
  }),
})).status, 409, 'backdated online trades must be rejected');
assert.equal((await fetchWorker('/api/trades', {
  method: 'POST', headers: { ...trusted, Cookie: adminCookie }, body: JSON.stringify({
    trade_date: '2026-02-31', ticker: '510500', direction: 'buy', quantity: 1, price: 5, position_category: 'broad-index',
  }),
})).status, 400, 'calendar-invalid trade dates must be rejected');
assert.equal((await fetchWorker('/api/trades', { headers: { Cookie: adminCookie } }).then((response) => response.json())).trades.length, 1);
assert.equal((await fetchWorker('/api/trades/1', {
  method: 'PATCH', headers: { ...trusted, Cookie: adminCookie }, body: JSON.stringify({
    trade_date: '2026-07-25', ticker: '510300', ticker_name: '沪深300ETF', direction: 'buy', quantity: 120, price: 4.3, position_category: 'broad-index', reason: 'corrected contract',
  }),
})).status, 200, 'the latest standalone online trade can be edited');
assert.equal((await fetchWorker('/api/trades/1', {
  method: 'DELETE', headers: { ...trusted, Cookie: adminCookie }, body: '{}',
})).status, 200, 'the latest standalone online trade can be soft-deleted');
assert.equal((await fetchWorker('/api/trades', { headers: { Cookie: adminCookie } }).then((response) => response.json())).trades.length, 0);
const memosAfterTradeDelete = await fetchWorker('/api/memos', { headers: { Cookie: adminCookie } }).then((response) => response.json());
assert.equal(memosAfterTradeDelete.memos.length, 1, 'soft-deleting a trade must not delete its memo');
assert.deepEqual(
  { memo_date: memosAfterTradeDelete.memos[0].memo_date, ticker: memosAfterTradeDelete.memos[0].ticker, position_category: memosAfterTradeDelete.memos[0].position_category, operation_type: memosAfterTradeDelete.memos[0].operation_type },
  { memo_date: '2026-07-25', ticker: '510300', position_category: 'broad-index', operation_type: 'buy' },
  'memo snapshot must remain readable after the source trade is soft-deleted',
);
assert.equal((await fetchWorker('/api/memos', {
  method: 'POST', headers: { ...trusted, Cookie: adminCookie }, body: JSON.stringify({ trade_id: 1, reason: 'deleted trade cannot be linked' }),
})).status, 404, 'new memos cannot select a soft-deleted trade');
assert.equal((await fetchWorker('/api/memos/1', {
  method: 'DELETE', headers: { ...trusted, Cookie: adminCookie }, body: '{}',
})).status, 200, 'an administrator can soft-delete a memo');
assert.equal((await fetchWorker('/api/memos', { headers: { Cookie: adminCookie } }).then((response) => response.json())).memos.length, 0, 'soft-deleted memos must not be listed');
for (let id = 2; id <= 102; id += 1) {
  database.prepare(`INSERT INTO trades (trade_date, ticker, ticker_name, direction, quantity, price, position_category, created_at, created_by)
    VALUES ('2026-07-30', '510300', '沪深300ETF', 'buy', 1, 4.2, 'broad-index', ?, 'contract')`).run(fixtureNowIso);
}
const firstTradePage = await fetchWorker('/api/trades?limit=50&ticker=510300&direction=buy', { headers: { Cookie: adminCookie } }).then((response) => response.json());
assert.equal(firstTradePage.items.length, 50);
assert.ok(firstTradePage.nextCursor, 'trade pagination must return a cursor after the first 50 rows');
const secondTradePage = await fetchWorker(`/api/trades?limit=50&ticker=510300&direction=buy&cursor=${encodeURIComponent(firstTradePage.nextCursor)}`, { headers: { Cookie: adminCookie } }).then((response) => response.json());
assert.equal(secondTradePage.items.length, 50);
assert.equal(new Set([...firstTradePage.items, ...secondTradePage.items].map((trade) => trade.id)).size, 100, 'trade cursor pages must not repeat rows');
assert.equal((await fetchWorker(`/api/trades?limit=50&ticker=510300&direction=sell&cursor=${encodeURIComponent(firstTradePage.nextCursor)}`, { headers: { Cookie: adminCookie } })).status, 400, 'trade cursor must be bound to its filters');
const insertAccessLog = database.prepare('INSERT INTO finance_access_log (username, action, occurred_at) VALUES (?, ?, ?)');
for (let id = 1; id <= 101; id += 1) insertAccessLog.run('pagination-admin', 'view', `2026-07-30T12:00:${String(id % 60).padStart(2, '0')}.000Z`);
const firstAccessPage = await fetchWorker('/api/access-log?limit=50&start=2026-07-30&end=2026-07-30&username=pagination-admin&action=view', { headers: { Cookie: adminCookie } }).then((response) => response.json());
assert.equal(firstAccessPage.items.length, 50, 'date-only access end filters must include that day');
assert.ok(firstAccessPage.nextCursor, 'access pagination must return a cursor after the first 50 rows');
const secondAccessPage = await fetchWorker(`/api/access-log?limit=50&start=2026-07-30&end=2026-07-30&username=pagination-admin&action=view&cursor=${encodeURIComponent(firstAccessPage.nextCursor)}`, { headers: { Cookie: adminCookie } }).then((response) => response.json());
assert.equal(secondAccessPage.items.length, 50);
assert.equal(new Set([...firstAccessPage.items, ...secondAccessPage.items].map((row) => row.id)).size, 100, 'access cursor pages must not repeat rows');
assert.equal((await fetchWorker(`/api/access-log?limit=50&username=other&cursor=${encodeURIComponent(firstAccessPage.nextCursor)}`, { headers: { Cookie: adminCookie } })).status, 400, 'access cursor must be bound to its filters');
const archive = await fetchWorker('/api/archive?year=2026', { headers: { Cookie: adminCookie } });
assert.equal(archive.status, 200);
assert.match(archive.headers.get('content-type') ?? '', /spreadsheetml/);
const archiveBytes = new Uint8Array(await archive.arrayBuffer());
assert.deepEqual([...archiveBytes.subarray(0, 4)], [0x50, 0x4b, 0x03, 0x04]);
const archiveFiles = readStoredZip(archiveBytes);
for (const [name, columns] of [
  ['Trades', ['trade_time', 'fee', 'net_cash_amount']],
  ['Holding Snapshots', ['snapshot_date', 'avg_cost', 'position_category']],
  ['Account Events', ['event_type', 'reference_value', 'amount']],
  ['Cash Flows', ['flow_type', 'manager_share_offset', 'net_amount']],
  ['Asset Snapshots', ['total_value', 'is_complete', 'incomplete_reason']],
  ['Investment Memos', ['trade_id', 'reason_source', 'stop_loss_triggered']],
]) {
  const sheet = archiveSheet(archiveFiles, name);
  for (const column of columns) assert.match(sheet, new RegExp(`<t xml:space="preserve">${column}</t>`), `${name} must include ${column}`);
}
const sameDayFirst = await fetchWorker('/api/trades', { method: 'POST', headers: { ...trusted, Cookie: adminCookie }, body: JSON.stringify({ trade_date: '2026-08-01', ticker: '159999', direction: 'buy', quantity: 100, price: 1, position_category: 'other' }) });
const sameDaySecond = await fetchWorker('/api/trades', { method: 'POST', headers: { ...trusted, Cookie: adminCookie }, body: JSON.stringify({ trade_date: '2026-08-01', ticker: '159999', direction: 'buy', quantity: 100, price: 2, position_category: 'other' }) });
assert.equal(sameDayFirst.status, 201); assert.equal(sameDaySecond.status, 201, 'same-day same-ticker online trades are allowed');
assert.equal((await sameDaySecond.json()).holding.quantity, 200, 'same-day holdings snapshots accumulate both trades');
assert.equal((await fetchWorker('/api/access-log?limit=20', { headers: { Cookie: adminCookie } })).status, 200);
assert.equal((await fetchWorker('/api/notifications', { headers: { Cookie: adminCookie } })).status, 200);
const pePayload = await fetchWorker('/api/pe', { headers: { Cookie: adminCookie } }).then((response) => response.json());
assert.equal(pePayload.indexes.find((row) => row.ticker === 'CSI300_PE').historical_position.status, 'available');
assert.equal(pePayload.indexes.find((row) => row.ticker === 'CSI300_PE').historical_position.source, 'CSI');
assert.equal(pePayload.indexes.find((row) => row.ticker === 'CSI500_PE').historical_position.reason, 'missing_history');
assert.equal(pePayload.indexes.find((row) => row.ticker === 'NASDAQ100_PE').historical_position, null);
database.prepare(`UPDATE market_data SET fetched_at = '2026-01-01T00:00:00.000Z' WHERE ticker = 'CSI300_PE'`).run();
const stalePePayload = await fetchWorker('/api/pe', { headers: { Cookie: adminCookie } }).then((response) => response.json());
assert.equal(stalePePayload.indexes.find((row) => row.ticker === 'CSI300_PE').historical_position.reason, 'current_pe_unavailable', 'stale current PE must not produce a historical position');
const pendingReview = await fetchWorker('/api/import-review?status=pending', { headers: { Cookie: adminCookie } }).then((response) => response.json());
assert.equal(pendingReview.review.length, 1);
assert.deepEqual(pendingReview.review[0].raw, { ticker: 'BAD' });
assert.equal((await fetchWorker('/api/import-review/1', {
  method: 'PATCH',
  headers: { ...trusted, Cookie: adminCookie },
  body: JSON.stringify({ resolution_note: '' }),
})).status, 400);
assert.equal((await fetchWorker('/api/import-review/1', {
  method: 'PATCH',
  headers: { ...trusted, Cookie: adminCookie },
  body: JSON.stringify({ resolution_note: 'Corrected through the online trade form' }),
})).status, 200);
assert.equal((await fetchWorker('/api/import-review/1', {
  method: 'PATCH',
  headers: { ...trusted, Cookie: adminCookie },
  body: JSON.stringify({ resolution_note: 'duplicate resolution' }),
})).status, 409);
assert.equal((await fetchWorker('/api/import-review?status=pending', { headers: { Cookie: adminCookie } }).then((response) => response.json())).review.length, 0);

assert.equal((await fetchWorker('/api/monthly', { headers: { Cookie: viewerCookie } })).status, 200);
assert.equal((await fetchWorker('/api/plan', { headers: { Cookie: viewerCookie } })).status, 200);
assert.equal((await fetchWorker('/api/accounts', { headers: { Cookie: viewerCookie } })).status, 404, 'Account structure is outside the joint-investment product');
assert.equal((await fetchWorker('/api/monthly', {
  method: 'PUT', headers: { ...trusted, Cookie: viewerCookie }, body: JSON.stringify({ year_month: '2026-07' }),
})).status, 403);
assert.equal((await fetchWorker('/api/monthly', {
  method: 'PUT', headers: { ...trusted, Cookie: adminCookie }, body: JSON.stringify({
    year_month: '2026-07', muxia_invest: 5000, cati_invest: 0, end_total: 12600, sse300_pe: 12.5, summary: 'contract monthly record',
  }),
})).status, 200);
assert.equal((await fetchWorker('/api/monthly', { headers: { Cookie: adminCookie } }).then((response) => response.json())).records.length, 1);
assert.equal((await fetchWorker('/api/plan', {
  method: 'PUT', headers: { ...trusted, Cookie: adminCookie }, body: JSON.stringify({
    initial_capital: 100000, monthly_invest: 5000, months_year1: 7, months_year2plus: 12,
    rate_low: .03, rate_base: .06, rate_high: .1, bonus1: 50000, bonus2to4: 35000, start_year: 2026, end_year: 2030,
  }),
})).status, 200);
assert.equal((await fetchWorker('/api/plan', { headers: { Cookie: adminCookie } }).then((response) => response.json())).plan.monthly_invest, 5000);
assert.equal((await fetchWorker('/api/risk-rules', {
  method: 'PUT', headers: { ...trusted, Cookie: adminCookie }, body: JSON.stringify({ rule_key: 'temperature', value: { freeze: 8, low: 12, normal: 18, high: 24 } }),
})).status, 200);
assert.equal(database.prepare(`SELECT value_json FROM finance_investment_rules WHERE rule_key = 'temperature'`).get().value_json, JSON.stringify({ freeze: 8, low: 12, normal: 18, high: 24 }));
assert.equal(database.prepare('SELECT rule_key FROM finance_rule_audit ORDER BY id DESC LIMIT 1').get()?.rule_key, 'temperature');
assert.equal((await fetchWorker('/api/risk-rules', {
  method: 'PUT', headers: { ...trusted, Cookie: adminCookie }, body: JSON.stringify({ rule_key: 'temperature', value: { freeze: 12, low: 10, normal: 18, high: 24 } }),
})).status, 400, 'PE temperature boundaries must be strictly increasing');
assert.equal((await fetchWorker('/api/monthly', {
  method: 'PUT', headers: { ...trusted, Cookie: adminCookie }, body: JSON.stringify({
    year_month: '2026-12', muxia_invest: 1000, cati_invest: 500, end_total: 120000, summary: 'year-end record',
  }),
})).status, 200);
const annual = await fetchWorker('/api/review/calculate', {
  method: 'POST', headers: { ...trusted, Cookie: adminCookie }, body: JSON.stringify({
    year: 2026,
    summary: 'derived annual review',
    modifiedDietz: { beginningValue: 1, endingValue: 2, periodDays: 1, cashFlows: [{ amount: 9_999_999, day: 0 }] },
    currentValue: 2,
    historicalMaximumValue: 3,
  }),
});
assert.equal(annual.status, 200);
const annualPayload = await annual.json();
assert.equal(annualPayload.calculation.dietz.beginningValue, 100000, 'annual review must derive beginning value from the Finance plan');
assert.equal(annualPayload.calculation.dietz.endingValue, 120000, 'annual review must derive ending value from the December record');
assert.equal(annualPayload.calculation.dietz.netCashFlow, 6500, 'annual review must ignore browser-provided cash flows');
const incompleteAnnual = await fetchWorker('/api/review/calculate', {
  method: 'POST', headers: { ...trusted, Cookie: adminCookie }, body: JSON.stringify({ year: 2027, summary: 'must not calculate' }),
});
assert.equal(incompleteAnnual.status, 409);
assert.equal((await incompleteAnnual.json()).error.code, 'missing_annual_data');
assert.equal((await fetchWorker('/api/accounts', {
  method: 'POST', headers: { ...trusted, Cookie: adminCookie }, body: JSON.stringify({ name: 'forbidden' }),
})).status, 404);

console.log('Finance HTTP contract passed.');

function readStoredZip(source) {
  const view = new DataView(source.buffer, source.byteOffset, source.byteLength);
  const end = findSignature(view, 0x06054b50);
  assert.ok(end >= 0, 'archive ZIP end record is missing');
  const files = new Map();
  let cursor = view.getUint32(end + 16, true);
  for (let index = 0; index < view.getUint16(end + 10, true); index += 1) {
    assert.equal(view.getUint32(cursor, true), 0x02014b50, 'archive ZIP central record is invalid');
    assert.equal(view.getUint16(cursor + 10, true), 0, 'archive ZIP must use stored entries');
    const size = view.getUint32(cursor + 24, true); const nameLength = view.getUint16(cursor + 28, true); const extraLength = view.getUint16(cursor + 30, true); const commentLength = view.getUint16(cursor + 32, true); const local = view.getUint32(cursor + 42, true);
    const name = new TextDecoder().decode(source.subarray(cursor + 46, cursor + 46 + nameLength));
    const localNameLength = view.getUint16(local + 26, true); const localExtraLength = view.getUint16(local + 28, true); const data = local + 30 + localNameLength + localExtraLength;
    files.set(name, source.subarray(data, data + size));
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  return files;
}

function archiveSheet(files, name) {
  const workbook = new TextDecoder().decode(files.get('xl/workbook.xml'));
  const match = new RegExp(`<sheet name="${name}" sheetId="\\d+" r:id="rId(\\d+)"/>`).exec(workbook);
  assert.ok(match, `archive must include ${name}`);
  const sheet = files.get(`xl/worksheets/sheet${match[1]}.xml`);
  assert.ok(sheet, `archive must include ${name} XML`);
  return new TextDecoder().decode(sheet);
}

function findSignature(view, signature) {
  for (let offset = view.byteLength - 22; offset >= 0; offset -= 1) if (view.getUint32(offset, true) === signature) return offset;
  return -1;
}
