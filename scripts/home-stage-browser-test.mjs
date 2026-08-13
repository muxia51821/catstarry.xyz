import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import net from 'node:net';
import path from 'node:path';

import { connectCdp, delay } from './lib/cdp-session.mjs';
import { launchIsolatedBrowser } from './lib/isolated-browser.mjs';

const port = await freePort();
const origin = `http://127.0.0.1:${port}`;
const site = spawn(process.execPath, [path.join('node_modules', 'astro', 'bin', 'astro.mjs'), 'dev', '--host', '127.0.0.1', '--port', String(port)], {
  env: { ...process.env, ASTRO_DEV_BACKGROUND: '0' }, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
});
let output = '';
site.stdout.on('data', (chunk) => { output += chunk; });
site.stderr.on('data', (chunk) => { output += chunk; });
let browser;
let cdp;

try {
  await waitForHttp(origin);
  browser = await launchIsolatedBrowser();
  cdp = await connectCdp(browser.target);
  await cdp.send('Page.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });

  const snapshot = async (url) => {
    await cdp.send('Page.navigate', { url });
    await cdp.waitFor('document.readyState === "complete"', `load ${url}`, 15_000);
    await delay(250);
    return cdp.evaluate('({ y: scrollY, search: location.search, height: document.documentElement.scrollHeight })');
  };
  const entry = await snapshot(`${origin}/`);
  assert.equal(entry.search, '');
  assert.ok(entry.y < 10, `normal Home must remain at Entry; received ${entry.y}`);

  const unknown = await snapshot(`${origin}/?stage=unknown`);
  assert.equal(unknown.search, '?stage=unknown');
  assert.ok(unknown.y < 10, `unknown stage must remain at Entry; received ${unknown.y}`);

  const overview = await snapshot(`${origin}/?stage=overview`);
  assert.equal(overview.search, '?stage=overview');
  assert.ok(overview.y > 100, `overview deep-link must move beyond Entry; received ${overview.y}`);
  assert.ok(overview.y < overview.height, 'overview target must use runtime journey bounds');

  const reloaded = await snapshot(`${origin}/?stage=overview`);
  assert.ok(reloaded.y > 100, `overview reload must preserve the initial stage; received ${reloaded.y}`);
  console.log('Home initial stage browser contract passed.');
} catch (error) {
  console.error(output);
  throw error;
} finally {
  cdp?.close();
  await browser?.close();
  await stopProcessTree(site);
}

async function freePort() {
  const server = net.createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Could not reserve a port');
  await new Promise((resolve) => server.close(resolve));
  return address.port;
}

async function waitForHttp(url) {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (site.exitCode !== null) throw new Error(`Astro exited before ready: ${output}`);
    try { if ((await fetch(url, { signal: AbortSignal.timeout(1_000) })).ok) return; } catch {}
    await delay(250);
  }
  throw new Error(`Astro did not become ready: ${output}`);
}

async function stopProcessTree(child) {
  if (child.exitCode !== null) return;
  if (process.platform === 'win32') {
    const killer = spawn('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
    await once(killer, 'exit');
  } else child.kill('SIGTERM');
}
