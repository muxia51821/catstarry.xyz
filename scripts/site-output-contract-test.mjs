import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const roots = ['dist/client', 'dist'].filter((candidate) => existsSync(candidate));
assert.ok(roots.length, 'Build output is missing. Run npm run build first.');

function outputPath(relative) {
  const found = roots.map((root) => path.join(root, relative)).find(existsSync);
  assert.ok(found, `Missing generated output: ${relative}`);
  return found;
}

function frontmatter(source) {
  const match = source.match(/^---\s*\r?\n([\s\S]*?)\r?\n---/);
  return match?.[1] ?? '';
}

function field(value, name) {
  return value.match(new RegExp(`^${name}:\\s*["']?([^"'\\r\\n]+)["']?\\s*$`, 'm'))?.[1].trim();
}

async function markdownFiles(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await markdownFiles(absolute));
    else if (/\.mdx?$/.test(entry.name)) result.push(absolute);
  }
  return result;
}

const home = await readFile(outputPath('index.html'), 'utf8');
for (const marker of ['class="journey"', 'id="planet-focus"', 'data-planet="learn"']) assert.match(home, new RegExp(marker));
assert.match(home, /data-home-manifest-url="\/activity-signals\.json"/);
const notFound = await readFile(outputPath('404.html'), 'utf8');
assert.match(notFound, /404 · LOST COORDINATE/);
assert.match(notFound, /href="\/"/);
const projects = await readFile(outputPath(path.join('projects', 'index.html')), 'utf8');
assert.doesNotMatch(projects, /截图待补|PROJECT PREVIEW/);

for (const [pathname, label] of [['learn/', 'Learn'], ['projects/', 'Projects']]) {
  const html = pathname === 'projects/' ? projects : await readFile(outputPath(path.join(pathname, 'index.html')), 'utf8');
  assert.match(
    html,
    /<a[^>]+class="[^"]*page-home-link[^"]*"[^>]+href="\/\?stage=overview"[^>]+aria-label="返回星图"[\s\S]*返回星图[\s\S]*<\/a>/,
    `${label} must provide the shared return-to-star-map link`,
  );
}
const blogArchiveSource = await readFile('src/components/blog/BlogArchive.astro', 'utf8');
assert.match(blogArchiveSource, /href=\{STAR_MAP_DESTINATION\}/, 'Blog must provide the shared return-to-star-map link');

const blogSources = await markdownFiles('src/data/blog');
const learnSources = await markdownFiles('src/data/learn');
const publishedBlog = [];
const draftSlugs = [];
for (const filename of blogSources) {
  const meta = frontmatter(await readFile(filename, 'utf8'));
  const slug = field(meta, 'slug') ?? path.basename(filename).replace(/\.mdx?$/, '');
  const state = field(meta, 'state');
  assert.ok(['draft', 'published', 'withdrawn'].includes(state), `${filename} needs an explicit Blog lifecycle state`);
  if (state === 'published') publishedBlog.push(`/blog/${slug}/`);
  else draftSlugs.push(`/blog/${slug}/`);
}
const routedLearn = [];
const publishedLearn = [];
for (const filename of learnSources) {
  const meta = frontmatter(await readFile(filename, 'utf8'));
  const slug = field(meta, 'slug');
  assert.ok(slug, `${filename} needs a stable slug`);
  const explicitState = field(meta, 'state');
  const legacyState = /^draft:\s*false\s*$/m.test(meta) ? 'published' : 'draft';
  const state = explicitState ?? legacyState;
  if (state === 'published') {
    publishedLearn.push(`/learn/notes/${slug}/`);
    routedLearn.push(`/learn/notes/${slug}/`);
  } else if (state === 'withdrawn') {
    routedLearn.push(`/learn/notes/${slug}/`);
    draftSlugs.push(`/learn/notes/${slug}/`);
  } else draftSlugs.push(`/learn/notes/${slug}/`);
}

for (const pathname of routedLearn) {
  const htmlPath = outputPath(path.join(pathname.slice(1), 'index.html'));
  const html = await readFile(htmlPath, 'utf8');
  assert.match(html, /<link[^>]+rel="canonical"|<meta[^>]+property="og:url"/, `${pathname} needs canonical metadata`);
}

const robots = await readFile(outputPath('robots.txt'), 'utf8');
assert.match(robots, /Sitemap: https:\/\/catstarry\.xyz\/sitemap\.xml/);
for (const pathname of publishedLearn) assert.ok(routedLearn.includes(pathname));
const sitemapSource = await readFile('src/pages/sitemap.xml.ts', 'utf8');
const rssSource = await readFile('src/pages/blog/rss.xml.ts', 'utf8');
assert.match(sitemapSource, /filterPublishedBlogPosts/);
assert.match(rssSource, /filterPublishedBlogPosts/);

console.log('Generated site output contracts passed.');
