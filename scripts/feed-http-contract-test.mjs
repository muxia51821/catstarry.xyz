import assert from 'node:assert/strict';

import worker from '../workers/feed-api/src/index.ts';

class MemoryKv {
  values = new Map();

  async get(key, type) {
    const value = this.values.get(key);
    if (value === undefined) return null;
    if (type === 'json') return typeof value === 'string' ? JSON.parse(value) : value;
    return value;
  }

  async put(key, value) {
    this.values.set(key, value);
  }

  async delete(key) {
    this.values.delete(key);
  }
}

class MemoryMediaBucket {
  objects = new Map();
  failPut = false;
  failDelete = false;

  async put(key, value, options = {}) {
    if (this.failPut) throw new Error('injected R2 put failure');
    const bytes = new Uint8Array(await new Response(value).arrayBuffer());
    this.objects.set(key, { bytes, httpMetadata: options.httpMetadata ?? {} });
  }

  async head(key) {
    return this.objects.has(key) ? { key } : null;
  }

  async get(key) {
    const object = this.objects.get(key);
    if (!object) return null;
    return {
      body: new Response(object.bytes).body,
      httpEtag: '"media-contract"',
      writeHttpMetadata(headers) {
        if (object.httpMetadata.contentType) headers.set('Content-Type', object.httpMetadata.contentType);
      },
    };
  }

  async delete(key) {
    if (this.failDelete) throw new Error('injected R2 delete failure');
    this.objects.delete(key);
  }

  async list() {
    return { objects: [], truncated: false };
  }
}

class MemoryD1 {
  footprints = new Map();
  viewVisitors = new Set();
  viewCounts = new Map();

  prepare(sql) {
    return new MemoryStatement(this, sql);
  }
}

class MemoryStatement {
  constructor(database, sql) {
    this.database = database;
    this.sql = sql.replace(/\s+/g, ' ').trim();
    this.values = [];
  }

  bind(...values) {
    this.values = values;
    return this;
  }

  async run() {
    if (this.sql.startsWith('INSERT OR IGNORE INTO public_footprints')) {
      const [id, sourceModule, sourceRef, sourceVersion, eventType, snapshotJson, occurredAt, idempotencyKey] = this.values;
      if (this.database.footprints.has(idempotencyKey)) return { meta: { changes: 0 } };
      this.database.footprints.set(idempotencyKey, {
        id,
        source_module: sourceModule,
        source_ref: sourceRef,
        source_version: sourceVersion,
        event_type: eventType,
        snapshot_json: snapshotJson,
        occurred_at: occurredAt,
        visibility: 'public',
      });
      return { meta: { changes: 1 } };
    }
    if (this.sql.startsWith('INSERT OR IGNORE INTO blog_view_visitors')) {
      const key = this.values.join(':');
      if (this.database.viewVisitors.has(key)) return { meta: { changes: 0 } };
      this.database.viewVisitors.add(key);
      const [slug, viewDate] = this.values;
      const countKey = `${slug}:${viewDate}`;
      this.database.viewCounts.set(countKey, (this.database.viewCounts.get(countKey) ?? 0) + 1);
      return { meta: { changes: 1 } };
    }
    throw new Error(`Unhandled D1 run: ${this.sql}`);
  }

  async first() {
    if (this.sql.includes('FROM public_footprints WHERE idempotency_key = ?')) {
      return this.database.footprints.get(this.values[0]) ?? null;
    }
    if (this.sql.includes('FROM feed_posts') || this.sql.includes('FROM public_footprints')) return null;
    if (this.sql.includes('SUM(count)') && this.sql.includes('WHERE slug = ?')) {
      return { count: totalForSlug(this.database.viewCounts, this.values[0]) };
    }
    throw new Error(`Unhandled D1 first: ${this.sql}`);
  }

