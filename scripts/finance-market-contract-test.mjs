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

const TENCENT_FIXTURES = [
  { ticker: 'sh000001', name: 'SSE Composite', price: 3832.26, previousClose: 3804.69, change: 27.57, changePercent: 0.72, peTtm: 17.73, quoteTime: '20260731161420' },
  { ticker: 'sh000300', name: 'CSI 300', price: 4588.2, previousClose: 4549.72, change: 38.48, changePercent: 0.85, peTtm: 14.38, quoteTime: '20260731161408' },
  { ticker: 'sh000905', name: 'CSI 500', price: 7493.99, previousClose: 7309.58, change: 184.41, changePercent: 2.52, peTtm: 35.24, quoteTime: '20260731161414' },
  { ticker: 'sh000852', name: 'CSI 1000', price: 7075.51, previousClose: 6900.66, change: 174.85, changePercent: 2.53, peTtm: 42.23, quoteTime: '20260731161414' },
  { ticker: 'sh000688', name: 'STAR 50', price: 1635.96, previousClose: 1588.41, change: 47.55, changePercent: 2.99, peTtm: 196.04, quoteTime: '20260731161414' },
  { ticker: 'sh510300', name: 'CSI 300 ETF', price: 4.2578, previousClose: 4.22, change: 0.0378, changePercent: 0.9, peTtm: 14.38, quoteTime: '20260731161408' },
];

function tencentResponse({ include920 = false, omit = [], zombie = [] } = {}) {
  const fixtures = TENCENT_FIXTURES.filter((fixture) => !omit.includes(fixture.ticker));
  if (include920) {
    fixtures.push({ ticker: 'bj920001', name: 'Beijing Sample', price: 9.12, previousClose: 9, change: 0.12, changePercent: 1.33, peTtm: 20.5, quoteTime: '20260731161408' });
  }
  const lines = fixtures.map((fixture) => {
    const isZombie = zombie.includes(fixture.ticker);
    return tencentLine(fixture.ticker, {
      name: fixture.name,
      price: isZombie ? fixture.previousClose : fixture.price,
      previousClose: fixture.previousClose,
      change: isZombie ? 0 : fixture.change,
      changePercent: isZombie ? 0 : fixture.changePercent,
      peTtm: fixture.peTtm,
      quoteTime: fixture.quoteTime,
    });
  });
  return new Response(lines.join(''));
}

function sinaLine(ticker, { name, open, prevClose, price, high, low, date = '2026-07-31', time = '15:00:00' }) {
  const values = Array.from({ length: 33 }, () => '');
  values[0] = name;
  values[1] = open;
  values[2] = prevClose;
  values[3] = price;
  values[4] = high;
  values[5] = low;
  values[8] = '1234567';
  values[9] = '99999999';
  values[30] = date;
  values[31] = time;
  return `var hq_str_${ticker}="${values.join(',')}";`;
}

