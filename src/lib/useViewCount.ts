import { useState, useEffect } from 'react';

const API_BASE = (import.meta.env.PUBLIC_FEED_API_URL ?? '').replace(/\/$/, '');

function viewsUrl(query = ''): string {
  return `${API_BASE}/api/views${query}`;
}

interface ViewResponse {
  slug: string;
  count: number;
}

/**
 * Count a single page view.
 * Returns the current view count, or null on error.
 */
async function recordView(slug: string): Promise<number | null> {
  try {
    const res = await fetch(viewsUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as ViewResponse;
    return data.count;
  } catch {
    return null;
  }
}

/**
 * Fetch view counts for multiple slugs at once.
 */
async function fetchBatchViews(slugs: string[]): Promise<Record<string, number> | null> {
  try {
    const query = slugs.map(encodeURIComponent).join(',');
    const res = await fetch(viewsUrl(`?slugs=${query}`));
    if (!res.ok) return null;
    const data = (await res.json()) as { views: ViewResponse[] };
    const map: Record<string, number> = {};
    for (const v of data.views) {
      map[v.slug] = v.count;
    }
    return map;
  } catch {
    return null;
  }
}

/**
 * Hook: single article view count.
 * Auto-records a view on mount.
 */
export function useViewCount(slug: string) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    recordView(slug).then((c) => {
      if (!cancelled && c !== null) setCount(c);
    });
    return () => { cancelled = true; };
  }, [slug]);

  return count;
}

/**
 * Hook: batch view counts for a list of slugs.
 */
export function useBatchViewCount(slugs: string[]) {
  const [counts, setCounts] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchBatchViews(slugs).then((map) => {
      if (!cancelled) setCounts(map);
    });
    return () => { cancelled = true; };
  }, [slugs.join(',')]);

  return counts;
}
