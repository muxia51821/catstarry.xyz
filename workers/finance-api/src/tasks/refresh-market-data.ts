import type { FinanceEnv } from '../routes/auth';

interface ProviderRecord {
  ticker?: unknown;
  price?: unknown;
  pe_ttm?: unknown;
}

interface ProviderIndexRecord {
  symbol?: unknown;
  display_name?: unknown;
  current_value?: unknown;
  previous_close?: unknown;
  change?: unknown;
  change_percent?: unknown;
  market_status?: unknown;
  market_time?: unknown;
  trading_date?: unknown;
}

const MAX_MARKET_RECORDS = 100;
const MAX_PROVIDER_BYTES = 1_048_576;
const TENCENT_INDEXES = [
  { providerTicker: 'sh000001', symbol: 'SSE_COMPOSITE', displayName: '上证指数' },
  { providerTicker: 'sh000300', peTicker: 'CSI300_PE' },
  { providerTicker: 'sh000905', peTicker: 'CSI500_PE' },
  { providerTicker: 'sh000852', peTicker: 'CSI1000_PE' },
  { providerTicker: 'sh000688', peTicker: 'STAR50_PE' },
] as const;
const SH_INDEX_CODES = new Set(TENCENT_INDEXES.map((index) => index.providerTicker.slice(2)));
const TRADINGVIEW_COLUMNS = ['name', 'description', 'close', 'change', 'change_abs', 'update_mode'] as const;

interface MarketPayload {
  records?: ProviderRecord[];
  indexes?: ProviderIndexRecord[];
}

interface TencentQuote {
  name: string;
  price: number;
  previousClose: number;
  change: number;
  changePercent: number;
  peTtm: number | null;
  marketTime: string | null;
  tradingDate: string | null;
}

interface HoldingTickerRow {
  ticker: string;
}

export async function refreshMarketData(
  env: FinanceEnv,
  fetchImpl: typeof fetch = fetch,
  sleep: (milliseconds: number) => Promise<void> = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
): Promise<{ written: number; configured: boolean }> {
  const payload = env.MARKET_PROVIDER_URL
    ? await fetchConfiguredProvider(env, fetchImpl, sleep)
    : await fetchBuiltinMarketData(env, fetchImpl, sleep);
  return writeMarketPayload(env, payload);
}

async function fetchConfiguredProvider(
  env: FinanceEnv,
  fetchImpl: typeof fetch,
  sleep: (milliseconds: number) => Promise<void>,
): Promise<MarketPayload> {
  const providerUrl = env.MARKET_PROVIDER_URL;
  if (!providerUrl) throw new Error('MARKET_PROVIDER_URL is missing');
  const endpoint = new URL(providerUrl);
  if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password) throw new Error('MARKET_PROVIDER_URL must use credential-free HTTPS');
  const response = await retryFetch(endpoint, env.MARKET_PROVIDER_TOKEN, fetchImpl, sleep);
  const length = Number(response.headers.get('Content-Length') ?? '0');
  if (Number.isFinite(length) && length > MAX_PROVIDER_BYTES) throw new Error('Market provider response is too large');
  return readLimitedJson(response, MAX_PROVIDER_BYTES) as Promise<MarketPayload>;
}

