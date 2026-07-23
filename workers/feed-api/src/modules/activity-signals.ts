import type { ActivitySignalsManifest, ActivityState } from '../../../../shared/types';
import { ActivitySignalStore } from '../adapters/activity-signal-store';

const ACTIVE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const RECENT_WINDOW_MS = 60 * 24 * 60 * 60 * 1000;

function stateFor(timestamp: string | null | undefined, now: number): ActivityState {
  const activityTime = timestamp ? Date.parse(timestamp) : Number.NaN;
  if (!Number.isFinite(activityTime)) return 'quiet';

  const age = now - activityTime;
  if (age <= ACTIVE_WINDOW_MS) return 'active';
  if (age <= RECENT_WINDOW_MS) return 'recent';
  return 'quiet';
}

export async function refreshActivitySignals(
  env: Pick<Env, 'DB' | 'HOME_PROJECTIONS'>,
): Promise<void> {
  const store = new ActivitySignalStore(env.DB, env.HOME_PROJECTIONS);
  const latest = await store.readLatestActivity();
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