  async all() {
    if (this.sql.includes('MAX(created_at) AS latest_at') && this.sql.includes('FROM feed_posts')) {
      return { results: [] };
    }
    if (this.sql.includes('MAX(occurred_at) AS latest_at') && this.sql.includes('FROM public_footprints')) {
      const latest = new Map();
      for (const footprint of this.database.footprints.values()) {
        const current = latest.get(footprint.source_module);
        if (!current || footprint.occurred_at > current) latest.set(footprint.source_module, footprint.occurred_at);
      }
      return { results: [...latest].map(([source_module, latest_at]) => ({ source_module, latest_at })) };
    }
    if (this.sql.includes('SUM(count)') && this.sql.includes('slug IN')) {
      return {
        results: this.values.map((slug) => ({
          slug,
          count: totalForSlug(this.database.viewCounts, slug),
        })).filter(({ count }) => count > 0),
      };
    }
    if (this.sql.includes('json_each')) return { results: [] };
    throw new Error(`Unhandled D1 all: ${this.sql}`);
  }
}

function totalForSlug(counts, slug) {
  let total = 0;
  for (const [key, count] of counts) {
    if (key.startsWith(`${slug}:`)) total += count;
  }
  return total;
}

function createContext() {
  const background = [];
  return {
    waitUntil(promise) {
      background.push(Promise.resolve(promise));
    },
    passThroughOnException() {},
    async settled() {
      await Promise.all(background);
    },
  };
}

class MemoryProjectionBucket {
  value = null;
  uploaded = null;
  httpMetadata = {};

  async get() {
    if (this.value === null || this.uploaded === null) return null;
    const value = this.value;
    const metadata = this.httpMetadata;
    return {
      body: new Response(value).body,
      uploaded: this.uploaded,
      httpEtag: '"activity-signals-contract"',
      writeHttpMetadata(headers) {
        if (metadata.contentType) headers.set('Content-Type', metadata.contentType);
        if (metadata.cacheControl) headers.set('Cache-Control', metadata.cacheControl);
      },
    };
  }

  async put(_key, value, options = {}) {
    this.value = typeof value === 'string' ? value : await new Response(value).text();
    this.uploaded = new Date();
    this.httpMetadata = options.httpMetadata ?? {};
  }
}

function createEnv() {
  return {
    DB: new MemoryD1(),
    VIEW_KV: new MemoryKv(),
    AUTH_KV: new MemoryKv(),
    MEDIA_BUCKET: new MemoryMediaBucket(),
    HOME_PROJECTIONS: new MemoryProjectionBucket(),
    FOOTPRINT_INGEST_TOKEN: 'isolated-contract-token',
  };
}

async function fetchWorker(env, input, init) {
  const context = createContext();
  const response = await worker.fetch(new Request(input, init), env, context);
  await context.settled();
  return response;
}

const env = createEnv();
const candidate = {
  source_module: 'blog',
  source_ref: 'contract-post',
  source_version: 'publication-contract-v1',
  event_type: 'blog_published',
  snapshot_json: JSON.stringify({ title: 'Contract post', link: '/blog/contract-post/' }),
  occurred_at: '2026-07-25T00:00:00.000Z',
  idempotency_key: 'blog:contract-post:publication-contract-v1',
};

const stagingOriginEnv = createEnv();
stagingOriginEnv.SITE_ORIGIN = 'https://staging.catstarry.xyz';
assert.equal((await fetchWorker(stagingOriginEnv, 'https://api.test/api/auth/login', {
  method: 'POST',
  headers: { Origin: 'https://catstarry.xyz', 'Content-Type': 'application/json' },
  body: '{}',
})).status, 403, 'configured staging Worker must reject the production Origin');
assert.equal((await fetchWorker(stagingOriginEnv, 'https://api.test/api/auth/login', {
  method: 'POST',
  headers: { Origin: 'https://staging.catstarry.xyz', 'Content-Type': 'application/json' },
  body: '{}',
})).status, 400, 'configured staging Origin must reach request validation');