function tradingViewOk() {
  return Response.json({ totalCount: 1, data: [{
    s: 'NASDAQ:NDX', d: ['NDX', 'NASDAQ 100 Index', 28274.1951, 0.5971914585, 167.8487, 'delayed_streaming_900'],
  }] });
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
    assert.equal(init.redirect, 'manual');
    return tencentResponse({ include920: true });
  }
  if (url.hostname === 'scanner.tradingview.com') {
    assert.equal(init.method, 'POST');
    assert.equal(init.redirect, 'manual');
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
assert.deepEqual(await refreshMarketData({ DB: builtin }, builtinFetch, async () => {}), { written: 8, configured: true, missing: { indexes: [], holdings: [] } });
assert.equal(builtinCalls.length, 2);
assert.ok(!builtinCalls.some((call) => call.url.includes('hq.sinajs.cn')), 'Sina must not be called when Tencent returns a complete response');
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
  assert.deepEqual(await refreshMarketData({ DB: bestEffort }, bestEffortFetch, async () => {}), { written: 6, configured: true, missing: { indexes: [], holdings: [] } });
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
  assert.equal(init.redirect, 'manual');
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

const partial = new MarketDatabase();
partial.holdingTickers = [{ ticker: '510300' }, { ticker: '600519' }];
const partialCalls = [];
const partialFetch = async (input, init = {}) => {
  const url = new URL(input);
  partialCalls.push(url.hostname);
  if (url.hostname === 'qt.gtimg.cn') return tencentResponse({ omit: ['sh000905', 'sh600519'] });
  if (url.hostname === 'scanner.tradingview.com') return tradingViewOk();
  if (url.hostname === 'hq.sinajs.cn') {
    assert.match(url.pathname, /sh600519/);
    assert.equal(init.headers.Referer, 'https://stock.finance.sina.com.cn/');
    return new Response(sinaLine('sh600519', { name: '贵州茅台', open: '1499', prevClose: '1490', price: '1510.5', high: '1520', low: '1489' }));
  }
  throw new Error(`Unexpected partial adapter request: ${url}`);
};
const partialResult = await refreshMarketData({ DB: partial }, partialFetch, async () => {});
assert.deepEqual(partialResult, { written: 7, configured: true, missing: { indexes: ['CSI500_PE'], holdings: [] } });
assert.deepEqual(partial.marketRows.map(({ ticker, price, pe_ttm }) => ({ ticker, price, pe_ttm })), [
  { ticker: 'CSI300_PE', price: null, pe_ttm: 14.38 },
  { ticker: 'CSI1000_PE', price: null, pe_ttm: 42.23 },
  { ticker: 'STAR50_PE', price: null, pe_ttm: 196.04 },
  { ticker: '510300', price: 4.2578, pe_ttm: 14.38 },
  { ticker: '600519', price: 1510.5, pe_ttm: null },
]);
assert.ok(partialCalls.includes('hq.sinajs.cn'), 'Sina fallback must be attempted for missing quotes');

const noSina = new MarketDatabase();
noSina.holdingTickers = [{ ticker: '600519' }];
let sinaAttempts = 0;
const originalWarn2 = console.warn;
console.warn = () => {};
try {
  const noSinaFetch = async (input) => {
    const url = new URL(input);
    if (url.hostname === 'qt.gtimg.cn') return tencentResponse({ omit: ['sh600519'] });
    if (url.hostname === 'scanner.tradingview.com') return tradingViewOk();
    if (url.hostname === 'hq.sinajs.cn') {
      sinaAttempts += 1;
      return new Response('unavailable', { status: 503 });
    }
    throw new Error(`Unexpected no-sina adapter request: ${url}`);
  };
  const noSinaResult = await refreshMarketData({ DB: noSina }, noSinaFetch, async () => {});
  assert.deepEqual(noSinaResult, { written: 6, configured: true, missing: { indexes: [], holdings: ['600519'] } });
} finally {
  console.warn = originalWarn2;
}
assert.equal(sinaAttempts, 3, 'Sina fallback failures must use bounded retries without blocking Tencent writes');

const zombie = new MarketDatabase();
zombie.holdingTickers = [{ ticker: '920001' }];
let sawZombieSina = false;
const zombieFetch = async (input, init = {}) => {
  const url = new URL(input);
  if (url.hostname === 'qt.gtimg.cn') return tencentResponse({ include920: true, zombie: ['bj920001'] });
  if (url.hostname === 'scanner.tradingview.com') return tradingViewOk();
  if (url.hostname === 'hq.sinajs.cn') {
    sawZombieSina = true;
    assert.match(url.pathname, /bj920001/);
    return new Response(sinaLine('bj920001', { name: 'Beijing Sample', open: '9', prevClose: '9', price: '10.2', high: '10.3', low: '9' }));
  }
  throw new Error(`Unexpected zombie adapter request: ${url}`);
};
const zombieResult = await refreshMarketData({ DB: zombie }, zombieFetch, async () => {});
assert.equal(sawZombieSina, true, 'Zombie quotes must not be written verbatim; fallback must be attempted');
assert.deepEqual(zombieResult, { written: 7, configured: true, missing: { indexes: [], holdings: [] } });
const zombieRow = zombie.marketRows.find((row) => row.ticker === '920001');
assert.deepEqual(
  { ticker: zombieRow.ticker, price: zombieRow.price, pe_ttm: zombieRow.pe_ttm },
  { ticker: '920001', price: 10.2, pe_ttm: null },
  'Zombie quote price must not be written; the Sina fallback price replaces it',
);

console.log('Finance market provider contract passed.');
