import { useState, useEffect } from 'react';

const API_BASE = 'https://feed-api.catstarry.workers.dev/api';

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
    const res = await fetch(`${API_BASE}/views`, {
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
async function fetchBatchViews(slugs: string[]): Promise<Record<string, number>> {
  try {
    const res = await fetch(`${API_BASE}/views?slugs=${slugs.join(',')}`);
    if (!res.ok) return {};
    const data = (await res.json()) as { views: ViewResponse[] };
    const map: Record<string, number> = {};
    for (const v of data.views) {
      map[v.slug] = v.count;
    }
    return map;
  } catch {
    return {};
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
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    let cancelled = false;
    fetchBatchViews(slugs).then((map) => {
      if (!cancelled) setCounts(map);
    });
    return () => { cancelled = true; };
  }, [slugs.join(',')]);

  return counts;
}
