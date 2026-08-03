import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

export function slugifyTitle(title, translation = '') {
  const source = translation.trim() || title.trim();
  if (!source) throw new Error('Title is required');
  const ascii = source
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
  if (ascii) return ascii;
  const digest = createHash('sha256').update(source).digest('hex').slice(0, 10);
  return `note-${digest}`;
}

export async function uniqueLearnSlug(baseSlug, root = 'src/data/learn') {
  const existing = new Set();
  for (const file of await walk(root)) {
    if (!/\.md$/.test(file)) continue;
    const source = await readFile(file, 'utf8');
    const slug = source.match(/^slug:\s*["']?([a-z0-9-]+)["']?\s*$/m)?.[1];
    if (slug) existing.add(slug);
  }
  if (!existing.has(baseSlug)) return baseSlug;
  let suffix = 2;
  while (existing.has(`${baseSlug}-${suffix}`)) suffix += 1;
  return `${baseSlug}-${suffix}`;
}

export function lessonHtmlToMarkdown(html) {
  let source = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '');
  const interactive = [];
  source = source.replace(/<([a-z0-9-]+)\b[^>]*(?:data-interactive|class=["'][^"']*(?:quiz|simulator|interactive)[^"']*)[^>]*>[\s\S]*?<\/\1>/gi, (match) => {
    const type = match.match(/data-interactive=["']([^"']+)["']/i)?.[1] ?? 'interactive';
    const token = `\n\n<!-- INTERACTIVE: ${type} -->\n\n`;
    interactive.push(token);
    return `@@INTERACTIVE_${interactive.length - 1}@@`;
  });
  const codeBlocks = [];
  source = source.replace(/<pre\b[^>]*>\s*<code\b([^>]*)>([\s\S]*?)<\/code>\s*<\/pre>/gi, (_, attributes, code) => {
    const language = attributes.match(/class=["'][^"']*language-([a-z0-9-]+)/i)?.[1] ?? '';
    const token = `@@CODE_BLOCK_${codeBlocks.length}@@`;
    codeBlocks.push(`\n\n\`\`\`${language}\n${decodeHtml(code).replace(/^\n|\n$/g, '')}\n\`\`\`\n\n`);
    return token;
  });
  source = source
    .replace(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi, '\n\n# $1\n\n')
    .replace(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi, '\n\n## $1\n\n')
    .replace(/<h3\b[^>]*>([\s\S]*?)<\/h3>/gi, '\n\n### $1\n\n')
    .replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, '\n- $1')
    .replace(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)')
    .replace(/<img\b[^>]*src=["']([^"']+)["'][^>]*alt=["']([^"']*)["'][^>]*\/?\s*>/gi, '![$2]($1)')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/(?:p|div|section|article|ul|ol)>/gi, '\n\n')
    .replace(/<(?:p|div|section|article|ul|ol)\b[^>]*>/gi, '')
    .replace(/<[^>]+>/g, '');
  source = decodeHtml(source)
    .replace(/@@CODE_BLOCK_(\d+)@@/g, (_, index) => codeBlocks[Number(index)])
    .replace(/@@INTERACTIVE_(\d+)@@/g, (_, index) => interactive[Number(index)])
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return { markdown: `${source}\n`, interactiveCount: interactive.length };
}

function decodeHtml(value) {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ');
}

async function walk(root) {
  try {
    const entries = await readdir(root, { withFileTypes: true });
    const nested = await Promise.all(entries.map((entry) => {
      const target = path.join(root, entry.name);
      return entry.isDirectory() ? walk(target) : [target];
    }));
    return nested.flat();
  } catch (error) {
    if (error?.code === 'ENOENT') return [];
    throw error;
  }
}