const projectionEnv = createEnv();
await projectionEnv.HOME_PROJECTIONS.put('activity-signals.json', JSON.stringify({
  schema_version: 1,
  signals: {
    blog: { state: 'active' },
    feed: { state: 'stable' },
    learn: { state: 'dormant' },
    projects: { state: 'stable' },
  },
}), {
  httpMetadata: { contentType: 'application/json; charset=utf-8' },
});
const projectionResponse = await fetchWorker(
  projectionEnv,
  'https://api.test/activity-signals.json',
);
assert.equal(projectionResponse.status, 200);
assert.equal(projectionResponse.headers.get('Content-Type'), 'application/json; charset=utf-8');
assert.equal(projectionResponse.headers.get('X-Content-Type-Options'), 'nosniff');
assert.equal((await projectionResponse.json()).signals.blog.state, 'active');
const projectionHead = await fetchWorker(projectionEnv, 'https://api.test/activity-signals.json', {
  method: 'HEAD',
});
assert.equal(projectionHead.status, 200);
assert.equal(await projectionHead.text(), '');
assert.equal((await fetchWorker(projectionEnv, 'https://api.test/activity-signals.json', {
  method: 'POST',
  headers: { Origin: 'https://catstarry.xyz' },
})).status, 405);
projectionEnv.HOME_PROJECTIONS.uploaded = new Date(Date.now() - 4 * 60 * 60 * 1_000);
const staleProjection = await fetchWorker(projectionEnv, 'https://api.test/activity-signals.json');
assert.equal(staleProjection.status, 503);
assert.equal(staleProjection.headers.get('Cache-Control'), 'no-store');
assert.equal((await fetchWorker(createEnv(), 'https://api.test/activity-signals.json')).status, 404);

const producer = await fetchWorker(env, 'https://api.test/api/feed/internal/footprints', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${env.FOOTPRINT_INGEST_TOKEN}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(candidate),
});
assert.equal(producer.status, 201, 'server producer must not require a browser Origin header');
assert.equal((await fetchWorker(env, 'https://api.test/api/feed/internal/footprints', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${env.FOOTPRINT_INGEST_TOKEN}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    ...candidate,
    occurred_at: new Date(Date.now() + 10 * 60 * 1_000).toISOString(),
    idempotency_key: 'blog:contract-post:future-contract-v1',
  }),
})).status, 400, 'producer timestamps beyond bounded clock skew must be rejected');

const projectionFailureEnv = createEnv();
projectionFailureEnv.HOME_PROJECTIONS = { async put() { throw new Error('injected projection failure'); } };
const originalConsoleError = console.error;
console.error = () => {};
try {
  const response = await fetchWorker(projectionFailureEnv, 'https://api.test/api/feed/internal/footprints', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${projectionFailureEnv.FOOTPRINT_INGEST_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ...candidate, idempotency_key: 'blog:contract-post:projection-failure-v1' }),
  });
  assert.equal(response.status, 201, 'projection failure must not roll back the durable footprint');
  assert.equal(projectionFailureEnv.DB.footprints.size, 1);
} finally {
  console.error = originalConsoleError;
}

