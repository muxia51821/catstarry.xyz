import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const node = process.execPath;
const python = process.platform === 'win32' ? 'python' : 'python3';
const wrangler = path.join(root, 'node_modules', 'wrangler', 'bin', 'wrangler.js');
const financeConfig = path.join(root, 'workers', 'finance-api', 'wrangler.jsonc');
const financeSite = path.join(root, 'finance-site');
const historyImporter = path.join(root, 'scripts', 'finance-import-history.py');
const financeUserRecord = path.join(root, 'scripts', 'finance-user-record.mjs');
const temporaryPrefix = 'catstarry-finance-history-preview-';
const readyTimeoutMs = 60_000;

async function localD1Sql(generatedSql, output) {
  const source = await readFile(generatedSql, 'utf8');
  const executable = source.replace(/^BEGIN;\s*/, '').replace(/\s*COMMIT;\s*$/, '');
  if (executable === source) throw new Error('Generated historical SQL did not have the expected transaction wrapper');
  await writeFile(output, executable, 'utf8');
}

function usage() {
  console.log('Usage: npm run finance:preview:history -- <accepted-workbook-path>');
  console.log('');
  console.log('Optional environment variables:');
  console.log('  FINANCE_HISTORY_PREVIEW_PORT      Local port (default: 8790; use 0 for automatic allocation)');
  console.log('  FINANCE_HISTORY_PREVIEW_USERNAME  Local admin username (default: history-local-admin)');
  console.log('  FINANCE_HISTORY_PREVIEW_PASSWORD  Local admin password (generated when omitted)');
}

function requestedPort() {
  const value = Number(process.env.FINANCE_HISTORY_PREVIEW_PORT ?? '8790');
  if (!Number.isInteger(value) || value < 0 || value > 65535) {
    throw new Error('FINANCE_HISTORY_PREVIEW_PORT must be a valid TCP port or 0 for automatic allocation');
  }
  return value;
}

function localCredentials() {
  const username = (process.env.FINANCE_HISTORY_PREVIEW_USERNAME ?? 'history-local-admin').trim();
  const password = process.env.FINANCE_HISTORY_PREVIEW_PASSWORD ?? randomBytes(24).toString('base64url');
  const passwordBytes = Buffer.byteLength(password, 'utf8');
  if (!/^[a-z0-9_-]{2,64}$/i.test(username)) throw new Error('FINANCE_HISTORY_PREVIEW_USERNAME must contain 2-64 ASCII username characters');
  if (passwordBytes < 12 || passwordBytes > 72) throw new Error('FINANCE_HISTORY_PREVIEW_PASSWORD must contain 12-72 UTF-8 bytes');
  return { username, password };
}

function spawnOptions(env, stdio = 'inherit') {
  return { cwd: root, env, stdio, windowsHide: true };
}

function run(command, args, label, env) {
  console.log(`[finance:preview:history] ${label}`);
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, spawnOptions(env));
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`${label} failed${signal ? ` (${signal})` : ` with exit code ${code}`}`));
    });
  });
}

function runCaptured(command, args, label, env) {
  console.log(`[finance:preview:history] ${label}`);
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, spawnOptions(env, ['ignore', 'pipe', 'pipe']));
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) resolve(stdout);
      else {
        const detail = (stderr || stdout).trim();
        reject(new Error(`${label} failed${signal ? ` (${signal})` : ` with exit code ${code}`}${detail ? `: ${detail}` : ''}`));
      }
    });
  });
}

async function reservePort(requested) {
  const server = net.createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(requested, '127.0.0.1', resolve);
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Could not reserve a local Finance preview port');
  return { port: address.port, server };
}

async function releasePort(reservation) {
  if (!reservation?.server.listening) return;
  await new Promise((resolve, reject) => reservation.server.close((error) => error ? reject(error) : resolve()));
}

function startWorker(args, env) {
  const child = spawn(node, args, spawnOptions(env, ['ignore', 'pipe', 'pipe']));
  child.stdout.on('data', (chunk) => process.stdout.write(chunk));
  child.stderr.on('data', (chunk) => process.stderr.write(chunk));
  const state = { child, stopped: false, outcome: null };
  state.exit = new Promise((resolve) => {
    child.once('error', (error) => {
      state.stopped = true;
      state.outcome = { code: 1, error };
      resolve(state.outcome);
    });
    child.once('exit', (code, signal) => {
      state.stopped = true;
      state.outcome = { code: code ?? 1, signal };
      resolve(state.outcome);
    });
  });
  return state;
}

