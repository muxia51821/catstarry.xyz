import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const astro = path.join(root, 'node_modules', 'astro', 'bin', 'astro.mjs');
const [sessionPort, sitePort] = await freePorts(2);
const sessionOrigin = `http://127.0.0.1:${sessionPort}`;
const siteOrigin = `http://127.0.0.1:${sitePort}`;
const sessionServer = createServer((request, response) => {
  if (request.url !== '/api/auth/session') {
    response.writeHead(404).end();
    return;
  }
  if ((request.headers.cookie ?? '').includes('preview-error=1')) {
    response.writeHead(503, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'unavailable' }));
    return;
  }
  const authenticated = (request.headers.cookie ?? '').includes('preview-token=1');
  response.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify({
    authenticated,
    username: authenticated ? 'local-preview' : null,
  }));
});
let site;

try {
  await listen(sessionServer, sessionPort);
  site = spawn(process.execPath, [astro, 'dev', '--host', '127.0.0.1', '--port', String(sitePort)], {
    cwd: root,
    env: {
      ...process.env,
      ASTRO_DEV_BACKGROUND: '0',
      FEED_API_URL: sessionOrigin,
      PUBLIC_FEED_API_URL: sessionOrigin,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  let output = '';
  site.stdout.on('data', (chunk) => { output += chunk; });
  site.stderr.on('data', (chunk) => { output += chunk; });
  await waitForHttp(`${siteOrigin}/`, site, () => output);

  const previewUrl = `${siteOrigin}/learn/preview/domain-dns-http/`;
  const unauthenticated = await fetch(previewUrl, { redirect: 'manual' });
  assert.ok([301, 302, 303, 307, 308].includes(unauthenticated.status));
  assert.equal(unauthenticated.headers.get('location'), '/feed/');
  assert.equal(unauthenticated.headers.get('cache-control'), 'private, no-store');
  assert.equal(unauthenticated.headers.get('pragma'), 'no-cache');
  assert.equal(unauthenticated.headers.get('x-robots-tag'), 'noindex, nofollow, noarchive');
  assert.doesNotMatch(await unauthenticated.text(), /域名、DNS 与 HTTP/);

  const unavailable = await fetch(previewUrl, {
    headers: { Cookie: 'preview-error=1' },
  });
  assert.equal(unavailable.status, 503);
  assert.equal(unavailable.headers.get('cache-control'), 'private, no-store');
  assert.doesNotMatch(await unavailable.text(), /域名、DNS 与 HTTP/);

  const authenticated = await fetch(previewUrl, {
    headers: { Cookie: 'preview-token=1' },
  });
  assert.equal(authenticated.status, 200);
  assert.equal(authenticated.headers.get('cache-control'), 'private, no-store');
  assert.equal(authenticated.headers.get('pragma'), 'no-cache');
  assert.equal(authenticated.headers.get('x-robots-tag'), 'noindex, nofollow, noarchive');
  const authenticatedBody = await authenticated.text();
  assert.match(authenticatedBody, /PRIVATE PREVIEW/);
  assert.match(authenticatedBody, /域名、DNS 与 HTTP/);
  assert.match(authenticatedBody, /浏览器访问网站/);
  assert.match(authenticatedBody, /<meta name="robots" content="noindex,nofollow,noarchive"/);

  const missing = await fetch(`${siteOrigin}/learn/preview/not-a-real-note/`, {
    headers: { Cookie: 'preview-token=1' },
  });
  assert.equal(missing.status, 404);
  assert.doesNotMatch(await missing.text(), /域名、DNS 与 HTTP/);

  const publicDraft = await fetch(`${siteOrigin}/learn/notes/domain-dns-http/`);
  assert.equal(publicDraft.status, 404);
  assert.doesNotMatch(await publicDraft.text(), /域名、DNS 与 HTTP/);

  for (const pathname of ['/learn/', '/learn/track/programming/']) {
    const response = await fetch(`${siteOrigin}${pathname}`);
    assert.equal(response.status, 200, pathname);
    assert.doesNotMatch(await response.text(), /域名、DNS 与 HTTP/);
  }

  const adminSource = await readFile(path.join(root, 'src', 'pages', 'learn', 'admin.astro'), 'utf8');
  assert.match(adminSource, /learn\/preview\/\$\{note\.slug\}/);
  assert.match(adminSource, />预览<\/a>/);
  assert.doesNotMatch(adminSource, /data-publication-action|data-complete-form|完成小节|撤回/);
  const learnRouteSource = await readFile(path.join(root, 'workers', 'feed-api', 'src', 'routes', 'learn.ts'), 'utf8');
  assert.doesNotMatch(learnRouteSource, /completeSection|requestPublication|learn_section_completed/);
  console.log('Learn preview contract passed.');
} catch (error) {
  if (site && site.exitCode === null) console.error(siteOutput(site));
  throw error;
} finally {
  await stopProcessTree(site);
  await closeServer(sessionServer);
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
  let lastError;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Astro dev exited before ready:\n${getOutput()}`);
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1_000) });
      if (response.ok) return;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Astro dev did not become ready: ${lastError?.message ?? 'unknown error'}\n${getOutput()}`);
}

function siteOutput(child) {
  return child.stdout ? 'Astro dev process output captured.' : 'Astro dev process output unavailable.';
}

async function stopProcessTree(child) {
  if (!child || child.exitCode !== null) return;
  if (process.platform === 'win32') {
    const killer = spawn('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
    await once(killer, 'exit');
  } else {
    child.kill('SIGTERM');
  }
  await Promise.race([once(child, 'exit'), new Promise((resolve) => setTimeout(resolve, 5_000))]);
}

function closeServer(server) {
  return new Promise((resolve) => {
    if (!server.listening) return resolve();
    server.close(() => resolve());
  });
}
