import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { mkdir, writeFile } from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { connectCdp, delay } from '../../scripts/lib/cdp-session.mjs';
import { launchIsolatedBrowser } from '../../scripts/lib/isolated-browser.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const outputRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'evidence');
const astro = path.join(root, 'node_modules', 'astro', 'bin', 'astro.mjs');
const [sessionPort, sitePort] = await freePorts(2);
const sessionOrigin = `http://127.0.0.1:${sessionPort}`;
const siteOrigin = `http://127.0.0.1:${sitePort}`;
const consoleProblems = [];
const failedRequests = [];
const observations = {};
let site;
let browser;
let cdp;

const sessionServer = createServer((request, response) => {
  if (request.url !== '/api/auth/session') {
    response.writeHead(404).end();
    return;
  }
  const authenticated = (request.headers.cookie ?? '').includes('preview-token=1');
  response.writeHead(200, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'private, no-store',
  });
  response.end(JSON.stringify({ authenticated, username: authenticated ? 'stage-0-evidence' : null }));
});

try {
  await mkdir(outputRoot, { recursive: true });
  await listen(sessionServer, sessionPort);
  site = spawn(process.execPath, [astro, 'dev', '--host', '127.0.0.1', '--port', String(sitePort)], {
    cwd: root,
    env: {
      ...process.env,
      ASTRO_DEV_BACKGROUND: '0',
      ASTRO_TELEMETRY_DISABLED: '1',
      FEED_API_URL: sessionOrigin,
      PUBLIC_FEED_API_URL: sessionOrigin,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  let siteOutput = '';
  site.stdout.on('data', (chunk) => { siteOutput += chunk; });
  site.stderr.on('data', (chunk) => { siteOutput += chunk; });
  await waitForHttp(`${siteOrigin}/`, site, () => siteOutput);

  browser = await launchIsolatedBrowser();
  cdp = await connectCdp(browser.target, (message) => {
    if (message.method === 'Runtime.exceptionThrown') {
      consoleProblems.push({
        kind: 'exception',
        text: message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text,
      });
    }
    if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') {
      consoleProblems.push({
        kind: 'console-error',
        text: message.params.args.map((value) => value.value ?? value.description).join(' '),
      });
    }
    if (message.method === 'Network.loadingFailed') {
      failedRequests.push({ requestId: message.params.requestId, errorText: message.params.errorText });
    }
  });
  const { send, evaluate, waitFor } = cdp;
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Network.enable');
  await send('Emulation.setEmulatedMedia', { media: '', features: [] });

  async function viewport(width, height, mobile = false) {
    await send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile,
    });
  }

  async function navigate(pathname) {
    await send('Page.navigate', { url: `${siteOrigin}${pathname}` });
    await waitFor(`document.readyState === 'complete'`, `${pathname} load`, 15_000);
    await delay(350);
  }

  async function fullScreenshot(name) {
    const metrics = await send('Page.getLayoutMetrics');
    const size = metrics.cssContentSize;
    const image = await send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: true,
      clip: { x: 0, y: 0, width: size.width, height: size.height, scale: 1 },
    }, 15_000);
    await writeFile(path.join(outputRoot, name), Buffer.from(image.data, 'base64'));
  }

  async function selectorScreenshot(name, selector, padding = 16) {
    const rect = await evaluate(`(() => {
      const node = document.querySelector(${JSON.stringify(selector)});
      if (!node) return null;
      const box = node.getBoundingClientRect();
      return { x: box.x + scrollX, y: box.y + scrollY, width: box.width, height: box.height };
    })()`);
    if (!rect) return false;
    const metrics = await send('Page.getLayoutMetrics');
    const size = metrics.cssContentSize;
    const x = Math.max(0, rect.x - padding);
    const y = Math.max(0, rect.y - padding);
    const width = Math.min(size.width - x, rect.width + padding * 2);
    const height = Math.min(size.height - y, rect.height + padding * 2);
    const image = await send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: true,
      clip: { x, y, width, height, scale: 1 },
    }, 15_000);
    await writeFile(path.join(outputRoot, name), Buffer.from(image.data, 'base64'));
    return true;
  }

  async function point(selector) {
    return evaluate(`(() => {
      const node = document.querySelector(${JSON.stringify(selector)});
      if (!node) return null;
      const box = node.getBoundingClientRect();
      return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    })()`);
  }

  await viewport(1440, 1000);
  await navigate('/learn/');
  observations.desktopHome = await evaluate(`(() => ({
    title: document.querySelector('h1')?.textContent?.trim(),
    eyebrow: document.querySelector('.learn-page__eyebrow')?.textContent?.trim(),
    intro: document.querySelector('.learn-page__intro')?.textContent?.trim(),
    count: document.querySelector('.learn-page__count')?.textContent?.trim(),
    graphHeading: document.querySelector('.learn-graph h2')?.textContent?.trim(),
    graphCount: document.querySelector('.learn-graph__count')?.textContent?.trim(),
    graphNodes: document.querySelectorAll('.learn-graph__node').length,
    graphEdges: document.querySelectorAll('.learn-graph__links line').length,
    trackCards: document.querySelectorAll('.learn-track-card').length,
    recentCards: document.querySelectorAll('#learn-recent-title + * .learn-note-card, #learn-recent-title ~ * .learn-note-card').length,
    searchSticky: getComputedStyle(document.querySelector('.learn-search')).position,
    graphStyle: (() => { const node = document.querySelector('.learn-graph'); const style = getComputedStyle(node); return { background: style.backgroundColor, color: style.color, borderRadius: style.borderRadius, boxShadow: style.boxShadow }; })(),
    bodyOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  }))()`);
  await fullScreenshot('desktop-home-full.png');
  await selectorScreenshot('desktop-home-opening.png', '.learn-page__header');
  await selectorScreenshot('desktop-home-graph.png', '.learn-graph');
  await selectorScreenshot('desktop-home-search-resting.png', '.learn-search');
  await selectorScreenshot('desktop-home-recent.png', '#learn-recent-title');
  await selectorScreenshot('desktop-home-tracks.png', '#learn-tracks-title');

  const firstGraphNode = await point('.learn-graph__node');
  if (firstGraphNode) {
    const graphBefore = await evaluate(`(() => { const n = document.querySelector('.learn-graph__node'); const c = n.querySelector('circle'); return { href: n.getAttribute('href'), fill: getComputedStyle(c).fill, radius: c.getAttribute('r') }; })()`);
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: firstGraphNode.x, y: firstGraphNode.y, pointerType: 'mouse' });
    await delay(180);
    const graphHover = await evaluate(`(() => { const n = document.querySelector('.learn-graph__node'); const c = n.querySelector('circle'); return { hovered: n.matches(':hover'), fill: getComputedStyle(c).fill, radius: getComputedStyle(c).r }; })()`);
    await evaluate(`document.querySelector('.learn-graph__node').focus()`);
    const graphFocus = await evaluate(`(() => { const n = document.querySelector('.learn-graph__node'); const s = getComputedStyle(n); return { focused: document.activeElement === n, outlineStyle: s.outlineStyle, outlineWidth: s.outlineWidth }; })()`);
    observations.graphInteraction = { before: graphBefore, hover: graphHover, focus: graphFocus };
    await selectorScreenshot('desktop-home-graph-focus.png', '.learn-graph');
  }

  await evaluate(`(() => { const input = document.querySelector('#learn-search-input'); input.focus(); input.value = 'vibe'; input.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await delay(420);
  observations.searchActive = await evaluate(`(() => ({
    pageActive: document.querySelector('[data-learn-page]')?.dataset.searchActive,
    expanded: document.querySelector('#learn-search-input')?.getAttribute('aria-expanded'),
    resultsVisible: !document.querySelector('[data-search-results]')?.hidden,
    suggestionsVisible: !document.querySelector('[data-search-suggestions]')?.hidden,
    suggestionCount: document.querySelectorAll('[data-search-suggestions] [role="option"]').length,
    homeContentDisplay: getComputedStyle(document.querySelector('.learn-home-content')).display,
  }))()`);
  await selectorScreenshot('desktop-home-search-active.png', '.learn-search');
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowDown', code: 'ArrowDown' });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowDown', code: 'ArrowDown' });
  observations.searchArrow = await evaluate(`(() => ({ activeDescendant: document.querySelector('#learn-search-input')?.getAttribute('aria-activedescendant'), selected: document.querySelector('[data-search-suggestions] [aria-selected="true"]')?.textContent?.trim() }))()`);
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape' });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape' });
  observations.searchEscape = await evaluate(`(() => ({ expanded: document.querySelector('#learn-search-input')?.getAttribute('aria-expanded'), suggestionsHidden: document.querySelector('[data-search-suggestions]')?.hidden }))()`);

  await navigate('/learn/track/programming/');
  observations.desktopTrack = await evaluate(`(() => ({
    heading: document.querySelector('h1')?.textContent?.trim(),
    eyebrow: document.querySelector('.learn-page__eyebrow')?.textContent?.trim(),
    count: document.querySelector('.learn-page__count')?.textContent?.trim(),
    sectionTabs: [...document.querySelectorAll('.learn-section-tabs a')].map((node) => node.textContent.trim()),
    noteCards: document.querySelectorAll('.learn-note-card').length,
    bottomReturn: [...document.querySelectorAll('a')].filter((node) => node.textContent.includes('返回 Learn')).length,
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  }))()`);
  await fullScreenshot('desktop-track-programming-full.png');
  await selectorScreenshot('desktop-track-top.png', '.learn-page__header');
  await selectorScreenshot('desktop-track-index.png', '#track-notes');

  await navigate('/learn/notes/vibe-coding-mission/');
  observations.desktopNote = await evaluate(`(() => ({
    back: document.querySelector('.learn-detail-page__back')?.textContent?.trim(),
    title: document.querySelector('h1')?.textContent?.trim(),
    metadata: [...document.querySelectorAll('.learn-detail-page__meta > *')].map((node) => node.textContent.trim()),
    tags: [...document.querySelectorAll('.learn-detail-page__tags li')].map((node) => node.textContent.trim()),
    bodyWidth: document.querySelector('.learn-note-body')?.getBoundingClientRect().width,
    tree: Boolean(document.querySelector('[data-learn-tree]')),
    drawer: Boolean(document.querySelector('[data-tree-open]')),
    wikilinks: document.querySelectorAll('[data-wikilink-trigger]').length,
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  }))()`);
  await fullScreenshot('desktop-note-full.png');
  await selectorScreenshot('desktop-note-header.png', '.learn-detail-page__header');
  await selectorScreenshot('desktop-note-reading.png', '.learn-note-body');
  await selectorScreenshot('desktop-note-tree.png', '.learn-tree-drawer');
  const wikiPoint = await point('[data-wikilink-trigger]');
  if (wikiPoint) {
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: wikiPoint.x, y: wikiPoint.y, pointerType: 'mouse' });
    await delay(150);
    const hover = await evaluate(`(() => { const t = document.querySelector('[data-wikilink-trigger]'); const p = t.closest('.learn-wikilink')?.querySelector('[data-wikilink-preview]'); return { hovered: t.matches(':hover'), previewVisible: p ? !p.hidden : false, previewText: p?.textContent?.trim() }; })()`);
    await evaluate(`document.querySelector('[data-wikilink-trigger]').focus()`);
    const focus = await evaluate(`(() => { const t = document.querySelector('[data-wikilink-trigger]'); const p = t.closest('.learn-wikilink')?.querySelector('[data-wikilink-preview]'); return { focused: document.activeElement === t, expanded: t.getAttribute('aria-expanded'), previewVisible: p ? !p.hidden : false }; })()`);
    const beforePath = await evaluate('location.pathname');
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: wikiPoint.x, y: wikiPoint.y, button: 'left', clickCount: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: wikiPoint.x, y: wikiPoint.y, button: 'left', clickCount: 1 });
    await delay(250);
    const click = await evaluate(`(() => { const t = document.querySelector('[data-wikilink-trigger]'); const p = t?.closest('.learn-wikilink')?.querySelector('[data-wikilink-preview]'); return { beforePath: ${JSON.stringify(beforePath)}, afterPath: location.pathname, previewVisible: p ? !p.hidden : false, secondLink: p?.querySelector('a')?.textContent?.trim() }; })()`);
    observations.wikilinkInteraction = { hover, focus, click };
    await selectorScreenshot('desktop-note-wikilink-active.png', '.learn-wikilink');
  }

  await send('Network.setCookie', { name: 'preview-token', value: '1', url: siteOrigin, path: '/' });
  await navigate('/learn/admin/');
  observations.admin = await evaluate(`(() => ({
    status: document.querySelector('h1')?.textContent?.trim(),
    rows: document.querySelectorAll('.learn-admin-row').length,
    states: [...document.querySelectorAll('.learn-admin-row__state span')].map((node) => node.textContent.trim()),
    completionForms: document.querySelectorAll('[data-complete-form]').length,
    completionButtons: [...document.querySelectorAll('button')].filter((node) => node.textContent.includes('完成小节')).length,
    retractButtons: [...document.querySelectorAll('[data-publication-action="retract"]')].length,
    noindex: document.querySelector('meta[name="robots"]')?.content,
  }))()`);
  await fullScreenshot('desktop-admin-full.png');

  await navigate('/learn/preview/domain-dns-http/');
  observations.preview = await evaluate(`(() => ({
    banner: document.querySelector('.learn-page__eyebrow')?.textContent?.trim(),
    back: document.querySelector('.learn-detail-page__back')?.textContent?.trim(),
    title: document.querySelector('h1')?.textContent?.trim(),
    noindex: document.querySelector('meta[name="robots"]')?.content,
    tags: document.querySelectorAll('.learn-detail-page__tags li').length,
  }))()`);
  await fullScreenshot('desktop-preview-draft-full.png');

  await viewport(390, 844, true);
  await navigate('/learn/');
  observations.mobileHome = await evaluate(`(() => ({
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    graphWidth: document.querySelector('.learn-graph')?.getBoundingClientRect().width,
    graphNodes: document.querySelectorAll('.learn-graph__node').length,
    trackCards: document.querySelectorAll('.learn-track-card').length,
    searchWidth: document.querySelector('.learn-search__form')?.getBoundingClientRect().width,
  }))()`);
  await fullScreenshot('mobile-home-full.png');
  await selectorScreenshot('mobile-home-graph.png', '.learn-graph', 8);
  await selectorScreenshot('mobile-home-search.png', '.learn-search', 8);
  await selectorScreenshot('mobile-home-tracks.png', '#learn-tracks-title', 8);

  await navigate('/learn/track/programming/');
  observations.mobileTrack = await evaluate(`(() => ({ overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth, tabs: document.querySelector('.learn-section-tabs')?.getBoundingClientRect().width, cards: document.querySelectorAll('.learn-note-card').length }))()`);
  await fullScreenshot('mobile-track-programming-full.png');

  await navigate('/learn/notes/vibe-coding-mission/');
  observations.mobileNote = await evaluate(`(() => ({
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    bodyWidth: document.querySelector('.learn-note-body')?.getBoundingClientRect().width,
    drawerToggleVisible: getComputedStyle(document.querySelector('[data-tree-open]')).display !== 'none',
    treeDrawerMode: document.querySelector('[data-tree-drawer]')?.getAttribute('role'),
  }))()`);
  await fullScreenshot('mobile-note-full.png');
  await selectorScreenshot('mobile-note-header.png', '.learn-detail-page__header', 8);
  await selectorScreenshot('mobile-note-reading.png', '.learn-note-body', 8);
  const drawerPoint = await point('[data-tree-open]');
  if (drawerPoint) {
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: drawerPoint.x, y: drawerPoint.y, button: 'left', clickCount: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: drawerPoint.x, y: drawerPoint.y, button: 'left', clickCount: 1 });
    await delay(180);
    observations.mobileDrawer = await evaluate(`(() => ({ open: document.querySelector('[data-tree-drawer]')?.dataset.open, role: document.querySelector('[data-tree-drawer]')?.getAttribute('role'), ariaModal: document.querySelector('[data-tree-drawer]')?.getAttribute('aria-modal'), active: document.activeElement?.textContent?.trim() }))()`);
    await fullScreenshot('mobile-note-drawer-open.png');
  }

  await send('Emulation.setEmulatedMedia', {
    media: '',
    features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
  });
  observations.reducedMotion = await evaluate(`(() => ({
    drawerTransition: getComputedStyle(document.querySelector('.learn-tree-drawer')).transitionDuration,
  }))()`);

  await writeFile(path.join(outputRoot, 'current-reality.json'), JSON.stringify({
    siteOrigin,
    capturedAt: new Date().toISOString(),
    observations,
    consoleProblems,
    failedRequests,
  }, null, 2));
  console.log(JSON.stringify({ outputRoot, observations, consoleProblems, failedRequests }, null, 2));
} finally {
  cdp?.close();
  await browser?.close();
  await stopProcessTree(site);
  await closeServer(sessionServer);
}

async function freePorts(count) {
  const ports = [];
  while (ports.length < count) {
    const server = net.createServer();
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Could not reserve a local port');
    await new Promise((resolve) => server.close(resolve));
    if (!ports.includes(address.port)) ports.push(address.port);
  }
  return ports;
}

function listen(server, port) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });
}

async function waitForHttp(url, child, getOutput) {
  const deadline = Date.now() + 90_000;
  let lastError;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Astro dev exited before ready:\n${getOutput()}`);
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1_000) });
      if (response.ok) return;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await delay(250);
  }
  throw new Error(`Astro dev did not become ready: ${lastError?.message ?? 'unknown error'}\n${getOutput()}`);
}

async function stopProcessTree(child) {
  if (!child || child.exitCode !== null) return;
  if (process.platform === 'win32') {
    const killer = spawn('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
    await once(killer, 'exit');
  } else {
    child.kill('SIGTERM');
  }
  await Promise.race([once(child, 'exit'), delay(5_000)]);
}

function closeServer(server) {
  return new Promise((resolve) => {
    if (!server.listening) return resolve();
    server.close(() => resolve());
  });
}
