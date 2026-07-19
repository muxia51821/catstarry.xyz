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

async function clickAt(point) {
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: point.x, y: point.y });
  await send("Input.dispatchMouseEvent", {
    type: "mousePressed",
    x: point.x,
    y: point.y,
    button: "left",
    clickCount: 1,
  });
  await send("Input.dispatchMouseEvent", {
    type: "mouseReleased",
    x: point.x,
    y: point.y,
    button: "left",
    clickCount: 1,
  });
}

async function moveToOverview() {
  await evaluate(`(() => {
    const P = PROTOTYPE_VISUAL_PARAMETERS;
    const latestThreshold = Math.max(
      ...Object.values(P.planet.emergence.depthOffset).map(
        ({ progress }) => P.planet.emergence.interactiveStart + progress * .12,
      ),
    );
    const base = (P.camera.journeyVh.drift - 100) * innerHeight / 100;
    window.scrollTo(0, base * Math.min(1, latestThreshold + .002));
  })()`);
  await wait(150);
}

async function resetToOverview() {
  await send("Page.navigate", {
    url: `http://127.0.0.1:4172/index.html?variant=drift&mock=mixed&learn-test=${Date.now()}`,
  });
  await wait(520);
  await moveToOverview();
}

async function pointFor(selector) {
  return evaluate(`(() => {
    const element = document.querySelector('${selector}');
    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const hit = document.elementFromPoint(x, y);
    return {
      x,
      y,
      hit: hit?.className || null,
      hitPlanet: hit?.closest?.('[data-planet]')?.dataset.planet || null
    };
  })()`);
}

await send("Runtime.enable");
await send("Page.enable");
await send("Emulation.setEmulatedMedia", {
  features: [{ name: "prefers-reduced-motion", value: "no-preference" }],
});
await send("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 900,
  deviceScaleFactor: 1,
  mobile: false,
});
await resetToOverview();

const learnTarget = await evaluate(`(() => {
  const learn = document.querySelector('[data-planet="learn"]');
  const rect = learn.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  const hit = document.elementFromPoint(x, y);
  return {
    x,
    y,
    ready: learn.classList.contains('ready'),
    tabIndex: learn.tabIndex,
    pointerEvents: getComputedStyle(learn).pointerEvents,
    hit: hit?.className || null,
    hitPlanet: hit?.closest?.('[data-planet]')?.dataset.planet || null
  };
})()`);
await clickAt(learnTarget);
await wait(1500);
const directFocus = await evaluate(`(() => ({
  focus: document.getElementById('planet-focus').dataset.focus || null,
  open: document.body.classList.contains('focus-open')
}))()`);
await evaluate(`document.getElementById('focus-back').click()`);
await wait(1450);
const returnToMap = await evaluate(`(() => ({
  open: document.body.classList.contains('focus-open'),
  stage: document.getElementById('debug-stage').textContent,
  learnReady: document.querySelector('[data-planet="learn"]').classList.contains('ready')
}))()`);

await resetToOverview();
const sideTarget = await pointFor('.flight-index [data-focus="learn"]');
await clickAt(sideTarget);
await wait(1500);
const sideFocus = await evaluate(`document.getElementById('planet-focus').dataset.focus || null`);

await resetToOverview();
await evaluate(`(() => {
  const P = PROTOTYPE_VISUAL_PARAMETERS;
  const h = innerHeight / 100;
  const base = (P.camera.journeyVh.drift - 100) * h;
  const target = base + P.camera.focusSequence.overviewHoldVh * h + P.camera.focusSequence.overviewHandoffVh.desktop * h + P.camera.focusSequence.stepVh.desktop * h * (4 + P.camera.focusSequence.holdRatio * .5);
  window.scrollTo(0, target);
})()`);
await wait(150);
const naturalFocus = await evaluate(`document.getElementById('planet-focus').dataset.focus || null`);
const footerRelease = await evaluate(`(() => {
  const P = PROTOTYPE_VISUAL_PARAMETERS;
  const h = innerHeight / 100;
  const base = (P.camera.journeyVh.drift - 100) * h;
  const target = base + P.camera.focusSequence.overviewHoldVh * h + P.camera.focusSequence.overviewHandoffVh.desktop * h + P.camera.focusSequence.stepVh.desktop * h * P.camera.focusSequence.order.length + P.camera.focusSequence.footerReleaseVh * h * .5;
  window.scrollTo(0, target);
  return true;
})()`);
await wait(120);
const footerReleaseFocus = await evaluate(`document.getElementById('planet-focus').dataset.focus || null`);

const result = {
  errors,
  learnTarget,
  directFocus,
  returnToMap,
  sideTarget,
  sideFocus,
  naturalFocus,
  footerRelease,
  footerReleaseFocus,
};
if (
  !learnTarget.ready ||
  learnTarget.hitPlanet !== "learn" ||
  directFocus.focus !== "learn" ||
  returnToMap.open ||
  !returnToMap.learnReady ||
  sideFocus !== "learn" ||
  naturalFocus !== "learn" ||
  footerReleaseFocus !== "learn"
) {
  console.error(JSON.stringify(result, null, 2));
  socket.close();
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(result, null, 2));
  socket.close();
}
