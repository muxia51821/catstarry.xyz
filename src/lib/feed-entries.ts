import type { TimelineEntry } from '../../shared/types';

export interface FootprintSnapshot {
  title?: unknown;
  summary?: unknown;
  link?: unknown;
}

export function parseFootprintSnapshot(entry: TimelineEntry): FootprintSnapshot | null {
  if (entry.kind !== 'system_footprint') return null;
  try {
    const data = entry.payload as unknown as Record<string, unknown>;
    const snapshot = JSON.parse(String(data.snapshot_json ?? '{}')) as unknown;
    return snapshot && typeof snapshot === 'object' && !Array.isArray(snapshot)
      ? snapshot as FootprintSnapshot
      : null;
  } catch {
    return null;
  }
}

export function appendDedupedById<T extends { id: string }>(current: T[], incoming: T[]): T[] {
  return [...current, ...incoming.filter((item) => !current.some((known) => known.id === item.id))];
}
