import type { ActivitySignalsManifest, ActivityState } from '../../../../shared/types';
import { ActivitySignalStore } from '../adapters/activity-signal-store';

const ACTIVE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const RECENT_WINDOW_MS = 60 * 24 * 60 * 60 * 1000;

function stateFor(timestamp: string | null | undefined, now: number): ActivityState {
  const activityTime = timestamp ? Date.parse(timestamp) : Number.NaN;
  if (!Number.isFinite(activityTime)) return 'dormant';

  const age = now - activityTime;
  if (age <= ACTIVE_WINDOW_MS) return 'active';
  if (age <= RECENT_WINDOW_MS) return 'stable';
  return 'dormant';
}

export async function refreshActivitySignals(
  env: Pick<Env, 'AUTH_KV' | 'DB' | 'HOME_PROJECTIONS'>,
): Promise<void> {
  const store = new ActivitySignalStore(env.DB, env.HOME_PROJECTIONS);
  const blogManifest = await env.AUTH_KV.get<unknown>('blog:published-manifest', 'json');
  const publishedBlogSlugs = Array.isArray(blogManifest)
    ? blogManifest.filter((slug): slug is string => typeof slug === 'string')
    : [];
  const latest = await store.readLatestActivity(publishedBlogSlugs);
  const now = Date.now();

  const manifest: ActivitySignalsManifest = {
    schema_version: 1,
    signals: {
      blog: { state: stateFor(latest.blog, now) },
      feed: { state: stateFor(latest.feed, now) },
      learn: { state: stateFor(latest.learn, now) },
      projects: { state: stateFor(latest.projects, now) },
    },
  };

  await store.publish(manifest);
}