const unauthorizedProducer = await fetchWorker(env, 'https://api.test/api/feed/internal/footprints', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(candidate),
});
assert.equal(unauthorizedProducer.status, 401, 'internal producer remains bearer protected');
assert.equal((await fetchWorker(env, 'https://api.test/api/feed/internal/footprints', {
  method: 'POST',
  headers: { Authorization: `Bearer ${env.FOOTPRINT_INGEST_TOKEN}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ payload: 'x'.repeat(41 * 1_024) }),
})).status, 413, 'producer payloads must remain bounded without relying on Content-Length');

const blogEnv = createEnv();
const blogManifestUrl = 'https://api.test/api/blog/internal/publications';
const blogHeaders = {
  Authorization: `Bearer ${blogEnv.FOOTPRINT_INGEST_TOKEN}`,
  'Content-Type': 'application/json',
};
const historicalManifest = {
  deployed_at: '2026-07-25T00:00:00.000Z',
  entries: [{ slug: 'historical-post', title: 'Historical post', summary: 'Seed only', state: 'published' }],
};
assert.equal((await fetchWorker(blogEnv, blogManifestUrl, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(historicalManifest),
})).status, 401);
assert.deepEqual(await fetchWorker(blogEnv, blogManifestUrl, {
  method: 'POST',
  headers: blogHeaders,
  body: JSON.stringify(historicalManifest),
}).then((response) => response.json()), { initialized: true, synced: 1, created: 0 });
assert.equal(blogEnv.DB.footprints.size, 0, 'initial production manifest must not backfill history');
assert.deepEqual(await fetchWorker(blogEnv, blogManifestUrl, {
  method: 'POST',
  headers: blogHeaders,
  body: JSON.stringify(historicalManifest),
}).then((response) => response.json()), { initialized: false, synced: 1, created: 0 });
const nextManifest = {
  deployed_at: '2026-07-26T00:00:00.000Z',
  entries: [
    historicalManifest.entries[0],
    { slug: 'first-new-post', title: 'First new post', summary: 'Draft preview', state: 'draft' },
  ],
};
assert.deepEqual(await fetchWorker(blogEnv, blogManifestUrl, {
  method: 'POST',
  headers: blogHeaders,
  body: JSON.stringify(nextManifest),
}).then((response) => response.json()), { initialized: false, synced: 2, created: 0 });
assert.equal(blogEnv.DB.footprints.size, 0, 'deploying a new Blog draft must not create a publication footprint');
assert.equal((await fetchWorker(blogEnv, blogManifestUrl, {
  method: 'POST',
  headers: blogHeaders,
  body: JSON.stringify({
    deployed_at: '2026-07-26T00:01:00.000Z',
    entries: [{ slug: 'missing-state', title: 'Missing state', summary: 'Invalid' }],
  }),
})).status, 400, 'the Worker manifest boundary must reject missing Blog state');
assert.deepEqual(await fetchWorker(blogEnv, blogManifestUrl, {
  method: 'POST',
  headers: blogHeaders,
  body: JSON.stringify({
    ...nextManifest,
    deployed_at: '2026-07-26T00:05:00.000Z',
    entries: [historicalManifest.entries[0], { ...nextManifest.entries[1], title: 'Ordinary edit' }],
  }),
}).then((response) => response.json()), { initialized: false, synced: 2, created: 0 });
assert.equal(blogEnv.DB.footprints.size, 0, 'deployment retry or ordinary edit must not publish a Blog draft');
const lifecycleToken = crypto.randomUUID();
blogEnv.AUTH_KV.values.set(`session:${lifecycleToken}`, {
  username: 'contract-owner',
  expires_at: new Date(Date.now() + 60_000).toISOString(),
});
const lifecycleHeaders = { Cookie: `token=${lifecycleToken}`, Origin: 'https://catstarry.xyz', 'Content-Type': 'application/json' };
assert.deepEqual(await fetchWorker(blogEnv, 'https://api.test/api/blog/admin/publications', {
  method: 'PATCH', headers: lifecycleHeaders, body: JSON.stringify({ slug: 'first-new-post', state: 'published' }),
}).then((response) => response.json()).then(({ entry, created }) => ({ state: entry.state, created })), { state: 'published', created: true });
assert.equal(blogEnv.DB.footprints.size, 1, 'owner Publish must create the first publication footprint exactly once');
const firstFootprint = [...blogEnv.DB.footprints.values()][0];
firstFootprint.visibility = 'private';
assert.deepEqual(await fetchWorker(blogEnv, 'https://api.test/api/blog/admin/publications', {
  method: 'PATCH', headers: lifecycleHeaders, body: JSON.stringify({ slug: 'first-new-post', state: 'withdrawn' }),
}).then((response) => response.json()).then(({ entry, created }) => ({ state: entry.state, created })), { state: 'withdrawn', created: false });
assert.deepEqual(await fetchWorker(blogEnv, 'https://api.test/api/blog/publications').then((response) => response.json()), {
  slugs: ['historical-post'],
});
assert.deepEqual(await fetchWorker(blogEnv, 'https://api.test/api/blog/admin/publications', {
  method: 'PATCH', headers: lifecycleHeaders, body: JSON.stringify({ slug: 'first-new-post', state: 'published' }),
}).then((response) => response.json()).then(({ entry, created }) => ({ state: entry.state, created })), { state: 'published', created: false });
assert.equal(firstFootprint.visibility, 'private', 'Blog restore must not overwrite a manually private footprint');
assert.equal(blogEnv.DB.footprints.size, 1, 'withdraw and restore must preserve one historical footprint');

const malformedCookie = await fetchWorker(env, 'https://api.test/api/auth/session', { headers: { Cookie: 'token=%GG' } });
assert.equal(malformedCookie.status, 200);
assert.deepEqual(await malformedCookie.json(), { authenticated: false, username: null });
for (const invalidBody of ['null', '[]', '"slug"']) {
  const response = await fetchWorker(env, 'https://api.test/api/views', {
    method: 'POST',
    headers: { Origin: 'https://catstarry.xyz', 'Content-Type': 'application/json' },
    body: invalidBody,
  });
  assert.equal(response.status, 400, 'non-object Feed JSON must be rejected as a client error');
}

const d1FailureEnv = createEnv();
d1FailureEnv.DB = { prepare() { throw new Error('SQL secret-marker'); } };
const d1FailureToken = crypto.randomUUID();
d1FailureEnv.AUTH_KV.values.set(`session:${d1FailureToken}`, {
  username: 'contract',
  expires_at: new Date(Date.now() + 60_000).toISOString(),
});
console.error = () => {};
try {
  const response = await fetchWorker(d1FailureEnv, 'https://api.test/api/views?slugs=contract-post', { headers: { Cookie: `token=${d1FailureToken}` } });
  assert.equal(response.status, 500);
  const body = await response.text();
  assert.doesNotMatch(body, /SQL|secret-marker|stack/i, 'D1 errors must use a bounded public envelope');
} finally {
  console.error = originalConsoleError;
}

const kvFailureEnv = createEnv();
kvFailureEnv.AUTH_KV = { async get() { throw new Error('KV secret-marker'); } };
console.error = () => {};
try {
  const response = await fetchWorker(kvFailureEnv, 'https://api.test/api/auth/session', {
    headers: { Cookie: `token=${crypto.randomUUID()}` },
  });
  assert.equal(response.status, 500);
  assert.doesNotMatch(await response.text(), /KV|secret-marker|stack/i, 'KV errors must use a bounded public envelope');
} finally {
  console.error = originalConsoleError;
}

const browserMutation = await fetchWorker(env, 'https://api.test/api/feed', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ type: 'note', content: 'blocked' }),
});
assert.equal(browserMutation.status, 403, 'browser mutation without Origin remains rejected');

const previewEnv = createEnv();
previewEnv.CLIP_PREVIEW_ALLOWED_HOSTS = 'example.com';
const previewToken = crypto.randomUUID();
previewEnv.AUTH_KV.values.set(`session:${previewToken}`, {
  username: 'contract',
  expires_at: new Date(Date.now() + 60_000).toISOString(),
});
const previewHeaders = {
  Origin: 'https://catstarry.xyz',
  'Content-Type': 'application/json',
  Cookie: `token=${previewToken}`,
};
assert.equal((await fetchWorker(previewEnv, 'https://api.test/api/feed/clip-preview', {
  method: 'POST',
  headers: previewHeaders,
  body: JSON.stringify({ link_url: 'http://127.0.0.1/private' }),
})).status, 400);
assert.equal((await fetchWorker(previewEnv, 'https://api.test/api/feed/clip-preview', {
  method: 'POST',
  headers: previewHeaders,
  body: '{',
})).status, 400);
assert.equal((await fetchWorker(
  previewEnv,
  `https://api.test/api/feed?cursor=${'A'.repeat(1_025)}`,
)).status, 400);
assert.equal((await fetchWorker(previewEnv, 'https://api.test/api/feed/admin?type=unsupported', {
  headers: { Cookie: `token=${previewToken}` },
})).status, 400);
assert.equal((await fetchWorker(previewEnv, 'https://api.test/api/feed/media/%GG')).status, 404);

const validUpload = new FormData();
validUpload.set('file', new File([
  new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0]),
], 'contract.png', { type: 'image/png' }));
const uploadResponse = await fetchWorker(previewEnv, 'https://api.test/api/feed/upload', {
  method: 'POST',
  headers: { Origin: 'https://catstarry.xyz', Cookie: `token=${previewToken}` },
  body: validUpload,
});
assert.equal(uploadResponse.status, 201);
assert.match((await uploadResponse.json()).key, /^feed\/\d{4}-\d{2}\/[0-9a-f-]{36}\.png$/);

