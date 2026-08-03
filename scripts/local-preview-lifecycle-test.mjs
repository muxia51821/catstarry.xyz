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
  });
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
  const gracefulExit = await waitForExit(preview);
  assert.deepEqual(gracefulExit, { code: 0, signal: null }, preview.output());
  assert.match(preview.output(), /Local previews are ready:/);
  assert.match(preview.output(), /Received SIGINT; stopping all local previews/);
  assert.match(preview.output(), /All local previews stopped\./);
  assert.deepEqual(await Promise.all([portIsAvailable(sitePort), portIsAvailable(feedPort), portIsAvailable(financePort)]), [true, true, true]);
  assert.equal(await exists(gracefulDirectory), false, 'a graceful stop must remove its own temporary state');

  const [forceSitePort, forceFeedPort, forceFinancePort] = await freePorts(3);
  preview = spawnPreview([], {
    SITE_PREVIEW_PORT: String(forceSitePort),
    FEED_PREVIEW_PORT: String(forceFeedPort),
    FINANCE_PREVIEW_PORT: String(forceFinancePort),
  });
  const forcedDirectory = await waitForOwnerDirectory(preview);
  await waitForOutput(preview, /Local previews are ready:/);
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
  await rm(staleDirectory, { recursive: true, force: true });
}
