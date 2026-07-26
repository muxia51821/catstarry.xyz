import type { CollectionEntry } from 'astro:content';

export interface TrackDefinition {
  slug: string;
  name: string;
  description: string;
}

export const TRACK_CATALOG: readonly TrackDefinition[] = [
  { slug: 'programming', name: '编程', description: '语言、框架与工具的实践笔记。' },
  { slug: 'english', name: '英语', description: '输入、表达与长期积累的方法。' },
  { slug: 'typing', name: '打字', description: '让输入更稳定、更准确。' },
  { slug: 'art', name: '艺术', description: '观察、创作与视觉训练。' },
  { slug: 'finance', name: '金融', description: '投资、理财与决策记录。' },
];

export type LearnEntry = CollectionEntry<'learn'>;

export interface LearnNote {
  slug: string;
  title: string;
  track: string;
  section?: string;
  tags: string[];
  draft: boolean;
  publishDate: string;
  lastModified: string;
  excerpt: string;
  completionId?: string;
  parentSlug?: string;
  sourceUrl?: string;
  links: string[];
}

export function noteFromEntry(entry: LearnEntry): LearnNote {
  return {
    slug: entry.data.slug,
    title: entry.data.title,
    track: entry.data.track,
    section: entry.data.section,
    tags: entry.data.tags,
    draft: entry.data.draft,
    publishDate: entry.data.publishDate.toISOString(),
    lastModified: entry.data.lastModified.toISOString(),
    excerpt: entry.data.excerpt ?? plainExcerpt(entry.body ?? ''),
    completionId: entry.data.completionId,
    parentSlug: entry.data.parentSlug,
    sourceUrl: entry.data.sourceUrl,
    links: [...(entry.body ?? '').matchAll(/\[\[([a-z0-9]+(?:-[a-z0-9]+)*)(?:\|[^\]]+)?\]\]/g)]
      .map((match) => match[1]),
  };
}

export function getPublishedNotes(entries: LearnEntry[] | LearnNote[]) {
  return entries
    .map((entry) => 'data' in entry ? noteFromEntry(entry as LearnEntry) : entry as LearnNote)
    .filter((note) => !note.draft)
    .sort((a, b) => Date.parse(b.lastModified) - Date.parse(a.lastModified));
}

export function getTrackDefinition(slug: string) {
  return TRACK_CATALOG.find((track) => track.slug === slug) ?? {
    slug,
    name: slug,
    description: '尚未填写轨道说明。',
  };
}

export function getActiveTracks(notes: LearnNote[]) {
  const activeSlugs = [...new Set(notes.map((note) => note.track))];
  const known = TRACK_CATALOG.filter((track) => activeSlugs.includes(track.slug));
  const additional = activeSlugs
    .filter((slug) => !TRACK_CATALOG.some((track) => track.slug === slug))
    .map((slug) => getTrackDefinition(slug));
  return [...known, ...additional];
}

export function getTrackNotes(notes: LearnNote[], trackSlug: string) {
  return notes.filter((note) => note.track === trackSlug);
}

export function getTrackSections(notes: LearnNote[]) {
  return [...new Set(notes.map((note) => note.section).filter((section): section is string => Boolean(section)))];
}

export function formatLearnDate(value: string) {
  return new Date(value).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Shanghai',
  });
}

export interface LearnTreeRow {
  note: LearnNote;
  depth: number;
}

export function getTreeRows(notes: LearnNote[]) {
  const rows: LearnTreeRow[] = [];
  const byParent = new Map<string | undefined, LearnNote[]>();
  for (const note of notes) {
    const siblings = byParent.get(note.parentSlug) ?? [];
    siblings.push(note);
    byParent.set(note.parentSlug, siblings);
  }

  const visited = new Set<string>();
  const visit = (parentSlug: string | undefined, depth: number) => {
    for (const note of byParent.get(parentSlug) ?? []) {
      if (visited.has(note.slug)) continue;
      visited.add(note.slug);
      rows.push({ note, depth });
      visit(note.slug, depth + 1);
    }
  };
  visit(undefined, 0);
  for (const note of notes) if (!visited.has(note.slug)) rows.push({ note, depth: 0 });
  return rows;
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
