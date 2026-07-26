import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { connectCdp, delay } from './lib/cdp-session.mjs';
import { launchIsolatedBrowser } from './lib/isolated-browser.mjs';

const distRoot = existsSync('dist/client/index.html') ? 'dist/client' : 'dist';
const server = createServer(async (request, response) => {
  try {
    const pathname = new URL(request.url, 'http://local.test').pathname;
    if (pathname === '/activity-signals.json') {
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
    if (pathname === '/favicon.ico') {
      response.statusCode = 204;
      response.end();
      return;
    }
    const relative = decodeURIComponent(pathname === '/' ? 'index.html' : pathname.slice(1));
    const file = path.resolve(distRoot, relative);
    if (!file.startsWith(path.resolve(distRoot) + path.sep)) throw new Error('Invalid static path');
    const type = file.endsWith('.js') ? 'text/javascript'
      : file.endsWith('.css') ? 'text/css'
        : file.endsWith('.webp') ? 'image/webp'
          : file.endsWith('.png') ? 'image/png'
            : file.endsWith('.svg') ? 'image/svg+xml'
              : file.endsWith('.woff2') ? 'font/woff2'
                : 'text/html';
    response.setHeader('content-type', type);
    response.end(await readFile(file));
  } catch {
    response.statusCode = 404;
    response.end();
  }
});

function focusSnapshotExpression() {
  return `(() => {
    const layer = document.getElementById('planet-focus');
    const slot = document.querySelector('.focus-shot[data-slot="primary"]');
    const planet = slot?.querySelector('.focus-planet-wrap');
    const copy = slot?.querySelector('.focus-copy');
    const proxy = document.getElementById('focus-proxy');
    const title = slot?.querySelector('.focus-title');
    const enter = document.getElementById('focus-enter');
    const inspect = (element) => {
      if (!element) return null;
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return { opacity: Number(style.opacity), width: rect.width, height: rect.height, visibility: style.visibility };
    };
    return {
      scrollY,
      focus: layer?.dataset.focus ?? null,
      focusMode: document.body.dataset.focusMode ?? null,
      focusOpen: document.body.classList.contains('focus-open'),
      layer: inspect(layer),
      slot: inspect(slot),
      planet: inspect(planet),
      copy: inspect(copy),
      proxy: inspect(proxy),
      title: inspect(title),
      enter: inspect(enter),
    };
  })()`;
}

function isVisible(snapshot, focus) {
  return snapshot.focus === focus
    && snapshot.focusOpen
    && snapshot.layer?.visibility === 'visible'
    && snapshot.layer?.opacity > 0
    && snapshot.slot?.opacity > 0
    && ((snapshot.planet?.opacity > 0 && snapshot.planet?.width > 0 && snapshot.planet?.height > 0)
      || (snapshot.proxy?.opacity > 0 && snapshot.proxy?.width > 0 && snapshot.proxy?.height > 0))
    && snapshot.title?.opacity > 0
    && snapshot.title?.width > 0
    && snapshot.title?.height > 0
    && (focus === 'about' || (
      snapshot.enter?.opacity > 0
      && snapshot.enter?.width > 0
      && snapshot.enter?.height > 0
    ));
}

function describeException(details, phase) {
  const frames = details.stackTrace?.callFrames ?? [];
  const exception = details.exception ?? {};
  const firstFrame = frames[0];
  return {
    phase,
    message: exception.description ?? exception.value ?? details.text,
    stack: exception.description ?? (frames.map((frame) => (
      `${frame.functionName || '<anonymous>'} (${frame.url}:${frame.lineNumber}:${frame.columnNumber})`
    )).join('\n') || null),
    sourceUrl: details.url ?? firstFrame?.url ?? null,
    line: details.lineNumber ?? firstFrame?.lineNumber ?? null,
    column: details.columnNumber ?? firstFrame?.columnNumber ?? null,
    text: details.text,
  };
}

let baseUrl = process.env.HOME_TEST_URL ?? '';
const ownsServer = !process.env.HOME_TEST_URL;
const fixtureActivitySignals = {
  blog: 'active',
  feed: 'stable',
  learn: 'dormant',
  projects: 'active',
};
if (ownsServer) {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Home fixture server did not expose a TCP port');
  baseUrl = `http://127.0.0.1:${address.port}`;
} else {
  const target = new URL(baseUrl);
  if (!['127.0.0.1', 'localhost', '::1'].includes(target.hostname) && process.env.HOME_TEST_ALLOW_REMOTE !== '1') {
    throw new Error('Home regression is restricted to localhost unless HOME_TEST_ALLOW_REMOTE=1 is explicitly set.');
  }
}

let browser;
let cdp;
try {
  browser = await launchIsolatedBrowser();
  const errors = [];
  let phase = 'CDP initialization';
  cdp = await connectCdp(browser.target, (message) => {
    if (message.method === 'Runtime.exceptionThrown') {
      errors.push({ kind: 'exception', ...describeException(message.params.exceptionDetails, phase) });
    }
    if (message.method === 'Runtime.consoleAPICalled' && ['warning', 'error'].includes(message.params.type)) {
      errors.push({
        kind: `console-${message.params.type}`,
        phase,
        message: message.params.args.map((value) => value.value ?? value.description).join(' '),
      });
    }
    if (message.method === 'Log.entryAdded' && ['warning', 'error'].includes(message.params.entry.level)) {
      errors.push({
        kind: `log-${message.params.entry.level}`,
        phase,
        message: message.params.entry.text,
        url: message.params.entry.url,
      });
    }
  });
  const { send, evaluate, waitFor } = cdp;
  const load = async () => {
    phase = 'page navigation';
    await send('Page.navigate', { url: baseUrl });
    try {
      await waitFor(
        `document.readyState === 'complete' && document.body.dataset.variant === 'drift'`,
        'Home runtime',
        10_000,
      );
    } catch (error) {
      throw new Error(`${error instanceof Error ? error.message : 'Home runtime did not start'}\n${JSON.stringify(errors, null, 2)}`);
    }
    const activityReady = ownsServer
      ? `${JSON.stringify(Object.entries(fixtureActivitySignals))}.every(([key, state]) =>
          document.querySelector('[data-planet="' + key + '"] .signal-wrap')?.dataset.state === state
        )`
      : `['blog', 'feed', 'learn', 'projects'].every((key) =>
          ['active', 'stable', 'dormant'].includes(
            document.querySelector('[data-planet="' + key + '"] .signal-wrap')?.dataset.state
          )
        )`;
    await waitFor(activityReady, 'Home Activity Signal projection', 5_000);
    phase = 'Overview setup';
    await evaluate(`(() => {
      const journey = document.querySelector('.journey');
      scrollTo(0, Math.max(0, journey.offsetHeight - innerHeight) * 0.88);
    })()`);
    await delay(300);
  };
  const samples = async (focus) => {
    const results = [];
    for (const afterMs of [50, 250, 1200]) {
      await delay(afterMs - (results.at(-1)?.afterMs ?? 0));
      results.push({ afterMs, state: await evaluate(focusSnapshotExpression()) });
    }
    return { focus, results, visible: results.every(({ state }) => isVisible(state, focus)) };
  };

  await send('Runtime.enable');
  await send('Page.enable');
  await send('Log.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

  await load();
  const activitySignals = await evaluate(`Object.fromEntries(
    ['blog', 'feed', 'learn', 'projects'].map((key) => [
      key,
      document.querySelector('[data-planet="' + key + '"] .signal-wrap')?.dataset.state ?? null,
    ]),
  )`);
  phase = 'planet click';
  await evaluate(`document.querySelector('[data-planet="learn"]').click()`);
  const planetClick = await samples('learn');

  await load();
  phase = 'index click';
  await evaluate(`document.querySelector('.flight-index [data-focus="learn"]').click()`);
  const indexClick = await samples('learn');

  await load();
  phase = 'natural scroll';
  const journeyHeight = await evaluate(`document.querySelector('.journey').offsetHeight`);
  const naturalFocuses = new Map();
  const naturalFocusFrames = [];
  let overviewEntry;
  for (let top = 0; top < journeyHeight; top += 120) {
    await evaluate(`scrollTo(0, ${top})`);
    await delay(24);
    const state = await evaluate(focusSnapshotExpression());
    if (!overviewEntry && state.focus === 'about') overviewEntry = state;
    if (state.focus && state.focusOpen) {
      naturalFocusFrames.push(state);
      const previous = naturalFocuses.get(state.focus);
      if (!previous || (state.planet?.opacity ?? 0) > (previous.planet?.opacity ?? 0)) naturalFocuses.set(state.focus, state);
    }
  }
  const naturalScroll = {
    overviewEntry: {
      planetOpacity: overviewEntry?.planet?.opacity ?? null,
      copyOpacity: overviewEntry?.copy?.opacity ?? null,
      readable: (overviewEntry?.planet?.opacity ?? 0) >= 0.8 && (overviewEntry?.copy?.opacity ?? 0) >= 0.8,
    },
    observed: [...naturalFocuses.entries()].map(([focus, state]) => ({
      focus,
      visible: isVisible(state, focus),
      planetOpacity: state.planet?.opacity,
      titleOpacity: state.title?.opacity,
      enterOpacity: state.enter?.opacity,
    })),
    visible: ['about', 'feed', 'blog', 'projects', 'learn'].every((focus) => {
      const state = naturalFocuses.get(focus);
      return state && isVisible(state, focus);
    }),
    focusFrameCount: naturalFocusFrames.length,
    hiddenLayerFrameCount: naturalFocusFrames.filter(
      (state) => state.layer?.visibility !== 'visible' || state.layer?.opacity <= 0,
    ).length,
    hiddenLayerFrames: naturalFocusFrames
      .filter((state) => state.layer?.visibility !== 'visible' || state.layer?.opacity <= 0)
      .map((state) => ({ scrollY: state.scrollY, focus: state.focus, opacity: state.layer?.opacity, visibility: state.layer?.visibility })),
    layerVisibleThroughout: naturalFocusFrames.length > 0 && naturalFocusFrames.every(
      (state) => state.layer?.visibility === 'visible' && state.layer?.opacity > 0,
    ),
  };

  phase = 'reverse scroll';
  const reverseOrder = [];
  let previousReverseFocus = null;
  for (let top = journeyHeight; top >= 0; top -= 120) {
    await evaluate(`scrollTo(0, ${top})`);
    await delay(24);
    const state = await evaluate(focusSnapshotExpression());
    if (state.focusOpen && state.focus && state.focus !== previousReverseFocus) {
      reverseOrder.push(state.focus);
      previousReverseFocus = state.focus;
    }
  }
  const reverseScroll = {
    observed: reverseOrder,
    visible: ['learn', 'projects', 'blog', 'feed', 'about'].every((focus, index) => {
      const position = reverseOrder.indexOf(focus);
      const previous = index === 0 ? -1 : reverseOrder.indexOf(['learn', 'projects', 'blog', 'feed', 'about'][index - 1]);
      return position > previous;
    }),
  };

  phase = 'footer release';
  await evaluate('scrollTo(0, document.documentElement.scrollHeight)');
  await delay(120);
  const footerRelease = await evaluate(`({
    focusOpen: document.body.classList.contains('focus-open'),
    footerVisible: Boolean(document.querySelector('footer')),
  })`);

  phase = 'viewport matrix';
  const viewports = [];
  for (const { width, height } of [
    { width: 1440, height: 900 },
    { width: 1366, height: 768 },
    { width: 1024, height: 768 },
    { width: 768, height: 1024 },
    { width: 430, height: 932 },
    { width: 390, height: 844 },
    { width: 360, height: 800 },
  ]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 768 });
    await load();
    viewports.push(await evaluate(`({
      width: ${width},
      height: ${height},
      noHorizontalOverflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      hasJourney: Boolean(document.querySelector('.journey')),
      hasFivePlanets: document.querySelectorAll('[data-planet]').length === 5,
    })`));
  }

  phase = 'reduced motion';
  await send('Emulation.setEmulatedMedia', {
    media: '',
    features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
  });
  await load();
  const reducedMotion = await evaluate(`({
    preferred: matchMedia('(prefers-reduced-motion: reduce)').matches,
    cursorMeteorHidden: document.getElementById('meteor-canvas')?.hidden === true
      || getComputedStyle(document.getElementById('meteor-canvas')).display === 'none',
    entryMeteorsHidden: getComputedStyle(document.querySelector('.entry-meteors')).display === 'none',
  })`);

  const result = {
    errors,
    activitySignals,
    planetClick: { visible: planetClick.visible, samples: planetClick.results.map(({ afterMs, state }) => ({ afterMs, focus: state.focus, focusMode: state.focusMode, focusOpen: state.focusOpen, layerOpacity: state.layer?.opacity, planetOpacity: state.planet?.opacity, proxyOpacity: state.proxy?.opacity, titleOpacity: state.title?.opacity, enterOpacity: state.enter?.opacity })) },
    indexClick: { visible: indexClick.visible, samples: indexClick.results.map(({ afterMs, state }) => ({ afterMs, focus: state.focus, focusMode: state.focusMode, focusOpen: state.focusOpen, layerOpacity: state.layer?.opacity, planetOpacity: state.planet?.opacity, proxyOpacity: state.proxy?.opacity, titleOpacity: state.title?.opacity, enterOpacity: state.enter?.opacity })) },
    naturalScroll,
    reverseScroll,
    footerRelease,
    viewports,
    reducedMotion,
  };
  console.log(JSON.stringify(result, null, 2));
  if (
    errors.length
    || (ownsServer
      ? JSON.stringify(activitySignals) !== JSON.stringify(fixtureActivitySignals)
      : Object.values(activitySignals).some((state) => !['active', 'stable', 'dormant'].includes(state)))
    || !planetClick.visible
    || !indexClick.visible
    || !naturalScroll.visible
    || !naturalScroll.layerVisibleThroughout
    || !naturalScroll.overviewEntry.readable
    || !reverseScroll.visible
    || footerRelease.focusOpen
    || !footerRelease.footerVisible
    || viewports.some((viewport) => !viewport.noHorizontalOverflow || !viewport.hasJourney || !viewport.hasFivePlanets)
    || !reducedMotion.preferred
    || !reducedMotion.cursorMeteorHidden
    || !reducedMotion.entryMeteorsHidden
  ) process.exitCode = 1;
} finally {
  cdp?.close();
  await browser?.close();
  if (ownsServer) await new Promise((resolve) => server.close(resolve));
}
