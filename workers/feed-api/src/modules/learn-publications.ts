import type { LearnPublicationRecord, LearnPublicationVisibility } from '../../../../shared/types';
import { LEARN_PENDING_RELEASE_KEY, readLearnPendingRelease } from './publication-release-guards';
import type { LearnRelationEntry } from '../../../../shared/learn-relations';
import type { PublicationReleaseIdentity } from '../../../../shared/publication-release';

export interface LearnRelationGuard {
  entries: LearnRelationEntry[];
  slugs: readonly string[];
  visibility: LearnPublicationVisibility;
  release: PublicationReleaseIdentity | null;
}

export function learnRelationWriteCondition(guard: LearnRelationGuard) {
  // Evaluate the complete proposed set inside each write, including a whole first-Publish batch.
  const sql = `(WITH proposed AS (
      SELECT slug FROM learn_publications WHERE visibility = 'public'
        AND slug NOT IN (SELECT value FROM json_each(?))
      UNION SELECT value FROM json_each(?) WHERE ? = 'public'
    ), relations AS (
      SELECT json_extract(value, '$.slug') AS slug, json_extract(value, '$.links') AS links
      FROM json_each(?)
    )
    SELECT NOT EXISTS (
      SELECT 1 FROM proposed LEFT JOIN relations USING (slug) WHERE relations.slug IS NULL
    ) AND NOT EXISTS (
      SELECT 1 FROM proposed JOIN relations USING (slug), json_each(relations.links) AS link
      WHERE link.value NOT IN (SELECT slug FROM proposed)
    )) AND COALESCE((SELECT release_sha FROM publication_release_guards
      WHERE guard_key = 'learn-active'), '') = ?
    AND COALESCE((SELECT release_generation FROM publication_release_guards
      WHERE guard_key = 'learn-active'), 0) = ?`;
  const slugs = JSON.stringify(guard.slugs);
  return { sql, values: [slugs, slugs, guard.visibility, JSON.stringify(guard.entries),
    guard.release?.sha ?? '', guard.release?.generation ?? 0] };
}

export async function getLearnPublication(
  database: D1Database,
  slug: string,
): Promise<LearnPublicationRecord | null> {
  return database.prepare(`SELECT slug, visibility, published_at, last_revised_at, updated_at
    FROM learn_publications WHERE slug = ?`).bind(slug).first<LearnPublicationRecord>();
}

export async function listLearnPublications(
  database: D1Database,
  visibility?: LearnPublicationVisibility,
): Promise<LearnPublicationRecord[]> {
  const statement = visibility
    ? database.prepare(`SELECT slug, visibility, published_at, last_revised_at, updated_at
      FROM learn_publications WHERE visibility = ? ORDER BY slug`).bind(visibility)
    : database.prepare(`SELECT slug, visibility, published_at, last_revised_at, updated_at
      FROM learn_publications ORDER BY slug`);
  return (await statement.all<LearnPublicationRecord>()).results;
}

export async function listPublicLearnSlugs(database: D1Database): Promise<string[]> {
  const result = await database.prepare(
    "SELECT slug FROM learn_publications WHERE visibility = 'public' ORDER BY slug",
  ).all<{ slug: string }>();
  return result.results.map((entry) => entry.slug);
}

export interface LearnFirstPublicationRow {
  slug: string;
  publishedAt: string;
  revisedAt: string | null;
}

export function insertLearnPublicationStatement(
  database: D1Database,
  row: LearnFirstPublicationRow,
  guard: LearnRelationGuard,
): D1PreparedStatement {
  const condition = learnRelationWriteCondition(guard);
  return database.prepare(`INSERT OR IGNORE INTO learn_publications (
      slug, visibility, published_at, last_revised_at, updated_at
    ) SELECT ?, 'public', ?, ?, ?
    WHERE NOT EXISTS (
      SELECT 1 FROM publication_release_guards WHERE guard_key = ?
    ) AND ${condition.sql}`).bind(row.slug, row.publishedAt, row.revisedAt, row.publishedAt,
      LEARN_PENDING_RELEASE_KEY, ...condition.values);
}

export function insertLearnPublicationBatchStatement(
  database: D1Database,
  row: LearnFirstPublicationRow,
  guard: LearnRelationGuard,
): D1PreparedStatement {
  const condition = learnRelationWriteCondition(guard);
  return database.prepare(`INSERT INTO learn_publications (
      slug, visibility, published_at, last_revised_at, updated_at
    ) SELECT ?, 'public', ?, ?, ?
    WHERE NOT EXISTS (
      SELECT 1 FROM publication_release_guards WHERE guard_key = ?
    ) AND ${condition.sql}`).bind(row.slug, row.publishedAt, row.revisedAt, row.publishedAt,
      LEARN_PENDING_RELEASE_KEY, ...condition.values);
}

export interface LearnPublicationVisibilityUpdate {
  slug: string;
  visibility: LearnPublicationVisibility;
  updatedAt: string;
}

export function updateLearnPublicationVisibilityStatement(
  database: D1Database,
  update: LearnPublicationVisibilityUpdate,
  guard: LearnRelationGuard,
): D1PreparedStatement {
  const condition = learnRelationWriteCondition(guard);
  return database.prepare(`UPDATE learn_publications
    SET visibility = ?, updated_at = ?
    WHERE slug = ? AND NOT EXISTS (
      SELECT 1 FROM publication_release_guards WHERE guard_key = ?
    ) AND ${condition.sql}`).bind(update.visibility, update.updatedAt, update.slug,
      LEARN_PENDING_RELEASE_KEY, ...condition.values);
}

export function updateLearnRevisionStatement(
  database: D1Database,
  slug: string,
  revisedAt: string,
  updatedAt: string,
): D1PreparedStatement {
  return database.prepare('UPDATE learn_publications SET last_revised_at = ?, updated_at = ? WHERE slug = ?')
    .bind(revisedAt, updatedAt, slug);
}

export interface GuardedLearnWriteOutcome {
  written: boolean;
  blockedByPendingRelease: boolean;
}

export async function interpretGuardedLearnWrite(
  database: D1Database,
  changes: number,
): Promise<GuardedLearnWriteOutcome> {
  if (changes > 0) return { written: true, blockedByPendingRelease: false };
  return { written: false, blockedByPendingRelease: Boolean(await readLearnPendingRelease(database)) };
}
