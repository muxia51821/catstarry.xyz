import assert from "node:assert/strict";

const baseUrl = process.env.FEED_UI_URL ?? "http://127.0.0.1:4322";
const parsedBaseUrl = new URL(baseUrl);
const isLocalTarget =
  parsedBaseUrl.hostname === "127.0.0.1" ||
  parsedBaseUrl.hostname === "localhost";

if (!isLocalTarget && process.env.FEED_UI_ALLOW_REMOTE !== "1") {
  throw new Error(
    "Feed UI regression is restricted to localhost. " +
      "Set FEED_UI_ALLOW_REMOTE=1 only for an explicitly authorized environment.",
  );
}
const cdpPort = process.env.FEED_UI_CDP_PORT ?? "9227";
const username = process.env.FEED_UI_USERNAME;
const password = process.env.FEED_UI_PASSWORD;

if (!username || !password) {
  throw new Error(
    "FEED_UI_USERNAME and FEED_UI_PASSWORD are required for the Feed UI regression test.",
  );
}
const diagnostics = {
  consoleErrors: [],
  exceptions: [],
  requests: [],
  checks: {},
};

function isKnownExtensionNoise(exception) {
  return (
    exception.url ===
      "chrome-extension://gmgoamodcdcjnbaobigkjelfplakmdhh/vendor/@eyeo/webext-ad-filtering-solution/content.js" ||
    exception.url ===
      "chrome-extension://gmgoamodcdcjnbaobigkjelfplakmdhh/polyfill.js"
  );
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const browserInfo = await fetch(
  `http://127.0.0.1:${cdpPort}/json/version`,
).then((response) => response.json());
const browserSocket = new WebSocket(browserInfo.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  browserSocket.addEventListener("open", resolve, { once: true });
  browserSocket.addEventListener("error", reject, { once: true });
});
let browserCommand = 0;
const browserPending = new Map();
browserSocket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.id) {
    const resolve = browserPending.get(message.id);
    browserPending.delete(message.id);
    resolve?.(message.result);
  }
});
const sendBrowser = (method, params = {}) =>
  new Promise((resolve) => {
    const id = ++browserCommand;
    browserPending.set(id, resolve);
    browserSocket.send(JSON.stringify({ id, method, params }));
  });
const created = await sendBrowser("Target.createTarget", {
  url: `${baseUrl}/feed/`,
});
browserSocket.close();

const socket = new WebSocket(
  created.targetId
    ? `ws://127.0.0.1:${cdpPort}/devtools/page/${created.targetId}`
    : "",
);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});
let command = 0;
const pending = new Map();
socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.id) {
    const resolve = pending.get(message.id);
    pending.delete(message.id);
    resolve?.(message);
  }
  if (message.method === "Runtime.exceptionThrown")
    diagnostics.exceptions.push(message.params.exceptionDetails);
  if (
    message.method === "Runtime.consoleAPICalled" &&
    message.params.type === "error"
  )
    diagnostics.consoleErrors.push(
      message.params.args
        .map((value) => value.value ?? value.description)
        .join(" "),
    );
  if (message.method === "Network.requestWillBeSent")
    diagnostics.requests.push({
      method: message.params.request.method,
      url: message.params.request.url,
    });
});
const send = (method, params = {}) =>
  new Promise((resolve) => {
    const id = ++command;
    pending.set(id, resolve);
    socket.send(JSON.stringify({ id, method, params }));
  });
