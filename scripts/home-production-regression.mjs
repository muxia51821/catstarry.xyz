import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

const server = createServer(async (request, response) => {
  try {
    const pathname = new URL(request.url, 'http://local.test').pathname;
    const file = pathname === '/' ? '/index.html' : pathname;
    const type = file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : file.endsWith('.webp') ? 'image/webp' : 'text/html';
    response.setHeader('content-type', type);
    response.end(await readFile(`dist${file}`));
  } catch {
    response.statusCode = 404;
    response.end();
  }
});

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

function isKnownBrowserExtensionNoise(exception) {
  return (
    exception.text === 'Uncaught (in promise)'
    && (
      (
        exception.sourceUrl === 'chrome-extension://gmgoamodcdcjnbaobigkjelfplakmdhh/vendor/@eyeo/webext-ad-filtering-solution/content.js'
        && exception.line === 17
        && exception.column === 80639
        && exception.message.startsWith("TypeError: Cannot read properties of undefined (reading 'useCache')")
      )
      || (
        exception.sourceUrl === 'chrome-extension://gmgoamodcdcjnbaobigkjelfplakmdhh/polyfill.js'
        && exception.line === 244
        && exception.column === 27
        && exception.message.startsWith('Error: Could not establish connection. Receiving end does not exist.')
      )
    )
  );
}

const baseUrl = process.env.HOME_TEST_URL ?? 'http://127.0.0.1:4321';
const ownsServer = !process.env.HOME_TEST_URL;
if (ownsServer) {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(4321, '127.0.0.1', resolve);
  });
}

try {
  const targets = await fetch('http://127.0.0.1:9227/json').then((response) => response.json());
  const target = targets.find((candidate) => candidate.type === 'page');
  if (!target) throw new Error('No CDP page target at port 9227');

  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });

  let commandId = 0;
  const pending = new Map();
  const errors = [];
  const filteredErrors = [];
  let phase = 'CDP initialization';
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const resolve = pending.get(message.id);
      pending.delete(message.id);
      resolve?.(message.result);
    }
    if (message.method === 'Runtime.exceptionThrown') {
      const exception = describeException(message.params.exceptionDetails, phase);
      (isKnownBrowserExtensionNoise(exception) ? filteredErrors : errors).push(exception);
    }
  });
  const send = (method, params = {}) => {
    const id = ++commandId;
    socket.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve) => pending.set(id, resolve));
  };
  const evaluate = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true })).result.value;
  const load = async () => {
    phase = 'page navigation';
    await send('Page.navigate', { url: baseUrl });
    await delay(850);
    phase = 'Overview setup';
    await evaluate(`scrollTo(0, (PROTOTYPE_VISUAL_PARAMETERS.camera.journeyVh.drift - 100) * innerHeight / 100 * 0.88)`);
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
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

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

  const result = {
    errors,
    filteredErrors,
    planetClick: { visible: planetClick.visible, samples: planetClick.results.map(({ afterMs, state }) => ({ afterMs, focus: state.focus, focusMode: state.focusMode, focusOpen: state.focusOpen, layerOpacity: state.layer?.opacity, planetOpacity: state.planet?.opacity, proxyOpacity: state.proxy?.opacity, titleOpacity: state.title?.opacity, enterOpacity: state.enter?.opacity })) },
    indexClick: { visible: indexClick.visible, samples: indexClick.results.map(({ afterMs, state }) => ({ afterMs, focus: state.focus, focusMode: state.focusMode, focusOpen: state.focusOpen, layerOpacity: state.layer?.opacity, planetOpacity: state.planet?.opacity, proxyOpacity: state.proxy?.opacity, titleOpacity: state.title?.opacity, enterOpacity: state.enter?.opacity })) },
    naturalScroll,
  };
  console.log(JSON.stringify(result, null, 2));
  socket.close();
  if (errors.length || !planetClick.visible || !indexClick.visible || !naturalScroll.visible || !naturalScroll.layerVisibleThroughout || !naturalScroll.overviewEntry.readable) process.exitCode = 1;
} finally {
  if (ownsServer) await new Promise((resolve) => server.close(resolve));
}
