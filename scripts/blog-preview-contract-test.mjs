import assert from 'node:assert/strict';
import { once } from 'node:events';
import { rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const astro = path.join(root, 'node_modules', 'astro', 'bin', 'astro.mjs');
const withdrawnSource = path.join(root, 'src', 'data', 'blog', 'withdrawn-preview-contract.md');
const [sessionPort, sitePort] = await freePorts(2);
const sessionOrigin = `http://127.0.0.1:${sessionPort}`;
const siteOrigin = `http://127.0.0.1:${sitePort}`;
const unexpectedOwnerRequests = [];
const sessionServer = createServer((request, response) => {
  if (request.url === '/api/auth/session') {
    if ((request.headers.cookie ?? '').includes('preview-error=1')) {
      response.writeHead(503, { 'Content-Type': 'application/json' }).end('{"error":"unavailable"}');
      return;
    }
    const authenticated = (request.headers.cookie ?? '').includes('preview-token=1');
    response.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    response.end(JSON.stringify({ authenticated, username: authenticated ? 'blog-preview-owner' : null }));
    return;
  }
  if (request.url === '/api/feed/admin?limit=20') {
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end('{"items":[],"cursor":null,"has_more":false}');
    return;
  }
  if (request.url === '/api/blog/admin/publications') {
    if ((request.headers.cookie ?? '').includes('blog-error=1')) {
      response.writeHead(503, { 'Content-Type': 'application/json' }).end('{"error":"unavailable"}');
      return;
    }
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end('{"entries":[]}');
    return;
  }
  unexpectedOwnerRequests.push(`${request.method} ${request.url}`);
  response.writeHead(404).end();
});
let site;
let output = '';

try {
  await writeFile(withdrawnSource, `---\ntitle: "Withdrawn preview contract"\ndate: 2026-08-13\ncategory: tech\ntags: ["contract"]\ndescription: "Withdrawn source remains privately previewable."\nstate: withdrawn\n---\n\n## Withdrawn source body\n\nThis content must remain visible only in owner preview.\n`, 'utf8');
  await listen(sessionServer, sessionPort);
  site = spawn(process.execPath, [astro, 'dev', '--host', '127.0.0.1', '--port', String(sitePort)], {
    cwd: root,
    env: { ...process.env, ASTRO_DEV_BACKGROUND: '0', FEED_API_URL: sessionOrigin, PUBLIC_FEED_API_URL: sessionOrigin },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  site.stdout.on('data', (chunk) => { output += chunk; });
  site.stderr.on('data', (chunk) => { output += chunk; });
  await waitForHttp(`${siteOrigin}/`, site, () => output);

  const previewUrl = `${siteOrigin}/blog/preview/draft-preview/`;
  const unauthenticated = await fetch(previewUrl, { redirect: 'manual' });
  assert.ok([301, 302, 303, 307, 308].includes(unauthenticated.status));
  assert.equal(unauthenticated.headers.get('location'), '/feed/');
  assertPrivatePreviewHeaders(unauthenticated);
  assert.doesNotMatch(await unauthenticated.text(), /仅供本地预览的草稿/);

  const unavailable = await fetch(previewUrl, { headers: { Cookie: 'preview-error=1' } });
  assert.equal(unavailable.status, 503);
  assertPrivatePreviewHeaders(unavailable);
  assert.doesNotMatch(await unavailable.text(), /仅供本地预览的草稿/);

  for (const [slug, title, body] of [
    ['draft-preview', '仅供本地预览的草稿', '不应出现在任何已发布页面'],
    ['from-zero', '从零开始建造数字空间', '我一直想有一个自己的网站'],
    ['withdrawn-preview-contract', 'Withdrawn preview contract', 'Withdrawn source body'],
  ]) {
    const response = await fetch(`${siteOrigin}/blog/preview/${slug}/`, { headers: { Cookie: 'preview-token=1' } });
    assert.equal(response.status, 200, slug);
    assertPrivatePreviewHeaders(response);
    const html = await response.text();
    assert.match(html, /PRIVATE PREVIEW/);
    assert.match(html, new RegExp(title));
    assert.match(html, new RegExp(body));
    assert.match(html, /<meta name="robots" content="noindex,nofollow,noarchive"/);
    assert.doesNotMatch(html, /data-blog-view-count|ViewTracker|ViewCounter/);
  }

  const missing = await fetch(`${siteOrigin}/blog/preview/not-a-real-post/`, { headers: { Cookie: 'preview-token=1' } });
  assert.equal(missing.status, 404);

  const splitError = await fetch(`${siteOrigin}/feed/admin/`, { headers: { Cookie: 'preview-token=1; blog-error=1' } });
  assert.equal(splitError.status, 200);
  const splitErrorBody = await splitError.text();
  assert.match(splitErrorBody, /Blog 发布状态暂时无法读取，请重试。/);
  assert.doesNotMatch(splitErrorBody, /管理列表暂时无法读取，请重试。/);
  assert.deepEqual(unexpectedOwnerRequests, [], 'Blog preview must not call public views, footprints, or activity APIs');

  console.log('Blog preview owner-auth contract passed.');
} catch (error) {
  if (site && site.exitCode === null) console.error(output);
  throw error;
} finally {
  await stopProcessTree(site);
  await closeServer(sessionServer);
  await rm(withdrawnSource, { force: true });
}

function assertPrivatePreviewHeaders(response) {
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.equal(response.headers.get('pragma'), 'no-cache');
  assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow, noarchive');
}

async function freePorts(count) {
  const ports = [];
  while (ports.length < count) {
    const server = net.createServer();
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Could not reserve a local port');
    await new Promise((resolve) => server.close(resolve));
    if (!ports.includes(address.port)) ports.push(address.port);
  }
  return ports;
}

function listen(server, port) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });
}

async function waitForHttp(url, child, getOutput) {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Astro dev exited before ready:\n${getOutput()}`);
    try { if ((await fetch(url, { signal: AbortSignal.timeout(1_000) })).ok) return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Astro dev did not become ready:\n${getOutput()}`);
}

async function stopProcessTree(child) {
  if (!child || child.exitCode !== null) return;
  if (process.platform === 'win32') {
    const killer = spawn('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
    await once(killer, 'exit');
  } else child.kill('SIGTERM');
  await Promise.race([once(child, 'exit'), new Promise((resolve) => setTimeout(resolve, 5_000))]);
}

function closeServer(server) {
  return new Promise((resolve) => {
    if (!server.listening) return resolve();
    server.close(() => resolve());
  });
}
