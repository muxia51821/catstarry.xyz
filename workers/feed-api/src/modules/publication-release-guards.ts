import type { PublicationReleaseIdentity } from '../../../../shared/publication-release';
import { comparePublicationRelease } from '../../../../shared/publication-release';

export type ReleaseGuardKey = 'blog-sync' | 'learn-active' | 'learn-pending';

interface ReleaseGuardRow {
  guard_key: ReleaseGuardKey;
  release_sha: string;
  release_generation: number;
  updated_at: string;
}

export type ReleaseGuardResult =
  | { ok: true; state: 'accepted' | 'same'; release: PublicationReleaseIdentity }
  | { ok: false; state: 'stale' | 'conflict' | 'pending'; current: PublicationReleaseIdentity | null };

export async function claimBlogSyncRelease(
  database: D1Database,
  release: PublicationReleaseIdentity,
): Promise<ReleaseGuardResult> {
  const now = new Date().toISOString();
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
    .bind(release.sha, release.generation, now)
    .run();
  if ((result.meta.changes ?? 0) > 0) {
    const current = await readReleaseGuard(database, 'blog-sync');
    return { ok: true, state: current && current.generation === release.generation ? 'same' : 'accepted', release };
  }
  const current = await readReleaseGuard(database, 'blog-sync');
  if (!current) return { ok: false, state: 'conflict', current: null };
  const comparison = comparePublicationRelease(release, current);
  return {
    ok: false,
    state: comparison === 'stale' ? 'stale' : 'conflict',
    current,
  };
}

export async function prepareLearnRelease(
  database: D1Database,
  release: PublicationReleaseIdentity,
): Promise<ReleaseGuardResult> {
  const now = new Date().toISOString();
  const result = await database.prepare(`INSERT INTO publication_release_guards (
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
    )
    ON CONFLICT(guard_key) DO UPDATE SET updated_at = excluded.updated_at
    WHERE publication_release_guards.release_generation = excluded.release_generation
      AND publication_release_guards.release_sha = excluded.release_sha`)
    .bind(release.sha, release.generation, now, release.generation, release.generation, release.sha)
    .run();
  if ((result.meta.changes ?? 0) > 0) {
    return { ok: true, state: 'accepted', release };
  }

  const pending = await readReleaseGuard(database, 'learn-pending');
  if (pending) {
    if (pending.sha === release.sha && pending.generation === release.generation) {
      return { ok: true, state: 'same', release };
    }
    return { ok: false, state: 'pending', current: pending };
  }
  const active = await readReleaseGuard(database, 'learn-active');
  if (!active) return { ok: false, state: 'conflict', current: null };
  const comparison = comparePublicationRelease(release, active);
  return {
    ok: false,
    state: comparison === 'stale' ? 'stale' : 'conflict',
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
  const now = new Date().toISOString();
  const [activeWrite, pendingDelete] = await database.batch([
    database.prepare(`INSERT INTO publication_release_guards (
        guard_key, release_sha, release_generation, updated_at
      )
      SELECT 'learn-active', ?, ?, ?
      WHERE EXISTS (
        SELECT 1 FROM publication_release_guards
        WHERE guard_key = 'learn-pending' AND release_sha = ? AND release_generation = ?
      )
      ON CONFLICT(guard_key) DO UPDATE SET
        release_sha = excluded.release_sha,
        release_generation = excluded.release_generation,
        updated_at = excluded.updated_at
      WHERE (
        publication_release_guards.release_generation < excluded.release_generation
        OR (
          publication_release_guards.release_generation = excluded.release_generation
          AND publication_release_guards.release_sha = excluded.release_sha
        )
      )
      AND EXISTS (
        SELECT 1 FROM publication_release_guards
        WHERE guard_key = 'learn-pending' AND release_sha = excluded.release_sha
          AND release_generation = excluded.release_generation
      )`)
      .bind(release.sha, release.generation, now, release.sha, release.generation),
    database.prepare(`DELETE FROM publication_release_guards
      WHERE guard_key = 'learn-pending' AND release_sha = ? AND release_generation = ?
        AND EXISTS (
          SELECT 1 FROM publication_release_guards
          WHERE guard_key = 'learn-active' AND release_sha = ? AND release_generation = ?
        )`)
      .bind(release.sha, release.generation, release.sha, release.generation),
  ]);
  return (activeWrite.meta.changes ?? 0) > 0 && (pendingDelete.meta.changes ?? 0) > 0;
}

export async function readLearnActiveRelease(database: D1Database): Promise<PublicationReleaseIdentity | null> {
  return readReleaseGuard(database, 'learn-active');
}

export async function readLearnPendingRelease(database: D1Database): Promise<PublicationReleaseIdentity | null> {
  return readReleaseGuard(database, 'learn-pending');
}

export async function readReleaseGuard(
  database: D1Database,
  key: ReleaseGuardKey,
): Promise<PublicationReleaseIdentity | null> {
  const row = await database.prepare(`SELECT guard_key, release_sha, release_generation, updated_at
    FROM publication_release_guards WHERE guard_key = ?`)
    .bind(key)
    .first<ReleaseGuardRow>();
  return row ? { sha: row.release_sha, generation: row.release_generation } : null;
}
