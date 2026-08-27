import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { access, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { readBlogPublicationEntries } from './lib/blog-publications.mjs';
import {
  localPreviewFixtureSummary,
  localPreviewFixtureSql,
  readLocalPreviewFixture,
} from './lib/local-preview-fixtures.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const node = process.execPath;
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const astro = path.join(root, 'node_modules', 'astro', 'bin', 'astro.mjs');
const feedUserRecord = path.join(root, 'scripts', 'feed-user-record.mjs');
const npmRunner = process.env.npm_execpath
  ? { command: node, prefix: [process.env.npm_execpath] }
  : { command: npm, prefix: [] };
const wrangler = path.join(root, 'node_modules', 'wrangler', 'bin', 'wrangler.js');
const feedConfig = path.join(root, 'workers', 'feed-api', 'wrangler.jsonc');
const checkOnly = process.argv.includes('--check-only');
const smokeOnly = process.argv.includes('--smoke-only');
const stopOnly = process.argv.includes('--stop');
if ([checkOnly, smokeOnly, stopOnly].filter(Boolean).length > 1) {
  throw new Error('--check-only, --smoke-only, and --stop cannot be used together');
}

function portFromEnv(name, fallback) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(value) || value < 0 || value > 65535) {
    throw new Error(`${name} must be a valid TCP port or 0 for automatic allocation`);
  }
  return value;
}

let sitePort = portFromEnv('SITE_PREVIEW_PORT', '4321');
let feedPort = portFromEnv('FEED_PREVIEW_PORT', '8787');
let financePort = portFromEnv('FINANCE_PREVIEW_PORT', '8788');
const configuredPorts = [sitePort, feedPort, financePort].filter((port) => port !== 0);
if (new Set(configuredPorts).size !== configuredPorts.length) {
  throw new Error('SITE_PREVIEW_PORT, FEED_PREVIEW_PORT, and FINANCE_PREVIEW_PORT must be different');
}
let siteOrigin = `http://127.0.0.1:${sitePort}`;
let feedOrigin = `http://127.0.0.1:${feedPort}`;
let financeOrigin = `http://127.0.0.1:${financePort}`;
const serviceReadyTimeoutMs = 60_000;
const serviceReadyPollMs = 250;
const migrationPollMs = 250;
const migrationCompletionTimeoutMs = 30_000;
const feedMigrationsDir = path.join(root, 'workers', 'feed-api', 'migrations');
const localPreviewDirectoryPrefix = 'catstarry-local-preview-';
const localPreviewOwnerFile = '.catstarry-local-preview-owner.json';

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function processIsRunning(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code !== 'ESRCH';
  }
}

async function readPreviewOwners() {
  const entries = await readdir(os.tmpdir(), { withFileTypes: true });
  const owners = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || !entry.name.startsWith(localPreviewDirectoryPrefix)) continue;
    const directory = path.join(os.tmpdir(), entry.name);
    try {
      owners.push({ directory, owner: JSON.parse(await readFile(path.join(directory, localPreviewOwnerFile), 'utf8')) });
    } catch {
      // Ignore unrelated and partially-created temporary directories.
    }
  }
  return owners;
}

async function recoverAbandonedLocalPreviewState() {
  let recovered = 0;
  for (const { directory, owner } of await readPreviewOwners()) {
    const pid = Number(owner?.pid);
    if (!Number.isInteger(pid) || pid <= 0 || processIsRunning(pid)) continue;
    await rm(directory, { recursive: true, force: true, maxRetries: 8, retryDelay: 250 });
    recovered += 1;
  }
  if (recovered) console.log(`[local-preview] Recovered ${recovered} abandoned local preview state ${recovered === 1 ? 'directory' : 'directories'}.`);
}

function previewPortsMatch(owner) {
  const ports = owner?.ports;
  return Number(ports?.site) === sitePort
    && Number(ports?.feed) === feedPort
    && Number(ports?.finance) === financePort;
}

