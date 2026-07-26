import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

import { connectCdp, delay } from './lib/cdp-session.mjs';
import { launchIsolatedBrowser } from './lib/isolated-browser.mjs';

const distRoot = path.resolve(existsSync('dist/client/index.html') ? 'dist/client' : 'dist');
if (!existsSync(path.join(distRoot, 'index.html'))) {
  throw new Error('Built static output is missing; run npm run build before site browser regression');
}

const localFailures = [];
const server = createServer(async (request, response) => {
  const url = new URL(request.url, 'http://local.test');
  if (url.pathname === '/api/views') {
    response.statusCode = 503;
    response.setHeader('content-type', 'application/json; charset=utf-8');
    response.end('{"error":{"code":"fixture_unavailable","message":"fixture"}}');
    return;
  }
  if (url.pathname === '/activity-signals.json') {
    response.setHeader('content-type', 'application/json; charset=utf-8');
    response.end(JSON.stringify({
      schema_version: 1,
      signals: {
        blog: { state: 'active' },
        feed: { state: 'stable' },
        learn: { state: 'dormant' },
        projects: { state: 'active' },
      },
    }));
    return;
  }
  if (url.pathname === '/favicon.ico') {
    response.statusCode = 204;
    response.end();
    return;
  }
  try {
    const decoded = decodeURIComponent(url.pathname);
    if (decoded.includes('\0')) throw new Error('Invalid path');
    const relative = decoded.replace(/^\/+/, '');
    const candidates = decoded === '/'
      ? ['index.html']
      : decoded.endsWith('/')
        ? [path.join(relative, 'index.html')]
        : [relative, `${relative}.html`, path.join(relative, 'index.html')];
    let file;
    for (const candidate of candidates) {
      const resolved = path.resolve(distRoot, candidate);
      if (!resolved.startsWith(`${distRoot}${path.sep}`)) continue;
      try {
        if ((await stat(resolved)).isFile()) {
          file = resolved;
          break;
        }
      } catch {}
    }
    if (!file) {
      file = path.join(distRoot, '404.html');
      response.statusCode = 404;
      localFailures.push(url.pathname);
    }
    const extension = path.extname(file);
    const types = {
      '.css': 'text/css',
      '.html': 'text/html; charset=utf-8',
      '.js': 'text/javascript',
      '.json': 'application/json',
      '.png': 'image/png',
      '.svg': 'image/svg+xml',
      '.webp': 'image/webp',
      '.woff2': 'font/woff2',
      '.xml': 'application/xml; charset=utf-8',
    };
    response.setHeader('content-type', types[extension] ?? 'application/octet-stream');
    response.end(await readFile(file));
  } catch {
    response.statusCode = 400;
    response.end();
  }
});

await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolve);
});
const address = server.address();
if (!address || typeof address === 'string') throw new Error('Site fixture server has no TCP port');
const baseUrl = `http://127.0.0.1:${address.port}`;

const routes = [
  '/',
  '/blog/',
  '/blog/from-zero/',
  '/projects/',
  '/learn/',
  '/learn/track/programming/',
  '/learn/notes/vibe-coding-mission/',
];
const viewports = [
  [1440, 900],
  [1366, 768],
  [1024, 768],
  [768, 1024],
  [430, 932],
  [390, 844],
  [360, 800],
];

