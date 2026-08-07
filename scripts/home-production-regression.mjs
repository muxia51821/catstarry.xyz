import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { connectCdp, delay } from './lib/cdp-session.mjs';
import { launchIsolatedBrowser } from './lib/isolated-browser.mjs';
import { homeCopy } from '../src/content/copy/home.ts';

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

const planetKeys = ['about', 'blog', 'feed', 'projects', 'learn'];
const planetAssetContracts = {
  overview: { attribute: 'overviewAsset', width: 1254, height: 1254 },
  focus: { attribute: 'focusAsset', width: 1120, height: 840 },
  mobile: { attribute: 'mobileAsset', width: 640, height: 640 },
};

function planetAssetProbeExpression(kind) {
  const contract = planetAssetContracts[kind];
  return `(async () => {
    const keys = ${JSON.stringify(planetKeys)};
    const loadImage = (source) => new Promise((resolve) => {
      const image = new Image();
      const finish = (loaded) => resolve({
        loaded,
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight,
      });
      image.addEventListener('load', () => finish(true), { once: true });
      image.addEventListener('error', () => finish(false), { once: true });
      image.src = source;
    });
    return Promise.all(keys.map(async (planetKey) => {
      const planet = document.querySelector('[data-planet="' + planetKey + '"]');
      const source = planet?.dataset.${contract.attribute} ?? null;
      const absoluteUrl = source ? new URL(source, location.href).href : null;
      const image = source
        ? await loadImage(source)
        : { loaded: false, naturalWidth: 0, naturalHeight: 0 };
      let renderedUrl = null;
      if (${JSON.stringify(kind)} === 'overview' && planet) {
        const backgroundImage = getComputedStyle(planet.querySelector('.planet-core')).backgroundImage;
        const match = backgroundImage.match(/^url\\(["']?(.*?)["']?\\)$/);
        renderedUrl = match ? new URL(match[1], location.href).href : null;
      }
      return {
        planet: planetKey,
        source,
        absoluteUrl,
        renderedUrl,
        rendered: ${JSON.stringify(kind)} !== 'overview' || renderedUrl === absoluteUrl,
        expectedWidth: ${contract.width},
        expectedHeight: ${contract.height},
        ...image,
      };
    }));
  })()`;
}

function addNetworkStatus(entries, responses) {
  return entries.map((entry) => {
    const response = responses.get(entry.absoluteUrl);
    return {
      ...entry,
      httpStatus: response?.status ?? null,
      mimeType: response?.mimeType ?? null,
      fromDiskCache: response?.fromDiskCache ?? false,
    };
  });
}

function assetsPass(entries) {
  return entries.length === planetKeys.length
    && planetKeys.every((key) => entries.some((entry) => entry.planet === key))
    && entries.every((entry) => (
      entry.loaded
      && entry.rendered
      && entry.naturalWidth === entry.expectedWidth
      && entry.naturalHeight === entry.expectedHeight
      && entry.httpStatus >= 200
      && entry.httpStatus < 400
      && entry.mimeType === 'image/webp'
    ));
}

function activitySignalSnapshotExpression() {
  return `(() => Object.fromEntries(['blog', 'feed', 'learn', 'projects'].map((key) => {
    const signal = document.querySelector('[data-planet="' + key + '"] .signal-wrap');
    const layers = [...(signal?.querySelectorAll('.signal-layer') ?? [])];
    const core = signal?.querySelector('.signal-core');
    const coreRect = core?.getBoundingClientRect();
    return [key, {
      hasState: signal?.dataset.hasState ?? null,
      reveal: signal ? getComputedStyle(signal).getPropertyValue('--signal-reveal').trim() : null,
      layerOpacities: layers.map((layer) => Number(getComputedStyle(layer).opacity)),
      coreOpacity: core ? Number(getComputedStyle(core).opacity) : null,
      coreWidth: coreRect?.width ?? 0,
      coreHeight: coreRect?.height ?? 0,
    }];
  })))()`;
}

function visibleSignalsPass(signals) {
  return Object.values(signals).every((signal) => (
    ['active', 'stable', 'dormant'].includes(signal.hasState)
    && Number(signal.reveal) > 0
    && signal.layerOpacities.length > 0
    && signal.layerOpacities.every((opacity) => opacity > 0)
    && signal.coreOpacity > 0
    && signal.coreWidth > 0
    && signal.coreHeight > 0
  ));
}

