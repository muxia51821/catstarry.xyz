import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
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

async function previewDirectories() {
  const entries = await readdir(os.tmpdir(), { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('catstarry-local-preview-'))
    .map((entry) => entry.name)
    .sort();
}

function spawnPreview(args, env) {
  const child = spawn(node, ['scripts/local-preview.mjs', ...args], {
    cwd: root,
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  let output = '';
  child.stdout.on('data', (chunk) => { output += chunk; });
  child.stderr.on('data', (chunk) => { output += chunk; });
  return { child, output: () => output };
}

function waitForOutput(process, pattern, timeoutMs = 90_000) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;
    const timer = setInterval(() => {
      if (pattern.test(process.output())) {
        clearInterval(timer);
        resolve();
      } else if (Date.now() >= deadline) {
        clearInterval(timer);
        reject(new Error(`Timed out waiting for ${pattern}; output:\n${process.output()}`));
      }
    }, 100);
  });
}

function waitForExit(child, timeoutMs = 20_000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timed out waiting for local preview to exit')), timeoutMs);
    child.once('exit', (code, signal) => { clearTimeout(timer); resolve({ code, signal }); });
  });
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
try {
  preview = spawnPreview(['--check-only']);
  const checkOnly = await waitForExit(preview.child);
  assert.deepEqual(checkOnly, { code: 0, signal: null });
  await assert.rejects(readdir(staleDirectory), { code: 'ENOENT' }, 'check-only must recover an abandoned local preview directory');

  const before = await previewDirectories();
  const [sitePort, feedPort, financePort] = await freePorts(3);
  preview = spawnPreview([], {
    SITE_PREVIEW_PORT: String(sitePort),
    FEED_PREVIEW_PORT: String(feedPort),
    FINANCE_PREVIEW_PORT: String(financePort),
    LOCAL_PREVIEW_TEST_STOP_AFTER_READY: 'SIGINT',
  });
  const gracefulExit = await waitForExit(preview.child);
  assert.deepEqual(gracefulExit, { code: 0, signal: null }, preview.output());
  assert.match(preview.output(), /Local previews are ready:/);
  assert.match(preview.output(), /Received SIGINT; stopping all local previews/);
  assert.match(preview.output(), /All local previews stopped\./);
  assert.deepEqual(await Promise.all([portIsAvailable(sitePort), portIsAvailable(feedPort), portIsAvailable(financePort)]), [true, true, true]);
  assert.deepEqual(await previewDirectories(), before, 'a graceful stop must remove its temporary state');

  const [forceSitePort, forceFeedPort, forceFinancePort] = await freePorts(3);
  preview = spawnPreview([], {
    SITE_PREVIEW_PORT: String(forceSitePort),
    FEED_PREVIEW_PORT: String(forceFeedPort),
    FINANCE_PREVIEW_PORT: String(forceFinancePort),
  });
  await waitForOutput(preview, /Local previews are ready:/);
  const forcedExit = waitForExit(preview.child);
  await stopProcessTree(preview.child);
  await forcedExit;
  preview = spawnPreview(['--check-only']);
  const recoveryExit = await waitForExit(preview.child);
  assert.deepEqual(recoveryExit, { code: 0, signal: null });
  assert.deepEqual(await previewDirectories(), before, 'the next launch must recover state left by a forced stop');
  console.log('Local preview lifecycle contract passed.');
} finally {
  if (preview) await stopProcessTree(preview.child);
  await rm(staleDirectory, { recursive: true, force: true });
}
