import type { PaginatedResponse, TimelineEntry } from '../../shared/types';

export function normalizeApiBase(value: string): string {
  return value.replace(/\/$/, '');
}

export function feedApiBase(origin: string): string {
  return normalizeApiBase(import.meta.env.FEED_API_URL ?? origin);
}

export function publicFeedApiBase(): string {
  return normalizeApiBase(import.meta.env.PUBLIC_FEED_API_URL ?? '');
}

export async function loadPublicTimeline(apiBase: string, cursor?: string): Promise<PaginatedResponse<TimelineEntry>> {
  const query = new URLSearchParams({ limit: '20', ...(cursor ? { cursor } : {}) });
  const response = await fetch(`${normalizeApiBase(apiBase)}/api/feed?${query}`, {
    credentials: 'include',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(cursor ? '无法加载更早的内容' : 'Feed 时间线暂时不可用');
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
