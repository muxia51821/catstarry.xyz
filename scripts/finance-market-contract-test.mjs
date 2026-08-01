import assert from 'node:assert/strict';
import { refreshMarketData } from '../workers/finance-api/src/tasks/refresh-market-data.ts';

class MarketDatabase {
  marketRows = [];
  indexRows = [];
  holdingTickers = [];

  prepare(sql) {
    return {
      values: [],
      bind(...values) { this.values = values; return this; },
      all: async () => ({ results: this.holdingTickers }),
      sql,
    };
  }

  async batch(statements) {
    for (const statement of statements) {
      if (statement.sql.includes('INSERT INTO market_data')) {
        this.marketRows.push({ ticker: statement.values[0], price: statement.values[1], pe_ttm: statement.values[2], fetched_at: statement.values[3] });
      } else if (statement.sql.includes('INSERT INTO finance_market_indexes')) {
        this.indexRows.push({ symbol: statement.values[0], current_value: statement.values[2], previous_close: statement.values[3], change: statement.values[4], change_percent: statement.values[5] });
      }
    }
    return statements.map(() => ({ meta: { changes: 1 } }));
  }
}

function tencentLine(ticker, { name, price, previousClose, change, changePercent, peTtm, quoteTime }) {
  const values = Array.from({ length: 88 }, () => '');
  values[1] = name;
  values[3] = String(price);
  values[4] = String(previousClose);
  values[30] = quoteTime;
  values[31] = String(change);
  values[32] = String(changePercent);
  values[39] = String(peTtm);
  return `v_${ticker}="${values.join('~')}";`;
}

function tencentResponse({ include920 = false } = {}) {
  const lines = [
    tencentLine('sh000001', { name: 'SSE Composite', price: 3832.26, previousClose: 3804.69, change: 27.57, changePercent: 0.72, peTtm: 17.73, quoteTime: '20260731161420' }),
    tencentLine('sh000300', { name: 'CSI 300', price: 4588.2, previousClose: 4549.72, change: 38.48, changePercent: 0.85, peTtm: 14.38, quoteTime: '20260731161408' }),
    tencentLine('sh000905', { name: 'CSI 500', price: 7493.99, previousClose: 7309.58, change: 184.41, changePercent: 2.52, peTtm: 35.24, quoteTime: '20260731161414' }),
    tencentLine('sh000852', { name: 'CSI 1000', price: 7075.51, previousClose: 6900.66, change: 174.85, changePercent: 2.53, peTtm: 42.23, quoteTime: '20260731161414' }),
    tencentLine('sh000688', { name: 'STAR 50', price: 1635.96, previousClose: 1588.41, change: 47.55, changePercent: 2.99, peTtm: 196.04, quoteTime: '20260731161414' }),
    tencentLine('sh510300', { name: 'CSI 300 ETF', price: 4.2578, previousClose: 4.22, change: 0.0378, changePercent: 0.9, peTtm: 14.38, quoteTime: '20260731161408' }),
  ];
  if (include920) {
    lines.push(tencentLine('bj920001', { name: 'Beijing Sample', price: 9.12, previousClose: 9, change: 0.12, changePercent: 1.33, peTtm: 20.5, quoteTime: '20260731161408' }));
  }
  return new Response(lines.join(''));
}

