import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { publishLearnDraft } from './lib/learn-local-publisher.mjs';

const root = await mkdtemp(path.join(os.tmpdir(), 'catstarry-learn-publish-'));
const learn = path.join(root, 'src', 'data', 'learn', 'programming');
await mkdir(learn, { recursive: true });
const draft = path.join(learn, 'draft-note.md');
const existingDate = path.join(learn, 'existing-date.md');
const published = path.join(learn, 'published-note.md');
const unrelated = path.join(root, 'unrelated.md');

try {
  await writeFile(draft, source('draft-note', 'draft'));
  await writeFile(existingDate, source('existing-date', 'draft', '2025-01-02T03:04:05.000Z'));
  await writeFile(published, source('published-note', 'published', '2025-01-02T03:04:05.000Z'));
  await writeFile(unrelated, 'state: draft');

  const result = await publishLearnDraft({ root, slug: 'draft-note', now: new Date('2026-08-13T01:02:03.000Z') });
  assert.deepEqual(result, { status: 200, slug: 'draft-note', state: 'published', publishedAt: '2026-08-13T01:02:03.000Z' });
  assert.match(await readFile(draft, 'utf8'), /state: published\npublishedAt: 2026-08-13T01:02:03\.000Z/);

  const existing = await publishLearnDraft({ root, slug: 'existing-date', now: new Date('2026-08-13T01:02:03.000Z') });
  assert.equal(existing.publishedAt, '2025-01-02T03:04:05.000Z');
  assert.match(await readFile(existingDate, 'utf8'), /publishedAt: 2025-01-02T03:04:05\.000Z/);

  const publishedBefore = await readFile(published, 'utf8');
  assert.deepEqual(await publishLearnDraft({ root, slug: 'published-note' }), { status: 409, error: 'Only a draft Learn note can be published.' });
  assert.equal(await readFile(published, 'utf8'), publishedBefore, 'non-draft publication must not alter source');

  for (const slug of ['../unrelated', 'draft-note.md', 'missing-note']) {
    const rejected = await publishLearnDraft({ root, slug });
    assert.ok([400, 404].includes(rejected.status), slug);
  }
  assert.equal(await readFile(unrelated, 'utf8'), 'state: draft');
  console.log('Learn local publication contract passed.');
} finally {
  await rm(root, { recursive: true, force: true });
}

function source(slug, state, publishedAt = '') {
  return `---\nslug: ${slug}\ntitle: "${slug}"\ntrack: programming\ntags: []\nstate: ${state}${publishedAt ? `\npublishedAt: ${publishedAt}` : ''}\n---\n\n# ${slug}\n`;
}
