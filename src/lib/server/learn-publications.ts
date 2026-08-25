import type { LearnPublicationRecord } from '../../../shared/types';
import { isCanonicalSlug } from '../../../shared/slug';
import {
  getPublishedNotes,
  noteFromEntry,
  type LearnEntry,
  type LearnNote,
} from '../../components/learn/learn-data';
import { fetchOwnerApi } from './owner-auth';

export async function loadPublicLearnNotes(
  request: Request,
  entries: LearnEntry[],
): Promise<LearnNote[] | null> {
  try {
    const response = await fetchOwnerApi(request, '/api/learn/publications');
    if (!response.ok) return null;
    const value = await response.json() as { entries?: unknown };
    const records = normalizePublicRecords(value.entries);
    if (!records) return null;
    const bySlug = new Map(records.map((record) => [record.slug, record]));
    return getPublishedNotes(entries.map(noteFromEntry).map((note) => {
      const record = bySlug.get(note.slug);
      if (!record || note.state === 'withdrawn' || note.state === 'superseded') return note;
      return { ...note, state: 'public' as const, publishedAt: record.published_at };
    }));
  } catch {
    return null;
  }
}

export async function loadOwnerLearnPublications(request: Request): Promise<LearnPublicationRecord[] | null> {
  try {
    const response = await fetchOwnerApi(request, '/api/learn/admin/publications');
    if (!response.ok) return null;
    const value = await response.json() as { entries?: unknown };
    return normalizeOwnerRecords(value.entries);
  } catch {
    return null;
  }
}

export function mergeOwnerLearnNotes(entries: LearnEntry[], records: LearnPublicationRecord[]): LearnNote[] {
  const bySlug = new Map(records.map((record) => [record.slug, record]));
  return entries.map(noteFromEntry).map((note) => {
    const record = bySlug.get(note.slug);
    if (!record || note.state === 'withdrawn' || note.state === 'superseded') return note;
    return {
      ...note,
      state: record.visibility,
      publishedAt: record.published_at,
    };
  });
}

function normalizePublicRecords(value: unknown): Pick<LearnPublicationRecord, 'slug' | 'published_at'>[] | null {
  if (!Array.isArray(value)) return null;
  const records = value.map((entry) => {
    if (!entry || typeof entry !== 'object') return null;
    const record = entry as Record<string, unknown>;
    return isCanonicalSlug(record.slug) && validTimestamp(record.published_at)
      ? { slug: record.slug, published_at: new Date(record.published_at).toISOString() }
      : null;
  });
  return records.every((record) => record !== null)
    ? records as Pick<LearnPublicationRecord, 'slug' | 'published_at'>[]
    : null;
}

function normalizeOwnerRecords(value: unknown): LearnPublicationRecord[] | null {
  if (!Array.isArray(value)) return null;
  const records = value.map((entry) => {
    if (!entry || typeof entry !== 'object') return null;
    const record = entry as Record<string, unknown>;
    if (
      !isCanonicalSlug(record.slug)
      || (record.visibility !== 'public' && record.visibility !== 'hidden')
      || !validTimestamp(record.published_at)
      || (record.last_revised_at !== null && !validTimestamp(record.last_revised_at))
      || !validTimestamp(record.updated_at)
    ) return null;
    return {
      slug: record.slug,
      visibility: record.visibility,
      published_at: new Date(record.published_at).toISOString(),
      last_revised_at: record.last_revised_at === null
        ? null
        : new Date(record.last_revised_at).toISOString(),
      updated_at: new Date(record.updated_at).toISOString(),
    } satisfies LearnPublicationRecord;
  });
  return records.every((record) => record !== null) ? records as LearnPublicationRecord[] : null;
}

function validTimestamp(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}
