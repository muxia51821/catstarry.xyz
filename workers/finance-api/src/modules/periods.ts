export interface FinancePeriodState {
  year: number;
  month: number;
  day: number;
  previousPeriod: string;
  adminReminderDue: boolean;
  annualReviewDue: boolean;
}

export function financePeriodState(date: Date): FinancePeriodState {
  if (!Number.isFinite(date.getTime())) throw new Error('date must be valid');
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, Number(part.value)]));
  const year = value.year;
  const month = value.month;
  const day = value.day;
  const previousPeriod = month === 1
    ? `${year - 1}-12`
    : `${year}-${String(month - 1).padStart(2, '0')}`;
  return {
    year,
    month,
    day,
    previousPeriod,
    adminReminderDue: day > 7,
    annualReviewDue: month === 12,
  };
}
