import assert from 'node:assert/strict';

import {
  formatShanghaiLongDate,
  formatShanghaiShortDate,
  shanghaiDayKey,
  shanghaiMonthKey,
  shanghaiParts,
  shanghaiUtcBoundary,
} from '../shared/shanghai-time.ts';

assert.equal(shanghaiDayKey(new Date('2026-08-11T15:59:59.000Z')), '2026-08-11');
assert.equal(shanghaiDayKey(new Date('2026-08-11T16:00:00.000Z')), '2026-08-12');
assert.equal(shanghaiDayKey(new Date('2026-08-11T16:30:00.000Z')), '2026-08-12');

assert.deepEqual(shanghaiParts(new Date('2025-12-31T16:01:00.000Z')), {
  year: '2026',
  month: '01',
  day: '01',
  hour: '00',
  minute: '01',
  second: '00',
});
assert.equal(shanghaiParts(new Date('2025-12-30T15:59:00.000Z')).year, '2025');
assert.equal(shanghaiParts(new Date('2025-12-30T15:59:00.000Z')).minute, '59');

assert.equal(shanghaiMonthKey(new Date('2026-07-31T15:59:59.000Z')), '2026-07');
assert.equal(shanghaiMonthKey(new Date('2026-07-31T16:00:00.000Z')), '2026-08');

assert.equal(shanghaiUtcBoundary('2026-08-17'), '2026-08-16T16:00:00.000Z');
assert.equal(shanghaiUtcBoundary('2026-08-17', 1), '2026-08-17T16:00:00.000Z');
assert.equal(shanghaiUtcBoundary('2026-02-30'), null);
assert.equal(shanghaiUtcBoundary('20260817'), null);
assert.equal(shanghaiUtcBoundary(''), null);

assert.equal(formatShanghaiLongDate(new Date('2026-08-11T16:30:00.000Z')), '2026年8月12日');
assert.equal(formatShanghaiLongDate('2026-08-11T16:30:00.000Z'), '2026年8月12日');
assert.equal(formatShanghaiShortDate(new Date('2026-08-11T16:30:00.000Z')), '08.12');
assert.equal(formatShanghaiShortDate('2025-12-31T16:01:00.000Z'), '01.01');

console.log('shanghai-time contract passed.');
