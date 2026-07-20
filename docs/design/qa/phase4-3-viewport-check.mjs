import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const targets = await fetch("http://127.0.0.1:9227/json").then((response) => response.json());
const target = targets.find((item) => item.type === "page");
if (!target) throw new Error("No CDP page target");

const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolveOpen, reject) => {
  socket.addEventListener("open", resolveOpen, { once: true });
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
  if (message.method === "Runtime.exceptionThrown") {
    errors.push(message.params.exceptionDetails.text);
  }
  if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error") {
    errors.push(message.params.args.map((arg) => arg.value ?? arg.description).join(" "));
  }
});

function send(method, params = {}) {
  const requestId = ++id;
  socket.send(JSON.stringify({ id: requestId, method, params }));
  return new Promise((resolveRequest, reject) => {
    pending.set(requestId, { resolve: resolveRequest, reject });
  });
}

const wait = (ms) => new Promise((resolveWait) => setTimeout(resolveWait, ms));

async function evaluate(expression) {
  const result = await send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}

const evidenceDir = resolve(dirname(fileURLToPath(import.meta.url)), "evidence");
await mkdir(evidenceDir, { recursive: true });

async function navigate({ width, height, mobile, reduce = "no-preference", mock = "mixed" }) {
  await send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile,
  });
  await send("Emulation.setTouchEmulationEnabled", {
    enabled: mobile,
    maxTouchPoints: mobile ? 5 : 1,
  });
  await send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: reduce }],
  });
  await send("Page.navigate", {
    url: `file:///D:/catstarry.xyz/docs/design/prototypes/phase4-2/index.html?variant=drift&mock=${mock}&qa=${Date.now()}`,
  });
  await wait(650);
  await evaluate(`(() => {
    const P = PROTOTYPE_VISUAL_PARAMETERS;
    const base = (P.camera.journeyVh.drift - 100) * innerHeight / 100;
    const latestThreshold = Math.max(
      ...Object.values(P.planet.emergence.depthOffset).map(
        ({ progress }) => P.planet.emergence.interactiveStart + progress * .12,
      ),
    );
    scrollTo(0, base * Math.min(1, latestThreshold + .002));
  })()`);
  await wait(220);
}

async function capture(name) {
  const screenshot = await send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
    fromSurface: true,
  });
  await writeFile(resolve(evidenceDir, name), Buffer.from(screenshot.data, "base64"));
}

async function overviewAudit() {
  return evaluate(`(() => ({
    viewport: { width: innerWidth, height: innerHeight },
    horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
    stage: document.querySelector('#stage-name')?.textContent.trim(),
    planets: [...document.querySelectorAll('.planet')].map((planet) => {
      const rect = planet.getBoundingClientRect();
      const labelRect = planet.querySelector('.planet-label').getBoundingClientRect();
      return {
        key: planet.dataset.planet,
        ready: planet.classList.contains('ready'),
        tabIndex: planet.tabIndex,
        pointerEvents: getComputedStyle(planet).pointerEvents,
        rect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom },
        labelWithinHorizontalViewport: labelRect.left >= 0 && labelRect.right <= innerWidth,
      };
    }),
    indexButtons: [...document.querySelectorAll('.flight-index button')].map((button) => ({
      text: button.textContent.trim(),
      tabIndex: button.tabIndex,
    })),
  }))()`);
}

async function focusAudit(key) {
  await evaluate(`document.querySelector('[data-planet="${key}"]').click()`);
  await wait(1350);
  return evaluate(`(() => {
    const slot = document.querySelector('.focus-shot[data-slot="primary"]');
    const copy = slot.querySelector('.focus-copy');
    const copyRect = copy.getBoundingClientRect();
    const actions = [...copy.querySelectorAll('button')]
      .filter((button) => getComputedStyle(button).display !== 'none')
      .map((button) => ({ text: button.textContent.trim(), tabIndex: button.tabIndex }));
    return {
      key: slot.dataset.identity,
      open: !document.querySelector('#planet-focus').matches('[aria-hidden="true"]'),
      copyWithinHorizontalViewport: copyRect.left >= 0 && copyRect.right <= innerWidth,
      copyIntersectsViewport: copyRect.bottom > 0 && copyRect.top < innerHeight,
      lineHeight: getComputedStyle(copy).lineHeight,
      actions,
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
    };
  })()`);
}

const report = { errors };

await navigate({ width: 1366, height: 768, mobile: false });
report.desktopOverview = await overviewAudit();
await capture("phase4-3-prototype-overview-1366x768.png");
report.desktopFeedFocus = await focusAudit("feed");
await capture("phase4-3-prototype-feed-focus-1366x768.png");

