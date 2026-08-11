import assert from 'node:assert/strict';
import { execFile, spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { hash } from 'bcryptjs';

const run = promisify(execFile);
const cwd = process.cwd();
const wrangler = path.join(cwd, 'node_modules', 'wrangler', 'bin', 'wrangler.js');
const config = path.join(cwd, 'workers', 'feed-api', 'wrangler.jsonc');
const persist = await mkdtemp(path.join(os.tmpdir(), 'catstarry-feed-contract-'));
const port = await availablePort();
const base = `http://127.0.0.1:${port}`;
const childEnv = { ...process.env, XDG_CONFIG_HOME: path.join(persist, 'xdg') };
const validPng = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
const password = `contract-${crypto.randomUUID()}`;
const footprintToken = `footprint-${crypto.randomUUID()}`;

async function command(...args) { await run(process.execPath, [wrangler, ...args], { cwd, windowsHide: true, env: childEnv }); }
async function waitForWorker() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`${base}/api/feed`);
      if (response.ok) return;
      if (attempt === 59) throw new Error(await response.text());
    } catch (error) {
      if (attempt === 59) throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('Feed Worker did not start');
}
async function request(pathname, init = {}) {
  return fetch(`${base}${pathname}`, { ...init, headers: { Origin: 'https://catstarry.xyz', ...(init.headers ?? {}) } });
}
async function rawRequest(pathname, init = {}) {
  return fetch(`${base}${pathname}`, init);
}
async function upload(cookie, bytes, name = 'pixel.png', type = 'image/png') {
  const form = new FormData();
  form.set('file', new File([bytes], name, { type }));
  return request('/api/feed/upload', { method: 'POST', headers: { Cookie: cookie }, body: form });
}
async function login(username, password) {
  return request('/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }),
  });
}
function footprintBody(overrides = {}) {
  return {
    source_module: 'blog', source_ref: 'contract', source_version: 'v1', event_type: 'blog_published',
    snapshot_json: JSON.stringify({ title: 'Contract blog', summary: 'snapshot', link: '/blog/contract/' }),
    occurred_at: '2026-07-25T12:00:00.000Z', idempotency_key: 'blog:contract:v1', ...overrides,
  };
}

