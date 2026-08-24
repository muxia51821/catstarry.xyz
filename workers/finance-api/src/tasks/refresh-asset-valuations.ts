import {
  previewForwardAssetValuations,
  valuationReplacementStatements,
  type HistoricalPriceRow,
} from '../routes/asset-valuation-rebuild';
import type { FinanceEnv } from '../routes/auth';

const MAX_CATCH_UP_DAYS = 20;
const SOURCE = 'tencent-finance+ths-coverage';
const MAX_RESPONSE_BYTES = 1_048_576;

type RunStatus = 'succeeded' | 'failed' | 'skipped' | 'review_required';
type DailyClose = { date: string; close: number };
type ExistingPrice = { ticker: string; price_date: string; close: number; source: string };

export const ASSET_VALUATION_REFRESH_CRONS: Record<string, number> = {
  '20 8 * * 1-5': 1,
  '0 9 * * 1-5': 2,
  '0 12 * * 1-5': 3,
};

export async function refreshAutomaticAssetValuations(
  env: FinanceEnv,
  options: { cron: string; now?: Date; fetchImpl?: typeof fetch } ,
): Promise<{ status: RunStatus; business_date: string | null; price_rows_written: number; valuation_rows_written: number }> {
  const startedAt = (options.now ?? new Date()).toISOString();
  const now = options.now ?? new Date();
  const fetchImpl = options.fetchImpl ?? fetch;
  const attempt = ASSET_VALUATION_REFRESH_CRONS[options.cron];
  if (!attempt) throw new Error(`Unsupported valuation refresh cron: ${options.cron}`);
  const today = shanghaiDay(now);
  let status: RunStatus = 'failed';
  let tickerCount = 0;
  let priceRowsWritten = 0;
  let valuationRowsWritten = 0;
  let missingTickers: string[] = [];
  let details: Record<string, unknown> = {};
  let errorSummary: string | null = null;

  try {
    const calendar = await fetchTencentDaily('sh000001', daysBefore(today, 70), today, fetchImpl);
    const complete = await env.DB.prepare("SELECT MAX(valuation_date) AS value FROM finance_asset_valuations WHERE is_complete = 1").first<{ value: string | null }>();
    const dates = calendar.map((row) => row.date).filter((date) => !complete?.value || date > complete.value);
    if (!dates.length) {
      status = 'skipped';
      details = { reason: 'no_new_tencent_trading_day', latest_complete: complete?.value ?? null };
      return result();
    }
    if (dates.length > MAX_CATCH_UP_DAYS) {
      status = 'review_required';
      errorSummary = `Missing ${dates.length} trading days; automatic backfill is limited to ${MAX_CATCH_UP_DAYS}.`;
      details = { first_missing_date: dates[0], latest_available_date: dates.at(-1), max_catch_up_days: MAX_CATCH_UP_DAYS };
      return result();
    }

    const tickers = await activeForwardTickers(env, dates.at(-1)!);
    tickerCount = tickers.length;
    if (!tickers.length) {
      status = 'review_required';
      errorSummary = 'No holdings or transaction-derived ticker is available for automatic valuation.';
      return result();
    }
    const [candidateResults, coverageResults, existing] = await Promise.all([
      Promise.all(tickers.map(async (ticker) => [ticker, await fetchTencentDaily(toTencentTicker(ticker), dates[0], dates.at(-1)!, fetchImpl)] as const)),
      Promise.all(tickers.map(async (ticker) => [ticker, await fetchThsCoverage(ticker, fetchImpl)] as const)),
      existingRawPrices(env, tickers, dates[0], dates.at(-1)!),
    ]);
    const candidateByTicker = new Map(candidateResults);
    const coverageByTicker = new Map(coverageResults);
    const existingByKey = new Map(existing.map((row) => [`${row.ticker}:${row.price_date}`, row]));
    const candidate: HistoricalPriceRow[] = [];
    const differences: string[] = [];
    for (const ticker of tickers) {
      const rows = new Map(candidateByTicker.get(ticker)?.map((row) => [row.date, row]) ?? []);
      const coverage = coverageByTicker.get(ticker) ?? new Set<string>();
      for (const date of dates) {
        const row = rows.get(date);
        if (!row || !coverage.has(date)) {
          missingTickers.push(`${ticker}@${date}`);
          continue;
        }
        const prior = existingByKey.get(`${ticker}:${date}`);
        if (prior && Math.abs(Number(prior.close) - row.close) > 0.000001) differences.push(`${ticker}@${date}`);
        if (!prior) candidate.push({ ticker, price_date: date, close: row.close, source: SOURCE });
      }
    }
    if (missingTickers.length) {
      status = 'failed';
      errorSummary = 'Required daily close or independent coverage is unavailable.';
      details = { dates, missing_count: missingTickers.length };
      return result();
    }
    if (differences.length) {
      status = 'review_required';
      errorSummary = 'Candidate daily close differs from an existing canonical raw close.';
      details = { dates, differing_prices: differences };
      return result();
    }

    const projection = await previewForwardAssetValuations(env, {
      dates,
      prices: [...existing, ...candidate],
      calculatedAt: startedAt,
    });
    const incomplete = projection.valuations.filter((row) => row.is_complete === 0);
    if (incomplete.length) {
      status = 'failed';
      missingTickers = incomplete.flatMap((row) => row.incomplete_reason?.match(/\b\d{6}\b/g) ?? []);
      errorSummary = 'Forward valuation projection is incomplete.';
      details = { dates, incomplete_dates: incomplete.map((row) => ({ date: row.valuation_date, reason: row.incomplete_reason })) };
      return result();
    }
    const statements = [
      ...candidate.map((row) => env.DB.prepare(`INSERT INTO finance_security_prices
        (ticker, price_date, close, source, adjustment, price_status, observed_at, created_at, created_by)
        VALUES (?, ?, ?, ?, 'raw', 'observed', ?, ?, 'scheduled-asset-valuation-refresh')`)
        .bind(row.ticker, row.price_date, row.close, row.source, startedAt, startedAt)),
      ...valuationReplacementStatements(env, dates[0], dates.at(-1)!, projection.valuations),
    ];
    await env.DB.batch(statements);
    status = 'succeeded';
    priceRowsWritten = candidate.length;
    valuationRowsWritten = projection.valuations.length;
    details = { dates, reconciliation_date: projection.reconciliation.snapshot_date };
  } catch (error) {
    status = 'failed';
    errorSummary = error instanceof Error ? error.message.slice(0, 500) : 'Automatic valuation refresh failed.';
  }
  return result();

  async function result() {
    const finishedAt = new Date().toISOString();
    await env.DB.prepare(`INSERT INTO finance_asset_valuation_refresh_runs (
      business_date, trigger_cron, attempt, status, source_label, ticker_count,
      price_rows_written, valuation_rows_written, missing_tickers_json, details_json,
      started_at, finished_at, error_summary
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(today, options.cron, attempt, status, SOURCE, tickerCount, priceRowsWritten, valuationRowsWritten,
        missingTickers.length ? JSON.stringify([...new Set(missingTickers)].slice(0, 100)) : null,
        JSON.stringify(details), startedAt, finishedAt, errorSummary).run();
    return { status, business_date: today, price_rows_written: priceRowsWritten, valuation_rows_written: valuationRowsWritten };
  }
}

async function activeForwardTickers(env: FinanceEnv, endDate: string): Promise<string[]> {
  const reconciliation = await env.DB.prepare(`SELECT snapshot_date FROM finance_asset_snapshots
    WHERE deleted_at IS NULL AND is_complete = 1 AND lower(COALESCE(source, '')) NOT IN ('auto_close', 'historical_backfill', 'history_import')
    ORDER BY snapshot_date DESC, julianday(snapshot_at) DESC, id DESC LIMIT 1`).first<{ snapshot_date: string }>();
  if (!reconciliation) throw new Error('A complete manual or broker reconciliation is required before refreshing history');
  const rows = await env.DB.prepare(`WITH latest AS (
      SELECT ticker, MAX(snapshot_date || ':' || printf('%020d', id)) AS marker
      FROM holdings_snapshots WHERE snapshot_date <= ? GROUP BY ticker
    )
    SELECT h.ticker AS ticker FROM holdings_snapshots h JOIN latest l
      ON l.ticker = h.ticker AND l.marker = h.snapshot_date || ':' || printf('%020d', h.id)
    WHERE h.quantity > 0
    UNION
    SELECT ticker FROM trades WHERE deleted_at IS NULL AND trade_date > ? AND trade_date <= ?
    ORDER BY ticker`).bind(reconciliation.snapshot_date, reconciliation.snapshot_date, endDate).all<{ ticker: string }>();
  return rows.results.map((row) => row.ticker).filter((ticker) => /^\d{6}$/.test(ticker));
}

async function existingRawPrices(env: FinanceEnv, tickers: string[], startDate: string, endDate: string): Promise<ExistingPrice[]> {
  const placeholders = tickers.map(() => '?').join(',');
  const rows = await env.DB.prepare(`SELECT ticker, price_date, close, source FROM finance_security_prices
    WHERE adjustment = 'raw' AND price_date >= ? AND price_date <= ? AND ticker IN (${placeholders})`)
    .bind(startDate, endDate, ...tickers).all<ExistingPrice>();
  return rows.results.map((row) => ({ ...row, close: Number(row.close) }));
}

async function fetchTencentDaily(symbol: string, startDate: string, endDate: string, fetchImpl: typeof fetch): Promise<DailyClose[]> {
  const url = new URL('https://web.ifzq.gtimg.cn/appstock/app/kline/kline');
  url.searchParams.set('param', `${symbol},day,${startDate},${endDate},500,`);
  const text = await readText(await fetchImpl(url, { headers: { Referer: 'https://gu.qq.com/' } }));
  const parsed = JSON.parse(text) as { data?: Record<string, { day?: unknown[] }> };
  const data = parsed.data?.[symbol]?.day;
  if (!Array.isArray(data)) throw new Error(`Tencent daily Kline is unavailable for ${symbol}`);
  return data.flatMap((value) => {
    if (!Array.isArray(value) || typeof value[0] !== 'string') return [];
    const close = Number(value[2]);
    return /^\d{4}-\d{2}-\d{2}$/.test(value[0]) && Number.isFinite(close) && close > 0 ? [{ date: value[0], close }] : [];
  });
}

async function fetchThsCoverage(ticker: string, fetchImpl: typeof fetch): Promise<Set<string>> {
  const response = await fetchImpl(`https://d.10jqka.com.cn/v6/line/hs_${ticker}/01/last.js`, {
    headers: { Referer: 'https://stock.10jqka.com.cn/', 'User-Agent': 'Mozilla/5.0' },
  });
  const text = await readText(response);
  if (!text.includes('data')) throw new Error(`THS daily coverage is unavailable for ${ticker}`);
  return new Set([...text.matchAll(/(?:^|[,;\"])(20\d{6})(?=[,;\"])/g)].map((match) => `${match[1].slice(0, 4)}-${match[1].slice(4, 6)}-${match[1].slice(6, 8)}`));
}

async function readText(response: Response): Promise<string> {
  if (!response.ok) throw new Error(`Market source responded ${response.status}`);
  const length = Number(response.headers.get('content-length') ?? '0');
  if (Number.isFinite(length) && length > MAX_RESPONSE_BYTES) throw new Error('Market source response is too large');
  const text = await response.text();
  if (new TextEncoder().encode(text).byteLength > MAX_RESPONSE_BYTES) throw new Error('Market source response is too large');
  return text;
}

function toTencentTicker(ticker: string) {
  return /^(5|6|9|688)/.test(ticker) ? `sh${ticker}` : `sz${ticker}`;
}

function shanghaiDay(value: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(value);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function daysBefore(day: string, count: number) {
  const date = new Date(`${day}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - count);
  return date.toISOString().slice(0, 10);
}
