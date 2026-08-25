import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { SqliteD1 } from './lib/sqlite-d1.mjs';
import { handleBlog } from '../workers/feed-api/src/routes/blog.ts';
import { handleFeed } from '../workers/feed-api/src/routes/feed.ts';
import { refreshActivitySignals } from '../workers/feed-api/src/modules/activity-signals.ts';
import {
  BLOG_LEGACY_PUBLISHED_KEY,
  BLOG_LIFECYCLE_KEY,
  readPublishedBlogSlugs,
  reconcileBlogLifecycle,
  writeBlogLifecycle,
} from '../workers/feed-api/src/modules/blog-publications.ts';

class MemoryKv {
  values = new Map();
  failGetKeys = new Set();
  failPutKeys = new Set();

  async get(key, type) {
    if (this.failGetKeys.has(key)) throw new Error(`injected KV get failure: ${key}`);
    const value = this.values.get(key);
    if (value === undefined) return null;
    if (type === 'json') return typeof value === 'string' ? JSON.parse(value) : value;
    return value;
  }

  async put(key, value) {
    if (this.failPutKeys.has(key)) throw new Error(`injected KV put failure: ${key}`);
    this.values.set(key, value);
  }
}

const feedMigrationDirectory = path.join(
  path.dirname(path.resolve(fileURLToPath(import.meta.url))), '..', 'workers', 'feed-api', 'migrations');
const feedMigrations = await Promise.all(
  (await readdir(feedMigrationDirectory))
    .filter((name) => name.endsWith('.sql')).sort()
    .map(async (name) => readFile(path.join(feedMigrationDirectory, name), 'utf8')),
);

function createDatabase() {
  const database = new DatabaseSync(':memory:');
  for (const sql of feedMigrations) database.exec(sql);
  return database;
}

function timelineDatabase(rows) {
  const database = createDatabase();
  database.prepare(`INSERT INTO learn_publications (slug, visibility, published_at, updated_at)
    VALUES ('learn-visible', 'public', '2026-08-18T00:00:00.000Z', '2026-08-18T00:00:00.000Z')`).run();
  const insertPost = database.prepare(`INSERT INTO feed_posts (id, type, content, visibility, created_at, updated_at)
    VALUES (?, 'note', ?, 'public', ?, ?)`);
  const insertFootprint = database.prepare(`INSERT INTO public_footprints
    (id, source_module, source_ref, source_version, event_type, snapshot_json, occurred_at, visibility, idempotency_key, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'public', ?, ?)`);
  for (const row of rows) {
    if (row.kind === 'native_post') {
      insertPost.run(row.id, row.content, row.occurred_at, row.updated_at);
    } else {
      insertFootprint.run(row.id, row.source_module, row.source_ref, row.source_version,
        row.event_type, row.snapshot_json, row.occurred_at, `${row.id}:idempotency`, row.occurred_at);
    }
  }
  return new SqliteD1(database);
}

class ProjectionBucket {
  constructor(value) {
    this.value = value;
    this.putCount = 0;
  }

  async put(_key, value) {
    this.putCount += 1;
    this.value = value;
  }
}

function lifecycleEntry(slug, state) {
  return {
    slug,
    title: slug,
    summary: '',
    state,
    ever_published: state === 'published' || state === 'withdrawn',
  };
}

function createContext() {
  return { waitUntil() {}, passThroughOnException() {} };
}

function timelineRow({ id, kind = 'system_footprint', sourceModule = null, sourceRef = null, eventType = null }) {
  return {
    kind,
    id,
    occurred_at: '2026-08-18T00:00:00.000Z',
    visibility: 'public',
    type: kind === 'native_post' ? 'note' : null,
    content: kind === 'native_post' ? 'native' : null,
    media_json: null,
    link_url: null,
    link_title: null,
    link_summary: null,
    link_image: null,
    updated_at: kind === 'native_post' ? '2026-08-18T00:00:00.000Z' : null,
    source_module: sourceModule,
    source_ref: sourceRef,
    source_version: sourceModule ? 'v1' : null,
    event_type: eventType,
    snapshot_json: sourceModule ? JSON.stringify({ title: id }) : null,
  };
}

