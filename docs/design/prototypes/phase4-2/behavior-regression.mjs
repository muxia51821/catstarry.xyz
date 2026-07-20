const targets = await fetch("http://127.0.0.1:9227/json").then((response) =>
  response.json(),
);
const target = targets.find((item) => item.type === "page");
if (!target) throw new Error("No CDP page target");

const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

let id = 0;
const pending = new Map();
const errors = [];
socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const callbacks = pending.get(message.id);
    pending.delete(message.id);
    message.error
      ? callbacks.reject(new Error(message.error.message))
      : callbacks.resolve(message.result);
  }
  if (message.method === "Runtime.exceptionThrown")
    errors.push(message.params.exceptionDetails.text);
  if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error")
    errors.push(message.params.args.map((arg) => arg.value ?? arg.description).join(" "));
});

function send(method, params = {}) {
  const requestId = ++id;
  socket.send(JSON.stringify({ id: requestId, method, params }));
  return new Promise((resolve, reject) => pending.set(requestId, { resolve, reject }));
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function evaluate(expression) {
  const result = await send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}

async function navigate({ mock = "mixed", mobile = false, reduce = "no-preference", variant = "drift", width, height } = {}) {
  await send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: reduce }],
  });
  await send("Emulation.setDeviceMetricsOverride", {
    width: width ?? (mobile ? 390 : 1440),
    height: height ?? (mobile ? 844 : 900),
    deviceScaleFactor: 1,
    mobile,
  });
  await send(
    "Emulation.setTouchEmulationEnabled",
    mobile ? { enabled: true, maxTouchPoints: 5 } : { enabled: false },
  );
  await send("Page.navigate", {
    url: `file:///D:/catstarry.xyz/docs/design/prototypes/phase4-2/index.html?variant=${variant}&mock=${mock}&test=${Date.now()}`,
  });
  await wait(520);
}

async function moveToOverview() {
  await evaluate(`(() => {
    const P = PROTOTYPE_VISUAL_PARAMETERS;
    const base = (P.camera.journeyVh.drift - 100) * innerHeight / 100;
    const latestThreshold = Math.max(
      ...Object.values(P.planet.emergence.depthOffset).map(
        ({ progress }) => P.planet.emergence.interactiveStart + progress * .12,
      ),
    );
    window.scrollTo(0, base * Math.min(1, latestThreshold + .002));
  })()`);
  await wait(180);
}

async function selectMock(key) {
  await evaluate(`document.querySelector('[data-mock="${key}"]').click()`);
  await wait(60);
  return evaluate(`(() => ({
    key: '${key}',
    signals: ['blog', 'feed', 'learn', 'projects'].map((planet) => {
      const signal = document.querySelector('[data-planet="' + planet + '"] .signal-wrap');
      return {
        planet,
        state: signal.dataset.state || null,
        status: document.getElementById(planet + '-signal-status').textContent
      };
    })
  }))()`);
}

await send("Runtime.enable");
await send("Page.enable");

await navigate();
await evaluate(`(() => {
  const P = PROTOTYPE_VISUAL_PARAMETERS;
  const threshold = (key) => P.planet.emergence.interactiveStart + P.planet.emergence.depthOffset[key].progress * .12;
  const about = threshold('about');
  const earliestOther = Math.min(...['blog', 'feed', 'learn', 'projects'].map(threshold));
  const base = (P.camera.journeyVh.drift - 100) * innerHeight / 100;
  window.scrollTo(0, base * ((about + earliestOther) / 2));
})()`);
await wait(120);
const beforeAboutReady = await evaluate(`(() => ({
  somePlanetReady: [...document.querySelectorAll('.planet')].some((planet) => planet.classList.contains('ready')),
  aboutReady: document.querySelector('[data-planet="about"]').classList.contains('ready'),
  catReady: document.getElementById('about-zone').classList.contains('ready'),
  catDisabled: document.getElementById('cat').disabled
}))()`);
await moveToOverview();
const initial = await evaluate(`(() => ({
  aboutReady: document.querySelector('[data-planet="about"]').classList.contains('ready'),
  catReady: document.getElementById('about-zone').classList.contains('ready'),
  catDisabled: document.getElementById('cat').disabled,
  states: ['blog', 'feed', 'learn', 'projects'].map((key) => ({
    key,
    state: document.querySelector('[data-planet="' + key + '"] .signal-wrap').dataset.state,
    status: document.getElementById(key + '-signal-status').textContent,
    staticMotion: document.querySelector('[data-planet="' + key + '"] .signal-wrap').dataset.staticMotion
  }))
}))()`);
const catStructure = await evaluate(`(() => ({
  layers: ['cat-aura', 'cat-contour-layer', 'cat-link-layer', 'cat-node-layer', 'cat-burst-layer'].every((name) => document.querySelector('.' + name)),
  nodes: document.querySelectorAll('.cat-node-layer .cat-node').length,
  primaryNodes: document.querySelectorAll('.cat-node--primary').length,
  secondaryNodes: document.querySelectorAll('.cat-node--secondary').length,
  fragmentCircles: document.querySelectorAll('.cat-fragment circle').length,
  burstParticles: document.querySelectorAll('.cat-burst-layer .cat-burst-particle').length,
  companionBodyAbsent: !document.querySelector('.companion-body')
}))()`);
const quiet = await selectMock("quiet");
const rotation = await selectMock("rotation");
await selectMock("mixed");

