import type { PaginatedResponse, TimelineEntry } from '../../shared/types';

export function feedApiBase(origin: string): string {
  return (import.meta.env.FEED_API_URL ?? origin).replace(/\/$/, '');
}

export function publicFeedApiBase(): string {
  return (import.meta.env.PUBLIC_FEED_API_URL ?? '').replace(/\/$/, '');
}

export async function loadPublicTimeline(origin: string): Promise<PaginatedResponse<TimelineEntry>> {
  const response = await fetch(`${feedApiBase(origin)}/api/feed?limit=20`, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error('Feed 时间线暂时不可用');
  return response.json() as Promise<PaginatedResponse<TimelineEntry>>;
}