const invalidUpload = new FormData();
invalidUpload.set('file', new File([new Uint8Array([1, 2, 3, 4])], 'fake.png', {
  type: 'image/png',
}));
assert.equal((await fetchWorker(previewEnv, 'https://api.test/api/feed/upload', {
  method: 'POST',
  headers: { Origin: 'https://catstarry.xyz', Cookie: `token=${previewToken}` },
  body: invalidUpload,
})).status, 415);

previewEnv.MEDIA_BUCKET.failPut = true;
const failedUpload = new FormData();
failedUpload.set('file', new File([
  new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0]),
], 'failure.png', { type: 'image/png' }));
assert.equal((await fetchWorker(previewEnv, 'https://api.test/api/feed/upload', {
  method: 'POST',
  headers: { Origin: 'https://catstarry.xyz', Cookie: `token=${previewToken}` },
  body: failedUpload,
})).status, 503);
previewEnv.MEDIA_BUCKET.failPut = false;
previewEnv.MEDIA_BUCKET.failDelete = true;
console.error = () => {};
try {
  const key = `feed/2026-07/${crypto.randomUUID()}.png`;
  const response = await fetchWorker(previewEnv, `https://api.test/api/feed/media/${key}`, {
    method: 'DELETE',
    headers: { Origin: 'https://catstarry.xyz', Cookie: `token=${previewToken}` },
  });
  assert.equal(response.status, 500);
  assert.doesNotMatch(await response.text(), /R2|delete failure|stack/i);
} finally {
  console.error = originalConsoleError;
  previewEnv.MEDIA_BUCKET.failDelete = false;
}