await navigate({ width: 1366, height: 768, mobile: false });
await evaluate(`(() => {
  const planet = document.querySelector('[data-planet="blog"]');
  planet.focus();
  planet.click();
})()`);
await wait(1350);
const focusEntry = await evaluate(`({
  activeId: document.activeElement.id,
  focusOpen: document.body.classList.contains('focus-open'),
})`);
await evaluate(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`);
await wait(1200);
report.desktopKeyboard = {
  focusEntry,
  returnFocus: await evaluate(`({
    planet: document.activeElement.dataset.planet || null,
    activeId: document.activeElement.id || null,
    activeClass: document.activeElement.className || null,
    focusOpen: document.body.classList.contains('focus-open'),
  })`),
};

await navigate({ width: 390, height: 844, mobile: true });
report.mobileOverview = await overviewAudit();
await capture("phase4-3-prototype-overview-390x844.png");
report.mobileAboutFocus = await focusAudit("about");
await capture("phase4-3-prototype-about-focus-390x844.png");

await send("Emulation.setPageScaleFactor", { pageScaleFactor: 1.25 });
report.mobileZoom125 = await evaluate(`({
  horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
  viewport: { width: innerWidth, height: innerHeight },
})`);
await send("Emulation.setPageScaleFactor", { pageScaleFactor: 1 });

await navigate({ width: 1366, height: 768, mobile: false, reduce: "reduce", mock: "mixed" });
report.reducedMotion = await evaluate(`(() => ({
  signals: [...document.querySelectorAll('.signal-wrap')].map((signal) => ({
    planet: signal.closest('.planet').dataset.planet,
    state: signal.dataset.state,
    staticMotion: signal.dataset.staticMotion,
    visible: getComputedStyle(signal).display !== 'none' && getComputedStyle(signal).opacity !== '0',
  })),
  cursorDisplay: getComputedStyle(document.querySelector('.meteor-canvas')).display,
  catPhysicsActive: document.querySelector('#about-zone').classList.contains('burst') ||
    document.querySelector('#about-zone').classList.contains('recovering'),
}))()`);

const failures = [];
const check = (condition, message) => {
  if (!condition) failures.push(message);
};
const checkOverview = (audit, label) => {
  check(!audit.horizontalOverflow, `${label}: horizontal overflow`);
  check(audit.planets.length === 5, `${label}: expected five planets`);
  check(
    audit.planets.every(
      (planet) =>
        planet.ready &&
        planet.tabIndex === 0 &&
        planet.pointerEvents === "auto" &&
        planet.labelWithinHorizontalViewport,
    ),
    `${label}: planet readiness, hit state, or label bounds failed`,
  );
  check(
    audit.indexButtons.every((button) => button.tabIndex === 0),
    `${label}: side index keyboard target failed`,
  );
};

check(errors.length === 0, "console errors were recorded");
checkOverview(report.desktopOverview, "desktop overview");
check(report.desktopFeedFocus.open, "desktop Feed focus did not open");
check(report.desktopFeedFocus.key === "feed", "desktop Feed focus identity mismatch");
check(
  report.desktopFeedFocus.copyWithinHorizontalViewport &&
    report.desktopFeedFocus.copyIntersectsViewport &&
    !report.desktopFeedFocus.horizontalOverflow,
  "desktop Feed focus copy overflowed or left the viewport",
);
check(
  report.desktopKeyboard.focusEntry.activeId === "focus-back" &&
    report.desktopKeyboard.focusEntry.focusOpen,
  "keyboard focus did not enter the Focus return control",
);
check(
  report.desktopKeyboard.returnFocus.planet === "blog" &&
    !report.desktopKeyboard.returnFocus.focusOpen,
  "Escape did not restore focus to the Blog planet",
);
checkOverview(report.mobileOverview, "mobile overview");
check(report.mobileAboutFocus.open, "mobile About focus did not open");
check(report.mobileAboutFocus.key === "about", "mobile About focus identity mismatch");
check(
  report.mobileAboutFocus.copyWithinHorizontalViewport &&
    report.mobileAboutFocus.copyIntersectsViewport &&
    !report.mobileAboutFocus.horizontalOverflow,
  "mobile About copy overflowed or left the viewport",
);
check(
  report.mobileAboutFocus.actions.length === 1 &&
    report.mobileAboutFocus.actions[0].text === "返回星图",
  "mobile About exposed an unexpected secondary action",
);
check(!report.mobileZoom125.horizontalOverflow, "mobile 125% zoom overflowed horizontally");
check(
  report.reducedMotion.signals.length === 4 &&
    report.reducedMotion.signals.every(
      (signal) => signal.staticMotion === "true" && signal.visible,
    ),
  "reduced-motion HAS did not retain four static readable states",
);
check(report.reducedMotion.cursorDisplay === "none", "reduced-motion cursor meteor remained visible");
check(!report.reducedMotion.catPhysicsActive, "reduced-motion leopard-cat physics remained active");

console.log(JSON.stringify(report, null, 2));
socket.close();

if (failures.length) {
  console.error(`Phase 4.3 viewport failures:\n- ${failures.join("\n- ")}`);
  process.exitCode = 1;
}
