import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

import { readBlogPublicationEntries } from './lib/blog-publications.mjs';

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
assert.equal(entries.some((entry) => entry.slug === 'draft-preview'), false);
assert.equal(new Set(entries.map((entry) => entry.slug)).size, entries.length);
assert.ok(entries.every((entry) => entry.title && entry.summary));

console.log('Blog publication manifest contract passed.');
