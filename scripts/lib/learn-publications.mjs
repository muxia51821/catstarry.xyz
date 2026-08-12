import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

export async function readLearnPublicationEntries(root = 'src/data/learn') {
  const entries = [];
  for (const file of await walk(root)) {
    if (!file.endsWith('.md')) continue;
    const source = await readFile(file, 'utf8');
    const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
    const state = scalar(frontmatter, 'state') ?? (scalar(frontmatter, 'draft') === 'false' ? 'published' : 'draft');
    if (state !== 'published') continue;
    const slug = scalar(frontmatter, 'slug');
    const title = scalar(frontmatter, 'title');
    const excerpt = scalar(frontmatter, 'excerpt') ?? '';
    const publishedAt = scalar(frontmatter, 'publishedAt') ?? scalar(frontmatter, 'publishDate');
    const revisedAt = scalar(frontmatter, 'revisedAt');
    if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !title || !publishedAt) {
      throw new Error(`Published Learn file has invalid lifecycle metadata: ${file}`);
    }
    entries.push({
      slug,
      title,
      excerpt,
      published_at: new Date(publishedAt).toISOString(),
      revised_at: revisedAt ? new Date(revisedAt).toISOString() : null,
    });
  }
  entries.sort((a, b) => a.slug.localeCompare(b.slug));
  if (new Set(entries.map((entry) => entry.slug)).size !== entries.length) {
    throw new Error('Published Learn slugs must be unique');
  }
  return entries;
}

function scalar(frontmatter, key) {
  const value = frontmatter.match(new RegExp(`^${key}:\\s*(.+?)\\s*$`, 'm'))?.[1];
  if (!value) return undefined;
  return value.replace(/^['"]|['"]$/g, '');
}

async function walk(root) {
  const entries = await readdir(root, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const target = path.join(root, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  }));
  return nested.flat();
}
