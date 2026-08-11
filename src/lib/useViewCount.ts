import { useEffect, useState } from 'react';

const API_BASE = (import.meta.env.PUBLIC_FEED_API_URL ?? '').replace(/\/$/, '');

function viewsUrl(query = ''): string {
  return `${API_BASE}/api/views${query}`;
}

interface ViewResponse {
  slug: string;
  count: number;
}

interface SessionResponse {
  authenticated: boolean;
}

async function recordView(slug: string): Promise<void> {
  try {
    await fetch(viewsUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ slug }),
    });
  } catch {
    // Recording is deliberately best-effort and never affects reading.
  }
}

export function useViewTracker(slug: string) {
  useEffect(() => {
    void recordView(slug);
  }, [slug]);
}

export function useOwnerViewCount(slug: string) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const readOwnerCount = async () => {
      try {
        const sessionResponse = await fetch(`${API_BASE}/api/auth/session`, { credentials: 'include' });
        if (!sessionResponse.ok || !(await sessionResponse.json() as SessionResponse).authenticated) return;

        const countResponse = await fetch(viewsUrl(`?slug=${encodeURIComponent(slug)}`), { credentials: 'include' });
        if (!countResponse.ok) return;
        const data = await countResponse.json() as ViewResponse;
        if (!cancelled) setCount(data.count);
      } catch {
        // Anonymous and unavailable auth states intentionally show no count.
      }
    };
    void readOwnerCount();
    return () => { cancelled = true; };
  }, [slug]);

  return count;
}