const conflictingKv = new MemoryKv();
conflictingKv.values.set(BLOG_LIFECYCLE_KEY, [
  lifecycleEntry('legacy-only', 'withdrawn'),
  lifecycleEntry('lifecycle-public', 'published'),
]);
conflictingKv.values.set(BLOG_LEGACY_PUBLISHED_KEY, ['legacy-only']);
assert.deepEqual(await readPublishedBlogSlugs({ AUTH_KV: conflictingKv }), ['lifecycle-public']);
assert.deepEqual(await handleBlog(
  new Request('https://api.test/api/blog/publications'),
  { AUTH_KV: conflictingKv },
  createContext(),
  '/api/blog/publications',
).then((response) => response.json()), { slugs: ['lifecycle-public'] }, 'lifecycle must win over a conflicting legacy mirror');

const emptyLifecycleKv = new MemoryKv();
emptyLifecycleKv.values.set(BLOG_LIFECYCLE_KEY, []);
emptyLifecycleKv.values.set(BLOG_LEGACY_PUBLISHED_KEY, ['must-not-reappear']);
assert.deepEqual(await readPublishedBlogSlugs({ AUTH_KV: emptyLifecycleKv }), [], 'present empty lifecycle is authoritative');

const bootstrapKv = new MemoryKv();
bootstrapKv.values.set(BLOG_LEGACY_PUBLISHED_KEY, ['legacy-bootstrap']);
assert.deepEqual(await readPublishedBlogSlugs({ AUTH_KV: bootstrapKv }), ['legacy-bootstrap'], 'legacy mirror is only a missing-lifecycle bootstrap fallback');

const malformedKv = new MemoryKv();
malformedKv.values.set(BLOG_LIFECYCLE_KEY, { entries: [] });
malformedKv.values.set(BLOG_LEGACY_PUBLISHED_KEY, ['must-not-mask-corruption']);
await assert.rejects(() => readPublishedBlogSlugs({ AUTH_KV: malformedKv }), /lifecycle manifest is invalid/);

const mirrorFailureKv = new MemoryKv();
mirrorFailureKv.values.set(BLOG_LEGACY_PUBLISHED_KEY, ['old-rollback-view']);
mirrorFailureKv.failPutKeys.add(BLOG_LEGACY_PUBLISHED_KEY);
const originalConsoleError = console.error;
console.error = () => {};
try {
  await writeBlogLifecycle({ AUTH_KV: mirrorFailureKv }, [lifecycleEntry('canonical-public', 'published')]);
} finally {
  console.error = originalConsoleError;
}
assert.deepEqual(JSON.parse(mirrorFailureKv.values.get(BLOG_LIFECYCLE_KEY)), [lifecycleEntry('canonical-public', 'published')]);
assert.deepEqual(mirrorFailureKv.values.get(BLOG_LEGACY_PUBLISHED_KEY), ['old-rollback-view'], 'legacy mirror failure must not roll back canonical lifecycle');

const absentIdentity = reconcileBlogLifecycle([
  lifecycleEntry('identity-post', 'withdrawn'),
], []);
assert.deepEqual(absentIdentity.first_publications, []);
assert.deepEqual(absentIdentity.entries, [{
  ...lifecycleEntry('identity-post', 'withdrawn'),
  source_present: false,
}], 'an ever-published withdrawn identity must survive source absence');

const reintroducedIdentity = reconcileBlogLifecycle(absentIdentity.entries, [{
  slug: 'identity-post',
  title: 'Reintroduced source',
  summary: 'Source frontmatter must not restore publication authority',
  state: 'published',
}]);
assert.deepEqual(reintroducedIdentity.first_publications, []);
assert.equal(reintroducedIdentity.entries[0].state, 'withdrawn', 'same-slug reintroduction must inherit runtime lifecycle state');
assert.equal(reintroducedIdentity.entries[0].ever_published, true);
assert.equal(reintroducedIdentity.entries[0].source_present, true);
assert.equal(reintroducedIdentity.entries[0].title, 'Reintroduced source', 'reintroduction may refresh source metadata without resetting lifecycle');

const removedDraft = reconcileBlogLifecycle([
  lifecycleEntry('never-published-draft', 'draft'),
], []);
assert.deepEqual(removedDraft.entries, [], 'never-published drafts do not need durable publication identity after source removal');

