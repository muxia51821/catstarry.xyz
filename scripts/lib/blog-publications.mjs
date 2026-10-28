import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseFrontmatter } from '@astrojs/markdown-remark';

export async function readBlogPublicationEntries(root = 'src/data/blog') {
  const entries = [];
  for (const file of await walk(root)) {
    if (!/\.mdx?$/i.test(file)) continue;
    const source = await readFile(file, 'utf8');
    const { frontmatter, rawFrontmatter } = parseFrontmatter(source);
    if (!rawFrontmatter) throw new Error(`Blog file has no frontmatter: ${file}`);
    const state = frontmatter.state;
    if (!state) {
      throw new Error(`Blog file must declare lifecycle state: ${file}`);
    }
    if (!['draft', 'published', 'withdrawn'].includes(state)) {
      throw new Error(`Blog file has invalid lifecycle state: ${file}`);
    }
    const fallbackSlug = path.basename(file, path.extname(file));
    const slug = frontmatter.slug || fallbackSlug;
    if (typeof slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      throw new Error(`Blog file has no valid slug: ${file}`);
    }
    if (typeof frontmatter.title !== 'string' || !frontmatter.title
      || typeof frontmatter.description !== 'string' || !frontmatter.description) {
      throw new Error(`Blog file needs title and description: ${file}`);
    }
    entries.push({ slug, title: frontmatter.title, summary: frontmatter.description, state });
  }
  entries.sort((a, b) => a.slug.localeCompare(b.slug));
  if (new Set(entries.map((entry) => entry.slug)).size !== entries.length) {
    throw new Error('Published Blog slugs must be unique');
  }
  return entries;
}

export function assertBlogProductionTransition(publicSlugs, candidateEntries) {
  const candidateSlugs = new Set(candidateEntries.map((entry) => entry.slug));
  for (const slug of [...new Set(publicSlugs)].sort()) {
    if (!candidateSlugs.has(slug)) {
      throw new Error(`Production Blog published source would disappear from candidate deployment: ${slug}`);
    }
  }
}

async function walk(root) {
  const entries = await readdir(root, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const target = path.join(root, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  }));
  return nested.flat();
}
