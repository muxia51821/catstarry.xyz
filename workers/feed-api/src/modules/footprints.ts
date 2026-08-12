import type { PublicFootprint, PublicFootprintCandidate } from '../../../../shared/types';
import { FeedStore } from '../adapters/feed-store';

export interface FootprintWrite {
  created: boolean;
  footprint: PublicFootprint;
}

export async function recordPublicFootprint(
  database: D1Database,
  candidate: PublicFootprintCandidate,
): Promise<FootprintWrite> {
  return new FeedStore(database).recordFootprint(candidate, new Date().toISOString());
}

export function parseFootprintCandidate(value: unknown): PublicFootprintCandidate | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<PublicFootprintCandidate>;
  const sourceModules = new Set(['blog', 'learn', 'projects']);
  const eventTypesBySource = {
    blog: new Set(['blog_published']),
    learn: new Set(['learn_section_completed', 'learn_note_published', 'learn_note_revised']),
    projects: new Set(['project_updated']),
  } as const;
  if (
    !sourceModules.has(candidate.source_module ?? '') ||
    !eventTypesBySource[candidate.source_module as keyof typeof eventTypesBySource]?.has(candidate.event_type ?? '') ||
    !isLength(candidate.source_ref, 1, 256) ||
    !isLength(candidate.source_version, 1, 128) ||
    !isNonEmpty(candidate.snapshot_json) ||
    !isNonEmpty(candidate.occurred_at) ||
    !isLength(candidate.idempotency_key, 8, 128) ||
    new TextEncoder().encode(candidate.snapshot_json ?? '').byteLength > 32_768
  ) {
    return null;
  }
  try {
    const snapshot = JSON.parse(candidate.snapshot_json);
    if (!isPlainObject(snapshot) || !isLength(snapshot.title, 1, 200)) return null;
    if (snapshot.summary !== undefined && (typeof snapshot.summary !== 'string' || snapshot.summary.length > 2_000)) return null;
    if (typeof snapshot.link !== 'string' || !isInternalSnapshotLink(snapshot.link, candidate.source_module)) return null;
    if (!isValidIsoTimestamp(candidate.occurred_at)) return null;
    const occurredAt = new Date(candidate.occurred_at);
    if (occurredAt.getTime() > Date.now() + 5 * 60 * 1_000) return null;
    return {
      source_module: candidate.source_module as PublicFootprintCandidate['source_module'],
      source_ref: candidate.source_ref.trim(),
      source_version: candidate.source_version.trim(),
      event_type: candidate.event_type as PublicFootprintCandidate['event_type'],
      snapshot_json: JSON.stringify({
        title: snapshot.title.trim(),
        ...(snapshot.summary !== undefined ? { summary: snapshot.summary.trim() } : {}),
        link: snapshot.link,
      }),
      occurred_at: occurredAt.toISOString(),
      idempotency_key: candidate.idempotency_key.trim(),
    };
  } catch {
    return null;
  }
}

function isLength(value: unknown, minimum: number, maximum: number): value is string {
  return typeof value === 'string' && value.trim().length >= minimum && value.length <= maximum;
}

function isNonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isInternalSnapshotLink(value: string, sourceModule: unknown): boolean {
  if (value.startsWith('//')) return false;
  if (sourceModule === 'blog') return /^\/blog\/.+/.test(value);
  if (sourceModule === 'learn') return /^\/learn\/.+/.test(value);
  if (sourceModule === 'projects') return value === '/projects/' || /^\/projects\/.+/.test(value);
  return false;
}

function isValidIsoTimestamp(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)
    && Number.isFinite(Date.parse(value));
}
