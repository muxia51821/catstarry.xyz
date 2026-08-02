import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
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

async function waitForHttp(url, label, service) {
  let lastError = null;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (service.stopped) {
      throw new Error(`${label} exited before becoming ready`);
    }
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1_000) });
      if (response.ok) return;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await sleep(250);
  }
  throw new Error(`${label} did not become ready at ${url}: ${lastError instanceof Error ? lastError.message : 'unknown error'}`);
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

async function runQuickVerification() {
  await runCommand(npmRunner.command, [...npmRunner.prefix, 'run', 'test:feed:page'], 'Feed page quick verification');
  await runCommand(npmRunner.command, [...npmRunner.prefix, 'run', 'test:finance:preview'], 'Finance preview quick verification');
}

async function main() {
  await runQuickVerification();
  if (checkOnly) {
    console.log('[local-preview] Quick verification passed.');
    return 0;
  }

  let persist;
  const services = [];
  let signalStop;
  const signalPromise = new Promise((resolve) => { signalStop = resolve; });
  const onSignal = () => signalStop({ code: 0, requested: true });
  process.once('SIGINT', onSignal);
  process.once('SIGTERM', onSignal);

  try {
    persist = await mkdtemp(path.join(os.tmpdir(), 'catstarry-local-preview-'));
    const feedEnv = { ...process.env, XDG_CONFIG_HOME: path.join(persist, 'xdg') };
    await runCommand(
      node,
      [wrangler, 'd1', 'migrations', 'apply', 'catstarry-db', '--local', '--persist-to', persist, '--config', feedConfig],
      'Prepare temporary local Feed database',
      feedEnv,
    );

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
    await waitForHttp(`${feedOrigin}/api/feed`, 'Local Feed API', feed);

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

    await Promise.all([
      waitForHttp(siteOrigin, 'Astro site', site),
      waitForHttp(financeOrigin, 'Finance preview', finance),
    ]);

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
    if (result.requested) return 0;
    console.error(`[local-preview] ${result.service.label} stopped unexpectedly.`);
    return 1;
  } finally {
    process.removeListener('SIGINT', onSignal);
    process.removeListener('SIGTERM', onSignal);
    await Promise.all(services.slice().reverse().map(stopService));
    if (persist) await rm(persist, { recursive: true, force: true, maxRetries: 8, retryDelay: 250 });
  }
}

try {
  process.exitCode = await main();
} catch (error) {
  console.error(`[local-preview] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
