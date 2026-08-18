export const MARKET_FRESHNESS_SLA_MS = 30 * 60 * 1000;

// This is the same nominal A-share trading window used by the accepted zombie-quote
// authority in refresh-market-data.ts. Persisted market_data rows do not retain the
// provider trading date, so current-account precision is intentionally fail-closed
// during these windows when no successful refresh has landed within the same SLA.
export function isAStockTradingWindow(now: Date): boolean {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  if (value.weekday === 'Sat' || value.weekday === 'Sun') return false;
  const minutes = Number(value.hour) * 60 + Number(value.minute);
  return (minutes >= 570 && minutes < 690) || (minutes >= 780 && minutes < 900);
}

export function isPersistedMarketSnapshotUsable(fetchedAt: string | null, now: Date): boolean {
  if (!fetchedAt) return false;
  const fetched = Date.parse(fetchedAt);
  if (!Number.isFinite(fetched)) return false;
  if (!isAStockTradingWindow(now)) return true;
  return now.getTime() - fetched <= MARKET_FRESHNESS_SLA_MS;
}