const originalFetch = globalThis.fetch;
globalThis.fetch = async (_input, init) => {
  assert.equal(init.redirect, 'manual');
  return new Response('<title>Contract preview</title><meta name="description" content="bounded">', {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
};
try {
  const response = await fetchWorker(previewEnv, 'https://api.test/api/feed/clip-preview', {
    method: 'POST',
    headers: previewHeaders,
    body: JSON.stringify({ link_url: 'https://example.com/article' }),
  });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).link_title, 'Contract preview');

  globalThis.fetch = async () => new Response(new Uint8Array(524_289), {
    headers: { 'Content-Type': 'text/html' },
  });
  assert.equal((await fetchWorker(previewEnv, 'https://api.test/api/feed/clip-preview', {
    method: 'POST',
    headers: previewHeaders,
    body: JSON.stringify({ link_url: 'https://example.com/oversized' }),
  })).status, 422);

  globalThis.fetch = async () => {
    throw new DOMException('injected timeout', 'AbortError');
  };
  assert.equal((await fetchWorker(previewEnv, 'https://api.test/api/feed/clip-preview', {
    method: 'POST',
    headers: previewHeaders,
    body: JSON.stringify({ link_url: 'https://example.com/timeout' }),
  })).status, 422);
} finally {
  globalThis.fetch = originalFetch;
}

