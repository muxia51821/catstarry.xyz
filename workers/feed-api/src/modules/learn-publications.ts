import type { LearnPublicationRecord, LearnPublicationVisibility } from '../../../../shared/types';
import { LEARN_PENDING_RELEASE_KEY, readLearnPendingRelease } from './publication-release-guards';

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
): D1PreparedStatement {
  return database.prepare(`INSERT OR IGNORE INTO learn_publications (
      slug, visibility, published_at, last_revised_at, updated_at
    ) SELECT ?, 'public', ?, ?, ?
    WHERE NOT EXISTS (
      SELECT 1 FROM publication_release_guards WHERE guard_key = ?
    )`).bind(row.slug, row.publishedAt, row.revisedAt, row.publishedAt, LEARN_PENDING_RELEASE_KEY);
}

export interface LearnPublicationVisibilityUpdate {
  slug: string;
  visibility: LearnPublicationVisibility;
  updatedAt: string;
}

export function updateLearnPublicationVisibilityStatement(
  database: D1Database,
  update: LearnPublicationVisibilityUpdate,
): D1PreparedStatement {
  return database.prepare(`UPDATE learn_publications
    SET visibility = ?, updated_at = ?
    WHERE slug = ? AND NOT EXISTS (
      SELECT 1 FROM publication_release_guards WHERE guard_key = ?
    )`).bind(update.visibility, update.updatedAt, update.slug, LEARN_PENDING_RELEASE_KEY);
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
