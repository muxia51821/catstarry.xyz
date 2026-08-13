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
const viewFixture = { records: 0, ownerReads: 0 };
const server = createServer(async (request, response) => {
  const url = new URL(request.url, 'http://local.test');
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
  await send('Network.enable');
  await send('Emulation.setEmulatedMedia', { media: '', features: [] });

  await send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await send('Page.navigate', { url: `${baseUrl}/blog/` });
  await waitFor(`document.readyState === 'complete'`, 'Blog archive load');
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
      contentBox: (() => { const box = entry.querySelector('.blog-post-entry__content').getBoundingClientRect(); return { x: box.x, y: box.y, width: box.width, height: box.height }; })(),
    };
  })()`);
  assert.ok(archiveDefault.entry && archiveDefault.noCard && archiveDefault.hasDateColumn);
  assert.equal(archiveDefault.summaryVisible, false);
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 1, y: 1, pointerType: 'mouse' });
  await send('Input.dispatchMouseEvent', {
    type: 'mouseMoved',
    x: archiveDefault.contentBox.x + Math.min(20, archiveDefault.contentBox.width / 2),
    y: archiveDefault.contentBox.y + Math.min(20, archiveDefault.contentBox.height / 2),
    pointerType: 'mouse',
  });
  await delay(260);
  const archiveHover = await evaluate(`(() => {
    const summary = document.querySelector('.blog-post-entry__description');
    const title = document.querySelector('.blog-post-entry h2 a');
    return {
      summaryVisible: summary.getBoundingClientRect().height > 0 && getComputedStyle(summary).opacity === '1',
      titleChanged: getComputedStyle(title).color !== ${JSON.stringify(archiveDefault.titleColor)},
      contentHovered: document.querySelector('.blog-post-entry__content').matches(':hover'),
    };
  })()`);
  assert.ok(archiveHover.contentHovered && archiveHover.summaryVisible && archiveHover.titleChanged);
  await evaluate(`document.querySelector('.blog-post-entry h2 a').focus()`);
  const archiveFocus = await evaluate(`(() => {
    const summary = document.querySelector('.blog-post-entry__description');
    return document.activeElement === document.querySelector('.blog-post-entry h2 a')
      && summary.getBoundingClientRect().height > 0
      && getComputedStyle(summary).opacity === '1';
  })()`);
  assert.ok(archiveFocus);

  await send('Emulation.setEmulatedMedia', {
    media: '',
    features: [
      { name: 'hover', value: 'hover' },
      { name: 'pointer', value: 'fine' },
    ],
  });
  await send('Page.navigate', { url: `${baseUrl}/projects/` });
  await waitFor(`document.readyState === 'complete' && Boolean(document.querySelector('.project-card'))`, 'Projects load');
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
    const transform = getComputedStyle(card).transform;
    return {
      hoverCapable: matchMedia('(hover: hover) and (pointer: fine)').matches,
      hovered: card.matches(':hover'),
      transform,
      translateY: transform === 'none' ? 0 : new DOMMatrixReadOnly(transform).m42,
    };
  })()`);
  assert.ok(projectHover.hovered, 'desktop browser must apply the real project-card hover state');
  assert.ok(projectHover.transform !== 'none' && projectHover.translateY < 0, 'normal project-card hover must produce upward motion');

  await send('Emulation.setEmulatedMedia', {
    media: '',
    features: [
      { name: 'hover', value: 'hover' },
      { name: 'pointer', value: 'fine' },
      { name: 'prefers-reduced-motion', value: 'reduce' },
    ],
  });
  await delay(50);
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
    legacyDirectoryAbsent:
      !document.querySelector('[data-tree-open], .learn-directory-tree'),
    relatedNotesPresent:
      Boolean(document.querySelector('.learn-related')),
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
  assert.ok(textZoom.noHorizontalOverflow && textZoom.legacyDirectoryAbsent && textZoom.relatedNotesPresent);
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
  await new Promise((resolve) => server.close(resolve));
}