let server;
let serverOutput = '';
try {
  await command('d1', 'migrations', 'apply', 'catstarry-db', '--local', '--persist-to', persist, '--config', config);
  await command('d1', 'migrations', 'apply', 'catstarry-db', '--local', '--persist-to', persist, '--config', config);
  const passwordHash = await hash(password, 10);
  const boundaryHash = await hash('密'.repeat(24), 10);
  await command('kv', 'key', 'put', '--local', '--persist-to', persist, '--binding', 'AUTH_KV', 'user:contract', JSON.stringify({ password_hash: passwordHash, role: 'admin' }), '--config', config);
  await command('kv', 'key', 'put', '--local', '--persist-to', persist, '--binding', 'AUTH_KV', 'user:boundary', JSON.stringify({ password_hash: boundaryHash, role: 'admin' }), '--config', config);
  server = spawn(process.execPath, [wrangler, 'dev', '--local', '--persist-to', persist, '--config', config, '--port', String(port), '--var', `FOOTPRINT_INGEST_TOKEN:${footprintToken}`, '--var', 'CLIP_PREVIEW_ALLOWED_HOSTS:developer.mozilla.org'], { cwd, windowsHide: true, stdio: 'pipe', env: childEnv });
  server.stdout?.on('data', (chunk) => { serverOutput += chunk.toString(); });
  server.stderr?.on('data', (chunk) => { serverOutput += chunk.toString(); });
  try { await waitForWorker(); } catch (error) { throw new Error(`${error instanceof Error ? error.message : 'Feed Worker did not start'}\n${serverOutput}`); }

  assert.equal((await login('contract', 'wrong')).status, 401);
  const boundary = await login('boundary', '密'.repeat(24));
  assert.equal(boundary.status, 200, '72-byte login must pass the password length gate');
  assert.equal((await login('boundary', '密'.repeat(25))).status, 400, 'overlong login must be rejected before bcrypt');

  const loginResponse = await login('contract', password);
  assert.equal(loginResponse.status, 200);
  assert.match(loginResponse.headers.get('set-cookie') ?? '', /HttpOnly; Secure; SameSite=Lax/);
  const cookie = (loginResponse.headers.get('set-cookie') ?? '').split(';')[0];
  const authHeaders = { Cookie: cookie, 'Content-Type': 'application/json', 'Idempotency-Key': 'contract-post-0001' };

  assert.equal((await request('/api/feed', { method: 'POST', headers: authHeaders, body: JSON.stringify({ type: 'note', content: 'x'.repeat(10_001) }) })).status, 400);
  for (const body of [
    { type: 'clip', link_url: `https://example.com/${'x'.repeat(2_050)}`, link_title: 'title' },
    { type: 'clip', link_url: 'https://example.com/', link_title: 'x'.repeat(201) },
    { type: 'clip', link_url: 'https://example.com/', link_title: 'title', link_summary: 'x'.repeat(2_001) },
    { type: 'clip', link_url: 'https://example.com/', link_title: 'title', link_image: `https://example.com/${'x'.repeat(2_050)}` },
  ]) {
    assert.equal((await request('/api/feed', { method: 'POST', headers: { ...authHeaders, 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify(body) })).status, 400);
  }

  const post = await request('/api/feed', { method: 'POST', headers: authHeaders, body: JSON.stringify({ type: 'note', content: 'contract note' }) });
  assert.equal(post.status, 201);
  const first = await post.json();
  const retry = await request('/api/feed', { method: 'POST', headers: authHeaders, body: JSON.stringify({ type: 'note', content: 'contract note' }) });
  assert.equal(retry.status, 200);
  assert.equal((await retry.json()).post.id, first.post.id);

  const footprint = await rawRequest('/api/feed/internal/footprints', { method: 'POST', headers: { Authorization: `Bearer ${footprintToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify(footprintBody()) });
  assert.equal(footprint.status, 201);
  const firstFootprint = await footprint.json();
  assert.equal(firstFootprint.created, true);
  const duplicateFootprint = await rawRequest('/api/feed/internal/footprints', { method: 'POST', headers: { Authorization: `Bearer ${footprintToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify(footprintBody()) });
  assert.equal(duplicateFootprint.status, 200);
  assert.equal((await duplicateFootprint.json()).created, false);
  const dangerous = await rawRequest('/api/feed/internal/footprints', { method: 'POST', headers: { Authorization: `Bearer ${footprintToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify(footprintBody({ idempotency_key: 'blog:danger:v1', snapshot_json: JSON.stringify({ title: 'Bad', link: 'javascript:alert(1)' }) })) });
  assert.equal(dangerous.status, 400);

  const dateFiltered = await request('/api/feed/admin?from=2026-07-25&to=2026-07-25', { headers: { Cookie: cookie } });
  assert.equal(dateFiltered.status, 200);
  assert.equal((await dateFiltered.json()).items.some((item) => item.id === firstFootprint.footprint.id), true, 'to date must include the entire selected day');
  assert.equal((await request('/api/feed/admin?from=2026-99-01', { headers: { Cookie: cookie } })).status, 400);
  assert.equal((await request('/api/feed/admin?from=2026-07-26&to=2026-07-25', { headers: { Cookie: cookie } })).status, 400);

  const fakePng = await upload(cookie, new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]));
  assert.equal(fakePng.status, 415);
  const uploaded = await upload(cookie, validPng);
  assert.equal(uploaded.status, 201);
  const uploadedMedia = await uploaded.json();
  assert.match(uploadedMedia.key, /^feed\/\d{4}-\d{2}\/[0-9a-f-]{36}\.png$/);
  const mediaPost = await request('/api/feed', { method: 'POST', headers: { ...authHeaders, 'Idempotency-Key': 'contract-media-0001' }, body: JSON.stringify({ type: 'note', media_keys: [uploadedMedia.key] }) });
  assert.equal(mediaPost.status, 201);
  const referencedDelete = await request(`/api/feed/media/${encodeURIComponent(uploadedMedia.key)}`, { method: 'DELETE', headers: { Cookie: cookie } });
  assert.equal(referencedDelete.status, 409, await referencedDelete.text());
  const mediaGet = await request(`/api/feed/media/${encodeURIComponent(uploadedMedia.key)}`);
  assert.equal(mediaGet.headers.get('x-content-type-options'), 'nosniff');
  const spareUpload = await upload(cookie, validPng, 'spare.png');
  assert.equal(spareUpload.status, 201);
  const spare = await spareUpload.json();
  assert.equal((await request(`/api/feed/media/${encodeURIComponent(spare.key)}`, { method: 'DELETE', headers: { Cookie: cookie } })).status, 204);

  const invalidMedia = await request('/api/feed', { method: 'POST', headers: authHeaders, body: JSON.stringify({ type: 'note', content: 'bad media', media_keys: [uploadedMedia.key, uploadedMedia.key.replace('.png', '.mp4')] }) });
  assert.equal(invalidMedia.status, 400);
  assert.equal((await request('/api/feed/clip-preview', { method: 'POST', headers: { Cookie: cookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ link_url: 'https://example.com/' }) })).status, 422);
  assert.equal((await request('/api/feed/clip-preview', { method: 'POST', headers: { Cookie: cookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ link_url: 'http://172.16.0.1/' }) })).status, 400);
  assert.equal((await request('/api/feed/clip-preview', { method: 'POST', headers: { Cookie: cookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ link_url: 'http://[::1]/' }) })).status, 400);
  assert.equal((await request('/api/feed/clip-preview', { method: 'POST', headers: { Cookie: cookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ link_url: 'http://[fc00::1]/' }) })).status, 400);
  assert.equal((await request('/api/feed/clip-preview', { method: 'POST', headers: { Cookie: cookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ link_url: 'https://user:secret@developer.mozilla.org/' }) })).status, 400);

  const firstView = await request('/api/views', { method: 'POST', headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '198.51.100.10' }, body: JSON.stringify({ slug: 'contract' }) });
  assert.deepEqual(await firstView.json(), { slug: 'contract' });
  const duplicateView = await request('/api/views', { method: 'POST', headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '198.51.100.10' }, body: JSON.stringify({ slug: 'contract' }) });
  assert.deepEqual(await duplicateView.json(), { slug: 'contract' });
  const nextView = await request('/api/views', { method: 'POST', headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '198.51.100.11' }, body: JSON.stringify({ slug: 'contract' }) });
  assert.deepEqual(await nextView.json(), { slug: 'contract' });
  assert.equal((await request('/api/views?slug=contract')).status, 401);
  const ownerView = await request('/api/views?slug=contract', { headers: { Cookie: cookie } });
  assert.equal(ownerView.status, 200);
  assert.deepEqual(await ownerView.json(), { slug: 'contract', count: 2 });
  const batchViews = await request('/api/views?slugs=contract,missing', { headers: { Cookie: cookie } });
  assert.deepEqual(await batchViews.json(), { views: [{ slug: 'contract', count: 2 }, { slug: 'missing', count: 0 }] });

  assert.equal((await request(`/api/feed/${firstFootprint.footprint.id}`, { method: 'DELETE', headers: { Cookie: cookie } })).status, 404);
  assert.equal((await request('/api/auth/logout', { method: 'POST', headers: { Cookie: cookie } })).status, 200);
  assert.equal((await request('/api/feed/admin', { headers: { Cookie: cookie } })).status, 401);
  assert.equal((await request('/api/feed', { method: 'POST', headers: { Origin: 'https://untrusted.example' }, body: '{}' })).status, 403);
  console.log('Feed Worker contract passed');
} catch (error) {
  console.error(serverOutput);
  throw error;
} finally {
  if (server) {
    const stopped = server.exitCode === null ? new Promise((resolve) => server.once('exit', resolve)) : Promise.resolve();
    server.kill('SIGTERM');
    await stopped;
  }
  await rm(persist, { recursive: true, force: true, maxRetries: 8, retryDelay: 250 }).catch((error) => {
    console.warn(`Local Feed contract state retained at ${persist}: ${error.code ?? error.message}`);
  });
}

async function availablePort() {
  const probe = createServer();
  await new Promise((resolve, reject) => {
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', resolve);
  });
  const address = probe.address();
  if (!address || typeof address === 'string') throw new Error('Could not reserve a local Feed test port');
  await new Promise((resolve) => probe.close(resolve));
  return address.port;
}