const tombstoneKv = new MemoryKv();
tombstoneKv.values.set(BLOG_LIFECYCLE_KEY, absentIdentity.entries);
tombstoneKv.values.set(BLOG_LEGACY_PUBLISHED_KEY, ['identity-post']);
assert.deepEqual(await readPublishedBlogSlugs({ AUTH_KV: tombstoneKv }), [], 'source-absent history must never project as public');
const tombstoneToken = crypto.randomUUID();
tombstoneKv.values.set(`session:${tombstoneToken}`, {
  username: 'contract-owner',
  expires_at: new Date(Date.now() + 60_000).toISOString(),
});
const tombstoneEnv = { AUTH_KV: tombstoneKv, DB: new SqliteD1(createDatabase()) };
const tombstoneHeaders = { Cookie: `token=${tombstoneToken}`, 'Content-Type': 'application/json' };
assert.deepEqual(await handleBlog(
  new Request('https://api.test/api/blog/admin/publications', { headers: tombstoneHeaders }),
  tombstoneEnv,
  createContext(),
  '/api/blog/admin/publications',
).then((response) => response.json()), { entries: [] }, 'source-absent identities must not appear as restorable admin entries');
assert.equal((await handleBlog(
  new Request('https://api.test/api/blog/admin/publications', {
    method: 'PATCH',
    headers: tombstoneHeaders,
    body: JSON.stringify({ slug: 'identity-post', state: 'published' }),
  }),
  tombstoneEnv,
  createContext(),
  '/api/blog/admin/publications',
)).status, 409, 'direct lifecycle mutation must not restore a source-absent identity');

tombstoneKv.values.set(BLOG_LIFECYCLE_KEY, reintroducedIdentity.entries);
assert.deepEqual(await readPublishedBlogSlugs({ AUTH_KV: tombstoneKv }), [], 'source reintroduction alone must not restore publication');
assert.equal((await handleBlog(
  new Request('https://api.test/api/blog/admin/publications', {
    method: 'PATCH',
    headers: tombstoneHeaders,
    body: JSON.stringify({ slug: 'identity-post', state: 'published' }),
  }),
  tombstoneEnv,
  createContext(),
  '/api/blog/admin/publications',
)).status, 200, 'explicit Owner Restore is legal again once the source is deployed');
assert.deepEqual(await readPublishedBlogSlugs({ AUTH_KV: tombstoneKv }), ['identity-post']);

const feedKv = new MemoryKv();
feedKv.failGetKeys.add(BLOG_LIFECYCLE_KEY);
const feedRows = [
  timelineRow({ id: '00000000-0000-4000-8000-000000000001', kind: 'native_post' }),
  timelineRow({ id: '00000000-0000-4000-8000-000000000002', sourceModule: 'blog', sourceRef: 'blog-public', eventType: 'blog_published' }),
  timelineRow({ id: '00000000-0000-4000-8000-000000000003', sourceModule: 'learn', sourceRef: 'learn-visible', eventType: 'learn_note_published' }),
  timelineRow({ id: '00000000-0000-4000-8000-000000000004', sourceModule: 'projects', sourceRef: 'project-1', eventType: 'project_updated' }),
];
console.error = () => {};
let publicFeed;
try {
  publicFeed = await handleFeed(
    new Request('https://api.test/api/feed?limit=20'),
    { AUTH_KV: feedKv, DB: timelineDatabase(feedRows) },
    createContext(),
    '/api/feed',
  );
} finally {
  console.error = originalConsoleError;
}
assert.equal(publicFeed.status, 200, 'Blog publication KV failure must not take down Public Feed');
const publicFeedBody = await publicFeed.json();
assert.deepEqual(publicFeedBody.items.map((entry) => entry.id).sort(), [
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000003',
  '00000000-0000-4000-8000-000000000004',
]);

const previousProjection = JSON.stringify({ schema_version: 1, signals: { blog: { state: 'stable' } } });
const projectionBucket = new ProjectionBucket(previousProjection);
await assert.rejects(() => refreshActivitySignals({
  AUTH_KV: feedKv,
  DB: {},
  HOME_PROJECTIONS: projectionBucket,
}), /injected KV get failure/);
assert.equal(projectionBucket.putCount, 0, 'Blog authority failure must abort activity projection refresh');
assert.equal(projectionBucket.value, previousProjection, 'activity projection failure must preserve the previous object');

console.log('Blog runtime authority convergence contract passed.');