const viewHeaders = {
  Origin: 'https://catstarry.xyz',
  'Content-Type': 'application/json',
  'CF-Connecting-IP': '203.0.113.10',
};
const firstView = await fetchWorker(env, 'https://api.test/api/views', {
  method: 'POST',
  headers: viewHeaders,
  body: JSON.stringify({ slug: 'contract-post' }),
});
assert.equal(firstView.status, 200);
assert.deepEqual(await firstView.json(), { slug: 'contract-post' });
assert.equal((await fetchWorker(env, 'https://api.test/api/views', {
  method: 'POST',
  headers: viewHeaders,
  body: JSON.stringify({ slug: 'x'.repeat(2_000) }),
})).status, 413);

const markerFailureEnv = createEnv();
const originalMarkerPut = markerFailureEnv.VIEW_KV.put.bind(markerFailureEnv.VIEW_KV);
markerFailureEnv.VIEW_KV.put = async (key, value) => {
  if (key.startsWith('view:')) throw new Error('injected marker failure');
  return originalMarkerPut(key, value);
};
const savedConsoleError = console.error;
console.error = () => {};
try {
  const response = await fetchWorker(markerFailureEnv, 'https://api.test/api/views', {
    method: 'POST',
    headers: viewHeaders,
    body: JSON.stringify({ slug: 'marker-failure' }),
  });
  assert.equal(response.status, 200, 'KV marker failure must not obscure the durable view');
  assert.deepEqual(await response.json(), { slug: 'marker-failure' });
} finally {
  console.error = savedConsoleError;
}

const duplicateView = await fetchWorker(env, 'https://api.test/api/views', {
  method: 'POST',
  headers: viewHeaders,
  body: JSON.stringify({ slug: 'contract-post' }),
});
assert.deepEqual(await duplicateView.json(), { slug: 'contract-post' });

const secondVisitor = await fetchWorker(env, 'https://api.test/api/views', {
  method: 'POST',
  headers: { ...viewHeaders, 'CF-Connecting-IP': '203.0.113.11' },
  body: JSON.stringify({ slug: 'contract-post' }),
});
assert.deepEqual(await secondVisitor.json(), { slug: 'contract-post' });

const rateLimitedHeaders = { ...viewHeaders, 'CF-Connecting-IP': '203.0.113.12' };
for (let index = 0; index < 120; index += 1) {
  const response = await fetchWorker(env, 'https://api.test/api/views', {
    method: 'POST',
    headers: rateLimitedHeaders,
    body: JSON.stringify({ slug: 'rate-limit-contract' }),
  });
  assert.equal(response.status, 200);
}
assert.equal((await fetchWorker(env, 'https://api.test/api/views', {
  method: 'POST',
  headers: rateLimitedHeaders,
  body: JSON.stringify({ slug: 'rate-limit-contract' }),
})).status, 429);

assert.equal((await fetchWorker(env, 'https://api.test/api/views?slug=contract-post')).status, 401);
const ownerToken = crypto.randomUUID();
env.AUTH_KV.values.set(`session:${ownerToken}`, {
  username: 'contract',
  expires_at: new Date(Date.now() + 60_000).toISOString(),
});
const ownerHeaders = { Cookie: `token=${ownerToken}` };
const ownerSingle = await fetchWorker(env, 'https://api.test/api/views?slug=contract-post', { headers: ownerHeaders });
assert.equal(ownerSingle.status, 200);
assert.deepEqual(await ownerSingle.json(), { slug: 'contract-post', count: 2 });
const batch = await fetchWorker(env, 'https://api.test/api/views?slugs=contract-post,missing-post', { headers: ownerHeaders });
assert.equal(batch.status, 200);
assert.deepEqual(await batch.json(), {
  views: [
    { slug: 'contract-post', count: 2 },
    { slug: 'missing-post', count: 0 },
  ],
});

console.log('Feed HTTP contract passed.');
