import type { PaginatedResponse, TimelineEntry } from '../../shared/types';

export function feedApiBase(origin: string): string {
  return (import.meta.env.FEED_API_URL ?? origin).replace(/\/$/, '');
}

export function publicFeedApiBase(): string {
  return (import.meta.env.PUBLIC_FEED_API_URL ?? '').replace(/\/$/, '');
}

export async function loadPublicTimeline(apiBase: string): Promise<PaginatedResponse<TimelineEntry>> {
  const response = await fetch(`${apiBase.replace(/\/$/, '')}/api/feed?limit=20`, {
    credentials: 'include',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error('Feed 时间线暂时不可用');
  return response.json() as Promise<PaginatedResponse<TimelineEntry>>;
}

export function previewCandidateUrl(value: string): string | null {
  const candidate = value.trim();
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    if ((url.protocol !== 'http:' && url.protocol !== 'https:') || !url.hostname || url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}
