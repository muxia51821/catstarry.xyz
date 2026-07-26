import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { connectCdp, delay } from './lib/cdp-session.mjs';
import { launchIsolatedBrowser } from './lib/isolated-browser.mjs';

const requests = [];
let currentRole = null;
let viewerConfirmed = false;
const fixtures = {
  '/api/auth/session': { authenticated: false, username: null, role: null },
  '/api/holdings': {
    total_market_value: 12600,
    holdings: [{ ticker: '510300', quantity: 100, avg_cost: 120, price: 126, market_value: 12600, pnl: 600, fetched_at: '2026-07-25T10:00:00.000Z' }],
    positions: [{ position_category: 'core', current_ratio: 1, target_ratio: 1, lower_ratio: 0.8, upper_ratio: 1, suggestedChange: 0, status: 'normal' }],
  },
  '/api/trades': { trades: [] },
  '/api/pe': { indexes: [{ ticker: 'CSI300_PE', pe_ttm: 12.5, temperature: { zone: 'normal', suggestion: 'normal_dca' } }] },
  '/api/circuit': { active: null },
  '/api/review': { reviews: [] },
  '/api/access-log': { access_log: [{ username: 'contract-admin', action: 'login', occurred_at: '2026-07-25T10:00:00.000Z' }] },
  '/api/import-review': { review: [{ id: 1, batch_id: 'fixture-batch', row_number: 3, record_kind: 'trade', status: 'pending', raw: { ticker: 'BAD' } }] },
};

const server = createServer(async (request, response) => {
  const url = new URL(request.url, 'http://local.test');
  requests.push({ method: request.method, pathname: url.pathname });
  if (url.pathname === '/api/auth/login' && request.method === 'POST') {
    const body = JSON.parse(await readBody(request));
    currentRole = String(body.username).includes('viewer') ? 'viewer' : 'admin';
    return json(response, 200, { authenticated: true, username: `contract-${currentRole}`, role: currentRole });
  }
  if (url.pathname === '/api/notifications') return json(response, 200, {
    active_circuit: null,
    monthly_confirmation: currentRole === 'viewer' ? { period: '2026-06', confirmed: viewerConfirmed } : null,
    unconfirmed_viewers: [],
    annual_review_due: false,
  });
  if (url.pathname === '/api/confirmations/monthly' && request.method === 'POST') {
    viewerConfirmed = true;
    return json(response, 200, { created: true, period: '2026-06', username: 'contract-viewer' });
  }
  if (url.pathname === '/api/trades' && request.method === 'POST') return json(response, 201, { created: true });
  if (url.pathname === '/api/import-review/1' && request.method === 'PATCH') {
    fixtures['/api/import-review'].review = [];
    return json(response, 200, { id: 1, status: 'resolved' });
  }
  if (url.pathname === '/api/auth/logout' && request.method === 'POST') return json(response, 200, { authenticated: false });
  const fixture = fixtures[url.pathname];
  if (fixture) return json(response, 200, fixture);
  const files = {
    '/': ['finance-site/index.html', 'text/html; charset=utf-8'],
    '/index.html': ['finance-site/index.html', 'text/html; charset=utf-8'],
    '/styles.css': ['finance-site/styles.css', 'text/css; charset=utf-8'],
    '/app.js': ['finance-site/app.js', 'text/javascript; charset=utf-8'],
  };
  const file = files[url.pathname];
  if (!file) {
    response.statusCode = 404;
    response.end();
    return;
  }
  response.setHeader('Content-Type', file[1]);
  response.end(await readFile(file[0]));
});

function json(response, status, payload) {
  response.statusCode = status;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(payload));
}

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolve);
});
const address = server.address();
if (!address || typeof address === 'string') throw new Error('Finance UI fixture server did not expose a TCP port');
const baseUrl = `http://127.0.0.1:${address.port}`;