async function processCommandLine(pid) {
  if (process.platform !== 'win32') return '';
  return new Promise((resolve) => {
    const command = `& { $process = Get-CimInstance Win32_Process -Filter 'ProcessId = ${pid}'; if ($process) { [Console]::Out.Write($process.CommandLine) } }`;
    const child = spawn('pwsh.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', command], {
      stdio: ['ignore', 'pipe', 'ignore'],
      windowsHide: true,
    });
    let output = '';
    child.stdout.on('data', (chunk) => { output += chunk; });
    child.once('close', () => resolve(output));
    child.once('error', () => resolve(''));
  });
}

async function isLocalPreviewController(pid) {
  if (!processIsRunning(pid)) return false;
  if (process.platform !== 'win32') return true;
  const command = await processCommandLine(pid);
  return /(?:^|[\s"'\\/])scripts[\\/]local-preview\.mjs(?:\s|$)/i.test(command);
}

async function stopProcessTree(pid) {
  if (process.platform === 'win32') {
    await new Promise((resolve) => {
      const killer = spawn('taskkill.exe', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
      killer.once('close', resolve);
      killer.once('error', resolve);
    });
    return;
  }
  try {
    process.kill(pid, 'SIGTERM');
  } catch (error) {
    if (error?.code !== 'ESRCH') throw error;
  }
}

async function waitForPreviewCleanup(directory, pid, timeoutMs = 10_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      await access(directory);
    } catch (error) {
      if (error?.code === 'ENOENT') return;
      throw error;
    }
    if (!processIsRunning(pid)) {
      await rm(directory, { recursive: true, force: true, maxRetries: 8, retryDelay: 250 });
      return;
    }
    await sleep(100);
  }
  throw new Error(`Timed out waiting for local preview PID ${pid} to clean its owner state`);
}

async function stopLocalPreview() {
  await recoverAbandonedLocalPreviewState();
  const owners = await readPreviewOwners();
  let candidates = owners.filter(({ owner }) => previewPortsMatch(owner));
  if (candidates.length === 0) {
    const legacyCandidates = [];
    for (const candidate of owners) {
      if (candidate.owner?.ports) continue;
      const pid = Number(candidate.owner?.pid);
      if (Number.isInteger(pid) && pid > 0 && await isLocalPreviewController(pid)) legacyCandidates.push(candidate);
    }
    if (legacyCandidates.length === 1) candidates = legacyCandidates;
    if (legacyCandidates.length > 1) throw new Error('[local-preview] More than one legacy local preview is running; refusing to guess which one to stop.');
  }
  if (candidates.length === 0) {
    console.log('[local-preview] No running local preview matches the requested ports.');
    return 0;
  }
  if (candidates.length > 1) throw new Error('[local-preview] More than one local preview matches the requested ports.');

  const { directory, owner } = candidates[0];
  const pid = Number(owner?.pid);
  if (!Number.isInteger(pid) || pid <= 0 || !await isLocalPreviewController(pid)) {
    throw new Error(`[local-preview] Refusing to stop PID ${String(owner?.pid)} because it is not an active local-preview controller.`);
  }
  await stopProcessTree(pid);
  await waitForPreviewCleanup(directory, pid);
  console.log(`[local-preview] Stopped local preview on ports ${sitePort}/${feedPort}/${financePort}.`);
  return 0;
}

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

function runCapturedCommand(command, args, label, env = process.env) {
  console.log(`[local-preview] ${label}`);
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { ...spawnOptions(command, env), stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(`${label} failed${signal ? ` (${signal})` : ` with exit code ${code}`}${stderr.trim() ? `: ${stderr.trim()}` : ''}`));
    });
  });
}

