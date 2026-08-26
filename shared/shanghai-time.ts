export interface ShanghaiTimeParts {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
  second: string;
}

const SHANGHAI_PARTS_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

const SHANGHAI_LONG_DATE_FORMATTER = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  timeZone: 'Asia/Shanghai',
});

const SHANGHAI_OFFSET_MS = 8 * 60 * 60 * 1000;

function toPartMap(value: Date): Record<string, string> {
  return Object.fromEntries(
    SHANGHAI_PARTS_FORMATTER.formatToParts(value).map(({ type, value }) => [type, value]),
  );
}

export function shanghaiParts(value: Date): ShanghaiTimeParts {
  const parts = toPartMap(value);
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour,
    minute: parts.minute,
    second: parts.second,
  };
}

export function shanghaiDayKey(value: Date): string {
  const parts = shanghaiParts(value);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function shanghaiMonthKey(value: Date): string {
  const parts = shanghaiParts(value);
  return `${parts.year}-${parts.month}`;
}

export function shanghaiUtcBoundary(day: string, offsetDays = 0): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!match) return null;
  const [year, month, date] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const probe = new Date(Date.UTC(year, month - 1, date));
  if (probe.getUTCFullYear() !== year || probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== date) return null;
  return new Date(probe.getTime() + offsetDays * 86_400_000 - SHANGHAI_OFFSET_MS).toISOString();
}

function asDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

export function formatShanghaiLongDate(value: Date | string): string {
  return SHANGHAI_LONG_DATE_FORMATTER.format(asDate(value));
}

export function formatShanghaiShortDate(value: Date | string): string {
  const parts = shanghaiParts(asDate(value));
  return `${parts.month}.${parts.day}`;
}
