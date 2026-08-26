import type { TimelineEntry } from '../../shared/types';
import { shanghaiParts } from '../../shared/shanghai-time';

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

export function groupTimelineByShanghai(entries: TimelineEntry[]): ChronologyYear[] {
  const years: ChronologyYear[] = [];
  for (const entry of entries) {
    const parts = shanghaiParts(new Date(entry.occurred_at));
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
