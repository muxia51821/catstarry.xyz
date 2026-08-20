export interface HistoricalValuationObservation {
  observation_date: string;
  pe_ttm: number | null;
}

export type HistoricalPositionReason = 'missing_history' | 'insufficient_history' | 'history_stale' | 'current_pe_unavailable';

export interface HistoricalPosition {
  status: 'available' | 'unavailable';
  reason: HistoricalPositionReason | null;
  source: 'CSI';
  source_date: string | null;
  window_start: string | null;
  window_end: string | null;
  observation_count: number;
  percentile: number | null;
  p20: number | null;
  p50: number | null;
  p80: number | null;
  band: 'historical_low' | 'normal_range' | 'historical_high' | null;
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1_000;

function isoDay(value: Date) {
  return value.toISOString().slice(0, 10);
}

function parseDay(value: string) {
  return DAY.test(value) ? new Date(`${value}T00:00:00.000Z`) : null;
}

function addYears(value: string, years: number) {
  const date = parseDay(value);
  if (!date) return null;
  date.setUTCFullYear(date.getUTCFullYear() + years);
  return isoDay(date);
}

function coversYears(start: string, end: string, years: number) {
  const threshold = addYears(start, years);
  return threshold !== null && end >= threshold;
}

function quantile(sorted: number[], percentile: number) {
  const index = (sorted.length - 1) * percentile;
  const lower = Math.floor(index); const upper = Math.ceil(index);
  return sorted[lower] + ((sorted[upper] - sorted[lower]) * (index - lower));
}

// The cache has no official holiday calendar. Count potential China trading days
// conservatively: a weekday closure can only make a stale result unavailable early.
export function potentialChinaTradingDaysSince(sourceDate: string, now: Date) {
  const source = parseDay(sourceDate);
  if (!source) return Number.POSITIVE_INFINITY;
  const chinaTime = new Date(now.getTime() + 8 * 60 * 60 * 1_000);
  const end = new Date(Date.UTC(chinaTime.getUTCFullYear(), chinaTime.getUTCMonth(), chinaTime.getUTCDate()));
  let count = 0;
  for (const cursor = new Date(source.getTime() + DAY_MS); cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    const weekday = cursor.getUTCDay();
    if (weekday !== 0 && weekday !== 6) count += 1;
  }
  return count;
}

export function buildHistoricalPosition(
  currentPe: number | null,
  observations: HistoricalValuationObservation[],
  now: Date,
): HistoricalPosition {
  const valid = observations
    .filter((row) => DAY.test(row.observation_date) && Number.isFinite(Number(row.pe_ttm)) && Number(row.pe_ttm) > 0)
    .map((row) => ({ observation_date: row.observation_date, pe_ttm: Number(row.pe_ttm) }))
    .sort((left, right) => left.observation_date.localeCompare(right.observation_date));
  const sourceDate = valid.at(-1)?.observation_date ?? null;
  const unavailable = (reason: HistoricalPositionReason, windowStart: string | null = null): HistoricalPosition => ({
    status: 'unavailable', reason, source: 'CSI', source_date: sourceDate,
    window_start: windowStart, window_end: sourceDate, observation_count: 0,
    percentile: null, p20: null, p50: null, p80: null, band: null,
  });
  if (!sourceDate) return unavailable('missing_history');
  if (potentialChinaTradingDaysSince(sourceDate, now) > 5) return unavailable('history_stale');
  if (!Number.isFinite(currentPe) || Number(currentPe) <= 0) return unavailable('current_pe_unavailable');
  const firstDate = valid[0].observation_date;
  if (!coversYears(firstDate, sourceDate, 3)) return unavailable('insufficient_history');
  const trailingStart = addYears(sourceDate, -10);
  const windowStart = coversYears(firstDate, sourceDate, 10) && trailingStart ? trailingStart : firstDate;
  const window = valid.filter((row) => row.observation_date >= windowStart);
  const sorted = window.map((row) => row.pe_ttm).sort((left, right) => left - right);
  const percentile = sorted.filter((value) => value <= Number(currentPe)).length / sorted.length;
  return {
    status: 'available', reason: null, source: 'CSI', source_date: sourceDate,
    window_start: windowStart, window_end: sourceDate, observation_count: sorted.length,
    percentile, p20: quantile(sorted, .2), p50: quantile(sorted, .5), p80: quantile(sorted, .8),
    band: percentile <= .2 ? 'historical_low' : percentile >= .8 ? 'historical_high' : 'normal_range',
  };
}
