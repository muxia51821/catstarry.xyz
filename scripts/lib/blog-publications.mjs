import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

export async function readBlogPublicationEntries(root = 'src/data/blog') {
  const entries = [];
  for (const file of await walk(root)) {
    if (!/\.mdx?$/i.test(file)) continue;
    const source = await readFile(file, 'utf8');
    const frontmatter = parseFrontmatter(source, file);
    const state = frontmatter.state;
    if (!state) {
      throw new Error(`Blog file must declare lifecycle state: ${file}`);
    }
    if (!['draft', 'published', 'withdrawn'].includes(state)) {
      throw new Error(`Blog file has invalid lifecycle state: ${file}`);
    }
    const fallbackSlug = path.basename(file, path.extname(file));
    const slug = frontmatter.slug || fallbackSlug;
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      throw new Error(`Blog file has no valid slug: ${file}`);
    }
    if (!frontmatter.title || !frontmatter.description) {
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

function parseFrontmatter(source, file) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) throw new Error(`Blog file has no frontmatter: ${file}`);
  const fields = {};
  for (const line of match[1].split(/\r?\n/)) {
    const field = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*):\s*(.*?)\s*$/);
    if (!field) continue;
    fields[field[1]] = parseScalar(field[2]);
  }
  return fields;
}

function parseScalar(value) {
  if (value.startsWith('"') && value.endsWith('"')) {
    try { return JSON.parse(value); } catch { return value.slice(1, -1); }
  }
  if (value.startsWith("'") && value.endsWith("'")) return value.slice(1, -1).replace(/''/g, "'");
  return value;
}

async function walk(root) {
  const entries = await readdir(root, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const target = path.join(root, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  }));
  return nested.flat();
}
