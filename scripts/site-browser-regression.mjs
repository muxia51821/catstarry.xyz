import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

import { connectCdp, delay } from './lib/cdp-session.mjs';
import { freePort, stopProcessTree, waitForHttp } from './lib/dev-server.mjs';
import { launchIsolatedBrowser } from './lib/isolated-browser.mjs';

const distRoot = path.resolve(existsSync('dist/client/index.html') ? 'dist/client' : 'dist');
if (!existsSync(path.join(distRoot, 'index.html'))) {
  throw new Error('Built static output is missing; run npm run build before site browser regression');
}

const localFailures = [];
const viewFixture = { records: 0, ownerReads: 0 };
const learnPublicationFixture = [
  'domain-dns-http',
  'git-recovery-reflog-reset',
  'git-commit-graph-branch-ref-head',
  'git-rebase-conflicts-and-force-with-lease',
  'git-remotes-fetch-and-divergence',
  'astro-react-and-hydration',
  'javascript-runtimes-browser-node-workers',
].map((slug, index) => ({
  slug,
  published_at: `2026-08-2${index}T08:00:00.000Z`,
}));
const server = createServer(async (request, response) => {
  const url = new URL(request.url, 'http://local.test');
  response.setHeader('access-control-allow-origin', request.headers.origin ?? '*');
  response.setHeader('access-control-allow-credentials', 'true');
  response.setHeader('access-control-allow-headers', 'content-type');
  response.setHeader('access-control-allow-methods', 'GET,POST,OPTIONS');
  if (request.method === 'OPTIONS') {
    response.statusCode = 204;
    response.end();
    return;
  }
  if (url.pathname === '/api/auth/session') {
    const authenticated = (request.headers.cookie ?? '').includes('owner-fixture=1');
    response.setHeader('content-type', 'application/json; charset=utf-8');
    response.end(JSON.stringify({ authenticated, username: authenticated ? 'owner' : null }));
    return;
  }
  if (url.pathname === '/api/views') {
    response.setHeader('content-type', 'application/json; charset=utf-8');
    if (request.method === 'POST') {
      viewFixture.records += 1;
      response.end('{"slug":"start-writing"}');
      return;
    }
    if (!(request.headers.cookie ?? '').includes('owner-fixture=1')) {
      response.statusCode = 401;
      response.end('{"error":{"code":"unauthorized"}}');
      return;
    }
    viewFixture.ownerReads += 1;
    response.end('{"slug":"start-writing","count":73}');
    return;
  }
  if (url.pathname === '/api/blog/publications') {
    response.setHeader('content-type', 'application/json; charset=utf-8');
    response.end(JSON.stringify({ slugs: ['before-thoughts-flow-away', 'from-zero', 'start-writing'] }));
    return;
  }
  if (url.pathname === '/api/learn/publications') {
    response.setHeader('content-type', 'application/json; charset=utf-8');
    response.end(JSON.stringify({ entries: learnPublicationFixture }));
    return;
  }
  if (url.pathname === '/api/feed') {
    response.setHeader('content-type', 'application/json; charset=utf-8');
    response.end(JSON.stringify({ items: [], cursor: null, has_more: false }));
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
const fixtureUrl = `http://127.0.0.1:${address.port}`;
const sitePort = await freePort();
const baseUrl = `http://127.0.0.1:${sitePort}`;
const site = spawn(process.execPath, [path.join('node_modules', 'astro', 'bin', 'astro.mjs'), 'dev', '--host', '127.0.0.1', '--port', String(sitePort), '--ignore-lock'], {
  env: {
    ...process.env,
    CI: 'true',
    ASTRO_DEV_BACKGROUND: '0',
    FEED_API_URL: fixtureUrl,
    PUBLIC_FEED_API_URL: fixtureUrl,
    PUBLIC_ACTIVITY_SIGNALS_URL: `${fixtureUrl}/activity-signals.json`,
  },
  stdio: ['ignore', 'pipe', 'pipe'],
  windowsHide: true,
});
let siteOutput = '';
site.stdout.on('data', (chunk) => { siteOutput += chunk; });
site.stderr.on('data', (chunk) => { siteOutput += chunk; });
await waitForHttp(baseUrl, { child: site, getOutput: () => siteOutput, timeoutMs: 60_000 });

const routes = [
  '/',
  '/blog/',
  '/blog/from-zero/',
  '/projects/',
  '/learn/',
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
  const pressKey = async (key, code, keyCode) => {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: keyCode, nativeVirtualKeyCode: keyCode });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: keyCode, nativeVirtualKeyCode: keyCode });
  };
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Network.enable');
  await send('Emulation.setEmulatedMedia', { media: '', features: [] });

  await send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await send('Page.navigate', { url: `${baseUrl}/learn/` });
  await waitFor(`document.readyState === 'complete' && document.querySelectorAll('[data-graph-node]').length === 7`, 'Learn graph load');
  assert.equal(await evaluate(`!document.querySelector('astro-dev-toolbar')`), true, 'Browser regression must disable the Astro dev toolbar');
  await waitFor(`document.querySelectorAll('.learn-graph__edges line').length === 6`, 'Learn graph relation edges');
  const learnGraphDefault = await evaluate(`(() => {
    const graph = document.querySelector('[data-learn-graph]');
    const viewport = document.querySelector('[data-graph-viewport]');
    const directory = document.querySelector('[data-track-link="programming"]');
    const viewportBox = viewport.getBoundingClientRect();
    const nodes = [...document.querySelectorAll('[data-graph-node]')];
    return {
      nodeCount: nodes.length,
      edgeCount: document.querySelectorAll('.learn-graph__edges line').length,
      directoryHref: directory?.getAttribute('href'),
      directoryAction: directory?.querySelector('.learn-track-directory__action')?.textContent?.trim(),
      allNodesInView: nodes.every((node) => {
        const box = node.getBoundingClientRect();
        return box.left >= viewportBox.left && box.right <= viewportBox.right
          && box.top >= viewportBox.top && box.bottom <= viewportBox.bottom;
      }),
      noHorizontalOverflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      horizontalSpread: Math.max(...nodes.map((node) => node.getBoundingClientRect().left))
        - Math.min(...nodes.map((node) => node.getBoundingClientRect().left)),
      verticalSpread: Math.max(...nodes.map((node) => node.getBoundingClientRect().top))
        - Math.min(...nodes.map((node) => node.getBoundingClientRect().top)),
      labelsDoNotOverlap: nodes.every((node, index) => {
        const box = node.getBoundingClientRect();
        return nodes.slice(index + 1).every((other) => {
          const otherBox = other.getBoundingClientRect();
          return box.right <= otherBox.left + 2 || otherBox.right <= box.left + 2
            || box.bottom <= otherBox.top + 2 || otherBox.bottom <= box.top + 2;
        });
      }),
      angledRelationCount: [...document.querySelectorAll('.learn-graph__edges line')].filter((line) => {
        const horizontal = Math.abs(Number(line.getAttribute('x2')) - Number(line.getAttribute('x1')));
        const vertical = Math.abs(Number(line.getAttribute('y2')) - Number(line.getAttribute('y1')));
        return horizontal >= 44 && vertical >= 28;
      }).length,
      mapHeight: graph.getBoundingClientRect().height,
    };
  })()`);
  assert.deepEqual(
    learnGraphDefault,
    {
      nodeCount: 7,
      edgeCount: 6,
      directoryHref: '/learn/track/programming/',
      directoryAction: '→',
      allNodesInView: true,
      noHorizontalOverflow: true,
      horizontalSpread: learnGraphDefault.horizontalSpread,
      verticalSpread: learnGraphDefault.verticalSpread,
      labelsDoNotOverlap: true,
      angledRelationCount: learnGraphDefault.angledRelationCount,
      mapHeight: learnGraphDefault.mapHeight,
    },
  );
  assert.ok(learnGraphDefault.horizontalSpread >= 300, `Learn graph must distribute nodes across a visibly wide field (actual ${learnGraphDefault.horizontalSpread}px)`);
  assert.ok(learnGraphDefault.verticalSpread >= 260, `Learn graph must distribute nodes across a visibly tall field (actual ${learnGraphDefault.verticalSpread}px)`);
  assert.ok(learnGraphDefault.angledRelationCount >= 3, `Learn graph must expose several non-axial relations (actual ${learnGraphDefault.angledRelationCount})`);
  await evaluate(`(() => {
    const graph = document.querySelector('[data-learn-graph]');
    const focusable = [...document.querySelectorAll('a[href], button:not(:disabled), input:not(:disabled), [tabindex]:not([tabindex="-1"])')];
    const index = focusable.indexOf(graph);
    focusable[index - 1]?.focus();
  })()`);
  await pressKey('Tab', 'Tab', 9);
  await waitFor(`document.activeElement === document.querySelector('[data-learn-graph]')`, 'Learn graph keyboard focus');
  const graphFocus = await evaluate(`(() => {
    const graph = document.querySelector('[data-learn-graph]');
    const style = getComputedStyle(graph);
    return document.activeElement === graph && style.outlineStyle !== 'none' && style.outlineWidth !== '0px';
  })()`);
  assert.equal(graphFocus, true, 'Learn graph keyboard entry must expose a visible focus indicator');
  await pressKey('+', 'Equal', 187);
  await waitFor(`Number(document.querySelector('[data-learn-graph]').dataset.zoom) > 100`, 'Learn graph keyboard zoom');
  await pressKey('0', 'Digit0', 48);
  await waitFor(`document.querySelector('[data-learn-graph]').dataset.zoom === '100'`, 'Learn graph keyboard fit');
  await pressKey('Enter', 'Enter', 13);
  await waitFor(`document.querySelector('[data-learn-graph]').dataset.expanded === 'true'`, 'Learn graph keyboard Explore view');
  await pressKey('Escape', 'Escape', 27);
  await waitFor(`document.querySelector('[data-learn-graph]').dataset.expanded === 'false'`, 'Learn graph keyboard Explore close');
  await evaluate(`document.querySelector('[data-learn-graph]').dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true }))`);
  await waitFor(`document.querySelector('[data-learn-graph]').dataset.expanded === 'true'`, 'Learn graph Space Explore view');
  await pressKey('Escape', 'Escape', 27);
  await waitFor(`document.querySelector('[data-learn-graph]').dataset.expanded === 'false'`, 'Learn graph Space Explore close');
  await delay(260);
  const graphPoint = await evaluate(`(() => {
    const viewport = document.querySelector('[data-graph-viewport]');
    const box = viewport.getBoundingClientRect();
    for (let y = box.top + 24; y < box.bottom - 24; y += 28) {
      for (let x = box.left + 24; x < box.right - 24; x += 28) {
        const target = document.elementFromPoint(x, y);
        if (!target?.closest('a, button')) return { x, y };
      }
    }
    return null;
  })()`);
  assert.ok(graphPoint, 'Learn graph must expose a blank interactive field');
  await send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: graphPoint.x, y: graphPoint.y, deltaX: 0, deltaY: -100, pointerType: 'mouse' });
  await waitFor(`Number(document.querySelector('[data-learn-graph]').dataset.zoom) > 100`, 'Learn graph wheel zoom');
  const transformBeforeDrag = await evaluate(`document.querySelector('[data-graph-world]').style.transform`);
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: graphPoint.x, y: graphPoint.y, button: 'left', buttons: 1, clickCount: 1, pointerType: 'mouse' });
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: graphPoint.x + 72, y: graphPoint.y + 48, button: 'left', buttons: 1, pointerType: 'mouse' });
  await waitFor(`document.querySelector('[data-learn-graph]').dataset.dragging === 'true'`, 'Learn graph drag state');
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: graphPoint.x + 72, y: graphPoint.y + 48, button: 'left', buttons: 0, clickCount: 1, pointerType: 'mouse' });
  assert.notEqual(await evaluate(`document.querySelector('[data-graph-world]').style.transform`), transformBeforeDrag, 'Learn graph drag must pan the world');
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: graphPoint.x, y: graphPoint.y, button: 'left', buttons: 1, clickCount: 1, pointerType: 'mouse' });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: graphPoint.x, y: graphPoint.y, button: 'left', buttons: 0, clickCount: 1, pointerType: 'mouse' });
  await waitFor(`document.querySelector('[data-learn-graph]').dataset.expanded === 'true'`, 'Learn graph Explore view');
  await delay(260);
  const learnGraphExplore = await evaluate(`(() => {
    const graph = document.querySelector('[data-learn-graph]');
    return {
      expanded: graph.dataset.expanded === 'true',
      tallerThanDefault: graph.getBoundingClientRect().height > ${learnGraphDefault.mapHeight},
      collapseVisible: getComputedStyle(graph.querySelector('[data-graph-collapse]')).display !== 'none',
    };
  })()`);
  assert.deepEqual(learnGraphExplore, { expanded: true, tallerThanDefault: true, collapseVisible: true });
  await pressKey('Escape', 'Escape', 27);
  await waitFor(`document.querySelector('[data-learn-graph]').dataset.expanded === 'false'`, 'Learn graph Explore close');
  await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: graphPoint.x, y: graphPoint.y, id: 1 }] });
  await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await waitFor(`document.querySelector('[data-learn-graph]').dataset.expanded === 'true'`, 'Learn graph touch Explore view');
  await pressKey('Escape', 'Escape', 27);
  await waitFor(`document.querySelector('[data-learn-graph]').dataset.expanded === 'false'`, 'Learn graph touch Explore close');
  const touchGraphPoint = await evaluate(`(() => {
    const viewport = document.querySelector('[data-graph-viewport]');
    const box = viewport.getBoundingClientRect();
    for (let y = box.top + 24; y < box.bottom - 24; y += 28) {
      for (let x = box.left + 24; x < box.right - 24; x += 28) {
        const target = document.elementFromPoint(x, y);
        if (!target?.closest('a, button')) return { x, y };
      }
    }
    return null;
  })()`);
  assert.ok(touchGraphPoint, 'Learn graph must expose a blank touch field after panning');
  await send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: touchGraphPoint.x, y: touchGraphPoint.y, deltaX: 0, deltaY: -100, pointerType: 'mouse' });
  await waitFor(`Number(document.querySelector('[data-learn-graph]').dataset.zoom) > 100`, 'Learn graph touch drag zoom precondition');
  const transformBeforeTouchDrag = await evaluate(`document.querySelector('[data-graph-world]').style.transform`);
  await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: touchGraphPoint.x, y: touchGraphPoint.y, id: 1 }] });
  await send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: touchGraphPoint.x - 56, y: touchGraphPoint.y + 42, id: 1 }] });
  await waitFor(`document.querySelector('[data-learn-graph]').dataset.dragging === 'true'`, 'Learn graph touch drag state');
  await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  assert.notEqual(await evaluate(`document.querySelector('[data-graph-world]').style.transform`), transformBeforeTouchDrag, 'Learn graph touch drag must pan the world');
  await evaluate(`document.querySelector('[data-graph-node="git-commit-graph-branch-ref-head"]').click()`);
  await waitFor(`location.pathname === '/learn/notes/git-commit-graph-branch-ref-head/'`, 'Learn graph node destination');

  await send('Page.navigate', { url: `${baseUrl}/blog/` });
  await waitFor(`document.readyState === 'complete'`, 'Blog archive load');
  await waitFor(`!document.fonts || document.fonts.status === 'loaded'`, 'Blog archive fonts', 10_000);
  const archiveDefault = await evaluate(`(() => {
    const entry = document.querySelector('.blog-post-entry');
    const summary = document.querySelector('.blog-post-entry__description');
    const title = document.querySelector('.blog-post-entry h2 a');
    const style = getComputedStyle(entry);
    return {
      entry: Boolean(entry),
      noCard: style.backgroundColor === 'rgba(0, 0, 0, 0)' && style.borderInlineStartWidth === '0px' && style.borderRadius === '0px' && style.boxShadow === 'none',
      hasDateColumn: getComputedStyle(document.querySelector('.blog-post-entry__date')).display !== 'none',
      summaryVisible: summary.getBoundingClientRect().height > 0 && getComputedStyle(summary).opacity === '1',
      titleColor: getComputedStyle(title).color,
    };
  })()`);
  assert.ok(archiveDefault.entry && archiveDefault.noCard && archiveDefault.hasDateColumn);
  assert.equal(archiveDefault.summaryVisible, false);
  await send('DOM.enable');
  await send('CSS.enable');
  const archiveHoverVisualState = `(() => {
    const summary = document.querySelector('.blog-post-entry__description');
    const title = document.querySelector('.blog-post-entry h2 a');
    return summary.getBoundingClientRect().height > 0
      && getComputedStyle(summary).opacity === '1'
      && getComputedStyle(title).color !== ${JSON.stringify(archiveDefault.titleColor)};
  })()`;
  const forceArchivePseudoState = async (forcedPseudoClasses, verifyVisualState = false) => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        await waitFor(
          `document.readyState === 'complete' && Boolean(document.querySelector('.blog-post-entry__content'))`,
          'Blog archive current document',
          2_000,
        );
        const { root: archiveDocument } = await send('DOM.getDocument', { depth: 0 });
        const { nodeId } = await send('DOM.querySelector', {
          nodeId: archiveDocument.nodeId,
          selector: '.blog-post-entry__content',
        });
        if (!nodeId) continue;
        await send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses });
        if (verifyVisualState) {
          await waitFor(archiveHoverVisualState, 'Blog archive forced hover visual state', 2_000);
        }
        return;
      } catch (error) {
        const staleNode = /Could not find node with given id|Timed out waiting for Blog archive forced hover visual state/.test(error.message);
        if (!staleNode || attempt === 2) throw error;
      }
    }
    assert.fail('Blog archive hover target must exist');
  };
  await forceArchivePseudoState(['hover'], true);
  const archiveHover = await evaluate(`(() => {
    const summary = document.querySelector('.blog-post-entry__description');
    const title = document.querySelector('.blog-post-entry h2 a');
    return {
      summaryVisible: summary.getBoundingClientRect().height > 0 && getComputedStyle(summary).opacity === '1',
      titleChanged: getComputedStyle(title).color !== ${JSON.stringify(archiveDefault.titleColor)},
    };
  })()`);
  assert.ok(archiveHover.summaryVisible && archiveHover.titleChanged);
  await forceArchivePseudoState([]);
  await evaluate(`document.querySelector('.blog-post-entry h2 a').focus()`);
  const archiveFocus = await evaluate(`(() => {
    const summary = document.querySelector('.blog-post-entry__description');
    return document.activeElement === document.querySelector('.blog-post-entry h2 a')
      && summary.getBoundingClientRect().height > 0
      && getComputedStyle(summary).opacity === '1';
  })()`);
  assert.ok(archiveFocus);

  await send('Page.navigate', { url: `${baseUrl}/projects/` });
  await waitFor(`document.readyState === 'complete' && Boolean(document.querySelector('.project-card'))`, 'Projects load');
  await evaluate(`(() => {
    const style = document.createElement('style');
    style.id = 'projects-browser-regression-control';
    style.textContent = '.project-card { transition: transform 0.2s linear; } .project-card:hover { transform: translateY(-1px); }';
    const firstStyle = document.head.querySelector('link[rel="stylesheet"], style');
    if (firstStyle) firstStyle.before(style);
    else document.head.prepend(style);
  })()`);
  const projectCardBox = await evaluate(`(() => {
    const card = document.querySelector('.project-card');
    card.scrollIntoView({ block: 'center' });
    const box = card.getBoundingClientRect();
    return { x: box.x, y: box.y, width: box.width, height: box.height };
  })()`);
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 1, y: 1, pointerType: 'mouse' });
  await send('Input.dispatchMouseEvent', {
    type: 'mouseMoved',
    x: projectCardBox.x + projectCardBox.width / 2,
    y: projectCardBox.y + projectCardBox.height / 2,
    pointerType: 'mouse',
  });
  await delay(260);
  const projectHover = await evaluate(`(() => {
    const card = document.querySelector('.project-card');
    const style = getComputedStyle(card);
    const transform = style.transform;
    return {
      hovered: card.matches(':hover'),
      transform,
      transitionDuration: style.transitionDuration,
      translateY: transform === 'none' ? 0 : new DOMMatrixReadOnly(transform).m42,
    };
  })()`);
  assert.ok(projectHover.hovered, 'desktop browser must apply the real project-card hover state');
  assert.ok(projectHover.transform !== 'none' && projectHover.translateY < 0, 'normal project-card hover must produce upward motion');
  assert.notEqual(projectHover.transitionDuration, '0s', 'normal project-card hover must have motion');

  await send('Emulation.setEmulatedMedia', {
    media: '',
    features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
  });
  const projectReducedMotion = await evaluate(`(() => {
    const card = document.querySelector('.project-card');
    const style = getComputedStyle(card);
    return {
      reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
      hovered: card.matches(':hover'),
      transform: style.transform,
      transitionDuration: style.transitionDuration,
    };
  })()`);
  assert.ok(projectReducedMotion.reduced && projectReducedMotion.hovered, 'reduced-motion assertion must observe an actual hovered project card');
  assert.equal(projectReducedMotion.transform, 'none', 'reduced motion must prohibit project-card hover translation');
  assert.equal(projectReducedMotion.transitionDuration, '0s', 'reduced motion must disable project-card transitions');
  await send('Emulation.setEmulatedMedia', { media: '', features: [] });
  await evaluate(`document.querySelector('#projects-browser-regression-control')?.remove()`);

  await send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await send('Page.navigate', { url: `${baseUrl}/blog/` });
  await waitFor(`document.readyState === 'complete'`, 'Mobile Blog archive load');
  const archiveMobile = await evaluate(`(() => {
    const date = document.querySelector('.blog-post-entry__date');
    const mobileMeta = document.querySelector('.blog-post-entry__mobile-meta');
    const summary = document.querySelector('.blog-post-entry__description');
    return {
      dateColumnHidden: getComputedStyle(date).display === 'none',
      mobileMetaVisible: getComputedStyle(mobileMeta).display === 'flex',
      summaryVisible: summary.getBoundingClientRect().height > 0 && getComputedStyle(summary).opacity === '1',
      noHorizontalOverflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    };
  })()`);
  assert.ok(archiveMobile.dateColumnHidden && archiveMobile.mobileMetaVisible && archiveMobile.summaryVisible && archiveMobile.noHorizontalOverflow);

  await send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await send('Page.navigate', { url: `${baseUrl}/blog/start-writing/` });
  await waitFor(`document.readyState === 'complete'`, 'Blog article load');
  await delay(500);
  const articleDesktop = await evaluate(`(() => {
    const paper = document.querySelector('.blog-article__paper');
    const returnLink = document.querySelector('.blog-reading-nav__return');
    const prevNext = document.querySelector('.blog-prev-next');
    const share = document.querySelector('.blog-share');
    const paperStyle = getComputedStyle(paper);
    return {
      parentReturn: returnLink?.getAttribute('href') === '/blog/' && !paper.contains(returnLink),
      tonalPaper: paperStyle.borderRadius === '0px' && paperStyle.boxShadow === 'none' && paperStyle.borderTopWidth === '0px',
      tagsAtPaperEnd: Boolean(paper.querySelector('.blog-article__tags')),
      endingOutsidePaper: !paper.contains(prevNext) && !paper.contains(share),
      previousNextPresent: Boolean(prevNext?.querySelector('a')),
      articleAdjacentLabels: [...(prevNext?.querySelectorAll('a > span') ?? [])].every((label) => ['上一篇', '下一篇'].includes(label.textContent?.trim() ?? '')),
      publicViewsAbsent: !document.querySelector('.post-views') && !document.body.textContent?.includes('次阅读'),
      noHorizontalOverflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    };
  })()`);
  assert.ok(articleDesktop.parentReturn && articleDesktop.tonalPaper && articleDesktop.tagsAtPaperEnd && articleDesktop.endingOutsidePaper && articleDesktop.previousNextPresent && articleDesktop.articleAdjacentLabels && articleDesktop.publicViewsAbsent && articleDesktop.noHorizontalOverflow);
  assert.equal(viewFixture.records, 1, 'anonymous Article visit must record exactly once');
  assert.equal(viewFixture.ownerReads, 0, 'anonymous Article must not read a view count');

  await send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await send('Page.navigate', { url: `${baseUrl}/blog/start-writing/` });
  await waitFor(`document.readyState === 'complete'`, 'Mobile Blog article load');
  await delay(500);
  const articleMobile = await evaluate(`(() => {
    const paper = document.querySelector('.blog-article__paper');
    const meta = document.querySelector('.blog-article__meta');
    const prevNext = document.querySelector('.blog-prev-next');
    const older = document.querySelector('.blog-prev-next__older');
    const paperBox = paper.getBoundingClientRect();
    const prevNextBox = prevNext.getBoundingClientRect();
    const olderBox = older.getBoundingClientRect();
    return {
      readableWidth: paperBox.width <= document.documentElement.clientWidth,
      metadataVisible: getComputedStyle(meta).display === 'flex',
      previousNextVertical: Math.abs(olderBox.left - prevNextBox.left) < 1 && olderBox.width <= prevNextBox.width,
      tagsPresent: Boolean(paper.querySelector('.blog-article__tags')),
      sharePresent: Boolean(document.querySelector('.blog-share')),
      giscusPresent: Boolean(document.querySelector('.blog-giscus')),
      publicViewsAbsent: !document.querySelector('.post-views') && !document.body.textContent?.includes('次阅读'),
      noHorizontalOverflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    };
  })()`);
  assert.ok(articleMobile.readableWidth && articleMobile.metadataVisible && articleMobile.previousNextVertical && articleMobile.tagsPresent && articleMobile.sharePresent && articleMobile.giscusPresent && articleMobile.publicViewsAbsent && articleMobile.noHorizontalOverflow);
  assert.equal(viewFixture.records, 2, 'each public Article navigation has one recording path');
  assert.equal(viewFixture.ownerReads, 0, 'anonymous mobile Article must not read a view count');

  await send('Network.setCookie', { url: baseUrl, name: 'owner-fixture', value: '1' });
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await send('Page.navigate', { url: `${baseUrl}/blog/start-writing/` });
  await waitFor(`document.readyState === 'complete'`, 'Owner Blog article load');
  await waitFor(`document.querySelector('.post-views')?.textContent?.trim() === '73 次阅读'`, 'Owner Blog view count');
  const ownerArticle = await evaluate(`(() => ({
    viewText: document.querySelector('.post-views')?.textContent?.trim() ?? null,
    noHorizontalOverflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
  }))()`);
  assert.deepEqual(ownerArticle, { viewText: '73 次阅读', noHorizontalOverflow: true });
  assert.equal(viewFixture.records, 3, 'owner Article visit must record exactly once');
  assert.equal(viewFixture.ownerReads, 1, 'authenticated owner reads the private view count once');

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
      assert.equal(
        navigation.errorText,
        undefined,
        `${route} navigation failed (Astro exitCode=${site.exitCode}, signalCode=${site.signalCode})\n${siteOutput}`,
      );
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
    legacyDirectoryAbsent:
      !document.querySelector('[data-tree-open], .learn-directory-tree'),
    withdrawnNoticePresent:
      Boolean(document.querySelector('.learn-withdrawn-notice')),
    relatedNotesAbsent:
      !document.querySelector('.learn-related'),
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
  const archiveReducedMotion = await evaluate(`(() => {
    const summary = document.querySelector('.blog-post-entry__description');
    return summary.getBoundingClientRect().height > 0 && getComputedStyle(summary).opacity === '1';
  })()`);
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
  assert.ok(textZoom.noHorizontalOverflow && textZoom.legacyDirectoryAbsent && textZoom.withdrawnNoticePresent && textZoom.relatedNotesAbsent);
  assert.ok(keyboard.focused && keyboard.focusVisible);
  assert.equal(reducedMotion, true);
  assert.ok(archiveReducedMotion);
  assert.ok(notFound.title && notFound.hasMain && notFound.hasH1 && notFound.hasHomeLink);

  console.log(JSON.stringify({
    routes: routes.length,
    viewports: viewports.length,
    matrixChecks: matrix.length,
    textZoom,
    keyboard,
    reducedMotion,
    archiveDefault,
    archiveHover,
    archiveFocus,
    projectHover,
    projectReducedMotion,
    archiveMobile,
    articleDesktop,
    articleMobile,
    archiveReducedMotion,
    notFound,
    consoleProblems,
  }, null, 2));
} finally {
  cdp?.close();
  await browser?.close();
  await stopProcessTree(site);
  await new Promise((resolve) => server.close(resolve));
}

