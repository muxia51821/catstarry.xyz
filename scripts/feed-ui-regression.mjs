import assert from 'node:assert/strict';
import { connectCdp, delay } from './lib/cdp-session.mjs';
import { launchIsolatedBrowser } from './lib/isolated-browser.mjs';

const baseUrl = (process.env.FEED_UI_URL ?? 'http://127.0.0.1:4322').replace(/\/$/, '');
const parsedBaseUrl = new URL(baseUrl);
const isLocalTarget = ['127.0.0.1', 'localhost', '::1'].includes(parsedBaseUrl.hostname);
if (!isLocalTarget && process.env.FEED_UI_ALLOW_REMOTE !== '1') {
  throw new Error('Feed UI regression is restricted to localhost unless FEED_UI_ALLOW_REMOTE=1 is explicitly set.');
}

const username = process.env.FEED_UI_USERNAME;
const password = process.env.FEED_UI_PASSWORD;
if (!username || !password) {
  throw new Error('FEED_UI_USERNAME and FEED_UI_PASSWORD are required for the Feed UI regression test.');
}

const diagnostics = {
  consoleProblems: [],
  exceptions: [],
  requests: [],
  checks: {},
};
let createdText = '';
let cleanupCompleted = false;

function consoleText(args) {
  return args.map((value) => value.value ?? value.description ?? value.type).join(' ');
}