await evaluate(`document.getElementById('cat').click()`);
const charged = await evaluate(`document.getElementById('about-zone').classList.contains('charged')`);
await wait(100);
const chargedNodes = await evaluate(`(() => ({
  mode: window.__catPhysicsMode || null,
  moved: [...document.querySelectorAll('.cat-node')].some((node) => node.getAttribute('transform') !== 'translate(' + node.dataset.originX + ' ' + node.dataset.originY + ')')
}))()`);
await evaluate(`window.scrollBy(0, 2)`);
await wait(80);
const chargeCancelledByScroll = await evaluate(`(() => ({
  charged: document.getElementById('about-zone').classList.contains('charged'),
  hint: document.getElementById('cat-hint').textContent
}))()`);
await evaluate(`document.getElementById('cat').click()`);
await wait(3950);
const chargeExpired = await evaluate(`(() => ({
  state: document.getElementById('about-zone').className,
  hint: document.getElementById('cat-hint').textContent
}))()`);
await evaluate(`document.getElementById('cat').click(); document.getElementById('cat').click()`);
await wait(140);
const burstMotion = await evaluate(`(() => ({
  nodeMoved: [...document.querySelectorAll('.cat-node')].some((node) => node.style.opacity !== ''),
  fragmentsShortRange: [...document.querySelectorAll('.cat-fragment')].every((fragment) => {
    return Number(fragment.dataset.travel || 0) < 180;
  })
}))()`);
await wait(2450);
const desktopCat = await evaluate(`(() => ({
  focus: document.getElementById('planet-focus').dataset.focus,
  focusOpen: document.body.classList.contains('focus-open'),
  catState: document.getElementById('about-zone').className
}))()`);
const focusResidue = await evaluate(`(() => ({
  active: document.body.classList.contains('cat-residue-visible'),
  visibleResidue: [...document.querySelectorAll('.is-residue')].filter((item) => getComputedStyle(item).opacity !== '0').length,
  contourOpacity: getComputedStyle(document.querySelector('.cat-contour-layer')).opacity,
  linkOpacity: getComputedStyle(document.querySelector('.cat-link-layer')).opacity
}))()`);
await evaluate(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`);
await wait(120);
const desktopEscape = await evaluate(`!document.body.classList.contains('focus-open')`);
await wait(3150);
const desktopRecovery = await evaluate(`(() => ({
  classes: document.getElementById('about-zone').className,
  hint: document.getElementById('cat-hint').textContent,
  residue: document.body.classList.contains('cat-residue-visible'),
  nodeTransformsReset: [...document.querySelectorAll('.cat-node')].every((node) => node.getAttribute('transform') === 'translate(' + node.dataset.originX + ' ' + node.dataset.originY + ')')
}))()`);
await evaluate(`(() => {
  const P = PROTOTYPE_VISUAL_PARAMETERS;
  const h = innerHeight / 100;
  const base = (P.camera.journeyVh.drift - 100) * h;
  const target = base + P.camera.focusSequence.overviewHoldVh * h + P.camera.focusSequence.overviewHandoffVh.desktop * h + P.camera.focusSequence.stepVh.desktop * h * (1 + P.camera.focusSequence.holdRatio * .5);
  window.scrollTo(0, target);
})()`);
await wait(140);
const feedAfterAbout = await evaluate(`document.getElementById('planet-focus').dataset.focus`);
const footerRelease = await evaluate(`(() => {
  window.scrollTo(0, document.documentElement.scrollHeight - innerHeight - 1);
  return new Promise((resolve) => setTimeout(() => resolve({ focus: document.getElementById('planet-focus').dataset.focus, footerVisible: document.querySelector('.footer').getBoundingClientRect().top < innerHeight }), 120));
})()`);
const reverseFromFooter = await evaluate(`(() => {
  const P = PROTOTYPE_VISUAL_PARAMETERS, base = (P.camera.journeyVh.drift - 100) * innerHeight / 100;
  const latest = Math.max(...Object.values(P.planet.emergence.depthOffset).map(({ progress }) => P.planet.emergence.interactiveStart + progress * .12));
  window.scrollTo(0, base * Math.min(1, latest + .002));
  return new Promise((resolve) => setTimeout(() => resolve({ focusOpen: document.body.classList.contains('focus-open'), stage: document.getElementById('stage-name').textContent }), 120));
})()`);

await navigate({ variant: 'orbit', width: 1366, height: 768 });
await moveToOverview();
const orbit1366 = await evaluate(`(() => ({
  variant: new URLSearchParams(location.search).get('variant'),
  readyPlanets: [...document.querySelectorAll('.planet.ready')].map((planet) => planet.dataset.planet),
  catReady: document.getElementById('about-zone').classList.contains('ready'),
  catDisabled: document.getElementById('cat').disabled
}))()`);

await navigate({ mobile: true });
await moveToOverview();
const touchRect = await evaluate(`(() => {
  const rect = document.getElementById('cat').getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
})()`);
await send("Input.dispatchTouchEvent", {
  type: "touchStart",
  touchPoints: [{ x: touchRect.x, y: touchRect.y, radiusX: 1, radiusY: 1, force: 1, id: 1 }],
});
await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
await wait(2450);
const touchCat = await evaluate(`(() => ({
  focus: document.getElementById('planet-focus').dataset.focus,
  focusOpen: document.body.classList.contains('focus-open'),
  charged: document.getElementById('about-zone').classList.contains('charged'),
  staticSignals: [...document.querySelectorAll('.signal-wrap[data-state]')].every((signal) => signal.dataset.staticMotion === 'true')
}))()`);
await evaluate(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`);
await wait(80);

