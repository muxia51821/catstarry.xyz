import assert from 'node:assert/strict';
import { once } from 'node:events';
import { access, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const node = process.execPath;
const ownerFile = '.catstarry-local-preview-owner.json';

async function freePort() {
  const server = net.createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Could not reserve a local TCP port');
  const { port } = address;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

async function freePorts(count) {
  const ports = [];
  while (ports.length < count) {
    const port = await freePort();
    if (!ports.includes(port)) ports.push(port);
  }
  return ports;
}

async function portIsAvailable(port) {
  const server = net.createServer();
  try {
    server.listen(port, '127.0.0.1');
    await once(server, 'listening');
    return true;
  } catch {
    return false;
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

async function previewDirectoryForPid(pid) {
  const entries = await readdir(os.tmpdir(), { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory() || !entry.name.startsWith('catstarry-local-preview-')) continue;
    const directory = path.join(os.tmpdir(), entry.name);
    try {
      const owner = JSON.parse(await readFile(path.join(directory, ownerFile), 'utf8'));
      if (Number(owner?.pid) === pid) return directory;
    } catch {
      // Ignore unrelated and partially-created temporary directories.
    }
  }
  return null;
}

async function exists(target) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

function spawnPreview(args, env) {
  const child = spawn(node, ['scripts/local-preview.mjs', ...args], {
    cwd: root,
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  let stdout = '';
  let stderr = '';
  let spawnError = null;
  child.stdout.on('data', (chunk) => { stdout += chunk; });
  child.stderr.on('data', (chunk) => { stderr += chunk; });
  child.on('error', (error) => { spawnError = error; });
  return {
    child,
    output: () => `${stdout}${stderr}`,
    error: () => spawnError,
    failureContext: () => `PID ${child.pid ?? 'unknown'}${spawnError ? `\nprocess error: ${spawnError.message}` : ''}\nstdout:\n${stdout}\nstderr:\n${stderr}`,
  };
}

function localPreviewCredentials(output) {
  const match = output.match(/Local preview login \(LOCAL PREVIEW ONLY\):\s+username:\s+(\S+)\s+password:\s+(\S+)/);
  if (!match) throw new Error(`Local preview credentials were not printed in the ready output:\n${output}`);
  return { username: match[1], password: match[2] };
}

async function verifyLocalAuthoringWorkflow({ sitePort, feedPort, output }) {
  const credentials = localPreviewCredentials(output);
  const siteOrigin = `http://127.0.0.1:${sitePort}`;
  const feedOrigin = `http://127.0.0.1:${feedPort}`;
  const request = async (url, options, label) => {
    let lastError;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try { return await fetch(url, options); } catch (error) {
        lastError = error;
        await new Promise((resolve) => setTimeout(resolve, 150 * (attempt + 1)));
      }
    }
    throw new Error(`${label} failed after transient retries: ${lastError?.message ?? 'unknown error'}`);
  };
  const login = await request(`${feedOrigin}/api/auth/login`, {
    method: 'POST',
    headers: { Origin: siteOrigin, 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });
  assert.equal(login.status, 200, await login.text());
  const setCookie = login.headers.get('set-cookie') ?? '';
  assert.match(setCookie, /HttpOnly; SameSite=Lax/);
  assert.doesNotMatch(setCookie, /(?:^|; )Secure(?:;|$)/, 'local preview cookies must work over HTTP');
  const cookie = setCookie.split(';', 1)[0];
  assert.match(cookie, /^token=[0-9a-f-]+$/i);

  const session = await fetch(`${feedOrigin}/api/auth/session`, { headers: { Cookie: cookie } });
  assert.equal(session.status, 200);
  assert.deepEqual(await session.json(), { authenticated: true, username: credentials.username });

  const admin = await fetch(`${siteOrigin}/learn/admin/`, { headers: { Cookie: cookie } });
  assert.equal(admin.status, 200);
  const adminBody = await admin.text();
  assert.match(adminBody, /Learn 管理/);
  assert.match(adminBody, /domain-dns-http/);
  assert.match(adminBody, /git-recovery-reflog-reset/);

  const feedAdmin = await fetch(`${siteOrigin}/feed/admin/`, { headers: { Cookie: cookie } });
  assert.equal(feedAdmin.status, 200);
  const feedAdminBody = await feedAdmin.text();
  assert.match(feedAdminBody, /Feed 管理/);
  assert.match(feedAdminBody, /Blog 发布状态/);
  assert.match(feedAdminBody, /从零开始建造数字空间/);
  assert.match(feedAdminBody, /仅供本地预览的草稿/);

  const draftUrl = `${siteOrigin}/blog/draft-preview/`;
  assert.equal((await fetch(draftUrl)).status, 404);
  const updateBlog = async (state) => request(`${siteOrigin}/blog/admin/lifecycle`, {
    method: 'PATCH',
    headers: { Cookie: cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug: 'draft-preview', state }),
  }, `Blog ${state}`);
  assert.equal((await updateBlog('published')).status, 200);
  assert.equal((await fetch(draftUrl)).status, 200);
  assert.equal((await updateBlog('withdrawn')).status, 200);
  assert.equal((await fetch(draftUrl)).status, 404);
  assert.equal((await updateBlog('published')).status, 200);
  assert.equal((await fetch(draftUrl)).status, 200);

  for (const pathname of ['/feed/admin/', '/learn/admin/']) {
    const response = await fetch(`${siteOrigin}${pathname}`, { redirect: 'manual' });
    assert.ok([301, 302, 303, 307, 308].includes(response.status), pathname);
    assert.equal(response.headers.get('location'), '/feed/', pathname);
  }

  for (const [slug, title] of [
    ['domain-dns-http', '域名、DNS 与 HTTP：浏览器如何找到 catstarry.xyz'],
    ['git-recovery-reflog-reset', 'Git 出问题时先找证据：Reflog、Reset 与安全恢复'],
  ]) {
    const preview = await fetch(`${siteOrigin}/learn/preview/${slug}/`, { headers: { Cookie: cookie } });
    assert.equal(preview.status, 200, slug);
    const previewBody = await preview.text();
    assert.match(previewBody, /PRIVATE PREVIEW/, slug);
    assert.match(previewBody, new RegExp(title), slug);
  }

  for (const slug of [
    'vibe-coding-mission',
    'site-context-and-terms',
    'content-canvas-and-accessibility',
    'english-reading-resources',
    'typing-foundation',
  ]) {
    const historical = await fetch(`${siteOrigin}/learn/notes/${slug}/`);
    assert.equal(historical.status, 200, slug);
    assert.match(await historical.text(), /此笔记已退出当前 Learn corpus；页面暂时保留用于历史链接。/, slug);
  }

  const unauthenticated = await fetch(`${siteOrigin}/learn/preview/domain-dns-http/`, { redirect: 'manual' });
  assert.ok([301, 302, 303, 307, 308].includes(unauthenticated.status));
  assert.doesNotMatch(await unauthenticated.text(), /域名、DNS 与 HTTP：浏览器如何找到 catstarry\.xyz/);
  assert.doesNotMatch(output, /\$2[aby]\$/i, 'bcrypt hashes must not be printed');
}

function exitDetails(child) {
  return child.signalCode ? `signal ${child.signalCode}` : `exit code ${child.exitCode}`;
}

function waitForOutput(preview, pattern, timeoutMs = 90_000) {
  return new Promise((resolve, reject) => {
    const { child } = preview;
    const fail = (message) => finish(reject, new Error(`${message}\n${preview.failureContext()}`));
    const onExit = () => fail(`Local preview exited before ${pattern} (${exitDetails(child)})`);
    const onError = (error) => fail(`Local preview failed before ${pattern}: ${error.message}`);
    const onTick = () => {
      if (pattern.test(preview.output())) finish(resolve);
      else if (child.exitCode !== null || child.signalCode !== null) onExit();
    };
    const timer = setInterval(onTick, 100);
    const timeout = setTimeout(() => fail(`Timed out waiting for ${pattern}`), timeoutMs);
    const finish = (settle, value) => {
      clearInterval(timer);
      clearTimeout(timeout);
      child.removeListener('exit', onExit);
      child.removeListener('error', onError);
      settle(value);
    };
    child.once('exit', onExit);
    child.once('error', onError);
    onTick();
  }, 'Feed login');
}

function waitForExit(preview, timeoutMs = 20_000) {
  return new Promise((resolve, reject) => {
    const { child } = preview;
    const finish = (settle, value) => {
      clearTimeout(timer);
      child.removeListener('exit', onExit);
      child.removeListener('error', onError);
      settle(value);
    };
    const onExit = (code, signal) => finish(resolve, { code, signal });
    const onError = (error) => finish(reject, new Error(`Local preview process error: ${error.message}\n${preview.failureContext()}`));
    const timer = setTimeout(() => finish(reject, new Error(`Timed out waiting for local preview to exit\n${preview.failureContext()}`)), timeoutMs);
    child.once('exit', onExit);
    child.once('error', onError);
    if (child.exitCode !== null || child.signalCode !== null) onExit(child.exitCode, child.signalCode);
  });
}

async function waitForOwnerDirectory(preview, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const directory = await previewDirectoryForPid(preview.child.pid);
    if (directory) return directory;
    if (preview.error()) {
      throw new Error(`Local preview failed before creating an owner marker: ${preview.error().message}\n${preview.failureContext()}`);
    }
    if (preview.child.exitCode !== null || preview.child.signalCode !== null) {
      throw new Error(`Local preview exited before creating an owner marker (${exitDetails(preview.child)})\n${preview.failureContext()}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for local preview owner marker\n${preview.failureContext()}`);
}

async function stopProcessTree(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  if (process.platform === 'win32') {
    const killer = spawn('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
    await once(killer, 'exit');
  } else {
    child.kill('SIGTERM');
  }
}

const staleDirectory = await mkdtemp(path.join(os.tmpdir(), 'catstarry-local-preview-lifecycle-stale-'));
await writeFile(path.join(staleDirectory, ownerFile), JSON.stringify({ pid: 2147483647, created_at: new Date(0).toISOString() }));

let preview;
let externallyStoppedPreview;
let legacyStoppedPreview;
try {
  preview = spawnPreview(['--check-only']);
  const checkOnly = await waitForExit(preview);
  assert.deepEqual(checkOnly, { code: 0, signal: null });
  await assert.rejects(readdir(staleDirectory), { code: 'ENOENT' }, 'check-only must recover an abandoned local preview directory');

  const [sitePort, feedPort, financePort] = await freePorts(3);
  preview = spawnPreview([], {
    SITE_PREVIEW_PORT: String(sitePort),
    FEED_PREVIEW_PORT: String(feedPort),
    FINANCE_PREVIEW_PORT: String(financePort),
    LOCAL_PREVIEW_TEST_STOP_AFTER_READY: 'SIGINT',
  });
  const gracefulDirectory = await waitForOwnerDirectory(preview);
  await waitForOutput(preview, /Local previews are ready:/);
  const gracefulExit = await waitForExit(preview);
  assert.deepEqual(gracefulExit, { code: 0, signal: null }, preview.output());
  assert.match(preview.output(), /Local previews are ready:/);
  assert.match(preview.output(), /LOCAL PREVIEW ONLY/);
  assert.match(preview.output(), /Received SIGINT; stopping all local previews/);
  assert.match(preview.output(), /All local previews stopped\./);
  assert.deepEqual(await Promise.all([portIsAvailable(sitePort), portIsAvailable(feedPort), portIsAvailable(financePort)]), [true, true, true]);
  assert.equal(await exists(gracefulDirectory), false, 'a graceful stop must remove its own temporary state');

  const [stopSitePort, stopFeedPort, stopFinancePort] = await freePorts(3);
  const stopEnvironment = {
    SITE_PREVIEW_PORT: String(stopSitePort),
    FEED_PREVIEW_PORT: String(stopFeedPort),
    FINANCE_PREVIEW_PORT: String(stopFinancePort),
  };
  externallyStoppedPreview = spawnPreview([], stopEnvironment);
  const externallyStoppedDirectory = await waitForOwnerDirectory(externallyStoppedPreview);
  await waitForOutput(externallyStoppedPreview, /Local previews are ready:/);
  const stopCommand = spawnPreview(['--stop'], stopEnvironment);
  const stopCommandExit = await waitForExit(stopCommand);
  assert.deepEqual(stopCommandExit, { code: 0, signal: null }, stopCommand.output());
  await waitForExit(externallyStoppedPreview);
  assert.match(stopCommand.output(), /Stopped local preview/);
  assert.deepEqual(await Promise.all([portIsAvailable(stopSitePort), portIsAvailable(stopFeedPort), portIsAvailable(stopFinancePort)]), [true, true, true]);
  assert.equal(await exists(externallyStoppedDirectory), false, 'preview:stop must remove the targeted preview state');
  externallyStoppedPreview = null;

  const [legacySitePort, legacyFeedPort, legacyFinancePort] = await freePorts(3);
  const legacyEnvironment = {
    SITE_PREVIEW_PORT: String(legacySitePort),
    FEED_PREVIEW_PORT: String(legacyFeedPort),
    FINANCE_PREVIEW_PORT: String(legacyFinancePort),
  };
  legacyStoppedPreview = spawnPreview([], legacyEnvironment);
  const legacyDirectory = await waitForOwnerDirectory(legacyStoppedPreview);
  await waitForOutput(legacyStoppedPreview, /Local previews are ready:/);
  const legacyOwner = JSON.parse(await readFile(path.join(legacyDirectory, ownerFile), 'utf8'));
  delete legacyOwner.ports;
  await writeFile(path.join(legacyDirectory, ownerFile), JSON.stringify(legacyOwner));
  const legacyStopCommand = spawnPreview(['--stop'], legacyEnvironment);
  const legacyStopExit = await waitForExit(legacyStopCommand);
  assert.deepEqual(legacyStopExit, { code: 0, signal: null }, legacyStopCommand.output());
  await waitForExit(legacyStoppedPreview);
  assert.match(legacyStopCommand.output(), /Stopped local preview/);
  assert.deepEqual(await Promise.all([portIsAvailable(legacySitePort), portIsAvailable(legacyFeedPort), portIsAvailable(legacyFinancePort)]), [true, true, true]);
  assert.equal(await exists(legacyDirectory), false, 'preview:stop must safely recover one legacy preview state');
  legacyStoppedPreview = null;

  const [forceSitePort, forceFeedPort, forceFinancePort] = await freePorts(3);
  preview = spawnPreview([], {
    SITE_PREVIEW_PORT: String(forceSitePort),
    FEED_PREVIEW_PORT: String(forceFeedPort),
    FINANCE_PREVIEW_PORT: String(forceFinancePort),
  });
  const forcedDirectory = await waitForOwnerDirectory(preview);
  await waitForOutput(preview, /Local previews are ready:/);
  await verifyLocalAuthoringWorkflow({
    sitePort: forceSitePort,
    feedPort: forceFeedPort,
    output: preview.output(),
  });
  const forcedExit = waitForExit(preview);
  await stopProcessTree(preview.child);
  await forcedExit;
  preview = spawnPreview(['--check-only']);
  const recoveryExit = await waitForExit(preview);
  assert.deepEqual(recoveryExit, { code: 0, signal: null });
  assert.equal(await exists(forcedDirectory), false, 'the next launch must recover state left by a forced stop');
  console.log('Local preview lifecycle contract passed.');
} finally {
  if (preview) await stopProcessTree(preview.child);
  if (externallyStoppedPreview) await stopProcessTree(externallyStoppedPreview.child);
  if (legacyStoppedPreview) await stopProcessTree(legacyStoppedPreview.child);
  await rm(staleDirectory, { recursive: true, force: true });
}
