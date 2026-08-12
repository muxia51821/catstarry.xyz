import type { TimelineEntry } from '../../shared/types';

export interface ChronologyActivity {
  time: string;
  entry: TimelineEntry;
}

export interface ChronologyDay {
  date: string;
  activities: ChronologyActivity[];
}

export interface ChronologyYear {
  year: string;
  days: ChronologyDay[];
}

const SHANGHAI_PARTS = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

export function groupTimelineByShanghai(entries: TimelineEntry[]): ChronologyYear[] {
  const years: ChronologyYear[] = [];
  for (const entry of entries) {
    const parts = Object.fromEntries(
      SHANGHAI_PARTS.formatToParts(new Date(entry.occurred_at)).map(({ type, value }) => [type, value]),
    );
    const year = parts.year;
    const date = `${parts.month}.${parts.day}`;
    const time = `${parts.hour}:${parts.minute}`;
    let yearGroup = years.at(-1);
    if (!yearGroup || yearGroup.year !== year) {
      yearGroup = { year, days: [] };
      years.push(yearGroup);
    }
    let dayGroup = yearGroup.days.at(-1);
    if (!dayGroup || dayGroup.date !== date) {
      dayGroup = { date, activities: [] };
      yearGroup.days.push(dayGroup);
    }
    dayGroup.activities.push({ time, entry });
  }
  return years;
}
