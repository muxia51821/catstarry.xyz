import type {
  FeedPost,
  FeedPostInput,
  FootprintSource,
  PaginatedResponse,
  PublicFootprint,
  PublicFootprintCandidate,
  TimelineEntry,
  Visibility,
} from '../../../../shared/types';
import type { FootprintWrite } from '../modules/footprints';

const PAGE_BUFFER = 1;

export interface Cursor {
  occurred_at: string;
  id: string;
}

export interface AdminFilters {
  visibility?: Visibility;
  type?: string;
  from?: string;
  to?: string;
  cursor?: Cursor;
  limit: number;
}

interface TimelineRow {
  kind: 'native_post' | 'system_footprint';
  id: string;
  occurred_at: string;
  visibility: Visibility;
  type: 'note' | 'clip' | null;
  content: string | null;
  media_json: string | null;
  link_url: string | null;
  link_title: string | null;
  link_summary: string | null;
  link_image: string | null;
  updated_at: string | null;
  source_module: FootprintSource | null;
  source_ref: string | null;
  source_version: string | null;
  event_type: PublicFootprint['event_type'] | null;
  snapshot_json: string | null;
}

const TIMELINE_SELECT = `
  SELECT
    'native_post' AS kind, id, created_at AS occurred_at, visibility,
    type, content, media_json, link_url, link_title, link_summary, link_image, updated_at,
    NULL AS source_module, NULL AS source_ref, NULL AS source_version,
    NULL AS event_type, NULL AS snapshot_json
  FROM feed_posts
  UNION ALL
  SELECT
    'system_footprint' AS kind, id, occurred_at, visibility,
    NULL AS type, NULL AS content, NULL AS media_json, NULL AS link_url, NULL AS link_title,
    NULL AS link_summary, NULL AS link_image, NULL AS updated_at,
    source_module, source_ref, source_version, event_type, snapshot_json
  FROM public_footprints`;

function entryFromRow(row: TimelineRow): TimelineEntry {
  if (row.kind === 'native_post') {
    const payload: FeedPost = {
      id: row.id,
      type: row.type as FeedPost['type'],
      content: row.content,
      media_json: row.media_json,
      link_url: row.link_url,
      link_title: row.link_title,
      link_summary: row.link_summary,
      link_image: row.link_image,
      visibility: row.visibility,
      created_at: row.occurred_at,
      updated_at: row.updated_at ?? row.occurred_at,
    };
    return { id: row.id, kind: row.kind, occurred_at: row.occurred_at, visibility: row.visibility, payload };
  }

  const payload: PublicFootprint = {
    id: row.id,
    source_module: row.source_module as FootprintSource,
    source_ref: row.source_ref ?? '',
    source_version: row.source_version ?? '',
    event_type: row.event_type as PublicFootprint['event_type'],
    snapshot_json: row.snapshot_json ?? '{}',
    occurred_at: row.occurred_at,
    visibility: row.visibility,
  };
  return { id: row.id, kind: row.kind, occurred_at: row.occurred_at, visibility: row.visibility, payload };
}

export class FeedStore {
  constructor(private readonly database: D1Database) {}

  async listPublic(cursor: Cursor | undefined, limit: number): Promise<PaginatedResponse<TimelineEntry>> {
    const page = await this.listTimeline({ cursor, limit, visibility: 'public' });
    return page;
  }

  async listAdmin(filters: AdminFilters): Promise<PaginatedResponse<TimelineEntry>> {
    return this.listTimeline(filters);
  }

  async createPost(input: FeedPostInput, now: string, id: string = crypto.randomUUID()): Promise<FeedPost> {
    const mediaJson = input.media_keys?.length ? JSON.stringify(input.media_keys) : null;
    await this.database
      .prepare(
        `INSERT INTO feed_posts (
          id, type, content, media_json, link_url, link_title, link_summary, link_image,
          visibility, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'public', ?, ?)`,
      )
      .bind(
        id,
        input.type,
        input.content ?? null,
        mediaJson,
        input.link_url ?? null,
        input.link_title ?? null,
        input.link_summary ?? null,
        input.link_image ?? null,
        now,
        now,
      )
      .run();

    return {
      id,
      type: input.type,
      content: input.content ?? null,
      media_json: mediaJson,
      link_url: input.link_url ?? null,
      link_title: input.link_title ?? null,
      link_summary: input.link_summary ?? null,
      link_image: input.link_image ?? null,
      visibility: 'public',
      created_at: now,
      updated_at: now,
    };
  }

  async getNativePost(id: string): Promise<FeedPost | null> {
    return this.database.prepare('SELECT * FROM feed_posts WHERE id = ?').bind(id).first<FeedPost>();
  }

  async updateNativeVisibility(id: string, visibility: Visibility, now: string): Promise<boolean> {
    const result = await this.database
      .prepare('UPDATE feed_posts SET visibility = ?, updated_at = ? WHERE id = ?')
      .bind(visibility, now, id)
      .run();
    return (result.meta.changes ?? 0) > 0;
  }

