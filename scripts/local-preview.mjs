import { spawn } from 'node:child_process';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const node = process.execPath;
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const astro = path.join(root, 'node_modules', 'astro', 'bin', 'astro.mjs');
const npmRunner = process.env.npm_execpath
  ? { command: node, prefix: [process.env.npm_execpath] }
  : { command: npm, prefix: [] };
const wrangler = path.join(root, 'node_modules', 'wrangler', 'bin', 'wrangler.js');
const feedConfig = path.join(root, 'workers', 'feed-api', 'wrangler.jsonc');
const checkOnly = process.argv.includes('--check-only');
const smokeOnly = process.argv.includes('--smoke-only');
if (checkOnly && smokeOnly) throw new Error('--check-only and --smoke-only cannot be used together');

function portFromEnv(name, fallback) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(value) || value < 1 || value > 65535) {
    throw new Error(`${name} must be a valid TCP port`);
  }
  return value;
}

const sitePort = portFromEnv('SITE_PREVIEW_PORT', '4321');
const feedPort = portFromEnv('FEED_PREVIEW_PORT', '8787');
const financePort = portFromEnv('FINANCE_PREVIEW_PORT', '8788');
const ports = new Set([sitePort, feedPort, financePort]);
if (ports.size !== 3) throw new Error('SITE_PREVIEW_PORT, FEED_PREVIEW_PORT, and FINANCE_PREVIEW_PORT must be different');

const siteOrigin = `http://127.0.0.1:${sitePort}`;
const feedOrigin = `http://127.0.0.1:${feedPort}`;
const financeOrigin = `http://127.0.0.1:${financePort}`;
const serviceReadyTimeoutMs = 60_000;
const serviceReadyPollMs = 250;
const migrationPollMs = 250;
const migrationCompletionTimeoutMs = 30_000;
const feedMigrationsDir = path.join(root, 'workers', 'feed-api', 'migrations');

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function spawnOptions(command, env) {
  return {
    cwd: root,
    env,
    stdio: 'inherit',
    windowsHide: true,
    shell: process.platform === 'win32' && command.toLowerCase().endsWith('.cmd'),
  };
}

function runCommand(command, args, label, env = process.env) {
  console.log(`[local-preview] ${label}`);
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, spawnOptions(command, env));
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`${label} failed${signal ? ` (${signal})` : ` with exit code ${code}`}`));
    });
  });
}

function startService(label, command, args, env) {
  const child = spawn(command, args, spawnOptions(command, env));
  const service = { label, child, stopped: false };
  const exit = new Promise((resolve) => {
    child.once('error', (error) => { service.stopped = true; resolve({ code: 1, error }); });
    child.once('exit', (code, signal) => { service.stopped = true; resolve({ code: code ?? 1, signal }); });
  });
  service.exit = exit;
  return service;
}

async function waitForHttp(url, label, service, shouldStop) {
  let lastError = null;
  const deadline = Date.now() + serviceReadyTimeoutMs;
  while (Date.now() < deadline) {
    if (shouldStop()) return false;
    if (service.stopped) {
      throw new Error(`${label} exited before becoming ready`);
    }
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1_000) });
      if (response.ok) return true;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    if (shouldStop()) return false;
    await sleep(serviceReadyPollMs);
  }
  if (shouldStop()) return false;
  throw new Error(`${label} did not become ready within ${serviceReadyTimeoutMs / 1_000} seconds at ${url}: ${lastError instanceof Error ? lastError.message : 'unknown error'}`);
}