let browser;
let cdp;
try {
  browser = await launchIsolatedBrowser();
  cdp = await connectCdp(browser.target, (message) => {
    if (message.method === 'Runtime.exceptionThrown') diagnostics.exceptions.push(message.params.exceptionDetails);
    if (message.method === 'Runtime.consoleAPICalled' && ['warning', 'error'].includes(message.params.type)) {
      diagnostics.consoleProblems.push({ type: message.params.type, text: consoleText(message.params.args) });
    }
    if (message.method === 'Network.requestWillBeSent') {
      diagnostics.requests.push({ method: message.params.request.method, url: message.params.request.url });
    }
  });
  const { send, evaluate, waitFor } = cdp;

  async function click(selector) {
    const point = await evaluate(`(() => {
      const node = document.querySelector(${JSON.stringify(selector)});
      if (!node) return null;
      const box = node.getBoundingClientRect();
      return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
    })()`);
    assert.ok(point, `Missing ${selector}`);
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: point.x, y: point.y, button: 'left', clickCount: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.x, y: point.y, button: 'left', clickCount: 1 });
  }

  async function key(key, modifiers = 0) {
    const keyCode = key === 'Escape' ? 27 : key === 'Tab' ? 9 : 0;
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code: key, modifiers, windowsVirtualKeyCode: keyCode, nativeVirtualKeyCode: keyCode });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code: key, modifiers, windowsVirtualKeyCode: keyCode, nativeVirtualKeyCode: keyCode });
  }

  await send('Runtime.enable');
  await send('Page.enable');
  await send('Network.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: `${baseUrl}/feed/` });
  await waitFor(`document.readyState === 'complete' && Boolean(document.querySelector('.feed-fab'))`, 'Feed application', 10_000);

  const alreadyAuthenticated = await evaluate(`Boolean(document.querySelector('.feed-fab[aria-label="发布 Feed"]'))`);
  diagnostics.checks.session = { authenticated: alreadyAuthenticated };
  if (!alreadyAuthenticated) {
    await waitFor(
      `document.querySelector('.feed-fab--login')?.dataset.sessionReady === 'true'`,
      'hydrated login action',
    );
    await click('.feed-fab--login');
    await waitFor(`Boolean(document.querySelector('.feed-dialog[aria-label="登录"]'))`, 'login dialog');
    diagnostics.checks.loginModal = await evaluate(`(() => {
      const dialog = document.querySelector('.feed-dialog[aria-label="登录"]');
      const timeline = document.querySelector('.feed-timeline');
      return {
        activeInside: dialog?.contains(document.activeElement) ?? false,
        backgroundInert: timeline?.inert ?? false,
        backgroundHidden: timeline?.getAttribute('aria-hidden') === 'true',
      };
    })()`);
    await key('Tab', 8);
    diagnostics.checks.loginKeyboard = await evaluate(`document.querySelector('.feed-dialog[aria-label="登录"]')?.contains(document.activeElement) ?? false`);
    await evaluate(`(() => {
      const [name, pass] = document.querySelectorAll('.feed-dialog input');
      const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      set.call(name, ${JSON.stringify(username)});
      name.dispatchEvent(new Event('input', { bubbles: true }));
      set.call(pass, ${JSON.stringify(password)});
      pass.dispatchEvent(new Event('input', { bubbles: true }));
    })()`);
    await click('.feed-dialog[aria-label="登录"] .feed-button');
  }

  await waitFor(`Boolean(document.querySelector('.feed-fab[aria-label="发布 Feed"]'))`, 'authenticated publish action');
  const publishAlreadyOpen = await evaluate(
    `Boolean(document.querySelector('.feed-dialog[aria-label="发布 Feed"]'))`,
  );
  if (!publishAlreadyOpen) await click('.feed-fab[aria-label="发布 Feed"]');
  await waitFor(`Boolean(document.querySelector('.feed-dialog[aria-label="发布 Feed"]'))`, 'publish dialog');

  diagnostics.checks.publishModal = await evaluate(`(() => {
    const dialog = document.querySelector('.feed-dialog[aria-label="发布 Feed"]');
    const timeline = document.querySelector('.feed-timeline');
    const button = dialog?.querySelector('.feed-button[type="submit"]');
    return {
      activeInside: dialog?.contains(document.activeElement) ?? false,
      backgroundInert: timeline?.inert ?? false,
      backgroundHidden: timeline?.getAttribute('aria-hidden') === 'true',
      emptyDisabled: button?.disabled ?? null,
    };
  })()`);
  const text = `browser-regression:${crypto.randomUUID()}`;
  createdText = text;
  await evaluate(`(() => {
    const textarea = document.querySelector('.feed-dialog[aria-label="发布 Feed"] textarea');
    const set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
    set.call(textarea, ${JSON.stringify(text)});
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);
  await waitFor(`document.querySelector('.feed-dialog[aria-label="发布 Feed"] .feed-button[type="submit"]')?.disabled === false`, 'enabled publish action');
  diagnostics.checks.publish = await evaluate(`(() => {
    const dialog = document.querySelector('.feed-dialog[aria-label="发布 Feed"]');
    const button = dialog.querySelector('.feed-button[type="submit"]');
    const textarea = dialog.querySelector('textarea');
    const rect = button.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    return {
      disabled: button.disabled,
      pointerEvents: getComputedStyle(button).pointerEvents,
      hit: hit === button || button.contains(hit),
      textarea: textarea.value,
    };
  })()`);
  await click('.feed-dialog[aria-label="发布 Feed"] .feed-button[type="submit"]');
  await waitFor(`!document.querySelector('.feed-dialog[aria-label="发布 Feed"]')`, 'publish completion', 10_000);
  diagnostics.checks.postRequests = diagnostics.requests.filter((request) => (
    request.method === 'POST' && /\/api\/feed(?:\?|$)/.test(request.url)
  )).length;
  diagnostics.checks.backgroundRestored = await evaluate(`(() => {
    const timeline = document.querySelector('.feed-timeline');
    return timeline?.inert === false && !timeline?.hasAttribute('aria-hidden');
  })()`);

  await click('.feed-fab[aria-label="发布 Feed"]');
  await waitFor(`Boolean(document.querySelector('.feed-dialog[aria-label="发布 Feed"]'))`, 'second publish dialog');
  await key('Escape');
  await waitFor(`!document.querySelector('.feed-dialog[aria-label="发布 Feed"]')`, 'Escape modal close');
  diagnostics.checks.escapeClose = true;

  diagnostics.checks.viewports = [];
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
    await delay(100);
    diagnostics.checks.viewports.push(await evaluate(`(() => {
      const action = document.querySelector('.feed-fab');
      const rect = action?.getBoundingClientRect();
      return {
        width: ${width},
        height: ${height},
        noHorizontalOverflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        actionVisible: Boolean(rect && rect.width > 0 && rect.height > 0 && rect.right <= innerWidth && rect.bottom <= innerHeight),
      };
    })()`));
  }

  await send('Page.navigate', { url: `${baseUrl}/feed/admin/` });
  await waitFor(`document.readyState === 'complete'`, 'admin page', 10_000);
  diagnostics.checks.adminReturn = await evaluate(`(() => {
    const link = [...document.querySelectorAll('a')].find((node) => node.textContent?.trim() === '← 返回 Feed');
    if (!link) return null;
    const rect = link.getBoundingClientRect();
    const style = getComputedStyle(link);
    return {
      href: link.getAttribute('href'),
      visible: style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0,
      focusable: link.tabIndex >= 0,
    };
  })()`);

  const postRequest = diagnostics.requests.find((request) => (
    request.method === 'POST' && /\/api\/feed(?:\?|$)/.test(request.url)
  ));
  assert.ok(postRequest, 'Published Feed request must be observable for cleanup');
  const apiOrigin = new URL(postRequest.url).origin;
  diagnostics.checks.cleanup = await evaluate(`(async () => {
    const list = await fetch(${JSON.stringify(`${apiOrigin}/api/feed/admin?limit=50`)}, { credentials: 'include' });
    if (!list.ok) return { ok: false, stage: 'list', status: list.status };
    const page = await list.json();
    const entry = page.items.find((item) => item.kind === 'native_post' && item.payload?.content === ${JSON.stringify(text)});
    if (!entry) return { ok: false, stage: 'find' };
    const removed = await fetch(${JSON.stringify(`${apiOrigin}/api/feed/`)} + encodeURIComponent(entry.id), {
      method: 'DELETE',
      credentials: 'include',
    });
    return { ok: removed.status === 204, stage: 'delete', status: removed.status };
  })()`);
  cleanupCompleted = diagnostics.checks.cleanup.ok;

  console.log(JSON.stringify(diagnostics, null, 2));
  assert.deepEqual(diagnostics.checks.loginModal ?? { activeInside: true, backgroundInert: true, backgroundHidden: true }, {
    activeInside: true,
    backgroundInert: true,
    backgroundHidden: true,
  });
  assert.equal(diagnostics.checks.loginKeyboard ?? true, true, 'keyboard focus must remain in the login modal');
  assert.deepEqual(diagnostics.checks.publishModal, {
    activeInside: true,
    backgroundInert: true,
    backgroundHidden: true,
    emptyDisabled: true,
  });
  assert.deepEqual(diagnostics.checks.publish, {
    disabled: false,
    pointerEvents: 'auto',
    hit: true,
    textarea: text,
  });
  assert.equal(diagnostics.checks.postRequests, 1, 'valid publish must send exactly one POST');
  assert.equal(diagnostics.checks.backgroundRestored, true, 'modal close must restore the page background');
  assert.equal(diagnostics.checks.escapeClose, true);
  assert.equal(diagnostics.checks.viewports.every((item) => item.noHorizontalOverflow && item.actionVisible), true);
  assert.deepEqual(diagnostics.checks.adminReturn, { href: '/feed/', visible: true, focusable: true });
  assert.deepEqual(diagnostics.checks.cleanup, { ok: true, stage: 'delete', status: 204 });
  assert.deepEqual(diagnostics.consoleProblems, []);
  assert.deepEqual(diagnostics.exceptions, []);
} finally {
  if (cdp && createdText && !cleanupCompleted) {
    await cdp.evaluate(`(async () => {
      try {
        const origins = ${JSON.stringify(diagnostics.requests
          .filter((request) => request.method === 'POST' && /\/api\/feed(?:\?|$)/.test(request.url))
          .map((request) => new URL(request.url).origin))};
        for (const origin of [...new Set(origins)]) {
          const list = await fetch(origin + '/api/feed/admin?limit=50', { credentials: 'include' });
          if (!list.ok) continue;
          const page = await list.json();
          for (const entry of page.items.filter((item) => item.kind === 'native_post' && item.payload?.content === ${JSON.stringify(createdText)})) {
            await fetch(origin + '/api/feed/' + encodeURIComponent(entry.id), { method: 'DELETE', credentials: 'include' });
          }
        }
      } catch {}
    })()`).catch(() => null);
  }
  cdp?.close();
  await browser?.close();
}