async function evaluate(expression) {
  const response = await send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (response.error) throw new Error(response.error.message);
  if (response.result.exceptionDetails)
    throw new Error(
      response.result.exceptionDetails.exception?.description ??
        response.result.exceptionDetails.text,
    );
  return response.result.result.value;
}
async function waitFor(expression, label) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (await evaluate(expression)) return;
    await delay(100);
  }
  throw new Error(`Timed out waiting for ${label}`);
}
async function click(selector) {
  const point = await evaluate(
    `(() => { const node = document.querySelector(${JSON.stringify(selector)}); if (!node) return null; const box = node.getBoundingClientRect(); return { x: box.left + box.width / 2, y: box.top + box.height / 2 }; })()`,
  );
  assert.ok(point, `Missing ${selector}`);
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

try {
  await send("Runtime.enable");
  await send("Page.enable");
  await send("Network.enable");
  await delay(700);
  const alreadyAuthenticated = await evaluate(
    `Boolean(document.querySelector('.feed-fab[aria-label="发布 Feed"]'))`,
  );
  diagnostics.checks.session = { authenticated: alreadyAuthenticated };
  if (!alreadyAuthenticated) {
    await waitFor(
      `Boolean(document.querySelector('.feed-fab--login'))`,
      "login action",
    );
    diagnostics.checks.login = await evaluate(
      `(() => { const node = document.querySelector('.feed-fab--login'); const style = getComputedStyle(node); const rect = node.getBoundingClientRect(); return { disabled: node.disabled, pointerEvents: style.pointerEvents, hit: document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2) === node, rect: { width: rect.width, height: rect.height } }; })()`,
    );
    await click(".feed-fab--login");
    try {
      await waitFor(
        `Boolean(document.querySelector('.feed-dialog[aria-label="登录"]'))`,
        "login dialog",
      );
    } catch (error) {
      throw new Error(
        `${error instanceof Error ? error.message : "Login dialog did not open"}\n${JSON.stringify(diagnostics, null, 2)}`,
      );
    }
    await evaluate(
      `(() => { const [name, pass] = document.querySelectorAll('.feed-dialog input'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(name, ${JSON.stringify(username)}); name.dispatchEvent(new Event('input', { bubbles: true })); set.call(pass, ${JSON.stringify(password)}); pass.dispatchEvent(new Event('input', { bubbles: true })); })()`,
    );
    await click('.feed-dialog[aria-label="登录"] .feed-button');
  }
  await waitFor(
    `Boolean(document.querySelector('.feed-fab[aria-label="发布 Feed"]'))`,
    "authenticated publish action",
  );
  await click('.feed-fab[aria-label="发布 Feed"]');
  await waitFor(
    `Boolean(document.querySelector('.feed-dialog[aria-label="发布 Feed"]'))`,
    "publish dialog",
  );

  diagnostics.checks.empty = await evaluate(
    `(() => { const button = document.querySelector('.feed-dialog[aria-label="发布 Feed"] .feed-button[type="submit"], .feed-dialog[aria-label="发布 Feed"] .feed-button:last-child'); return { disabled: button?.disabled ?? null, text: button?.textContent?.trim() ?? null }; })()`,
  );
  const text = `browser regression ${new Date().toISOString()}`;
  await evaluate(
    `(() => { const textarea = document.querySelector('.feed-dialog[aria-label="发布 Feed"] textarea'); const set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set; set.call(textarea, ${JSON.stringify(text)}); textarea.dispatchEvent(new Event('input', { bubbles: true })); })()`,
  );
  await delay(100);
  diagnostics.checks.publish = await evaluate(
    `(() => { const button = document.querySelector('.feed-dialog[aria-label="发布 Feed"] .feed-button:last-child'); const style = getComputedStyle(button); const rect = button.getBoundingClientRect(); const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2); const textarea = document.querySelector('.feed-dialog[aria-label="发布 Feed"] textarea'); return { disabled: button.disabled, ariaDisabled: button.getAttribute('aria-disabled'), pointerEvents: style.pointerEvents, hit: hit === button || button.contains(hit), textarea: textarea.value, rect: { width: rect.width, height: rect.height } }; })()`,
  );
  await click('.feed-dialog[aria-label="发布 Feed"] .feed-button:last-child');
  await delay(800);
  diagnostics.checks.postRequests = diagnostics.requests.filter(
    (request) =>
      request.method === "POST" && /\/api\/feed(?:\?|$)/.test(request.url),
  ).length;
  diagnostics.checks.publishDialogClosed = await evaluate(
    `!document.querySelector('.feed-dialog[aria-label="发布 Feed"]')`,
  );

  await send("Page.navigate", { url: `${baseUrl}/feed/admin/` });
  await waitFor(`document.readyState === 'complete'`, "admin page");
  diagnostics.checks.adminReturn = await evaluate(
    `(() => { const link = [...document.querySelectorAll('a')].find((node) => node.textContent?.trim() === '← 返回 Feed'); if (!link) return null; const style = getComputedStyle(link); const rect = link.getBoundingClientRect(); return { href: link.getAttribute('href'), visible: style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0, focusable: link.tabIndex >= 0 }; })()`,
  );
  if (diagnostics.checks.adminReturn) {
    await click('a[href="/feed/"]');
    await waitFor(`location.pathname === '/feed/'`, "return to Feed");
  }

  console.log(
    JSON.stringify(
      {
        session: diagnostics.checks.session,
        empty: diagnostics.checks.empty,
        publish: diagnostics.checks.publish,
        postRequests: diagnostics.checks.postRequests,
        publishDialogClosed: diagnostics.checks.publishDialogClosed,
        adminReturn: diagnostics.checks.adminReturn,
        consoleErrors: diagnostics.consoleErrors,
        filteredExtensionExceptions: diagnostics.exceptions.filter(
          isKnownExtensionNoise,
        ).length,
        unexpectedExceptions: diagnostics.exceptions.filter(
          (exception) => !isKnownExtensionNoise(exception),
        ).length,
      },
      null,
      2,
    ),
  );
  assert.equal(
    diagnostics.checks.empty.disabled,
    true,
    "empty note must be disabled",
  );
  assert.equal(
    diagnostics.checks.publish.disabled,
    false,
    "valid text must enable publish",
  );
  assert.notEqual(
    diagnostics.checks.publish.pointerEvents,
    "none",
    "publish must accept pointers",
  );
  assert.equal(
    diagnostics.checks.publish.hit,
    true,
    "publish must not be covered",
  );
  assert.equal(
    diagnostics.checks.publish.textarea,
    text,
    "textarea must retain controlled value",
  );
  assert.equal(
    diagnostics.checks.postRequests,
    1,
    "valid publish must send exactly one POST",
  );
  assert.equal(
    diagnostics.checks.publishDialogClosed,
    true,
    "publish state must reset after success",
  );
  assert.deepEqual(diagnostics.checks.adminReturn, {
    href: "/feed/",
    visible: true,
    focusable: true,
  });
  assert.deepEqual(diagnostics.consoleErrors, []);
  assert.deepEqual(
    diagnostics.exceptions.filter(
      (exception) => !isKnownExtensionNoise(exception),
    ),
    [],
  );
} finally {
  await send("Page.close").catch(() => undefined);
  socket.close();
}