function startService(label, command, args, env, { captureOutput = false, interactive = false } = {}) {
  const stdin = interactive ? 'inherit' : 'ignore';
  const child = spawn(command, args, {
    ...spawnOptions(command, env),
    detached: process.platform !== 'win32',
    stdio: captureOutput ? [stdin, 'pipe', 'pipe'] : [stdin, 'inherit', 'inherit'],
  });
  const service = { label, child, stopped: false, outcome: null, output: '', collectOutput: captureOutput };
  if (captureOutput) {
    child.stdout.on('data', (chunk) => {
      if (service.collectOutput) service.output += chunk.toString();
      process.stdout.write(chunk);
    });
    child.stderr.on('data', (chunk) => {
      if (service.collectOutput) service.output += chunk.toString();
      process.stderr.write(chunk);
    });
  }
  const exit = new Promise((resolve) => {
    child.once('error', (error) => { service.stopped = true; service.outcome = { code: 1, error }; resolve(service.outcome); });
    child.once('exit', (code, signal) => { service.stopped = true; service.outcome = { code: code ?? 1, signal }; resolve(service.outcome); });
  });
  service.exit = exit;
  return service;
}

async function waitForAstroPort(service, shouldStop) {
  const deadline = Date.now() + serviceReadyTimeoutMs;
  while (Date.now() < deadline) {
    if (shouldStop()) return null;
    if (service.stopped) {
      const detail = service.outcome?.signal ? ` (${service.outcome.signal})` : ` with exit code ${service.outcome?.code ?? 'unknown'}`;
      throw new Error(`Astro site exited before reporting its local URL${detail}`);
    }
    const match = service.output.match(/http:\/\/127\.0\.0\.1:(\d+)\//);
    if (match) {
      service.collectOutput = false;
      service.output = '';
      return Number(match[1]);
    }
    await sleep(serviceReadyPollMs);
  }
  throw new Error(`Astro site did not report its local URL within ${serviceReadyTimeoutMs / 1_000} seconds`);
}

async function waitForHttp(url, label, service, shouldStop) {
  let lastError = null;
  const deadline = Date.now() + serviceReadyTimeoutMs;
  while (Date.now() < deadline) {
    if (shouldStop()) return false;
    if (service.stopped) {
      const detail = service.outcome?.signal ? ` (${service.outcome.signal})` : ` with exit code ${service.outcome?.code ?? 'unknown'}`;
      throw new Error(`${label} exited before becoming ready${detail}`);
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
  if (process.platform === 'win32') {
    if (service.stopped) return;
    await stopProcessTree(service.child.pid);
    await Promise.race([service.exit, sleep(5_000)]);
    return;
  } else {
    try {
      process.kill(-service.child.pid, 'SIGTERM');
    } catch (error) {
      if (error?.code !== 'ESRCH') throw error;
    }
  }
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    try {
      process.kill(-service.child.pid, 0);
    } catch (error) {
      if (error?.code === 'ESRCH') return;
      throw error;
    }
    await sleep(100);
  }
  try {
    process.kill(-service.child.pid, 'SIGKILL');
  } catch (error) {
    if (error?.code !== 'ESRCH') throw error;
  }
  await Promise.race([service.exit, sleep(1_000)]);
}

async function reservePort(requestedPort) {
  const server = net.createServer();
  const sockets = new Set();
  server.on('connection', (socket) => {
    sockets.add(socket);
    socket.once('close', () => sockets.delete(socket));
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(requestedPort, '127.0.0.1', resolve);
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Could not reserve a local preview port');
  return { port: address.port, server, sockets };
}

async function releasePort(reservation) {
  if (!reservation?.server.listening) return;
  for (const socket of reservation.sockets ?? []) socket.destroy();
  await new Promise((resolve, reject) => reservation.server.close((error) => error ? reject(error) : resolve()));
}

async function reservePorts(requestedPorts) {
  const reservations = [];
  try {
    for (const requestedPort of requestedPorts) reservations.push(await reservePort(requestedPort));
    return reservations;
  } catch (error) {
    await Promise.all(reservations.map(releasePort));
    throw error;
  }
}

function isRetryableLocalD1InspectionError(error) {
  if (!(error instanceof Error)) return false;
  if ('code' in error && error.code === 'ENOENT') return true;
  return /database is locked|disk i\/o error|no such table: d1_migrations/i.test(error.message);
}

async function localFeedDatabasePaths(persist) {
  const d1Root = path.join(persist, 'v3', 'd1', 'miniflare-D1DatabaseObject');
  const d1Entries = await readdir(d1Root, { withFileTypes: true });
  const databasePaths = d1Entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.sqlite') && entry.name !== 'metadata.sqlite')
    .map((entry) => path.join(d1Root, entry.name));
  for (const directory of d1Entries) {
    if (!directory.isDirectory()) continue;
    const directoryPath = path.join(d1Root, directory.name);
    const files = await readdir(directoryPath, { withFileTypes: true });
    databasePaths.push(...files
      .filter((file) => file.isFile() && file.name.endsWith('.sqlite') && file.name !== 'metadata.sqlite')
      .map((file) => path.join(directoryPath, file.name)));
  }
  return databasePaths;
}

async function localFeedMigrationsApplied(persist) {
  const migrationEntries = await readdir(feedMigrationsDir, { withFileTypes: true });
  const expected = migrationEntries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.sql'))
    .map((entry) => entry.name);
  let databasePaths;
  try {
    databasePaths = await localFeedDatabasePaths(persist);
  } catch (error) {
    if (isRetryableLocalD1InspectionError(error)) return false;
    throw error;
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

async function seedLocalPreviewFixtures(persist, fixture, env) {
  const sqlPath = path.join(persist, 'local-preview-visual-fixture.sql');
  const signalsPath = path.join(persist, 'local-preview-activity-signals.json');
  await writeFile(sqlPath, localPreviewFixtureSql(fixture), 'utf8');
  await writeFile(signalsPath, JSON.stringify(fixture.activitySignals), 'utf8');
  await runCommand(node, [
    wrangler,
    'd1',
    'execute',
    'catstarry-db',
    '--local',
    '--persist-to', persist,
    '--config', feedConfig,
    '--file', sqlPath,
  ], 'Seed temporary local visual database', env);
  await runCommand(node, [
    wrangler,
    'r2',
    'object',
    'put',
    'home-projections/activity-signals.json',
    '--local',
    '--persist-to', persist,
    '--file', signalsPath,
    '--content-type', 'application/json',
    '--cache-control', 'public, max-age=60, stale-while-revalidate=300',
  ], 'Seed temporary local Home signals', env);
}

async function prepareLocalFeedDatabase(persist, env) {
  console.log('[local-preview] Prepare temporary local Feed database');
  const attempts = 3;
  let lastFailure;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    let attemptFailure;
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
    ], env, { interactive: true });
    const deadline = Date.now() + migrationCompletionTimeoutMs;
    while (Date.now() < deadline) {
      const outcome = await Promise.race([migration.exit, sleep(migrationPollMs).then(() => null)]);
      if (outcome) {
        if (outcome.code === 0) return;
        attemptFailure = `exit code ${outcome.code ?? 'unknown'}${outcome.signal ? ` (${outcome.signal})` : ''}`;
        break;
      }
      if (await localFeedMigrationsApplied(persist)) {
        await stopService(migration);
        console.log('[local-preview] Local Feed database is ready.');
        return;
      }
    }
    if (!attemptFailure) {
      await stopService(migration);
      attemptFailure = `did not complete within ${migrationCompletionTimeoutMs / 1_000} seconds`;
    }
    lastFailure = attemptFailure;
    if (attempt < attempts) {
      console.warn(`[local-preview] Temporary local Feed database attempt ${attempt} failed (${lastFailure}); retrying.`);
      await sleep(1_000 * attempt);
    }
  }
  throw new Error(`[local-preview] Prepare temporary local Feed database failed after ${attempts} attempts (${lastFailure}).`);
}

function localPreviewCredentials() {
  const username = (process.env.LOCAL_PREVIEW_USERNAME ?? 'local-preview').trim();
  const password = process.env.LOCAL_PREVIEW_PASSWORD ?? randomBytes(24).toString('base64url');
  if (!/^[A-Za-z0-9._-]{1,64}$/.test(username)) throw new Error('LOCAL_PREVIEW_USERNAME must contain 1 to 64 ASCII username characters');
  const passwordBytes = Buffer.byteLength(password, 'utf8');
  if (passwordBytes < 12 || passwordBytes > 72) throw new Error('LOCAL_PREVIEW_PASSWORD must contain 12 to 72 UTF-8 bytes');
  return { username, password };
}

async function prepareLocalPreviewAuth(persist, env) {
  const credentials = localPreviewCredentials();
  const recordOutput = await runCapturedCommand(node, [feedUserRecord, credentials.username], 'Prepare temporary local Feed auth user', {
    ...env,
    FEED_PASSWORD: credentials.password,
  });
  let record;
  try {
    record = JSON.parse(recordOutput);
  } catch {
    throw new Error('Temporary local Feed auth user record was invalid');
  }
  if (record?.key !== `user:${credentials.username}` || record?.value?.role !== 'admin' || typeof record?.value?.password_hash !== 'string') {
    throw new Error('Temporary local Feed auth user record did not match the auth contract');
  }

  return { ...credentials, passwordHash: record.value.password_hash };
}

async function prepareLocalBlogLifecycle(feedOrigin) {
  const response = await fetch(`${feedOrigin}/api/blog/internal/publications`, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer local-preview-token',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      deployed_at: new Date().toISOString(),
      entries: await readBlogPublicationEntries(),
    }),
  });
  if (!response.ok) throw new Error(`Local Blog lifecycle initialization failed (${response.status}): ${await response.text()}`);
}

