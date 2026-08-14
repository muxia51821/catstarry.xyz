export interface LearnRelationEntry {
  slug: string;
  links: string[];
}

export function extractLearnWikilinkSlugs(markdown: string): string[] {
  return [...new Set(
    [...markdown.matchAll(/\[\[([a-z0-9]+(?:-[a-z0-9]+)*)(?:\|[^\]]+)?\]\]/g)]
      .map((match) => match[1]),
  )];
}

export function assertValidLearnPublicRelations(entries: LearnRelationEntry[]): void {
  const publicSlugs = new Set(entries.map((entry) => entry.slug));
  for (const entry of entries) {
    for (const target of entry.links) {
      if (!publicSlugs.has(target)) {
        throw new Error(`Broken public Learn relation: ${entry.slug} -> ${target}`);
      }
    }
  }
}