function unavailableSignalsPass(signals) {
  return Object.values(signals).every((signal) => (
    signal.hasState === 'unavailable'
    && signal.layerOpacities.length > 0
    && signal.layerOpacities.every((opacity) => opacity === 0)
  ));
}

function planetRevealTransitionExpression() {
  return `(async () => {
    const journey = document.querySelector('.journey');
    const planets = [...document.querySelectorAll('[data-planet]')];
    const maxScroll = Math.max(1, journey.offsetHeight - innerHeight);
    const residuals = new Map();
    const revealed = new Set();
    for (let step = 0; step <= 160; step++) {
      scrollTo(0, (maxScroll * step) / 160);
      await new Promise(requestAnimationFrame);
      for (const planet of planets) {
        const texture = Number(getComputedStyle(planet.querySelector('.planet-core')).opacity);
        const targetDot = Number(getComputedStyle(planet, '::before').opacity);
        if (texture > 0.001) revealed.add(planet.dataset.planet);
        if (texture > 0.001 && targetDot > 0.001 && !residuals.has(planet.dataset.planet)) {
          residuals.set(planet.dataset.planet, { planet: planet.dataset.planet, texture, targetDot });
        }
      }
      if (revealed.size === planets.length) break;
    }
    return { revealed: [...revealed], residuals: [...residuals.values()] };
  })()`;
}

