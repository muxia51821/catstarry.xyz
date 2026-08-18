import type { PublicationReleaseIdentity } from '../../../../shared/publication-release';
import { comparePublicationRelease, samePublicationRelease } from '../../../../shared/publication-release';

export type ReleaseGuardKey = 'blog-sync' | 'learn-active' | 'learn-pending';

type ReleaseGuardResult =
  | { ok: true }
  | { ok: false; state: 'stale' | 'conflict' | 'pending'; current: PublicationReleaseIdentity | null };

export async function claimBlogSyncRelease(
  database: D1Database,
  release: PublicationReleaseIdentity,
): Promise<ReleaseGuardResult> {
  const result = await database.prepare(`INSERT INTO publication_release_guards (
      guard_key, release_sha, release_generation, updated_at
    ) VALUES ('blog-sync', ?, ?, ?)
    ON CONFLICT(guard_key) DO UPDATE SET
      release_sha = excluded.release_sha,
      release_generation = excluded.release_generation,
      updated_at = excluded.updated_at
    WHERE publication_release_guards.release_generation < excluded.release_generation
      OR (
        publication_release_guards.release_generation = excluded.release_generation
        AND publication_release_guards.release_sha = excluded.release_sha
      )`)
    .bind(release.sha, release.generation, new Date().toISOString())
    .run();
  if ((result.meta.changes ?? 0) > 0) return { ok: true };

  const current = await readReleaseGuard(database, 'blog-sync');
  if (!current) return { ok: false, state: 'conflict', current: null };
  return {
    ok: false,
    state: comparePublicationRelease(release, current) === 'stale' ? 'stale' : 'conflict',
    current,
  };
}

export async function prepareLearnRelease(
  database: D1Database,
  release: PublicationReleaseIdentity,
): Promise<ReleaseGuardResult> {
  const result = await database.prepare(`INSERT OR IGNORE INTO publication_release_guards (
      guard_key, release_sha, release_generation, updated_at
    )
    SELECT 'learn-pending', ?, ?, ?
    WHERE NOT EXISTS (
      SELECT 1 FROM publication_release_guards
      WHERE guard_key = 'learn-active'
        AND (
          release_generation > ?
          OR (release_generation = ? AND release_sha <> ?)
        )
    )`)
    .bind(
      release.sha,
      release.generation,
      new Date().toISOString(),
      release.generation,
      release.generation,
      release.sha,
    )
    .run();
  if ((result.meta.changes ?? 0) > 0) return { ok: true };

  const pending = await readReleaseGuard(database, 'learn-pending');
  if (pending) {
    return samePublicationRelease(release, pending)
      ? { ok: true }
      : { ok: false, state: 'pending', current: pending };
  }
  const active = await readReleaseGuard(database, 'learn-active');
  if (!active) return { ok: false, state: 'conflict', current: null };
  return {
    ok: false,
    state: comparePublicationRelease(release, active) === 'stale' ? 'stale' : 'conflict',
    current: active,
  };
}

export async function abortLearnRelease(
  database: D1Database,
  release: PublicationReleaseIdentity,
): Promise<boolean> {
  const result = await database.prepare(`DELETE FROM publication_release_guards
    WHERE guard_key = 'learn-pending' AND release_sha = ? AND release_generation = ?`)
    .bind(release.sha, release.generation)
    .run();
  return (result.meta.changes ?? 0) > 0;
}

export async function activateLearnRelease(
  database: D1Database,
  release: PublicationReleaseIdentity,
): Promise<boolean> {
  const [, activation] = await database.batch([
    database.prepare(`DELETE FROM publication_release_guards
      WHERE guard_key = 'learn-active'
        AND (
          release_generation < ?
          OR (release_generation = ? AND release_sha = ?)
        )`)
      .bind(release.generation, release.generation, release.sha),
    database.prepare(`UPDATE publication_release_guards
      SET guard_key = 'learn-active', updated_at = ?
      WHERE guard_key = 'learn-pending' AND release_sha = ? AND release_generation = ?
        AND NOT EXISTS (
          SELECT 1 FROM publication_release_guards WHERE guard_key = 'learn-active'
        )`)
      .bind(new Date().toISOString(), release.sha, release.generation),
  ]);
  return (activation.meta.changes ?? 0) > 0;
}

export async function readLearnActiveRelease(database: D1Database): Promise<PublicationReleaseIdentity | null> {
  return readReleaseGuard(database, 'learn-active');
}

export async function readLearnPendingRelease(database: D1Database): Promise<PublicationReleaseIdentity | null> {
  return readReleaseGuard(database, 'learn-pending');
}

async function readReleaseGuard(
  database: D1Database,
  key: ReleaseGuardKey,
): Promise<PublicationReleaseIdentity | null> {
  const row = await database.prepare(`SELECT release_sha, release_generation
    FROM publication_release_guards WHERE guard_key = ?`)
    .bind(key)
    .first<{ release_sha: string; release_generation: number }>();
  return row ? { sha: row.release_sha, generation: row.release_generation } : null;
}
