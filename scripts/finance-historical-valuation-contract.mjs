import assert from 'node:assert/strict';
import {
  buildHistoricalPosition,
  potentialChinaTradingDaysSince,
} from '../workers/finance-api/src/modules/historical-valuation.ts';

const now = new Date('2026-08-20T08:00:00.000Z');
const decade = [
  ['2014-08-14', 1], ['2016-08-12', 2], ['2016-08-15', 3], ['2018-08-14', 5],
  ['2020-08-14', 7], ['2022-08-14', 9], ['2024-08-14', 11], ['2026-08-14', 13],
].map(([observation_date, pe_ttm]) => ({ observation_date, pe_ttm }));

const trailing = buildHistoricalPosition(10, decade, now);
assert.equal(trailing.status, 'available');
assert.equal(trailing.window_start, '2016-08-14', '10+ years must use a trailing 10-year window');
assert.equal(trailing.observation_count, 6, 'trailing window must exclude earlier observations');
assert.equal(trailing.percentile, 4 / 6);
assert.equal(trailing.band, 'normal_range');

const threeYears = buildHistoricalPosition(20, [
  { observation_date: '2023-08-14', pe_ttm: 10 }, { observation_date: '2024-08-14', pe_ttm: 20 },
  { observation_date: '2025-08-14', pe_ttm: 30 }, { observation_date: '2026-08-14', pe_ttm: 40 },
], now);
assert.equal(threeYears.status, 'available');
assert.equal(threeYears.window_start, '2023-08-14', '3-10 years must retain the full available window');

const shortHistory = buildHistoricalPosition(20, [
  { observation_date: '2024-08-14', pe_ttm: 10 }, { observation_date: '2026-08-14', pe_ttm: 20 },
], now);
assert.deepEqual({ status: shortHistory.status, reason: shortHistory.reason }, { status: 'unavailable', reason: 'insufficient_history' });

const invalidFiltered = buildHistoricalPosition(30, [
  { observation_date: '2023-08-14', pe_ttm: null }, { observation_date: '2023-08-15', pe_ttm: 0 },
  { observation_date: '2023-08-16', pe_ttm: -1 }, { observation_date: '2023-08-17', pe_ttm: Number.NaN },
  { observation_date: '2023-08-18', pe_ttm: 10 }, { observation_date: '2026-08-14', pe_ttm: 20 },
], now);
assert.equal(invalidFiltered.reason, 'insufficient_history', 'null, NaN, and non-positive PE must not count as history');

const percentile = buildHistoricalPosition(30, [
  { observation_date: '2023-08-14', pe_ttm: 10 }, { observation_date: '2023-08-15', pe_ttm: 20 },
  { observation_date: '2024-08-14', pe_ttm: 30 }, { observation_date: '2025-08-14', pe_ttm: 40 },
  { observation_date: '2026-08-14', pe_ttm: 50 },
], now);
assert.equal(percentile.percentile, .6);
assert.equal(percentile.p20, 18);
assert.equal(percentile.p50, 30);
assert.equal(percentile.p80, 42);
assert.equal(buildHistoricalPosition(1, decade, now).band, 'historical_low');
assert.equal(buildHistoricalPosition(99, decade, now).band, 'historical_high');

const currentUnavailable = buildHistoricalPosition(null, decade, now);
assert.deepEqual({ status: currentUnavailable.status, reason: currentUnavailable.reason }, { status: 'unavailable', reason: 'current_pe_unavailable' });
const sourceFailure = buildHistoricalPosition(12, [], now);
assert.deepEqual({ status: sourceFailure.status, reason: sourceFailure.reason }, { status: 'unavailable', reason: 'missing_history' });
const stale = buildHistoricalPosition(12, [{ observation_date: '2013-08-12', pe_ttm: 10 }, { observation_date: '2026-08-12', pe_ttm: 12 }], now);
assert.deepEqual({ status: stale.status, reason: stale.reason }, { status: 'unavailable', reason: 'history_stale' });
assert.equal(potentialChinaTradingDaysSince('2026-08-12', now), 6, 'more than five potential China trading days must fail closed');

console.log('Finance historical valuation contract passed.');