await navigate({ mock: "unavailable", reduce: "reduce" });
await moveToOverview();
await evaluate(`document.getElementById('cat').click()`);
await wait(100);
const reduced = await evaluate(`(() => ({
  focus: document.getElementById('planet-focus').dataset.focus,
  focusOpen: document.body.classList.contains('focus-open'),
  catClasses: document.getElementById('about-zone').className,
  signalsVisible: [...document.querySelectorAll('.signal-wrap')].filter((signal) => signal.dataset.state).length,
  statuses: ['blog', 'feed', 'learn', 'projects'].map((key) => document.getElementById(key + '-signal-status').textContent)
}))()`);
await evaluate(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`);
await wait(80);
const reducedEscape = await evaluate(`!document.body.classList.contains('focus-open')`);

const result = {
  errors,
  beforeAboutReady,
  initial,
  catStructure,
  quiet,
  rotation,
  charged,
  chargedNodes,
  chargeCancelledByScroll,
  chargeExpired,
  burstMotion,
  desktopCat,
  focusResidue,
  desktopEscape,
  desktopRecovery,
  feedAfterAbout,
  footerRelease,
  reverseFromFooter,
  orbit1366,
  touchCat,
  reduced,
  reducedEscape,
};

console.log(JSON.stringify(result, null, 2));

const failed =
  errors.length > 0 ||
  !beforeAboutReady.somePlanetReady ||
  beforeAboutReady.aboutReady ||
  beforeAboutReady.catReady ||
  !beforeAboutReady.catDisabled ||
  !initial.aboutReady ||
  !initial.catReady ||
  initial.catDisabled ||
  !catStructure.layers ||
  catStructure.nodes !== 28 ||
  catStructure.primaryNodes !== 16 ||
  catStructure.secondaryNodes !== 12 ||
  catStructure.fragmentCircles !== 0 ||
  catStructure.burstParticles < 1 ||
  !catStructure.companionBodyAbsent ||
  quiet.signals.some(({ state }) => state !== "dormant") ||
  !charged ||
  !chargedNodes.moved ||
  chargeCancelledByScroll.charged ||
  chargeExpired.state.includes("charged") ||
  !burstMotion.nodeMoved ||
  !burstMotion.fragmentsShortRange ||
  desktopCat.focus !== "about" ||
  !desktopCat.focusOpen ||
  !focusResidue.active ||
  focusResidue.visibleResidue < 1 ||
  focusResidue.contourOpacity !== "0" ||
  focusResidue.linkOpacity !== "0" ||
  !desktopEscape ||
  desktopRecovery.residue ||
  !desktopRecovery.nodeTransformsReset ||
  feedAfterAbout !== "feed" ||
  !footerRelease.footerVisible ||
  reverseFromFooter.focusOpen ||
  !reverseFromFooter.stage.includes("STAR MAP") ||
  orbit1366.readyPlanets.length !== 5 ||
  touchCat.focus !== "about" ||
  !touchCat.focusOpen ||
  touchCat.charged ||
  !touchCat.staticSignals ||
  reduced.focus !== "about" ||
  !reduced.focusOpen ||
  reduced.signalsVisible !== 0 ||
  reduced.statuses.some((status) => !status.includes("不可用")) ||
  !reducedEscape;

if (failed) process.exitCode = 1;
socket.close();
