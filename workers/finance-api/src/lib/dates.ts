export const ISO_DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDay(value: string): boolean {
  return ISO_DAY_PATTERN.test(value);
}

export function isCalendarIsoDay(value: unknown): boolean {
  if (typeof value !== 'string' || !ISO_DAY_PATTERN.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export type ShanghaiClockParts = Record<'year' | 'month' | 'day' | 'hour' | 'minute', string>;

export function shanghaiClockParts(value: Date): ShanghaiClockParts {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(value);
  return Object.fromEntries(parts.map((part) => [part.type, part.value])) as ShanghaiClockParts;
}

export function shanghaiDay(value: Date): string {
  const { year, month, day } = shanghaiClockParts(value);
  return `${year}-${month}-${day}`;
}
