import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { readBlogPublicationEntries } from './lib/blog-publications.mjs';
import { readLearnPublicationEntries } from './lib/learn-publications.mjs';

for (const script of ['scripts/blog-publication-manifest.mjs', 'scripts/learn-publication-manifest.mjs']) {
  const result = spawnSync(process.execPath, [script], {
    encoding: 'utf8',
    env: {
      ...process.env,
      DEPLOYMENT_ENVIRONMENT: 'production',
      DEPLOYMENT_STATUS: 'success',
      FEED_API_URL: 'https://attacker.invalid',
      FOOTPRINT_INGEST_TOKEN: 'must-not-be-sent',
    },
  });
  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}${result.stderr}`, /must be exactly https:\/\/catstarry\.xyz/);
}

const entries = await readBlogPublicationEntries();
assert.ok(entries.length > 0);
assert.equal(entries.find((entry) => entry.slug === 'draft-preview')?.state, 'draft');
assert.ok(entries.some((entry) => entry.state === 'published'));
assert.equal(new Set(entries.map((entry) => entry.slug)).size, entries.length);
assert.ok(entries.every((entry) => entry.title && entry.summary && ['draft', 'published', 'withdrawn'].includes(entry.state)));

const missingStateRoot = await mkdtemp(path.join(os.tmpdir(), 'catstarry-blog-state-'));
try {
  await writeFile(path.join(missingStateRoot, 'missing-state.md'), `---\ntitle: Missing state\ndate: 2026-08-13\ncategory: tech\ndescription: Must fail\ndraft: false\n---\n`, 'utf8');
  await assert.rejects(
    readBlogPublicationEntries(missingStateRoot),
    /must declare lifecycle state/,
  );
} finally {
  await rm(missingStateRoot, { recursive: true, force: true });
}

const learnEntries = await readLearnPublicationEntries();
// A corpus transition can intentionally leave no published Learn Notes.
// The production manifest represents the resulting public set, including [] .
assert.equal(learnEntries.some((entry) => entry.slug === 'domain-dns-http'), false);
assert.ok(learnEntries.every((entry) => entry.title && entry.published_at));
assert.equal(new Set(learnEntries.map((entry) => entry.slug)).size, learnEntries.length);

console.log('Blog publication manifest contract passed.');