let browser;
let cdp;
try {
  browser = await launchIsolatedBrowser();
  const consoleProblems = [];
  cdp = await connectCdp(browser.target, (message) => {
    if (message.method === 'Runtime.exceptionThrown') {
      consoleProblems.push({
        kind: 'exception',
        text: message.params.exceptionDetails.exception?.description
          ?? message.params.exceptionDetails.text,
      });
    }
    if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') {
      consoleProblems.push({
        kind: 'console-error',
        text: message.params.args.map((value) => value.value ?? value.description).join(' '),
      });
    }
  });
  const { send, evaluate, waitFor } = cdp;
  await send('Runtime.enable');
  await send('Page.enable');

  const matrix = [];
  for (const [width, height] of viewports) {
    await send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: width < 768,
    });
    for (const route of routes) {
      const navigation = await send('Page.navigate', { url: `${baseUrl}${route}` });
      assert.equal(navigation.errorText, undefined, `${route} navigation failed`);
      await waitFor(
        `document.readyState === 'complete' && location.pathname === ${JSON.stringify(route)}`,
        `${route} load`,
        10_000,
      );
      await delay(100);
      matrix.push(await evaluate(`({
        route: ${JSON.stringify(route)},
        width: ${width},
        height: ${height},
        title: document.title,
        canonical: document.querySelector('link[rel="canonical"]')?.href ?? null,
        hasMain: Boolean(document.querySelector('main')),
        hasH1: Boolean(document.querySelector('h1')),
        lang: document.documentElement.lang,
        noHorizontalOverflow:
          document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        imageAlternatives: [...document.images].every((image) => image.hasAttribute('alt')),
      })`));
    }
  }

  await send('Emulation.setDeviceMetricsOverride', {
    width: 360,
    height: 800,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await send('Page.navigate', { url: `${baseUrl}/learn/notes/vibe-coding-mission/` });
  await waitFor(`document.readyState === 'complete'`, 'Learn detail load');
  await evaluate(`document.documentElement.style.fontSize = '200%'`);
  await delay(100);
  const textZoom = await evaluate(`({
    noHorizontalOverflow:
      document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    drawerToggleVisible:
      document.querySelector('[data-tree-open]')?.getClientRects().length > 0,
  })`);

  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab' });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab' });
  const keyboard = await evaluate(`({
    focused: document.activeElement !== document.body,
    focusVisible: document.activeElement?.matches(':focus-visible') ?? false,
  })`);

  await send('Emulation.setEmulatedMedia', {
    media: '',
    features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
  });
  const reducedMotion = await evaluate(
    `matchMedia('(prefers-reduced-motion: reduce)').matches`,
  );

  await send('Page.navigate', { url: `${baseUrl}/blog/` });
  await waitFor(`location.pathname === '/blog/'`, 'Blog history origin');
  await send('Page.navigate', { url: `${baseUrl}/learn/` });
  await waitFor(`location.pathname === '/learn/'`, 'Learn history destination');
  await evaluate('history.back()');
  await waitFor(`location.pathname === '/blog/'`, 'history back');
  await evaluate('history.forward()');
  await waitFor(`location.pathname === '/learn/'`, 'history forward');

  await send('Page.navigate', { url: `${baseUrl}/missing-contract-route/` });
  await waitFor(`document.readyState === 'complete'`, '404 load');
  const notFound = await evaluate(`({
    title: document.title,
    hasMain: Boolean(document.querySelector('main')),
    hasH1: Boolean(document.querySelector('h1')),
    hasHomeLink: Boolean(document.querySelector('a[href="/"]')),
  })`);

  for (const asset of ['/robots.txt', '/sitemap.xml', '/blog/rss.xml']) {
    const response = await fetch(`${baseUrl}${asset}`);
    assert.equal(response.status, 200, `${asset} must be generated`);
    assert.ok((await response.text()).trim().length > 0, `${asset} must not be empty`);
  }

  for (const item of matrix) {
    const expectedCanonical = new URL(item.route, 'https://catstarry.xyz').href;
    assert.ok(item.title);
    assert.equal(item.canonical, expectedCanonical);
    assert.equal(item.lang, 'zh-CN');
    assert.ok(item.hasMain && item.hasH1);
    assert.ok(item.noHorizontalOverflow, `${item.route} overflows at ${item.width}x${item.height}`);
    assert.ok(item.imageAlternatives, `${item.route} has an image without alt`);
  }
  assert.deepEqual(consoleProblems, []);
  assert.deepEqual(
    localFailures.filter((pathname) => pathname !== '/missing-contract-route/'),
    [],
    'unexpected local assets or routes returned 404',
  );
  assert.ok(textZoom.noHorizontalOverflow && textZoom.drawerToggleVisible);
  assert.ok(keyboard.focused && keyboard.focusVisible);
  assert.equal(reducedMotion, true);
  assert.ok(notFound.title && notFound.hasMain && notFound.hasH1 && notFound.hasHomeLink);

  console.log(JSON.stringify({
    routes: routes.length,
    viewports: viewports.length,
    matrixChecks: matrix.length,
    textZoom,
    keyboard,
    reducedMotion,
    notFound,
    consoleProblems,
  }, null, 2));
} finally {
  cdp?.close();
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