const diagnostics = { consoleProblems: [], exceptions: [], checks: {} };
let browser;
let cdp;
try {
  browser = await launchIsolatedBrowser();
  cdp = await connectCdp(browser.target, (message) => {
    if (message.method === 'Runtime.exceptionThrown') diagnostics.exceptions.push(message.params.exceptionDetails);
    if (message.method === 'Runtime.consoleAPICalled' && ['warning', 'error'].includes(message.params.type)) {
      diagnostics.consoleProblems.push({
        type: message.params.type,
        text: message.params.args.map((value) => value.value ?? value.description ?? value.type).join(' '),
      });
    }
  });
  const { send, evaluate, waitFor } = cdp;
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: baseUrl });
  await waitFor(`document.readyState === 'complete' && Boolean(document.querySelector('[data-login-form]'))`, 'Finance login');

  await evaluate(`(() => {
    const form = document.querySelector('[data-login-form]');
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    set.call(form.elements.username, 'contract-admin');
    form.elements.username.dispatchEvent(new Event('input', { bubbles: true }));
    set.call(form.elements.password, 'ephemeral-contract-password');
    form.elements.password.dispatchEvent(new Event('input', { bubbles: true }));
    form.requestSubmit();
  })()`);
  await waitFor(`!document.querySelector('[data-app]').hidden && document.querySelector('[data-total-value]').textContent !== '—'`, 'Finance dashboard');

  diagnostics.checks.rendered = await evaluate(`({
    role: document.querySelector('[data-role]').textContent,
    holdings: document.querySelectorAll('[data-holdings-body] tr').length,
    pe: document.querySelectorAll('[data-pe-list] article').length,
    peSegments: document.querySelectorAll('[data-pe-list] .pe-scale__segment').length,
    accessRows: document.querySelectorAll('[data-access-list] p').length,
    importReviewRows: document.querySelectorAll('[data-import-review-list] article').length,
    tradeActionVisible: !document.querySelector('[data-open-trade]').hidden,
    reviewActionVisible: !document.querySelector('[data-open-review]').hidden,
    riskActionVisible: !document.querySelector('[data-open-risk]').hidden,
  })`);

  await evaluate(`(() => {
    const row = document.querySelector('[data-import-review-list] article');
    const input = row.querySelector('input');
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    set.call(input, 'Corrected through the online trade form');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    row.querySelector('button').click();
  })()`);
  await waitFor(`document.querySelectorAll('[data-import-review-list] article').length === 0`, 'import review resolution');
  diagnostics.checks.importReviewResolved = true;

  await evaluate(`(() => {
    const button = document.querySelector('[data-open-trade]');
    button.focus();
    button.click();
  })()`);
  await waitFor(`document.querySelector('[data-trade-dialog]').open`, 'trade dialog');
  diagnostics.checks.modal = await evaluate(`(() => {
    const dialog = document.querySelector('[data-trade-dialog]');
    return {
      appInert: document.querySelector('[data-app]').inert,
      activeInside: dialog.contains(document.activeElement),
      activeName: document.activeElement?.name ?? null,
    };
  })()`);
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 });
  await waitFor(`!document.querySelector('[data-trade-dialog]').open`, 'Escape trade dialog close');
  await waitFor(`document.querySelector('[data-app]').inert === false`, 'modal background restoration');
  diagnostics.checks.modalRestored = await evaluate(`({
    background: document.querySelector('[data-app]').inert === false,
    focus: document.activeElement === document.querySelector('[data-open-trade]'),
  })`);

  await evaluate(`document.querySelector('[data-open-review]').click()`);
  await waitFor(`document.querySelector('[data-review-dialog]').open`, 'annual review dialog');
  diagnostics.checks.reviewModal = await evaluate(`({
    appInert: document.querySelector('[data-app]').inert,
    activeName: document.activeElement?.name ?? null,
  })`);
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 });
  await waitFor(`!document.querySelector('[data-review-dialog]').open && document.querySelector('[data-app]').inert === false`, 'annual review dialog close');

  await evaluate(`document.querySelector('[data-open-risk]').click()`);
  await waitFor(`document.querySelector('[data-risk-dialog]').open`, 'risk evaluation dialog');
  diagnostics.checks.riskModal = await evaluate(`({
    appInert: document.querySelector('[data-app]').inert,
    activeName: document.activeElement?.name ?? null,
  })`);
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 });
  await waitFor(`!document.querySelector('[data-risk-dialog]').open && document.querySelector('[data-app]').inert === false`, 'risk evaluation dialog close');

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
    diagnostics.checks.viewports.push(await evaluate(`({
      width: ${width},
      height: ${height},
      noHorizontalOverflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      dashboardColumns: getComputedStyle(document.querySelector('.dashboard-grid')).gridTemplateColumns.split(' ').length,
    })`));
  }
  await send('Emulation.setDeviceMetricsOverride', { width: 360, height: 800, deviceScaleFactor: 1, mobile: true });
  diagnostics.checks.textZoom = await evaluate(`(() => {
    document.documentElement.style.fontSize = '200%';
    return {
      noHorizontalOverflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      controlsRemainVisible: [...document.querySelectorAll('[data-app] button:not([hidden])')]
        .filter((button) => button.getClientRects().length > 0)
        .every((button) => {
          const rect = button.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        }),
    };
  })()`);
  await evaluate(`document.documentElement.style.removeProperty('font-size')`);

  await evaluate(`document.querySelector('[data-logout]').click()`);
  await waitFor(`!document.querySelector('[data-login]').hidden`, 'viewer login screen');
  await evaluate(`(() => {
    const form = document.querySelector('[data-login-form]');
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    set.call(form.elements.username, 'contract-viewer');
    form.elements.username.dispatchEvent(new Event('input', { bubbles: true }));
    set.call(form.elements.password, 'ephemeral-viewer-password');
    form.elements.password.dispatchEvent(new Event('input', { bubbles: true }));
    form.requestSubmit();
  })()`);
  await waitFor(`document.querySelector('[data-notification-dialog]').open`, 'viewer monthly confirmation');
  diagnostics.checks.viewer = await evaluate(`({
    role: document.querySelector('[data-role]').textContent,
    tradeHidden: document.querySelector('[data-open-trade]').hidden,
    reviewHidden: document.querySelector('[data-open-review]').hidden,
    exportHidden: document.querySelector('[data-export-archive]').hidden,
    riskHidden: document.querySelector('[data-open-risk]').hidden,
    prompt: document.querySelector('[data-notification-copy]').textContent,
    appInert: document.querySelector('[data-app]').inert,
  })`);
  await evaluate(`document.querySelector('[data-confirm-notification]').click()`);
  await waitFor(`!document.querySelector('[data-notification-dialog]').open && document.querySelector('[data-app]').inert === false`, 'viewer monthly confirmation completion');

  console.log(JSON.stringify(diagnostics, null, 2));
  assert.deepEqual(diagnostics.checks.rendered, {
    role: 'ADMIN · READ / WRITE',
    holdings: 1,
    pe: 1,
    peSegments: 5,
    accessRows: 1,
    importReviewRows: 1,
    tradeActionVisible: true,
    reviewActionVisible: true,
    riskActionVisible: true,
  });
  assert.equal(diagnostics.checks.importReviewResolved, true);
  assert.deepEqual(diagnostics.checks.modal, { appInert: true, activeInside: true, activeName: 'ticker' });
  assert.deepEqual(diagnostics.checks.modalRestored, { background: true, focus: true });
  assert.deepEqual(diagnostics.checks.reviewModal, { appInert: true, activeName: 'beginningValue' });
  assert.deepEqual(diagnostics.checks.riskModal, { appInert: true, activeName: 'annualDrawdown' });
  assert.equal(diagnostics.checks.viewports.every((item) => item.noHorizontalOverflow), true);
  assert.equal(diagnostics.checks.viewports.find((item) => item.width === 360)?.dashboardColumns, 1);
  assert.equal(diagnostics.checks.viewports.find((item) => item.width === 1440)?.dashboardColumns, 3);
  assert.deepEqual(diagnostics.checks.textZoom, { noHorizontalOverflow: true, controlsRemainVisible: true });
  assert.deepEqual(diagnostics.checks.viewer, {
    role: 'CATI · READ ONLY',
    tradeHidden: true,
    reviewHidden: true,
    exportHidden: true,
    riskHidden: true,
    prompt: '请确认已查阅 2026-06 月投资记录。',
    appInert: true,
  });
  assert.equal(requests.filter((item) => item.method === 'POST' && item.pathname === '/api/auth/login').length, 2);
  assert.equal(requests.filter((item) => item.method === 'POST' && item.pathname === '/api/confirmations/monthly').length, 1);
  assert.equal(requests.filter((item) => item.method === 'PATCH' && item.pathname === '/api/import-review/1').length, 1);
  assert.deepEqual(diagnostics.consoleProblems, []);
  assert.deepEqual(diagnostics.exceptions, []);
} finally {
  cdp?.close();
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