async function stopWorker(worker) {
  if (!worker || worker.stopped) return;
  if (process.platform === 'win32') {
    await new Promise((resolve) => {
      const killer = spawn('taskkill.exe', ['/PID', String(worker.child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
      killer.once('close', resolve);
      killer.once('error', resolve);
    });
  } else {
    try { process.kill(worker.child.pid, 'SIGTERM'); } catch (error) { if (error?.code !== 'ESRCH') throw error; }
  }
  await Promise.race([worker.exit, new Promise((resolve) => setTimeout(resolve, 5_000))]);
}

async function waitForHttp(url, worker) {
  const deadline = Date.now() + readyTimeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    if (worker.stopped) {
      const detail = worker.outcome?.signal ? ` (${worker.outcome.signal})` : ` with exit code ${worker.outcome?.code ?? 'unknown'}`;
      throw new Error(`Local Finance worker exited before becoming ready${detail}`);
    }
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1_000) });
      if (response.ok) return;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Local Finance site did not become ready within ${readyTimeoutMs / 1_000} seconds at ${url}: ${lastError instanceof Error ? lastError.message : 'unknown error'}`);
}

async function workbookPath(argument) {
  const resolved = path.resolve(root, argument);
  const details = await stat(resolved).catch(() => null);
  if (!details?.isFile()) throw new Error(`Accepted workbook does not exist or is not a file: ${argument}`);
  return resolved;
}

async function main() {
  const [argument] = process.argv.slice(2);
  if (!argument || argument === '--help' || argument === '-h') {
    usage();
    return argument ? 0 : 1;
  }
  if (process.argv.length !== 3) throw new Error('Provide exactly one accepted workbook path');

  const workbook = await workbookPath(argument);
  const credentials = localCredentials();
  const reservation = await reservePort(requestedPort());
  const port = reservation.port;
  const origin = `http://localhost:${port}`;
  const persist = await mkdtemp(path.join(os.tmpdir(), temporaryPrefix));
  const sqlOutput = path.join(persist, 'accepted-history.sql');
  const localSqlOutput = path.join(persist, 'accepted-history-local-d1.sql');
  const reportOutput = path.join(persist, 'accepted-history-report.json');
  const env = {
    ...process.env,
    WRANGLER_HIDE_BANNER: 'true',
    WRANGLER_SEND_METRICS: 'false',
    XDG_CONFIG_HOME: path.join(persist, 'xdg'),
  };
  let worker;
  let stopRequested = false;
  let resolveSignal;
  const signal = new Promise((resolve) => { resolveSignal = resolve; });
  const onSignal = () => {
    if (stopRequested) return;
    stopRequested = true;
    resolveSignal();
  };

  try {
    process.on('SIGINT', onSignal);
    process.on('SIGTERM', onSignal);
    console.log('[finance:preview:history] Create a new isolated local Finance D1 state.');
    await run(node, [wrangler, 'd1', 'migrations', 'apply', 'finance-db', '--local', '--persist-to', persist, '--config', financeConfig], 'Apply all local Finance migrations', env);
    await runCaptured(python, [historyImporter, workbook, sqlOutput, reportOutput], 'Generate accepted historical SQL', env);
    await localD1Sql(sqlOutput, localSqlOutput);
    await runCaptured(node, [wrangler, 'd1', 'execute', 'finance-db', '--local', '--persist-to', persist, '--config', financeConfig, '--file', localSqlOutput], 'Write generated SQL to isolated local Finance D1', env);

    const recordText = await runCaptured(node, [financeUserRecord, credentials.username, 'admin'], 'Create local Finance login record', {
      ...env,
      FINANCE_PASSWORD: credentials.password,
    });
    const record = JSON.parse(recordText);
    if (record?.key !== `user:${credentials.username}` || record?.value?.role !== 'admin' || typeof record?.value?.password_hash !== 'string') {
      throw new Error('Local Finance login record did not match the auth contract');
    }
    await runCaptured(node, [wrangler, 'kv', 'key', 'put', '--local', '--persist-to', persist, '--binding', 'FINANCE_AUTH_KV', record.key, JSON.stringify(record.value), '--config', financeConfig], 'Write local Finance login record', env);

    const report = JSON.parse(await readFile(reportOutput, 'utf8'));
    await releasePort(reservation);
    worker = startWorker([
      wrangler,
      'dev',
      '--local',
      '--persist-to', persist,
      '--config', financeConfig,
      '--assets', financeSite,
      '--ip', '127.0.0.1',
      '--port', String(port),
      '--var', `FINANCE_SITE_ORIGIN:${origin}`,
    ], env);
    await waitForHttp(`${origin}/`, worker);

    console.log('');
    console.log('Finance historical local acceptance is ready:');
    console.log(`  URL:      ${origin}/`);
    console.log(`  Username: ${credentials.username}`);
    console.log(`  Password: ${credentials.password}`);
    console.log(`  Imported: ${JSON.stringify(report.actual)}`);
    console.log('');
    console.log('This runner uses only a newly created temporary local D1/KV state. It does not connect to production, deploy, push, or retain the generated SQL after Ctrl+C.');
    console.log('Open the URL above, log in with the local credentials, and press Ctrl+C when acceptance is complete.');

    if (process.env.FINANCE_HISTORY_PREVIEW_TEST_STOP_AFTER_READY === '1') onSignal();

    const result = await Promise.race([
      worker.exit.then((outcome) => ({ kind: 'worker', outcome })),
      signal.then(() => ({ kind: 'signal' })),
    ]);
    if (result.kind === 'worker' && !stopRequested) {
      const detail = result.outcome.signal ? ` (${result.outcome.signal})` : ` with exit code ${result.outcome.code}`;
      throw new Error(`Local Finance worker stopped unexpectedly${detail}`);
    }
    return 0;
  } finally {
    process.removeListener('SIGINT', onSignal);
    process.removeListener('SIGTERM', onSignal);
    await releasePort(reservation);
    await stopWorker(worker);
    await rm(persist, { recursive: true, force: true, maxRetries: 8, retryDelay: 250 });
    if (stopRequested) console.log('[finance:preview:history] Local Finance historical acceptance state removed.');
  }
}

try {
  process.exitCode = await main();
} catch (error) {
  console.error(`[finance:preview:history] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
