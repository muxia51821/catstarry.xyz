import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

import { connectCdp, delay } from './lib/cdp-session.mjs';
import { launchIsolatedBrowser } from './lib/isolated-browser.mjs';

const distRoot = path.resolve(existsSync('dist/client/index.html') ? 'dist/client' : 'dist');
const server = createServer(async (request, response) => {
  const url = new URL(request.url, 'http://local.test');
  try {
    const relative = decodeURIComponent(url.pathname).replace(/^\/+/, '');
    const candidates = url.pathname === '/'
      ? ['index.html']
      : url.pathname.endsWith('/')
        ? [path.join(relative, 'index.html')]
        : [relative, `${relative}.html`, path.join(relative, 'index.html')];
    const file = (await Promise.all(candidates.map(async (candidate) => {
      const resolved = path.resolve(distRoot, candidate);
      if (!resolved.startsWith(`${distRoot}${path.sep}`)) return null;
      try { return (await stat(resolved)).isFile() ? resolved : null; } catch { return null; }
    }))).find(Boolean);
    if (!file) throw new Error('missing');
    const extension = path.extname(file);
    response.setHeader('content-type', extension === '.html' ? 'text/html; charset=utf-8' : extension === '.js' ? 'text/javascript' : extension === '.css' ? 'text/css' : 'application/octet-stream');
    response.end(await readFile(file));
  } catch {
    response.statusCode = 404;
    response.end();
  }
});

await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolve);
});
const address = server.address();
if (!address || typeof address === 'string') throw new Error('Fixture server has no port');
const baseUrl = `http://127.0.0.1:${address.port}`;

let browser;
let cdp;
try {
  browser = await launchIsolatedBrowser();
  const consoleProblems = [];
  cdp = await connectCdp(browser.target, (message) => {
    if (message.method === 'Runtime.exceptionThrown') consoleProblems.push(message.params.exceptionDetails.text);
    if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') consoleProblems.push('console error');
  });
  const { send, evaluate, waitFor } = cdp;
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

  async function load(route, label) {
    await send('Page.navigate', { url: `${baseUrl}${route}` });
    await waitFor(`document.readyState === 'complete'`, label);
  }

  const contentRoutes = ['/blog/', '/learn/', '/projects/'];
  const desktop = [];
  for (const route of contentRoutes) {
    await send('Emulation.setEmulatedMedia', { media: '', features: [] });
    await load(route, `${route} desktop load`);
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 360, y: 180, pointerType: 'mouse' });
    await delay(40);
    desktop.push(await evaluate(`(() => {
      const canvas = document.querySelector('.content-meteor-canvas');
      const content = document.querySelector('[data-canvas="content"]');
      return {
        route: location.pathname,
        mounted: Boolean(canvas),
        pointerEvents: canvas ? getComputedStyle(canvas).pointerEvents : null,
        visible: canvas ? getComputedStyle(canvas).display !== 'none' : false,
        noOverflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        tokens: content ? ['--cursor-meteor-opacity', '--cursor-meteor-width', '--cursor-meteor-head-radius', '--cursor-meteor-debris-opacity']
          .map((token) => getComputedStyle(content).getPropertyValue(token).trim()) : [],
      };
    })()`));
  }
  for (const result of desktop) {
    assert.ok(result.mounted && result.visible && result.pointerEvents === 'none' && result.noOverflow, `${result.route} must mount a non-intercepting Content meteor`);
    assert.deepEqual(result.tokens, ['.65', '1px', '5px', '.05'], `${result.route} must use weakened Content tokens`);
  }

  // Feed is SSR-only on this fixture. Its shared layout provides the content canvas;
  // client runtime activation is covered by the same Base capability in production.
  const feedSource = await readFile('src/layouts/FeedLayout.astro', 'utf8');
  assert.match(feedSource, /data-canvas="content"/, 'Feed must retain its Content canvas marker');

  await load('/', 'Home load');
  const home = await evaluate(`({ homeMeteor: Boolean(document.getElementById('meteor-canvas')), contentMeteor: Boolean(document.querySelector('.content-meteor-canvas')) })`);
  assert.deepEqual(home, { homeMeteor: true, contentMeteor: false }, 'Home runtime must remain isolated');

  await send('Emulation.setEmulatedMedia', { media: '', features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await load('/blog/', 'reduced motion Blog load');
  const reducedMotion = await evaluate(`Boolean(document.querySelector('.content-meteor-canvas'))`);
  assert.equal(reducedMotion, false, 'reduced motion must not mount Content meteor');

  await send('Emulation.setEmulatedMedia', { media: '', features: [] });
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
  await load('/blog/', 'mobile Blog load');
  const coarsePointer = await evaluate(`(() => {
    const canvas = document.querySelector('.content-meteor-canvas');
    return !canvas || getComputedStyle(canvas).display === 'none';
  })()`);
  assert.ok(coarsePointer, 'mobile/coarse pointer must not show Content meteor');

  assert.deepEqual(consoleProblems, []);
  console.log(JSON.stringify({ desktop, home, reducedMotion, coarsePointer, consoleProblems }, null, 2));
} finally {
  cdp?.close();
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
