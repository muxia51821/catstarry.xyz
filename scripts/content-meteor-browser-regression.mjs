import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { connectCdp, delay } from './lib/cdp-session.mjs';
import { launchIsolatedBrowser } from './lib/isolated-browser.mjs';
import { freePort, stopProcessTree, waitForHttp } from './lib/dev-server.mjs';

const server = createServer(async (request, response) => {
  const url = new URL(request.url, 'http://local.test');
  if (url.pathname === '/api/blog/publications') {
    response.setHeader('content-type', 'application/json; charset=utf-8');
    response.end(JSON.stringify({ slugs: ['before-thoughts-flow-away', 'from-zero', 'start-writing'] }));
    return;
  }
  if (url.pathname === '/api/learn/publications') {
    response.setHeader('content-type', 'application/json; charset=utf-8');
    response.end(JSON.stringify({ entries: [] }));
    return;
  }
  response.statusCode = 404;
  response.end();
});

await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolve);
});
const address = server.address();
if (!address || typeof address === 'string') throw new Error('Fixture server has no port');
const fixtureUrl = `http://127.0.0.1:${address.port}`;
const sitePort = await freePort();
const baseUrl = `http://127.0.0.1:${sitePort}`;
const site = spawn(process.execPath, [path.join('node_modules', 'astro', 'bin', 'astro.mjs'), 'dev', '--host', '127.0.0.1', '--port', String(sitePort)], {
  env: {
    ...process.env,
    ASTRO_DEV_BACKGROUND: '0',
    FEED_API_URL: fixtureUrl,
    PUBLIC_FEED_API_URL: fixtureUrl,
  },
  stdio: ['ignore', 'pipe', 'pipe'],
  windowsHide: true,
});
let siteOutput = '';
site.stdout.on('data', (chunk) => { siteOutput += chunk; });
site.stderr.on('data', (chunk) => { siteOutput += chunk; });
await waitForHttp(baseUrl, { child: site, getOutput: () => siteOutput, timeoutMs: 60_000 });

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

  // Enable the CSS desktop interaction environment. Isolated Chromium can still
  // report no physical fine pointer to JavaScript; the assertion below treats
  // that as the capability-gated disabled state rather than a false regression.
  const desktopFinePointerMedia = [
    { name: 'hover', value: 'hover' },
    { name: 'pointer', value: 'fine' },
  ];

  async function load(route, label) {
    await send('Page.navigate', { url: `${baseUrl}${route}` });
    await waitFor(`document.readyState === 'complete'`, label);
  }

  const contentRoutes = ['/blog/', '/learn/', '/projects/'];
  const desktop = [];
  for (const route of contentRoutes) {
    await send('Emulation.setEmulatedMedia', { media: '', features: desktopFinePointerMedia });
    await load(route, `${route} desktop load`);
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 360, y: 180, pointerType: 'mouse' });
    await delay(40);
    const beforeClick = await evaluate(`(() => {
      const canvas = document.querySelector('.content-meteor-canvas');
      if (!(canvas instanceof HTMLCanvasElement)) return null;
      return Array.from(canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data).some((value) => value !== 0);
    })()`);
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 360, y: 180, button: 'left', clickCount: 1, pointerType: 'mouse' });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 360, y: 180, button: 'left', clickCount: 1, pointerType: 'mouse' });
    await delay(20);
    desktop.push(await evaluate(`(() => {
      const canvas = document.querySelector('.content-meteor-canvas');
      const content = document.querySelector('[data-canvas="content"]');
      return {
        route: location.pathname,
        finePointer: matchMedia('(hover: hover) and (pointer: fine)').matches,
        mounted: Boolean(canvas),
        pointerEvents: canvas ? getComputedStyle(canvas).pointerEvents : null,
        visible: canvas ? getComputedStyle(canvas).display !== 'none' : false,
        beforeClick: ${JSON.stringify(beforeClick)},
        hasClickFlash: canvas instanceof HTMLCanvasElement
          ? Array.from(canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data).some((value) => value !== 0)
          : false,
        noOverflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        tokens: content ? ['--cursor-meteor-opacity', '--cursor-meteor-width', '--cursor-meteor-head-radius', '--cursor-meteor-debris-opacity']
          .map((token) => getComputedStyle(content).getPropertyValue(token).trim()) : [],
      };
    })()`));
  }
  for (const result of desktop) {
    if (!result.finePointer) {
      assert.equal(result.mounted, false, `${result.route} must remain disabled without a real fine pointer`);
      continue;
    }
    assert.ok(result.visible && result.pointerEvents === 'none' && result.noOverflow, `${result.route} must mount a non-intercepting Content click flash`);
    assert.equal(result.beforeClick, false, `${result.route} must not draw a movement trail`);
    assert.equal(result.hasClickFlash, true, `${result.route} must draw a click flash`);
    assert.equal(Number.parseFloat(result.tokens[0]), 0.42, `${result.route} must use calibrated Content opacity`);
    assert.equal(result.tokens[1], '0.75px', `${result.route} must use calibrated Content trail width`);
    assert.equal(result.tokens[2], '2.75px', `${result.route} must use calibrated Content head radius`);
    assert.equal(Number.parseFloat(result.tokens[3]), 0.012, `${result.route} must use near-invisible Content debris`);
  }

  // Feed is SSR-only on this fixture. Its shared layout provides the content canvas;
  // client runtime activation is covered by the same Base capability in production.
  const feedSource = await readFile('src/layouts/FeedLayout.astro', 'utf8');
  assert.match(feedSource, /data-canvas="content"/, 'Feed must retain its Content canvas marker');

  await load('/', 'Home load');
  const home = await evaluate(`({ homeMeteor: Boolean(document.getElementById('meteor-canvas')), contentMeteor: Boolean(document.querySelector('.content-meteor-canvas')) })`);
  assert.deepEqual(home, { homeMeteor: true, contentMeteor: false }, 'Home runtime must remain isolated');

  await send('Emulation.setEmulatedMedia', {
    media: '',
    features: [...desktopFinePointerMedia, { name: 'prefers-reduced-motion', value: 'reduce' }],
  });
  await load('/blog/', 'reduced motion Blog load');
  const reducedMotion = await evaluate(`Boolean(document.querySelector('.content-meteor-canvas'))`);
  assert.equal(reducedMotion, false, 'reduced motion must not mount Content meteor');

  await send('Emulation.setEmulatedMedia', {
    media: '',
    features: [
      { name: 'hover', value: 'none' },
      { name: 'pointer', value: 'coarse' },
    ],
  });
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
  await stopProcessTree(site);
  await new Promise((resolve) => server.close(resolve));
}

