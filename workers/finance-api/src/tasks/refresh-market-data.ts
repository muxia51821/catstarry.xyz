import type { FinanceEnv } from '../routes/auth';

interface ProviderRecord {
  ticker?: unknown;
  price?: unknown;
  pe_ttm?: unknown;
}

const MAX_MARKET_RECORDS = 100;

export async function refreshMarketData(
  env: FinanceEnv,
  fetchImpl: typeof fetch = fetch,
  sleep: (milliseconds: number) => Promise<void> = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
): Promise<{ written: number; configured: boolean }> {
  if (!env.MARKET_PROVIDER_URL) {
    console.warn('Finance market provider is not configured; keeping the last valid D1 snapshot');
    return { written: 0, configured: false };
  }
  const endpoint = new URL(env.MARKET_PROVIDER_URL);
  if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password) throw new Error('MARKET_PROVIDER_URL must use credential-free HTTPS');
  const response = await retryFetch(endpoint, env.MARKET_PROVIDER_TOKEN, fetchImpl, sleep);
  const length = Number(response.headers.get('Content-Length') ?? '0');
  if (Number.isFinite(length) && length > 1_048_576) throw new Error('Market provider response is too large');
  const payload = await readLimitedJson(response, 1_048_576) as { records?: ProviderRecord[] };
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
  if (statements.length > 0) await env.DB.batch(statements);
  return { written: statements.length, configured: true };
}

async function retryFetch(url: URL, token: string | undefined, fetchImpl: typeof fetch, sleep: (milliseconds: number) => Promise<void>): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8_000);
      try {
        const response = await fetchImpl(url, {
          headers: {
            Accept: 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          redirect: 'error',
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`Market provider returned ${response.status}`);
        return response;
      } finally {
        clearTimeout(timeout);
      }
    } catch (error) {
      lastError = error;
      if (attempt < 2) await sleep(250 * (2 ** attempt));
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Market provider request failed');
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
