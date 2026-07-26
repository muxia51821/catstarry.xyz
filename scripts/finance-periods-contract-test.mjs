import assert from 'node:assert/strict';

import { financePeriodState } from '../workers/finance-api/src/modules/periods.ts';

assert.deepEqual(financePeriodState(new Date('2026-01-01T00:00:00+08:00')), {
  year: 2026,
  month: 1,
  day: 1,
  previousPeriod: '2025-12',
  adminReminderDue: false,
  annualReviewDue: false,
});

assert.deepEqual(financePeriodState(new Date('2026-08-31T16:00:00.000Z')), {
  year: 2026,
  month: 9,
  day: 1,
  previousPeriod: '2026-08',
  adminReminderDue: false,
  annualReviewDue: false,
}, 'Shanghai midnight must advance the confirmation period');

assert.deepEqual(financePeriodState(new Date('2026-12-08T12:00:00+08:00')), {
  year: 2026,
  month: 12,
  day: 8,
  previousPeriod: '2026-11',
  adminReminderDue: true,
  annualReviewDue: true,
});

assert.throws(() => financePeriodState(new Date('invalid')), /valid/);

console.log('Finance period contract passed.');
