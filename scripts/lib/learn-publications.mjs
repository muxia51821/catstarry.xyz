import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseFrontmatter } from '@astrojs/markdown-remark';
import { assertValidLearnPublicRelations, extractLearnWikilinkSlugs } from '../../shared/learn-relations.ts';
import { formatLearnTitle } from '../../shared/learn-title.mjs';

export async function readLearnPublicationEntries(root = 'src/data/learn') {
  const entries = [];
  for (const file of await walk(root)) {
    if (!file.endsWith('.md')) continue;
    const source = await readFile(file, 'utf8');
    const { frontmatter } = parseFrontmatter(source);
    const { state, slug, title, subtitle, excerpt = '', revisedAt } = frontmatter;
    if (state === 'withdrawn' || state === 'superseded') continue;
    if (typeof slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
      || typeof title !== 'string' || !title
      || (subtitle !== undefined && typeof subtitle !== 'string')
      || typeof excerpt !== 'string') {
      throw new Error(`Learn file has invalid deployment metadata: ${file}`);
    }
    entries.push({
      slug,
      title: formatLearnTitle({ title, subtitle }),
      excerpt,
      revised_at: revisedAt ? new Date(revisedAt).toISOString() : null,
      links: extractLearnWikilinkSlugs(source),
    });
  }
  entries.sort((a, b) => a.slug.localeCompare(b.slug));
  if (new Set(entries.map((entry) => entry.slug)).size !== entries.length) {
    throw new Error('Published Learn slugs must be unique');
  }
  return entries;
}

export function assertLearnProductionTransition(publicSlugs, candidateEntries) {
  const candidatesBySlug = new Map(candidateEntries.map((entry) => [entry.slug, entry]));
  const publicEntries = [...new Set(publicSlugs)].sort().map((slug) => {
    const candidate = candidatesBySlug.get(slug);
    if (!candidate) {
      throw new Error(`Production Learn public note would disappear from candidate deployment: ${slug}`);
    }
    return { slug: candidate.slug, links: candidate.links };
  });
  assertValidLearnPublicRelations(publicEntries);
}

async function walk(root) {
  const entries = await readdir(root, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const target = path.join(root, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  }));
  return nested.flat();
}
