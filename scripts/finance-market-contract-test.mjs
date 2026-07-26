import assert from 'node:assert/strict';
import { refreshMarketData } from '../workers/finance-api/src/tasks/refresh-market-data.ts';

class MarketDatabase {
  rows = [];
  prepare(sql) {
    return {
      values: [],
      bind(...values) { this.values = values; return this; },
      sql,
    };
  }
  async batch(statements) {
    this.rows.push(...statements.map((statement) => ({ ticker: statement.values[0], price: statement.values[1], pe_ttm: statement.values[2], fetched_at: statement.values[3] })));
    return statements.map(() => ({ meta: { changes: 1 } }));
  }
}

const unconfigured = new MarketDatabase();
assert.deepEqual(await refreshMarketData({ DB: unconfigured }, undefined, async () => {}), { written: 0, configured: false });
assert.deepEqual(unconfigured.rows, []);

const database = new MarketDatabase();
let calls = 0;
const providerToken = `isolated-${crypto.randomUUID()}`;
const goodFetch = async (_url, init) => {
  calls += 1;
  assert.equal(init.headers.Authorization, `Bearer ${providerToken}`);
  return Response.json({ records: [
    { ticker: '510300', price: 4.2578, pe_ttm: null },
    { ticker: 'SSE300_PE', price: null, pe_ttm: 15.8123 },
  ] });
};
assert.deepEqual(await refreshMarketData({ DB: database, MARKET_PROVIDER_URL: 'https://provider.invalid/snapshot', MARKET_PROVIDER_TOKEN: providerToken }, goodFetch, async () => {}), { written: 2, configured: true });
assert.equal(calls, 1);
assert.deepEqual(database.rows.map(({ ticker, price, pe_ttm }) => ({ ticker, price, pe_ttm })), [
  { ticker: '510300', price: 4.2578, pe_ttm: null },
  { ticker: 'SSE300_PE', price: null, pe_ttm: 15.8123 },
]);

const duplicateDatabase = new MarketDatabase();
await assert.rejects(refreshMarketData(
  { DB: duplicateDatabase, MARKET_PROVIDER_URL: 'https://provider.invalid/snapshot' },
  async () => Response.json({ records: [{ ticker: '510300', price: 4 }, { ticker: '510300', price: 5 }] }),
  async () => {},
), /duplicate ticker/);
assert.deepEqual(duplicateDatabase.rows, [], 'invalid provider batches must not partially replace the last valid snapshot');

await assert.rejects(refreshMarketData(
  { DB: new MarketDatabase(), MARKET_PROVIDER_URL: 'https://provider.invalid/snapshot' },
  async () => Response.json({
    records: Array.from({ length: 101 }, (_, index) => ({ ticker: `TICKER-${index}`, price: 1 })),
  }),
  async () => {},
), /payload is invalid/);

const retainedDatabase = new MarketDatabase();
retainedDatabase.rows.push({ ticker: '510300', price: 4, pe_ttm: null, fetched_at: 'previous' });
retainedDatabase.batch = async () => {
  throw new Error('D1 batch unavailable');
};
await assert.rejects(refreshMarketData(
  {
    DB: retainedDatabase,
    MARKET_PROVIDER_URL: 'https://provider.invalid/snapshot',
    MARKET_PROVIDER_TOKEN: providerToken,
  },
  goodFetch,
  async () => {},
), /D1 batch unavailable/);
assert.deepEqual(
  retainedDatabase.rows,
  [{ ticker: '510300', price: 4, pe_ttm: null, fetched_at: 'previous' }],
  'database write failures must retain the last valid snapshot',
);

let failures = 0;
await assert.rejects(refreshMarketData(
  { DB: new MarketDatabase(), MARKET_PROVIDER_URL: 'https://provider.invalid/snapshot' },
  async () => { failures += 1; return new Response('unavailable', { status: 503 }); },
  async () => {},
), /503/);
assert.equal(failures, 3, 'transient provider failures must use bounded retries');

const oversized = new ReadableStream({
  start(controller) {
    controller.enqueue(new Uint8Array(1_048_577));
    controller.close();
  },
});
await assert.rejects(refreshMarketData(
  { DB: new MarketDatabase(), MARKET_PROVIDER_URL: 'https://provider.invalid/snapshot' },
  async () => new Response(oversized, { headers: { 'Content-Type': 'application/json' } }),
  async () => {},
), /too large/);

console.log('Finance market provider contract passed.');