const builtin = new MarketDatabase();
builtin.holdingTickers = [{ ticker: '510300' }, { ticker: '920001' }];
const builtinCalls = [];
const builtinFetch = async (input, init = {}) => {
  const url = new URL(input);
  builtinCalls.push({ url: url.toString(), init });
  if (url.hostname === 'qt.gtimg.cn') {
    assert.match(url.pathname, /sh000001,sh000300,sh000905,sh000852,sh000688,sh510300,bj920001/);
    assert.equal(init.method, undefined);
    return tencentResponse({ include920: true });
  }
  if (url.hostname === 'scanner.tradingview.com') {
    assert.equal(init.method, 'POST');
    assert.equal(init.headers.Origin, 'https://www.tradingview.com');
    assert.deepEqual(JSON.parse(init.body), {
      columns: ['name', 'description', 'close', 'change', 'change_abs', 'update_mode'],
      range: [0, 1], symbols: { tickers: ['NASDAQ:NDX'] },
    });
    return Response.json({ totalCount: 1, data: [{
      s: 'NASDAQ:NDX', d: ['NDX', 'NASDAQ 100 Index', 28274.1951, 0.5971914585, 167.8487, 'delayed_streaming_900'],
    }] });
  }
  throw new Error(`Unexpected built-in adapter request: ${url}`);
};
assert.deepEqual(await refreshMarketData({ DB: builtin }, builtinFetch, async () => {}), { written: 8, configured: true });
assert.equal(builtinCalls.length, 2);
assert.deepEqual(builtin.marketRows.map(({ ticker, price, pe_ttm }) => ({ ticker, price, pe_ttm })), [
  { ticker: 'CSI300_PE', price: null, pe_ttm: 14.38 },
  { ticker: 'CSI500_PE', price: null, pe_ttm: 35.24 },
  { ticker: 'CSI1000_PE', price: null, pe_ttm: 42.23 },
  { ticker: 'STAR50_PE', price: null, pe_ttm: 196.04 },
  { ticker: '510300', price: 4.2578, pe_ttm: 14.38 },
  { ticker: '920001', price: 9.12, pe_ttm: 20.5 },
]);
assert.deepEqual(builtin.indexRows, [
  { symbol: 'SSE_COMPOSITE', current_value: 3832.26, previous_close: 3804.69, change: 27.57, change_percent: 0.72 },
  { symbol: 'NASDAQ_100', current_value: 28274.1951, previous_close: 28106.3464, change: 167.8487, change_percent: 0.5971914585 },
]);
assert.equal(builtin.marketRows.some((row) => row.ticker === 'NASDAQ100_PE'), false, 'Nasdaq-100 PE must remain absent until a verified source exists');

const bestEffort = new MarketDatabase();
bestEffort.holdingTickers = [{ ticker: '510300' }];
let tradingViewFailures = 0;
const bestEffortFetch = async (input) => {
  const url = new URL(input);
  if (url.hostname === 'qt.gtimg.cn') return tencentResponse();
  if (url.hostname === 'scanner.tradingview.com') {
    tradingViewFailures += 1;
    return new Response('unavailable', { status: 503 });
  }
  throw new Error(`Unexpected best-effort adapter request: ${url}`);
};
const originalWarn = console.warn;
console.warn = () => {};
try {
  assert.deepEqual(await refreshMarketData({ DB: bestEffort }, bestEffortFetch, async () => {}), { written: 6, configured: true });
} finally {
  console.warn = originalWarn;
}
assert.equal(tradingViewFailures, 3, 'TradingView failures must use bounded retries without blocking Tencent writes');
assert.deepEqual(bestEffort.marketRows.map(({ ticker, price, pe_ttm }) => ({ ticker, price, pe_ttm })), [
  { ticker: 'CSI300_PE', price: null, pe_ttm: 14.38 },
  { ticker: 'CSI500_PE', price: null, pe_ttm: 35.24 },
  { ticker: 'CSI1000_PE', price: null, pe_ttm: 42.23 },
  { ticker: 'STAR50_PE', price: null, pe_ttm: 196.04 },
  { ticker: '510300', price: 4.2578, pe_ttm: 14.38 },
]);
assert.deepEqual(bestEffort.indexRows.map(({ symbol }) => symbol), ['SSE_COMPOSITE'], 'TradingView failure must retain, not replace, the Nasdaq-100 snapshot');

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
assert.deepEqual(database.marketRows.map(({ ticker, price, pe_ttm }) => ({ ticker, price, pe_ttm })), [
  { ticker: '510300', price: 4.2578, pe_ttm: null },
  { ticker: 'SSE300_PE', price: null, pe_ttm: 15.8123 },
]);

const duplicateDatabase = new MarketDatabase();
await assert.rejects(refreshMarketData(
  { DB: duplicateDatabase, MARKET_PROVIDER_URL: 'https://provider.invalid/snapshot' },
  async () => Response.json({ records: [{ ticker: '510300', price: 4 }, { ticker: '510300', price: 5 }] }),
  async () => {},
), /duplicate ticker/);
assert.deepEqual(duplicateDatabase.marketRows, [], 'invalid provider batches must not partially replace the last valid snapshot');

await assert.rejects(refreshMarketData(
  { DB: new MarketDatabase(), MARKET_PROVIDER_URL: 'https://provider.invalid/snapshot' },
  async () => Response.json({
    records: Array.from({ length: 101 }, (_, index) => ({ ticker: `TICKER-${index}`, price: 1 })),
  }),
  async () => {},
), /payload is invalid/);

const retainedDatabase = new MarketDatabase();
retainedDatabase.marketRows.push({ ticker: '510300', price: 4, pe_ttm: null, fetched_at: 'previous' });
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
  retainedDatabase.marketRows,
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