async function stopService(service) {
  if (service.stopped) return;
  if (process.platform === 'win32') {
    await new Promise((resolve) => {
      const killer = spawn('taskkill.exe', ['/PID', String(service.child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
      killer.once('close', resolve);
      killer.once('error', resolve);
    });
  } else {
    service.child.kill('SIGTERM');
  }
  await Promise.race([service.exit, sleep(5_000)]);
}

function isRetryableLocalD1InspectionError(error) {
  if (!(error instanceof Error)) return false;
  if ('code' in error && error.code === 'ENOENT') return true;
  return /database is locked|disk i\/o error|no such table: d1_migrations/i.test(error.message);
}

async function localFeedMigrationsApplied(persist) {
  const migrationEntries = await readdir(feedMigrationsDir, { withFileTypes: true });
  const expected = migrationEntries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.sql'))
    .map((entry) => entry.name);
  const d1Root = path.join(persist, 'v3', 'd1', 'miniflare-D1DatabaseObject');
  let d1Entries;
  try {
    d1Entries = await readdir(d1Root, { withFileTypes: true });
  } catch (error) {
    if (isRetryableLocalD1InspectionError(error)) return false;
    throw error;
  }
  const databasePaths = d1Entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.sqlite') && entry.name !== 'metadata.sqlite')
    .map((entry) => path.join(d1Root, entry.name));
  for (const directory of d1Entries) {
    if (!directory.isDirectory()) continue;
    const directoryPath = path.join(d1Root, directory.name);
    let files;
    try {
      files = await readdir(directoryPath, { withFileTypes: true });
    } catch (error) {
      if (isRetryableLocalD1InspectionError(error)) continue;
      throw error;
    }
    databasePaths.push(...files
      .filter((file) => file.isFile() && file.name.endsWith('.sqlite') && file.name !== 'metadata.sqlite')
      .map((file) => path.join(directoryPath, file.name)));
  }
  for (const databasePath of databasePaths) {
    let connection;
    try {
      connection = new DatabaseSync(databasePath, { readOnly: true });
      const applied = new Set(connection.prepare('SELECT name FROM d1_migrations').all().map((row) => row.name));
      if (expected.every((name) => applied.has(name))) return true;
    } catch (error) {
      if (isRetryableLocalD1InspectionError(error)) continue;
      throw error;
    } finally {
      connection?.close();
    }
  }
  return false;
}

async function prepareLocalFeedDatabase(persist, env) {
  console.log('[local-preview] Prepare temporary local Feed database');
  const migration = startService('Local Feed database preparation', node, [
    wrangler,
    'd1',
    'migrations',
    'apply',
    'catstarry-db',
    '--local',
    '--persist-to',
    persist,
    '--config',
    feedConfig,
  ], env);
  const deadline = Date.now() + migrationCompletionTimeoutMs;
  while (Date.now() < deadline) {
    const outcome = await Promise.race([migration.exit, sleep(migrationPollMs).then(() => null)]);
    if (outcome) {
      if (outcome.code === 0) return;
      throw new Error(`Prepare temporary local Feed database failed${outcome.signal ? ` (${outcome.signal})` : ` with exit code ${outcome.code}`}`);
    }
    if (await localFeedMigrationsApplied(persist)) {
      await stopService(migration);
      console.log('[local-preview] Local Feed database is ready.');
      return;
    }
  }
  await stopService(migration);
  throw new Error(`[local-preview] Local Feed database did not complete within ${migrationCompletionTimeoutMs / 1_000} seconds.`);
}

async function runQuickVerification() {
  await runCommand(npmRunner.command, [...npmRunner.prefix, 'run', 'test:feed:page'], 'Feed page quick verification');
  await runCommand(npmRunner.command, [...npmRunner.prefix, 'run', 'test:finance:preview'], 'Finance preview quick verification');
}

async function main() {
  let persist;
  const services = [];
  let stopRequested = false;
  let signalStop;
  const signalPromise = new Promise((resolve) => { signalStop = resolve; });
  const onSignal = (signal) => {
    if (stopRequested) return;
    stopRequested = true;
    console.log(`\n[local-preview] Received ${signal}; stopping all local previews...`);
    signalStop({ code: 0, requested: true });
  };

  try {
    await runQuickVerification();
    if (stopRequested) return 0;
    if (checkOnly) {
      console.log('[local-preview] Quick verification passed.');
      return 0;
    }

    persist = await mkdtemp(path.join(os.tmpdir(), 'catstarry-local-preview-'));
    const feedEnv = { ...process.env, XDG_CONFIG_HOME: path.join(persist, 'xdg') };
    await prepareLocalFeedDatabase(persist, feedEnv);
    process.on('SIGINT', onSignal);
    process.on('SIGTERM', onSignal);

    const feed = startService('Feed Worker', node, [
      wrangler,
      'dev',
      '--local',
      '--persist-to', persist,
      '--config', feedConfig,
      '--port', String(feedPort),
      '--var', `SITE_ORIGIN:${siteOrigin}`,
      '--var', 'FOOTPRINT_INGEST_TOKEN:local-preview-token',
      '--var', 'CLIP_PREVIEW_ALLOWED_HOSTS:developer.mozilla.org',
    ], feedEnv);
    services.push(feed);
    if (!await waitForHttp(`${feedOrigin}/api/feed`, 'Local Feed API', feed, () => stopRequested)) return 0;

    const finance = startService('Finance preview', node, ['scripts/finance-preview.mjs'], {
      ...process.env,
      FINANCE_PREVIEW_PORT: String(financePort),
    });
    services.push(finance);

    const site = startService('Astro site preview', node, [
      astro,
      'dev',
      '--host',
      '127.0.0.1',
      '--port',
      String(sitePort),
    ], {
      ...process.env,
      ASTRO_DEV_BACKGROUND: '0',
      FEED_API_URL: feedOrigin,
      PUBLIC_FEED_API_URL: feedOrigin,
    });
    services.push(site);

    const ready = await Promise.all([
      waitForHttp(siteOrigin, 'Astro site', site, () => stopRequested),
      waitForHttp(financeOrigin, 'Finance preview', finance, () => stopRequested),
    ]);
    if (stopRequested || ready.includes(false)) return 0;

    console.log('');
    console.log('Local previews are ready:');
    console.log(`  catstarry.xyz  ${siteOrigin}/`);
    console.log(`  f.catstarry.xyz ${financeOrigin}/`);
    console.log(`  Feed API       ${feedOrigin}/api/feed`);
    console.log('Feed starts with an empty local database. Press Ctrl+C to stop all previews and clean temporary state.');

    if (smokeOnly) {
      await sleep(1_000);
      console.log('[local-preview] Startup smoke passed.');
      return 0;
    }

    const result = await Promise.race([
      Promise.race(services.map(async (service) => ({ service, ...(await service.exit) }))),
      signalPromise,
    ]);
    if (!result.requested) await Promise.race([signalPromise, sleep(100)]);
    if (result.requested || stopRequested) return 0;
    console.error(`[local-preview] ${result.service.label} stopped unexpectedly.`);
    return 1;
  } catch (error) {
    if (stopRequested) return 0;
    throw error;
  } finally {
    process.removeListener('SIGINT', onSignal);
    process.removeListener('SIGTERM', onSignal);
    await Promise.all(services.slice().reverse().map(stopService));
    if (persist) await rm(persist, { recursive: true, force: true, maxRetries: 8, retryDelay: 250 });
    if (stopRequested) console.log('[local-preview] All local previews stopped.');
  }
}

try {
  process.exitCode = await main();
} catch (error) {
  console.error(`[local-preview] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
