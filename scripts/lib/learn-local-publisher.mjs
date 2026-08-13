import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { readdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function publishLearnDraft({ root, slug, now = new Date() }) {
  if (!slugPattern.test(slug)) return { status: 400, error: 'Invalid Learn slug.' };
  const learnRoot = path.resolve(root, 'src', 'data', 'learn');
  const matches = await findLearnSources(learnRoot, slug);
  if (matches.length === 0) return { status: 404, error: 'Learn note not found.' };
  if (matches.length > 1) throw new Error(`Duplicate Learn slug: ${slug}`);
  const source = matches[0];

  const original = await readFile(source, 'utf8');
  const next = publishFrontmatter(original, now);
  if (next.status !== 200) return next;

  const temporary = `${source}.${randomBytes(8).toString('hex')}.tmp`;
  try {
    await writeFile(temporary, next.source, 'utf8');
    await rename(temporary, source);
  } finally {
    await rm(temporary, { force: true });
  }
  return { status: 200, slug, state: 'published', publishedAt: next.publishedAt };
}

export async function startLearnLocalPublisher({ root, token }) {
  const server = createServer(async (request, response) => {
    if (request.method !== 'POST' || request.url !== '/publish') {
      response.writeHead(404).end();
      return;
    }
    if (request.headers.authorization !== `Bearer ${token}`) {
      response.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' })
        .end(JSON.stringify({ error: 'Local publisher authentication required.' }));
      return;
    }
    let payload;
    try {
      payload = JSON.parse(await requestBody(request));
    } catch {
      response.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' })
        .end(JSON.stringify({ error: 'Invalid publish request.' }));
      return;
    }
    const result = await publishLearnDraft({ root, slug: payload?.slug });
    response.writeHead(result.status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
      .end(JSON.stringify(result));
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Local Learn publisher did not bind a TCP port.');
  return {
    origin: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

async function findLearnSources(learnRoot, slug) {
  const entries = await readdir(learnRoot, { withFileTypes: true });
  const matches = [];
  for (const entry of entries) {
    const target = path.join(learnRoot, entry.name);
    if (entry.isDirectory()) matches.push(...await findLearnSources(target, slug));
    if (!entry.isFile() || path.extname(entry.name) !== '.md') continue;
    const source = await readFile(target, 'utf8');
    if (frontmatterValue(source, 'slug') === slug) matches.push(target);
  }
  return matches;
}

function publishFrontmatter(source, now) {
  const match = source.match(/^(---\r?\n)([\s\S]*?)(\r?\n---\r?\n)/);
  if (!match) return { status: 422, error: 'Learn note has no YAML frontmatter.' };
  const frontmatter = match[2];
  if (frontmatterValue(source, 'state') !== 'draft') return { status: 409, error: 'Only a draft Learn note can be published.' };
  const newline = source.includes('\r\n') ? '\r\n' : '\n';
  const publishedAt = frontmatterValue(source, 'publishedAt') ?? now.toISOString();
  const withState = frontmatter.replace(/^state:\s*draft\s*$/m, 'state: published');
  const withPublishedAt = /^publishedAt:\s*/m.test(withState)
    ? withState
    : withState.replace(/^state: published\s*$/m, (line) => `${line}${newline}publishedAt: ${publishedAt}`);
  return {
    status: 200,
    source: `${match[1]}${withPublishedAt}${match[3]}${source.slice(match[0].length)}`,
    publishedAt,
  };
}

function frontmatterValue(source, key) {
  const match = source.match(new RegExp(`^${key}:\\s*(?:["']([^"']+)["']|([^\\s#]+))\\s*$`, 'm'));
  return match?.[1] ?? match?.[2] ?? null;
}

function requestBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.setEncoding('utf8');
    request.on('data', (chunk) => { body += chunk; });
    request.once('end', () => resolve(body));
    request.once('error', reject);
  });
}