async function writeMarketPayload(env: FinanceEnv, payload: MarketPayload): Promise<{ written: number; configured: boolean }> {
  if (!Array.isArray(payload.records) || payload.records.length > MAX_MARKET_RECORDS) {
    throw new Error('Market provider payload is invalid');
  }
  const fetchedAt = new Date().toISOString();
  const tickers = new Set<string>();
  const statements = payload.records.map((record) => {
    const ticker = typeof record.ticker === 'string' ? record.ticker.trim().toUpperCase() : '';
    const price = record.price === null || record.price === undefined ? null : Number(record.price);
    const peTtm = record.pe_ttm === null || record.pe_ttm === undefined ? null : Number(record.pe_ttm);
    if (!/^[A-Z0-9._-]{2,32}$/.test(ticker)) throw new Error('Market provider returned an invalid ticker');
    if (tickers.has(ticker)) throw new Error(`Market provider returned duplicate ticker ${ticker}`);
    tickers.add(ticker);
    if (price !== null && (!Number.isFinite(price) || price < 0)) throw new Error(`Invalid price for ${ticker}`);
    if (peTtm !== null && (!Number.isFinite(peTtm) || peTtm < 0)) throw new Error(`Invalid PE-TTM for ${ticker}`);
    if (price === null && peTtm === null) throw new Error(`Market record ${ticker} has no value`);
    return env.DB.prepare('INSERT INTO market_data (ticker, price, pe_ttm, fetched_at) VALUES (?, ?, ?, ?)')
      .bind(ticker, price, peTtm, fetchedAt);
  });
  if (payload.indexes !== undefined && (!Array.isArray(payload.indexes) || payload.indexes.length > 20)) {
    throw new Error('Market provider index payload is invalid');
  }
  for (const record of payload.indexes ?? []) {
    const symbol = typeof record.symbol === 'string' ? record.symbol.trim().toUpperCase() : '';
    const displayName = typeof record.display_name === 'string' ? record.display_name.trim() : '';
    const currentValue = Number(record.current_value); const previousClose = Number(record.previous_close);
    const change = Number(record.change); const changePercent = Number(record.change_percent);
    if (!/^[A-Z0-9._-]{2,32}$/.test(symbol) || !displayName || displayName.length > 64
      || ![currentValue, previousClose, change, changePercent].every(Number.isFinite)
      || currentValue < 0 || previousClose < 0 || !['open', 'closed', 'unknown'].includes(String(record.market_status))) {
      throw new Error('Market provider index record is invalid');
    }
    const marketTime = typeof record.market_time === 'string' && record.market_time.trim() ? record.market_time.trim() : null;
    const tradingDate = typeof record.trading_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(record.trading_date) ? record.trading_date : null;
    statements.push(env.DB.prepare(`INSERT INTO finance_market_indexes
      (symbol, display_name, current_value, previous_close, change_value, change_percent, market_status, market_time, trading_date, fetched_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(symbol, displayName, currentValue, previousClose, change, changePercent, record.market_status, marketTime, tradingDate, fetchedAt));
  }
  if (statements.length > 0) await env.DB.batch(statements);
  return { written: statements.length, configured: true };
}

async function fetchBuiltinMarketData(
  env: FinanceEnv,
  fetchImpl: typeof fetch,
  sleep: (milliseconds: number) => Promise<void>,
): Promise<MarketPayload> {
  const holdingTickers = await activeHoldingTickers(env);
  const providerTickers = new Set<string>(TENCENT_INDEXES.map((index) => index.providerTicker));
  const normalizedHoldings = holdingTickers.flatMap((ticker) => {
    const providerTicker = toTencentTicker(ticker);
    if (!providerTicker) return [];
    providerTickers.add(providerTicker);
    return [{ ticker, providerTicker }];
  });
  if (normalizedHoldings.length > MAX_MARKET_RECORDS - (TENCENT_INDEXES.length - 1)) {
    throw new Error('Too many active holdings for the built-in Tencent snapshot');
  }
  const [tencentResult, nasdaqResult] = await Promise.allSettled([
    fetchTencentQuotes([...providerTickers], fetchImpl, sleep),
    fetchNasdaq100Quote(fetchImpl, sleep),
  ]);
  if (tencentResult.status === 'rejected') throw tencentResult.reason;
  const tencentQuotes = tencentResult.value;
  const sseComposite = tencentQuotes.get('sh000001');
  if (!sseComposite) throw new Error('Tencent did not return sh000001');

  const records: ProviderRecord[] = [];
  for (const index of TENCENT_INDEXES) {
    if (!('peTicker' in index)) continue;
    const quote = tencentQuotes.get(index.providerTicker);
    if (!quote || quote.peTtm === null) throw new Error(`Tencent did not return PE-TTM for ${index.providerTicker}`);
    records.push({ ticker: index.peTicker, price: null, pe_ttm: quote.peTtm });
  }
  for (const holding of normalizedHoldings) {
    const quote = tencentQuotes.get(holding.providerTicker);
    if (!quote) continue;
    records.push({ ticker: holding.ticker, price: quote.price, pe_ttm: quote.peTtm });
  }

  const indexes = [toIndexRecord('SSE_COMPOSITE', sseComposite.name || '上证指数', sseComposite)];
  if (nasdaqResult.status === 'fulfilled') {
    indexes.push(nasdaqResult.value);
  } else {
    console.warn('TradingView market data refresh failed; retaining the last Nasdaq-100 D1 snapshot', nasdaqResult.reason);
  }
  return { records, indexes };
}

async function activeHoldingTickers(env: FinanceEnv): Promise<string[]> {
  const rows = await env.DB.prepare(`WITH latest AS (
      SELECT ticker, MAX(snapshot_date || ':' || printf('%020d', id)) AS marker
      FROM holdings_snapshots GROUP BY ticker
    )
    SELECT h.ticker FROM holdings_snapshots h
    JOIN latest l ON l.ticker = h.ticker AND l.marker = h.snapshot_date || ':' || printf('%020d', h.id)
    WHERE h.quantity > 0 ORDER BY h.ticker`).all<HoldingTickerRow>();
  return rows.results.map((row) => row.ticker.trim().toUpperCase()).filter(Boolean);
}

function toTencentTicker(ticker: string): string | null {
  const normalized = ticker.trim().toLowerCase();
  if (/^(sh|sz|bj)\d{6}$/.test(normalized)) return normalized;
  if (!/^\d{6}$/.test(normalized)) return null;
  if (normalized.startsWith('4') || normalized.startsWith('8') || normalized.startsWith('920')) return `bj${normalized}`;
  if (normalized.startsWith('5') || normalized.startsWith('6') || normalized.startsWith('9') || SH_INDEX_CODES.has(normalized)) return `sh${normalized}`;
  return `sz${normalized}`;
}

async function fetchTencentQuotes(
  providerTickers: string[],
  fetchImpl: typeof fetch,
  sleep: (milliseconds: number) => Promise<void>,
): Promise<Map<string, TencentQuote>> {
  const url = new URL(`https://qt.gtimg.cn/q=${providerTickers.join(',')}`);
  const response = await retryRequest(url, {
    headers: { Accept: 'text/plain', 'User-Agent': 'Mozilla/5.0 (compatible; catstarry-finance/1.0)' },
    redirect: 'error',
  }, fetchImpl, sleep, 'Tencent market data');
  const text = await readLimitedText(response, MAX_PROVIDER_BYTES, 'gbk');
  const quotes = new Map<string, TencentQuote>();
  for (const rawLine of text.split(';')) {
    const line = rawLine.trim();
    const equals = line.indexOf('=');
    const firstQuote = line.indexOf('"');
    const lastQuote = line.lastIndexOf('"');
    if (equals < 0 || firstQuote < 0 || lastQuote <= firstQuote) continue;
    const ticker = line.slice(0, equals).trim().replace(/^v_/, '').toLowerCase();
    const values = line.slice(firstQuote + 1, lastQuote).split('~');
    const quote = parseTencentQuote(values);
    if (quote) quotes.set(ticker, quote);
  }
  for (const index of TENCENT_INDEXES) {
    if (!quotes.has(index.providerTicker)) throw new Error(`Tencent did not return ${index.providerTicker}`);
  }
  return quotes;
}

function parseTencentQuote(values: string[]): TencentQuote | null {
  if (values.length < 40) return null;
  const name = values[1]?.trim();
  const price = finiteNumber(values[3]);
  const previousClose = finiteNumber(values[4]);
  const change = finiteNumber(values[31]);
  const changePercent = finiteNumber(values[32]);
  if (!name || price === null || previousClose === null || change === null || changePercent === null || price < 0 || previousClose < 0) return null;
  const rawPe = values[39]?.trim();
  const peTtm = rawPe ? finiteNumber(rawPe) : null;
  if (rawPe && (peTtm === null || peTtm < 0)) return null;
  const rawTime = values[30]?.trim() ?? '';
  return { name, price, previousClose, change, changePercent, peTtm, ...tencentTimestamp(rawTime) };
}

function tencentTimestamp(rawTime: string): Pick<TencentQuote, 'marketTime' | 'tradingDate'> {
  if (!/^\d{14}$/.test(rawTime)) return { marketTime: null, tradingDate: null };
  const tradingDate = `${rawTime.slice(0, 4)}-${rawTime.slice(4, 6)}-${rawTime.slice(6, 8)}`;
  return { marketTime: `${tradingDate}T${rawTime.slice(8, 10)}:${rawTime.slice(10, 12)}:${rawTime.slice(12, 14)}+08:00`, tradingDate };
}

async function fetchNasdaq100Quote(
  fetchImpl: typeof fetch,
  sleep: (milliseconds: number) => Promise<void>,
): Promise<ProviderIndexRecord> {
  const response = await retryRequest(new URL('https://scanner.tradingview.com/global/scan'), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Origin: 'https://www.tradingview.com',
      Referer: 'https://www.tradingview.com/',
      'User-Agent': 'Mozilla/5.0 (compatible; catstarry-finance/1.0)',
    },
    body: JSON.stringify({ columns: TRADINGVIEW_COLUMNS, range: [0, 1], symbols: { tickers: ['NASDAQ:NDX'] } }),
    redirect: 'error',
  }, fetchImpl, sleep, 'TradingView market data');
  const payload = await readLimitedJson(response, MAX_PROVIDER_BYTES) as { totalCount?: unknown; data?: unknown };
  if (payload.totalCount !== 1 || !Array.isArray(payload.data) || payload.data.length !== 1) throw new Error('TradingView did not return NASDAQ:NDX');
  const row = payload.data[0] as { s?: unknown; d?: unknown };
  if (row.s !== 'NASDAQ:NDX' || !Array.isArray(row.d) || row.d.length !== TRADINGVIEW_COLUMNS.length) throw new Error('TradingView returned an invalid NASDAQ:NDX row');
  const [name, description, close, changePercent, change] = row.d;
  const currentValue = finiteNumber(close);
  const changeValue = finiteNumber(change);
  const percent = finiteNumber(changePercent);
  const displayName = typeof description === 'string' && description.trim()
    ? description.trim()
    : typeof name === 'string' && name.trim() ? name.trim() : '';
  if (!displayName || currentValue === null || changeValue === null || percent === null || currentValue < 0) {
    throw new Error('TradingView returned invalid NASDAQ:NDX values');
  }
  const previousClose = Number((currentValue - changeValue).toFixed(8));
  if (!Number.isFinite(previousClose) || previousClose < 0) throw new Error('TradingView returned invalid NASDAQ:NDX previous close');
  // TradingView does not provide Nasdaq-100 PE-TTM; intentionally do not create a NASDAQ100_PE market_data row.
  return {
    symbol: 'NASDAQ_100', display_name: displayName, current_value: currentValue, previous_close: previousClose,
    change: changeValue, change_percent: percent, market_status: 'unknown', market_time: null, trading_date: null,
  };
}

function toIndexRecord(symbol: string, displayName: string, quote: TencentQuote): ProviderIndexRecord {
  return {
    symbol, display_name: displayName, current_value: quote.price, previous_close: quote.previousClose,
    change: quote.change, change_percent: quote.changePercent, market_status: 'unknown',
    market_time: quote.marketTime, trading_date: quote.tradingDate,
  };
}

function finiteNumber(value: unknown): number | null {
  const number = typeof value === 'number' || typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(number) ? number : null;
}

async function retryFetch(url: URL, token: string | undefined, fetchImpl: typeof fetch, sleep: (milliseconds: number) => Promise<void>): Promise<Response> {
  return retryRequest(url, {
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    redirect: 'error',
  }, fetchImpl, sleep, 'Market provider');
}

async function retryRequest(
  url: URL,
  init: RequestInit,
  fetchImpl: typeof fetch,
  sleep: (milliseconds: number) => Promise<void>,
  label: string,
): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8_000);
      try {
        const response = await fetchImpl(url, { ...init, signal: controller.signal });
        if (!response.ok) throw new Error(`${label} returned ${response.status}`);
        return response;
      } finally {
        clearTimeout(timeout);
      }
    } catch (error) {
      lastError = error;
      if (attempt < 2) await sleep(250 * (2 ** attempt));
    }
  }
  throw lastError instanceof Error ? lastError : new Error(`${label} request failed`);
}

async function readLimitedJson(response: Response, maximumBytes: number): Promise<unknown> {
  if (!response.body) throw new Error('Market provider response body is missing');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let text = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maximumBytes) throw new Error('Market provider response is too large');
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return JSON.parse(text);
  } catch (error) {
    if (error instanceof Error && error.message.includes('too large')) throw error;
    throw new Error('Market provider returned invalid JSON');
  } finally {
    reader.releaseLock();
  }
}

async function readLimitedText(response: Response, maximumBytes: number, encoding: string): Promise<string> {
  if (!response.body) throw new Error('Market provider response body is missing');
  const reader = response.body.getReader();
  const decoder = new TextDecoder(encoding);
  let total = 0;
  let text = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maximumBytes) throw new Error('Market provider response is too large');
      text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}
