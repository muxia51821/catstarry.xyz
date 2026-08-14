import type { CollectionEntry } from 'astro:content';
import {
  assertValidLearnPublicRelations,
  extractLearnWikilinkSlugs,
} from '../../../shared/learn-relations';

export interface TrackDefinition {
  slug: string;
  name: string;
  description: string;
}

export const TRACK_CATALOG: readonly TrackDefinition[] = [
  { slug: 'programming', name: 'Programming', description: '围绕程序、系统与工具形成可长期复用的知识。' },
  { slug: 'finance', name: 'Finance', description: '记录金融、投资与决策中的稳定知识。' },
  { slug: 'art', name: 'Art', description: '整理观察、创作与视觉训练形成的 durable knowledge。' },
  { slug: 'english', name: 'English', description: '沉淀语言输入、表达与长期积累的方法。' },
  // Transitional declaration while historical destinations remain gated by MR-08.
  { slug: 'typing', name: 'Typing', description: '让输入更稳定、更准确。' },
];

export type LearnEntry = CollectionEntry<'learn'>;
export type LearnLifecycleState = 'hidden' | 'public' | 'superseded' | 'withdrawn';

export interface LearnNote {
  slug: string;
  title: string;
  track: string;
  section?: string;
  tags: string[];
  state: LearnLifecycleState;
  publishedAt?: string;
  revisedAt?: string;
  excerpt: string;
  links: string[];
}

export interface LearnRelation {
  source: string;
  target: string;
}

export function noteFromEntry(entry: LearnEntry): LearnNote {
  const sourceState = entry.data.state;
  const state: LearnLifecycleState = sourceState === 'withdrawn' || sourceState === 'superseded'
    ? sourceState
    : 'hidden';
  const publishedAt = sourceState === 'withdrawn'
    ? entry.data.publishedAt ?? entry.data.publishDate
    : undefined;
  return {
    slug: entry.data.slug,
    title: entry.data.title,
    track: entry.data.track,
    section: entry.data.section,
    tags: entry.data.tags,
    state,
    publishedAt: publishedAt?.toISOString(),
    revisedAt: entry.data.revisedAt?.toISOString(),
    excerpt: entry.data.excerpt ?? plainExcerpt(entry.body ?? ''),
    links: extractLearnWikilinkSlugs(entry.body ?? ''),
  };
}

export function getPublishedNotes(entries: LearnEntry[] | LearnNote[]) {
  const published = entries
    .map((entry) => 'data' in entry ? noteFromEntry(entry as LearnEntry) : entry as LearnNote)
    .filter((note) => note.state === 'public')
    .sort(compareNotesByTitle);
  assertValidPublicRelations(published);
  return published;
}

export function assertValidPublicRelations(notes: LearnNote[]) {
  assertValidLearnPublicRelations(notes);
}

export function getTrackDefinition(slug: string) {
  const track = TRACK_CATALOG.find((candidate) => candidate.slug === slug);
  if (!track) throw new Error(`Undeclared Learn Track: ${slug}`);
  return track;
}

export function getActiveTracks(notes: LearnNote[]) {
  const activeSlugs = [...new Set(notes.map((note) => note.track))];
  activeSlugs.forEach(getTrackDefinition);
  return TRACK_CATALOG.filter((track) => activeSlugs.includes(track.slug));
}

export function getTrackNotes(notes: LearnNote[], trackSlug: string) {
  getTrackDefinition(trackSlug);
  return notes.filter((note) => note.track === trackSlug).sort(compareNotesByTitle);
}

export function getTrackSections(notes: LearnNote[]) {
  return [...new Set(notes.map((note) => note.section).filter((section): section is string => Boolean(section)))]
    .sort((a, b) => a.localeCompare(b, 'zh-CN'));
}

export function getNormalizedRelations(notes: LearnNote[]): LearnRelation[] {
  const known = new Set(notes.map((note) => note.slug));
  const relations = new Map<string, LearnRelation>();
  for (const note of notes) {
    for (const target of note.links) {
      if (!known.has(target) || target === note.slug) continue;
      const [source, destination] = [note.slug, target].sort();
      relations.set(`${source}\u0000${destination}`, { source, target: destination });
    }
  }
  return [...relations.values()].sort((a, b) =>
    `${a.source}:${a.target}`.localeCompare(`${b.source}:${b.target}`, 'en'),
  );
}

export function getRelatedNotes(note: LearnNote, notes: LearnNote[]) {
  const relatedSlugs = new Set<string>();
  for (const relation of getNormalizedRelations(notes)) {
    if (relation.source === note.slug) relatedSlugs.add(relation.target);
    if (relation.target === note.slug) relatedSlugs.add(relation.source);
  }
  return notes.filter((candidate) => relatedSlugs.has(candidate.slug)).sort(compareNotesByTitle);
}

export function getRecentKnowledge(notes: LearnNote[], limit = 5) {
  return [...notes]
    .sort((a, b) => Date.parse(b.revisedAt ?? b.publishedAt ?? '1970-01-01')
      - Date.parse(a.revisedAt ?? a.publishedAt ?? '1970-01-01'))
    .slice(0, limit);
}

export function formatLearnDate(value: string) {
  return new Date(value).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Shanghai',
  });
}

export function formatLearnShortDate(value: string) {
  return new Date(value).toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Shanghai',
  }).replaceAll('/', '.');
}

export function lifecycleLabel(state: LearnLifecycleState) {
  return state[0].toUpperCase() + state.slice(1);
}

function compareNotesByTitle(a: LearnNote, b: LearnNote) {
  return a.title.localeCompare(b.title, 'zh-CN');
}

function plainExcerpt(markdown: string): string {
  return markdown
    .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_match, slug: string, label?: string) => label ?? slug)
    .replace(/<[^>]+>/g, '')
    .replace(/[#*_`>\[\]()!-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180);
}