  async updateFootprintVisibility(id: string, visibility: Visibility): Promise<boolean> {
    const result = await this.database
      .prepare('UPDATE public_footprints SET visibility = ? WHERE id = ?')
      .bind(visibility, id)
      .run();
    return (result.meta.changes ?? 0) > 0;
  }

  async deleteNativePost(id: string): Promise<boolean> {
    const result = await this.database.prepare('DELETE FROM feed_posts WHERE id = ?').bind(id).run();
    return (result.meta.changes ?? 0) > 0;
  }

  async recordFootprint(candidate: PublicFootprintCandidate, now: string): Promise<FootprintWrite> {
    const id = crypto.randomUUID();
    const result = await this.database
      .prepare(
        `INSERT OR IGNORE INTO public_footprints (
          id, source_module, source_ref, source_version, event_type, snapshot_json,
          occurred_at, visibility, idempotency_key, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'public', ?, ?)`,
      )
      .bind(
        id,
        candidate.source_module,
        candidate.source_ref,
        candidate.source_version,
        candidate.event_type,
        candidate.snapshot_json,
        candidate.occurred_at,
        candidate.idempotency_key,
        now,
      )
      .run();

    const row = await this.database
      .prepare(
        `SELECT id, source_module, source_ref, source_version, event_type, snapshot_json,
          occurred_at, visibility FROM public_footprints WHERE idempotency_key = ?`,
      )
      .bind(candidate.idempotency_key)
      .first<PublicFootprint>();
    if (!row) throw new Error('Public footprint write was not persisted');
    return { created: (result.meta.changes ?? 0) > 0, footprint: row };
  }

  async isMediaReferenced(key: string): Promise<boolean> {
    return (await this.findReferencedMedia([key])).has(key);
  }

  async findReferencedMedia(keys: string[]): Promise<Set<string>> {
    const referenced = new Set<string>();
    for (let offset = 0; offset < keys.length; offset += 50) {
      const chunk = keys.slice(offset, offset + 50);
      if (chunk.length === 0) continue;
      const placeholders = chunk.map(() => '?').join(', ');
      const result = await this.database
        .prepare(`SELECT DISTINCT media.value AS media_key
          FROM feed_posts
          JOIN json_each(CASE WHEN json_valid(feed_posts.media_json) THEN feed_posts.media_json ELSE '[]' END) AS media
          WHERE media.value IN (${placeholders})`)
        .bind(...chunk)
        .all<{ media_key: string }>();
      for (const row of result.results) referenced.add(row.media_key);
    }
    return referenced;
  }

  private async listTimeline(filters: AdminFilters): Promise<PaginatedResponse<TimelineEntry>> {
    const where: string[] = [];
    const values: (string | number)[] = [];
    if (filters.visibility) {
      where.push('visibility = ?');
      values.push(filters.visibility);
    }
    if (filters.type && ['note', 'clip'].includes(filters.type)) {
      where.push("(kind = 'native_post' AND type = ?)");
      values.push(filters.type);
    }
    if (filters.type === 'system_footprint') where.push("kind = 'system_footprint'");
    if (filters.type && ['blog', 'learn', 'projects'].includes(filters.type)) {
      where.push("(kind = 'system_footprint' AND source_module = ?)");
      values.push(filters.type);
    }
    if (filters.from) {
      where.push('occurred_at >= ?');
      values.push(filters.from);
    }
    if (filters.to) {
      where.push('occurred_at < ?');
      values.push(filters.to);
    }
    if (filters.cursor) {
      where.push('(occurred_at < ? OR (occurred_at = ? AND id < ?))');
      values.push(filters.cursor.occurred_at, filters.cursor.occurred_at, filters.cursor.id);
    }

    const query = `SELECT * FROM (${TIMELINE_SELECT})${where.length ? ` WHERE ${where.join(' AND ')}` : ''}
      ORDER BY occurred_at DESC, id DESC LIMIT ?`;
    values.push(filters.limit + PAGE_BUFFER);
    const result = await this.database.prepare(query).bind(...values).all<TimelineRow>();
    const rows = result.results;
    const hasMore = rows.length > filters.limit;
    const items = rows.slice(0, filters.limit).map(entryFromRow);
    const last = items.at(-1);
    return {
      items,
      cursor: hasMore && last ? encodeCursor({ occurred_at: last.occurred_at, id: last.id }) : null,
      has_more: hasMore,
    };
  }
}

export function encodeCursor(cursor: Cursor): string {
  return btoa(JSON.stringify(cursor)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

export function decodeCursor(value: string): Cursor | null {
  try {
    if (value.length < 8 || value.length > 1_024 || !/^[A-Za-z0-9_-]+$/.test(value)) return null;
    const normalized = value.replaceAll('-', '+').replaceAll('_', '/');
    const padding = '='.repeat((4 - (normalized.length % 4)) % 4);
    const parsed = JSON.parse(atob(`${normalized}${padding}`)) as Partial<Cursor>;
    return typeof parsed.occurred_at === 'string'
      && Number.isFinite(Date.parse(parsed.occurred_at))
      && typeof parsed.id === 'string'
      && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(parsed.id)
      ? { occurred_at: parsed.occurred_at, id: parsed.id }
      : null;
  } catch {
    return null;
  }
}