function planetRevealTransitionPass(snapshot) {
  return snapshot.revealed.length === planetKeys.length && snapshot.residuals.length === 0;
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
  const firstPaintHtml = await readFile(path.join(distRoot, 'index.html'), 'utf8');
  const firstPaintDrift = /<body\s+data-variant="drift">/.test(firstPaintHtml);
  const copyOutputPass = [
    homeCopy.entry.eyebrow,
    homeCopy.entry.title,
    homeCopy.entry.description,
    homeCopy.entry.action,
    homeCopy.focus.placeholderKicker,
    homeCopy.footer,
    homeCopy.contact.label,
    homeCopy.planets.about.label,
    homeCopy.planets.feed.label,
    homeCopy.planets.blog.label,
    homeCopy.planets.projects.label,
    homeCopy.planets.learn.label,
  ].every((text) => firstPaintHtml.includes(text));
  browser = await launchIsolatedBrowser();
  const errors = [];
  const networkRequests = new Map();
  const networkResponses = new Map();
  const networkErrorKeys = new Set();
  let phase = 'CDP initialization';
  const recordNetworkError = (error) => {
    const key = JSON.stringify([error.kind, error.url, error.status, error.message]);
    if (networkErrorKeys.has(key)) return;
    networkErrorKeys.add(key);
    errors.push(error);
  };
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
    if (message.method === 'Network.requestWillBeSent') {
      networkRequests.set(message.params.requestId, {
        url: message.params.request.url,
        type: message.params.type,
      });
    }
    if (message.method === 'Network.responseReceived') {
      const response = message.params.response;
      networkResponses.set(response.url, {
        status: response.status,
        mimeType: response.mimeType,
        fromDiskCache: response.fromDiskCache === true,
      });
      if (response.status >= 400) {
        recordNetworkError({
          kind: 'http-error',
          phase,
          message: `HTTP ${response.status} ${response.statusText}`.trim(),
          status: response.status,
          url: response.url,
          resourceType: message.params.type,
        });
      }
    }
    if (message.method === 'Network.loadingFailed') {
      const request = networkRequests.get(message.params.requestId);
      const expectedNavigationAbort = message.params.canceled
        && message.params.errorText === 'net::ERR_ABORTED'
        && request?.type === 'Document';
      if (!expectedNavigationAbort) {
        recordNetworkError({
          kind: 'resource-failed',
          phase,
          message: message.params.errorText,
          url: request?.url ?? null,
          resourceType: request?.type ?? message.params.type,
          canceled: message.params.canceled === true,
        });
      }
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
          document.querySelector('[data-planet="' + key + '"] .signal-wrap')?.dataset.hasState === state
        )`
      : `['blog', 'feed', 'learn', 'projects'].every((key) =>
          ['active', 'stable', 'dormant'].includes(
            document.querySelector('[data-planet="' + key + '"] .signal-wrap')?.dataset.hasState
          )
        )`;
    await waitFor(activityReady, 'Home Activity Signal projection', 5_000);
    phase = 'Overview setup';
    await evaluate(`(() => {
      const journey = document.querySelector('.journey');
      scrollTo(0, Math.max(0, journey.offsetHeight - innerHeight) * 0.27);
    })()`);
    await delay(1_000);
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
  await send('Network.enable');
  await send('Network.setCacheDisabled', { cacheDisabled: true });
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

  await load();
  phase = 'desktop Overview assets';
  const overviewAssetsRaw = await evaluate(planetAssetProbeExpression('overview'));
  await delay(50);
  const overviewAssets = addNetworkStatus(overviewAssetsRaw, networkResponses);
  phase = 'desktop Focus assets';
  const focusAssetsRaw = await evaluate(planetAssetProbeExpression('focus'));
  await delay(50);
  const focusAssets = addNetworkStatus(focusAssetsRaw, networkResponses);
  const activitySignals = await evaluate(`Object.fromEntries(
    ['blog', 'feed', 'learn', 'projects'].map((key) => [
      key,
      document.querySelector('[data-planet="' + key + '"] .signal-wrap')?.dataset.hasState ?? null,
    ]),
  )`);
  const visibleSignals = await evaluate(activitySignalSnapshotExpression());
  phase = 'planet texture reveal transition';
  const planetRevealTransition = await evaluate(planetRevealTransitionExpression());
  const unavailableSignalStates = await evaluate(`(() => {
    const signals = [...document.querySelectorAll('.signal-wrap')];
    const states = signals.map((signal) => signal.dataset.hasState);
    signals.forEach((signal) => { signal.dataset.hasState = 'unavailable'; });
    return states;
  })()`);
  await delay(1_000);
  const unavailableSignals = await evaluate(activitySignalSnapshotExpression());
  await evaluate(`document.querySelectorAll('.signal-wrap').forEach((signal, index) => {
    signal.dataset.hasState = ${JSON.stringify(unavailableSignalStates)}[index];
  })`);
  await evaluate(`scrollTo({ top: document.querySelector('.journey').offsetHeight - innerHeight, behavior: 'instant' })`);
  await delay(300);
  phase = 'cat vocabulary';
  await waitFor(
    `document.querySelector('.about-zone')?.classList.contains('ready')`,
    'cat companion ready',
    3_000,
  );
  const catVocabulary = await evaluate(`(async () => {
    const about = document.querySelector('[data-planet="about"]');
    const catZone = document.querySelector('.about-zone');
    const cat = catZone.querySelector('.cat');
    const click = (target) => target.dispatchEvent(
      new MouseEvent('click', { bubbles: true, clientX: 600, clientY: 300 }),
    );
    const states = [];
    const planetStates = [...document.querySelectorAll('[data-planet]')]
      .map((p) => p.dataset.planetState ?? null);
    about.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    states.push({ step: 'hover-enter', catState: catZone.dataset.catState ?? null });
    about.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
    states.push({ step: 'hover-leave', catState: catZone.dataset.catState ?? null });
    about.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    states.push({ step: 'hover-enter-2', catState: catZone.dataset.catState ?? null });
    click(cat);
    await new Promise((resolve) => setTimeout(resolve, 60));
    states.push({ step: 'charged', catState: catZone.dataset.catState ?? null });
    click(cat);
    await new Promise((resolve) => setTimeout(resolve, 60));
    states.push({ step: 'burst', catState: catZone.dataset.catState ?? null });
    return { planetStates, states };
  })()`);
  const catVocabularyPass = (
    catVocabulary.planetStates.includes('ready')
    && catVocabulary.states[0].catState === 'reveal'
    && catVocabulary.states[1].catState === null
    && catVocabulary.states[2].catState === 'reveal'
    && catVocabulary.states[3].catState === 'charged'
    && catVocabulary.states[4].catState === 'burst'
  );
  await load();
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
    copyLineCount: (() => {
      const copy = document.querySelector('.footer-copy');
      const range = document.createRange();
      range.selectNodeContents(copy);
      return range.getClientRects().length;
    })(),
    hasContact: Boolean(document.querySelector('[data-contact="xiaohongshu"]') && document.querySelector('[data-contact="email"]')),
    hasApproachIndex: Boolean(document.querySelector('.flight-index [data-anchor="approach"]')),
  })`);
  phase = 'footer email reveal';
  const footerEmailReveal = await evaluate(`(() => {
    const details = document.querySelector('[data-contact="email"]');
    details?.querySelector('summary')?.click();
    const address = details?.querySelector('.footer-email-address');
    return {
      open: details?.open === true,
      address: address?.textContent?.trim() ?? null,
      href: address?.getAttribute('href') ?? null,
    };
  })()`);

  phase = 'viewport matrix';
  const viewports = [];
  let mobileAssets = [];
  let mobileFooter;
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
    if (width === 390 && height === 844) {
      phase = '390x844 Mobile assets';
      const mobileAssetsRaw = await evaluate(planetAssetProbeExpression('mobile'));
      await delay(50);
      mobileAssets = addNetworkStatus(mobileAssetsRaw, networkResponses);
      mobileFooter = await evaluate(`(() => {
        const copy = document.querySelector('.footer-copy');
        return {
          whiteSpace: getComputedStyle(copy).whiteSpace,
          noOverflow: copy.scrollWidth <= copy.clientWidth,
        };
      })()`);
    }
    viewports.push(await evaluate(`({
      width: ${width},
      height: ${height},
      noHorizontalOverflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      hasJourney: Boolean(document.querySelector('.journey')),
      hasFivePlanets: document.querySelectorAll('[data-planet]').length === 5,
      footerCopyLineCount: (() => {
        const copy = document.querySelector('.footer-copy');
        const range = document.createRange();
        range.selectNodeContents(copy);
        return range.getClientRects().length;
      })(),
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
    assets: {
      overview: overviewAssets,
      focus: focusAssets,
      mobile: mobileAssets,
    },
    activitySignals,
    firstPaintDrift,
    copyOutputPass,
    visibleSignals,
    planetRevealTransition,
    unavailableSignals,
    catVocabulary,
    planetClick: { visible: planetClick.visible, samples: planetClick.results.map(({ afterMs, state }) => ({ afterMs, focus: state.focus, focusMode: state.focusMode, focusOpen: state.focusOpen, layerOpacity: state.layer?.opacity, planetOpacity: state.planet?.opacity, proxyOpacity: state.proxy?.opacity, titleOpacity: state.title?.opacity, enterOpacity: state.enter?.opacity })) },
    indexClick: { visible: indexClick.visible, samples: indexClick.results.map(({ afterMs, state }) => ({ afterMs, focus: state.focus, focusMode: state.focusMode, focusOpen: state.focusOpen, layerOpacity: state.layer?.opacity, planetOpacity: state.planet?.opacity, proxyOpacity: state.proxy?.opacity, titleOpacity: state.title?.opacity, enterOpacity: state.enter?.opacity })) },
    naturalScroll,
    reverseScroll,
    footerRelease,
    footerEmailReveal,
    mobileFooter,
    viewports,
    reducedMotion,
  };
  console.log(JSON.stringify(result, null, 2));
  if (
    errors.length
    || !assetsPass(overviewAssets)
    || !assetsPass(focusAssets)
    || !assetsPass(mobileAssets)
    || (ownsServer
      ? JSON.stringify(activitySignals) !== JSON.stringify(fixtureActivitySignals)
      : Object.values(activitySignals).some((state) => !['active', 'stable', 'dormant'].includes(state)))
    || !firstPaintDrift
    || !copyOutputPass
    || !visibleSignalsPass(visibleSignals)
    || !planetRevealTransitionPass(planetRevealTransition)
    || !unavailableSignalsPass(unavailableSignals)
    || !catVocabularyPass
    || !planetClick.visible
    || !indexClick.visible
    || !naturalScroll.visible
    || !naturalScroll.layerVisibleThroughout
    || !naturalScroll.overviewEntry.readable
    || !reverseScroll.visible
    || footerRelease.focusOpen
    || !footerRelease.footerVisible
    || footerRelease.copyLineCount !== 1
    || !footerRelease.hasContact
    || footerRelease.hasApproachIndex
    || !footerEmailReveal.open
    || footerEmailReveal.address !== homeCopy.contact.email.address
    || footerEmailReveal.href !== `mailto:${homeCopy.contact.email.address}`
    || mobileFooter?.whiteSpace !== 'normal'
    || !mobileFooter?.noOverflow
    || viewports.some((viewport) => !viewport.noHorizontalOverflow || !viewport.hasJourney || !viewport.hasFivePlanets)
    || viewports.some((viewport) => viewport.width >= 768 && viewport.footerCopyLineCount !== 1)
    || !reducedMotion.preferred
    || !reducedMotion.cursorMeteorHidden
    || !reducedMotion.entryMeteorsHidden
  ) process.exitCode = 1;
} finally {
  cdp?.close();
  await browser?.close();
  if (ownsServer) await new Promise((resolve) => server.close(resolve));
}
