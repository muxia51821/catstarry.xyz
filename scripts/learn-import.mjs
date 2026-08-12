import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { lessonHtmlToMarkdown, slugifyTitle, uniqueLearnSlug } from './lib/learn-authoring.mjs';

const options = parseArgs(process.argv.slice(2));
for (const required of ['input', 'track']) if (!options[required]) throw new Error(`--${required} is required`);
const html = await readFile(options.input, 'utf8');
const htmlTitle = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]
  ?? html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
const title = (options.title ?? htmlTitle ?? '').replace(/<[^>]+>/g, '').trim();
if (!title) throw new Error('A title is required via --title or lesson HTML');
const baseSlug = options.slug ?? slugifyTitle(title, options.translation ?? '');
const slug = await uniqueLearnSlug(baseSlug);
const { markdown, interactiveCount } = lessonHtmlToMarkdown(html);
const outputDir = path.join('src/data/learn', options.track);
const output = path.join(outputDir, `${slug}.md`);
const tags = (options.tags ?? '').split(',').map((tag) => tag.trim()).filter(Boolean);
const frontmatter = [
  '---',
  `slug: ${slug}`,
  `title: ${JSON.stringify(title)}`,
  `track: ${options.track}`,
  `tags: ${JSON.stringify(tags)}`,
  'state: draft',
  `excerpt: ${JSON.stringify(options.excerpt ?? '')}`,
  '---',
  '',
].join('\n');
await mkdir(outputDir, { recursive: true });
await writeFile(output, `${frontmatter}${markdown}`, { encoding: 'utf8', flag: 'wx' });
console.log(JSON.stringify({ output, slug, state: 'draft', interactiveCount }, null, 2));

function parseArgs(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 1) {
    const key = args[index];
    if (!key.startsWith('--')) throw new Error(`Unexpected argument: ${key}`);
    const value = args[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`${key} requires a value`);
    options[key.slice(2)] = value;
    index += 1;
  }
  return options;
}