async function runQuickVerification() {
  const env = { ...process.env };
  delete env.SITE_PREVIEW_PORT;
  delete env.FEED_PREVIEW_PORT;
  delete env.FINANCE_PREVIEW_PORT;
  await runCommand(npmRunner.command, [...npmRunner.prefix, 'run', 'test:feed:page'], 'Feed page quick verification', env);
  await runCommand(npmRunner.command, [...npmRunner.prefix, 'run', 'test:finance:preview'], 'Finance preview quick verification', env);
}

async function main() {
  let persist;
  let reservations = [];
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
    process.on('SIGINT', onSignal);
    process.on('SIGTERM', onSignal);
    await recoverAbandonedLocalPreviewState();
    if (stopOnly) return await stopLocalPreview();
    if (checkOnly) {
      await runQuickVerification();
      console.log('[local-preview] Quick verification passed.');
      return 0;
    }

    await runQuickVerification();
    if (stopRequested) return 0;

    reservations = await reservePorts([sitePort, feedPort, financePort]);
    [sitePort, feedPort, financePort] = reservations.map((reservation) => reservation.port);
    const ports = new Set([sitePort, feedPort, financePort]);
    if (ports.size !== 3) throw new Error('SITE_PREVIEW_PORT, FEED_PREVIEW_PORT, and FINANCE_PREVIEW_PORT must be different');
    siteOrigin = `http://127.0.0.1:${sitePort}`;
    feedOrigin = `http://127.0.0.1:${feedPort}`;
    financeOrigin = `http://127.0.0.1:${financePort}`;

    persist = await mkdtemp(path.join(os.tmpdir(), localPreviewDirectoryPrefix));
    const ownerPath = path.join(persist, localPreviewOwnerFile);
    const createdAt = new Date().toISOString();
    const writeOwnerState = () => writeFile(ownerPath, JSON.stringify({
      pid: process.pid,
      created_at: createdAt,
      ports: { site: sitePort, feed: feedPort, finance: financePort },
    }));
    await writeOwnerState();
    const feedEnv = {
      ...process.env,
      CI: '1',
      WRANGLER_HIDE_BANNER: 'true',
      WRANGLER_SEND_METRICS: 'false',
      XDG_CONFIG_HOME: path.join(persist, 'xdg'),
    };
    await prepareLocalFeedDatabase(persist, feedEnv);
    const localFixture = await readLocalPreviewFixture();
    await seedLocalPreviewFixtures(persist, localFixture, feedEnv);
    const localAuth = await prepareLocalPreviewAuth(persist, feedEnv);
    await releasePort(reservations[0]);
    const site = startService('Astro site preview', node, [
      astro,
      'dev',
      '--host',
      '127.0.0.1',
      '--port',
      String(sitePort),
      '--ignore-lock',
    ], {
      ...process.env,
      ASTRO_DEV_BACKGROUND: '0',
      FEED_API_URL: feedOrigin,
      PUBLIC_FEED_API_URL: feedOrigin,
      PUBLIC_ACTIVITY_SIGNALS_URL: `${feedOrigin}/activity-signals.json`,
    }, { captureOutput: true });
    services.push(site);
    const actualSitePort = await waitForAstroPort(site, () => stopRequested);
    if (actualSitePort === null) return 0;
    if (actualSitePort !== sitePort) {
      sitePort = actualSitePort;
      siteOrigin = `http://127.0.0.1:${sitePort}`;
      await writeOwnerState();
    }

    await releasePort(reservations[1]);
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
      '--var', 'LOCAL_PREVIEW_AUTH:1',
      '--var', `LOCAL_PREVIEW_AUTH_USERNAME:${localAuth.username}`,
      '--var', `LOCAL_PREVIEW_AUTH_PASSWORD_HASH:${localAuth.passwordHash}`,
    ], feedEnv);
    services.push(feed);
    if (!await waitForHttp(`${feedOrigin}/api/feed`, 'Local Feed API', feed, () => stopRequested)) return 0;
    await prepareLocalBlogLifecycle(feedOrigin);

    await releasePort(reservations[2]);
    const finance = startService('Finance preview', node, ['scripts/finance-preview.mjs'], {
      ...process.env,
      FINANCE_PREVIEW_PORT: String(financePort),
    });
    services.push(finance);

    const ready = await Promise.all([
      waitForHttp(siteOrigin, 'Astro site', site, () => stopRequested),
      waitForHttp(financeOrigin, 'Finance preview', finance, () => stopRequested),
    ]);
    if (stopRequested || ready.includes(false)) return 0;
    const sourceIdentity = await gitIdentity();

    console.log('');
    console.log('Local previews are ready:');
    console.log(`  catstarry.xyz  ${siteOrigin}/`);
    console.log(`  f.catstarry.xyz ${financeOrigin}/`);
    console.log(`  Feed API       ${feedOrigin}/api/feed`);
    console.log(`  Source checkout: ${root}`);
    console.log(`  Git branch / HEAD: ${sourceIdentity}`);
    const fixtureSummary = localPreviewFixtureSummary(localFixture);
    console.log(`  Local visual fixture: ${fixtureSummary.learn} Learn Notes, ${fixtureSummary.feed} Feed entries, ${fixtureSummary.footprints} Footprints`);
    console.log('');
    console.log('Local preview login (LOCAL PREVIEW ONLY):');
    console.log(`  username: ${localAuth.username}`);
    console.log(`  password: ${localAuth.password}`);
    console.log('');
    console.log('Next steps:');
    console.log(`  1. Open ${siteOrigin}/, /blog/, /feed/, /learn/, or /projects/`);
    console.log(`  2. Open ${financeOrigin}/ for the Finance representative preview`);
    console.log('  3. Login with the LOCAL PREVIEW ONLY credentials above for owner previews');
    console.log('The visual fixture is temporary and read-only: it never performs Learn Publish or a production release. Press Ctrl+C to stop all previews and clean temporary state.');

    if (process.env.LOCAL_PREVIEW_TEST_STOP_AFTER_READY === 'SIGINT') onSignal('SIGINT');

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
    await Promise.all(reservations.map(releasePort));
    await Promise.all(services.slice().reverse().map(stopService));
    if (persist) await rm(persist, { recursive: true, force: true, maxRetries: 8, retryDelay: 250 });
    if (stopRequested) console.log('[local-preview] All local previews stopped.');
  }
}

async function gitIdentity() {
  const branch = (await runCapturedCommand('git', ['branch', '--show-current'], 'Read source branch')).trim() || '(detached)';
  const head = (await runCapturedCommand('git', ['rev-parse', 'HEAD'], 'Read source HEAD')).trim();
  return `${branch} / ${head}`;
}

try {
  process.exitCode = await main();
} catch (error) {
  console.error(`[local-preview] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
