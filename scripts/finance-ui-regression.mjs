import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { connectCdp, delay } from './lib/cdp-session.mjs';
import { launchIsolatedBrowser } from './lib/isolated-browser.mjs';

const requests = [];
let currentRole = null;
let viewerConfirmed = false;
let initialSessionRequest = true;
const fixtures = {
  '/api/auth/session': { authenticated: false, username: null, role: null },
  '/api/holdings': {
    total_market_value: 12600,
    holdings: [{ ticker: '510300', quantity: 100, avg_cost: 120, price: 126, market_value: 12600, pnl: 600, fetched_at: '2026-07-25T10:00:00.000Z' }],
    positions: [{ position_category: 'core', current_ratio: 1, target_ratio: 1, lower_ratio: 0.8, upper_ratio: 1, suggestedChange: 0, status: 'normal' }],
  },
  '/api/trades': { trades: [{ id: 1, trade_date: '2026-07-24', ticker: '510300', ticker_name: '沪深300ETF', direction: 'buy', quantity: 100, price: 12, position_category: 'A股宽基指数底仓', reason: 'fixture trade', created_by: 'contract-admin' }] },
  '/api/pe': { indexes: [{ ticker: 'CSI300_PE', pe_ttm: 12.5, temperature: { zone: 'normal', suggestion: 'normal_dca' } }] },
  '/api/circuit': { active: null },
  '/api/review': { reviews: [{ year: 2026, summary: 'fixture annual review', calculation: { dietz: { returnRate: .08 } }, confirmed_at: null, confirmed_by: null }] },
  '/api/monthly': { records: [{ id: 1, year_month: '2026-07', muxia_invest: 5000, cati_invest: 0, end_total: 12600, blue_chip_temp: 'normal', summary: 'fixture monthly record' }] },
  '/api/plan': { plan: { initial_capital: 100000, monthly_invest: 5000, months_year1: 7, months_year2plus: 12, rate_low: .03, rate_base: .06, rate_high: .1, bonus1: 50000, bonus2to4: 35000, start_year: 2026, end_year: 2030, updated_at: '2026-07-25T10:00:00.000Z' } },
  '/api/memos': { memos: [{ id: 1, memo_date: '2026-07-24', ticker: '510300', operation_type: '建仓', reason: 'fixture memo', note: null, stop_loss_triggered: 0 }] },
  '/api/risk-rules': { rules: [{ rule_key: 'risk', value: { single_position_active_cap: .5, loss_pause_ratio: .15, stop_loss_ratio: .3, rebalance_deviation: .05 } }, { rule_key: 'temperature', value: { freeze: 10, low: 12, normal: 16, high: 20 } }] },
  '/api/rebalances': { rebalances: [{ id: 1, year: 2026, executed_on: '2026-12-20', adjustments: 'fixture rebalance', reason: 'fixture', confirmed_at: null, confirmed_by: null }] },
  '/api/access-log': { access_log: [{ username: 'contract-admin', action: 'login', occurred_at: '2026-07-25T10:00:00.000Z' }] },
  '/api/import-review': { review: [{ id: 1, batch_id: 'fixture-batch', row_number: 3, record_kind: 'trade', status: 'pending', raw: { ticker: 'BAD' } }] },
};

const server = createServer(async (request, response) => {
  const url = new URL(request.url, 'http://local.test');
  const requestRecord = { method: request.method, pathname: url.pathname };
  requests.push(requestRecord);
  if (url.pathname === '/api/auth/session' && initialSessionRequest) {
    initialSessionRequest = false;
    await delay(350);
  }
  if (url.pathname === '/api/auth/login' && request.method === 'POST') {
    const body = JSON.parse(await readBody(request));
    currentRole = String(body.username).includes('viewer') ? 'viewer' : 'admin';
    return json(response, 200, { authenticated: true, username: `contract-${currentRole}`, role: currentRole });
  }
  if (url.pathname === '/api/auth/session') {
    return json(response, 200, currentRole
      ? { authenticated: true, username: `contract-${currentRole}`, role: currentRole }
      : fixtures['/api/auth/session']);
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
  if (url.pathname === '/api/trades/1' && request.method === 'PATCH') return json(response, 200, { updated: true });
  if (url.pathname === '/api/trades/1' && request.method === 'DELETE') return json(response, 200, { deleted: true });
  if (url.pathname === '/api/monthly' && request.method === 'PUT') return json(response, 200, { record: JSON.parse(await readBody(request)) });
  if (url.pathname === '/api/plan' && request.method === 'PUT') return json(response, 200, { plan: JSON.parse(await readBody(request)) });
  if (url.pathname === '/api/memos' && request.method === 'POST') return json(response, 201, { memo: JSON.parse(await readBody(request)) });
  if (url.pathname === '/api/risk-rules' && request.method === 'PUT') { requestRecord.body = JSON.parse(await readBody(request)); return json(response, 200, { saved: true }); }
  if (url.pathname === '/api/review/confirm' && request.method === 'POST') { fixtures['/api/review'].reviews[0].confirmed_at = '2026-12-31T00:00:00.000Z'; fixtures['/api/review'].reviews[0].confirmed_by = 'contract-viewer'; return json(response, 200, { confirmed: true }); }
  if (url.pathname === '/api/rebalances/1/confirm' && request.method === 'POST') { fixtures['/api/rebalances'].rebalances[0].confirmed_at = '2026-12-31T00:00:00.000Z'; fixtures['/api/rebalances'].rebalances[0].confirmed_by = 'contract-viewer'; return json(response, 200, { confirmed: true }); }
  if (url.pathname === '/api/import-review/1' && request.method === 'PATCH') {
    fixtures['/api/import-review'].review = [];
    return json(response, 200, { id: 1, status: 'resolved' });
  }
  if (url.pathname === '/api/auth/logout' && request.method === 'POST') {
    currentRole = null;
    return json(response, 200, { authenticated: false });
  }
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
  await waitFor(`document.querySelector('[data-app]')?.hidden === false && document.querySelector('[data-total-value]')?.textContent !== '—'`, 'Finance dashboard');
  await delay(400);

  diagnostics.checks.rendered = await evaluate(`({
    role: document.querySelector('[data-role]').textContent,
    holdings: document.querySelectorAll('[data-holdings-body] tr').length,
    pe: document.querySelectorAll('[data-pe-list] article').length,
    peSegments: document.querySelectorAll('[data-pe-list] .pe-scale__segment').length,
    accessRows: document.querySelectorAll('[data-access-list] p').length,
    importReviewRows: document.querySelectorAll('[data-import-review-list] article').length,
    monthlyRows: document.querySelectorAll('[data-monthly-list] article').length,
    planValues: document.querySelectorAll('[data-plan-overview] strong').length,
    memoRows: document.querySelectorAll('[data-memo-list] article').length,
    accessCollapsed: !document.querySelector('[data-access-panel]').open,
    financeFont: getComputedStyle(document.documentElement).fontFamily,
    tradeActionVisible: !document.querySelector('[data-open-trade]').hidden,
    reviewActionVisible: !document.querySelector('[data-open-review]').hidden,
    riskActionVisible: !document.querySelector('[data-open-risk]').hidden,
    loginStatusCleared: document.querySelector('[data-login-status]').textContent === '',
    dashboardStatusCleared: document.querySelector('[data-dashboard-status]').textContent === '',
    workbookReviewAbsent: !document.querySelector('[data-workbook-review-panel]'),
    monthlyPeFieldsAbsent: !document.querySelector('[data-monthly-form]').elements.sse300_pe && !document.querySelector('[data-monthly-form]').elements.sse500_pe && !document.querySelector('[data-monthly-form]').elements.sse1000_pe && !document.querySelector('[data-monthly-form]').elements.blue_chip_temp,
    loginSurvivesInitialSessionRace: document.querySelector('[data-login]').hidden && !document.querySelector('[data-app]').hidden,
    loginLayerRemoved: getComputedStyle(document.querySelector('[data-login]')).display === 'none',
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
      sections: [...dialog.querySelectorAll('fieldset legend')].map((legend) => legend.textContent),
      cancelVisible: Boolean(dialog.querySelector('[data-cancel-trade]')?.getClientRects().length),
      categoryOptions: [...dialog.querySelector('[name="position_category"]').options].map((option) => option.value),
      placeholderUsesUiFont: getComputedStyle(dialog.querySelector('[data-trade-total]')).fontFamily === getComputedStyle(document.documentElement).fontFamily,
    };
  })()`);
  await evaluate(`(() => {
    const form = document.querySelector('[data-trade-form]');
    const values = { ticker: '510300', ticker_name: '沪深 300 ETF', position_category: 'A股宽基指数底仓', quantity: '100', price: '12.6' };
    for (const [name, value] of Object.entries(values)) {
      const input = form.elements[name];
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    form.requestSubmit();
  })()`);
  await waitFor(`document.querySelector('[data-trade-status]').textContent === '已保存，可继续录入下一笔。'`, 'continuous trade entry completion');
  diagnostics.checks.tradeEntry = await evaluate(`(() => {
    const dialog = document.querySelector('[data-trade-dialog]');
    const form = document.querySelector('[data-trade-form]');
    const total = document.querySelector('[data-trade-total]').textContent;
    return {
      remainsOpen: dialog.open,
      dateRetained: Boolean(form.elements.trade_date.value),
      categoryRetained: form.elements.position_category.value === 'A股宽基指数底仓',
      tickerCleared: form.elements.ticker.value === '',
      totalReset: total === '输入数量和价格后自动计算',
      focus: document.activeElement === form.elements.ticker,
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

  await evaluate(`document.querySelector('[data-edit-trade="1"]').click()`);
  await waitFor(`document.querySelector('[data-trade-dialog]').open && document.querySelector('[data-trade-dialog-title]').textContent === '修改最新交易'`, 'trade edit dialog');
  await evaluate(`(() => { const form = document.querySelector('[data-trade-form]'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(form.elements.quantity, '120'); form.requestSubmit(); })()`);
  await waitFor(`!document.querySelector('[data-trade-dialog]').open`, 'trade edit completion');
  await evaluate(`(() => { window.confirm = () => true; document.querySelector('[data-delete-trade="1"]').click(); })()`);
  await delay(250);

  for (const [trigger, dialog] of [['[data-open-monthly]', '[data-monthly-dialog]'], ['[data-open-plan]', '[data-plan-dialog]'], ['[data-open-memo]', '[data-memo-dialog]'], ['[data-open-rules]', '[data-rules-dialog]']]) {
    await evaluate(`document.querySelector('${trigger}').click()`);
    await waitFor(`document.querySelector('${dialog}').open`, `${dialog} open`);
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 });
    await waitFor(`!document.querySelector('${dialog}').open`, `${dialog} close`);
  }
  diagnostics.checks.management = await evaluate(`({
    editAvailable: Boolean(document.querySelector('[data-edit-trade="1"]')),
    monthlyEntryAvailable: !document.querySelector('[data-open-monthly]').hidden,
    planEntryAvailable: !document.querySelector('[data-open-plan]').hidden,
    memoEntryAvailable: !document.querySelector('[data-open-memo]').hidden,
    rulesEntryAvailable: !document.querySelector('[data-open-rules]').hidden,
  })`);
  await evaluate(`(() => { document.querySelector('[data-open-rules]').click(); const form = document.querySelector('[data-rules-form]'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; const values = { single_position_active_cap: '.5', loss_pause_ratio: '.15', stop_loss_ratio: '.3', take_profit_ratio: '.2', rebalance_deviation: '.05', freeze: '10', low: '12', normal: '16', high: '20' }; for (const [name, value] of Object.entries(values)) { set.call(form.elements[name], value); form.elements[name].dispatchEvent(new Event('input', { bubbles: true })); } form.requestSubmit(); })()`);
  await waitFor(`!document.querySelector('[data-rules-dialog]').open`, 'risk rule save');
  diagnostics.checks.riskRuleSaved = true;

  diagnostics.checks.tabs = [];
  for (const tab of ['entry', 'holdings', 'review', 'planning', 'records']) {
    await evaluate(`document.querySelector('[data-tab="${tab}"]').click()`);
    diagnostics.checks.tabs.push(await evaluate(`({ tab: '${tab}', active: document.querySelector('[data-tab="${tab}"]').classList.contains('is-active'), visible: [...document.querySelectorAll('[data-pane="${tab}"]')].some((node) => !node.hidden) })`));
  }
  await evaluate(`document.querySelector('[data-tab="entry"]').click()`);

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

  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await evaluate(`document.querySelector('[data-open-trade]').click()`);
  await waitFor(`document.querySelector('[data-trade-dialog]').open`, 'mobile trade dialog');
  diagnostics.checks.mobileTradeEntry = await evaluate(`(() => {
    const dialog = document.querySelector('[data-trade-dialog]');
    const actions = dialog.querySelector('[data-cancel-trade]').parentElement;
    return {
      noHorizontalOverflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      singleColumnFields: getComputedStyle(dialog.querySelector('.form-grid')).gridTemplateColumns.split(' ').length === 1,
      scrollableDialog: getComputedStyle(dialog).overflowY === 'auto',
      actionButtonsReachable: [...actions.querySelectorAll('button')].every((button) => button.getBoundingClientRect().height >= 44),
    };
  })()`);
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 });
  await waitFor(`!document.querySelector('[data-trade-dialog]').open`, 'mobile trade dialog close');

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
  await evaluate(`document.querySelector('[data-tab="review"]').click()`);
  await waitFor(`Boolean(document.querySelector('[data-confirm-review]')) && Boolean(document.querySelector('[data-confirm-rebalance]'))`, 'viewer review and rebalance confirmations');
  await evaluate(`document.querySelector('[data-confirm-review]').click()`);
  await waitFor(`!document.querySelector('[data-confirm-review]')`, 'viewer annual review confirmation');
  await evaluate(`document.querySelector('[data-confirm-rebalance]').click()`);
  await waitFor(`!document.querySelector('[data-confirm-rebalance]')`, 'viewer rebalance confirmation');
  diagnostics.checks.viewerConfirmations = true;

  console.log(JSON.stringify(diagnostics, null, 2));
  assert.deepEqual(diagnostics.checks.rendered, {
    role: 'ADMIN · READ / WRITE',
    holdings: 1,
    pe: 1,
    peSegments: 5,
    accessRows: 1,
    importReviewRows: 1,
    monthlyRows: 1,
    planValues: 4,
    memoRows: 1,
    accessCollapsed: true,
    financeFont: 'Geist, "HarmonyOS Sans SC", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif',
    tradeActionVisible: true,
    reviewActionVisible: true,
    riskActionVisible: true,
    loginStatusCleared: true,
    dashboardStatusCleared: true,
    workbookReviewAbsent: true,
    monthlyPeFieldsAbsent: true,
    loginSurvivesInitialSessionRace: true,
    loginLayerRemoved: true,
  });
  assert.equal(diagnostics.checks.importReviewResolved, true);
  assert.deepEqual(diagnostics.checks.modal, { appInert: true, activeInside: true, activeName: 'ticker', sections: ['标的', '本次操作'], cancelVisible: true, categoryOptions: ['主动操作仓（A股）', 'A股宽基指数底仓', '港股宽基指数底仓', '美股宽基指数底仓', '货币基金/现金'], placeholderUsesUiFont: true });
  assert.deepEqual(diagnostics.checks.tradeEntry, { remainsOpen: true, dateRetained: true, categoryRetained: true, tickerCleared: true, totalReset: true, focus: true });
  assert.deepEqual(diagnostics.checks.modalRestored, { background: true, focus: true });
  assert.deepEqual(diagnostics.checks.management, { editAvailable: true, monthlyEntryAvailable: true, planEntryAvailable: true, memoEntryAvailable: true, rulesEntryAvailable: true });
  assert.equal(diagnostics.checks.tabs.every((item) => item.active && item.visible), true, 'each Finance path must expose its own pane');
  assert.equal(diagnostics.checks.riskRuleSaved, true);
  assert.deepEqual(diagnostics.checks.reviewModal, { appInert: true, activeName: 'year' });
  assert.deepEqual(diagnostics.checks.riskModal, { appInert: true, activeName: 'annualDrawdown' });
  assert.equal(diagnostics.checks.viewports.every((item) => item.noHorizontalOverflow), true);
  assert.equal(diagnostics.checks.viewports.find((item) => item.width === 360)?.dashboardColumns, 1);
  assert.equal(diagnostics.checks.viewports.find((item) => item.width === 1440)?.dashboardColumns, 3);
  assert.deepEqual(diagnostics.checks.textZoom, { noHorizontalOverflow: true, controlsRemainVisible: true });
  assert.deepEqual(diagnostics.checks.mobileTradeEntry, { noHorizontalOverflow: true, singleColumnFields: true, scrollableDialog: true, actionButtonsReachable: true });
  assert.deepEqual(diagnostics.checks.viewer, {
    role: 'CATI · READ ONLY',
    tradeHidden: true,
    reviewHidden: true,
    exportHidden: true,
    riskHidden: true,
    prompt: '请确认已查阅 2026-06 月投资记录。',
    appInert: true,
  });
  assert.equal(diagnostics.checks.viewerConfirmations, true);
  assert.equal(requests.filter((item) => item.method === 'POST' && item.pathname === '/api/auth/login').length, 2);
  assert.equal(requests.filter((item) => item.method === 'POST' && item.pathname === '/api/trades').length, 1);
  assert.equal(requests.filter((item) => item.method === 'PATCH' && item.pathname === '/api/trades/1').length, 1);
  assert.equal(requests.filter((item) => item.method === 'DELETE' && item.pathname === '/api/trades/1').length, 1);
  assert.equal(requests.filter((item) => item.method === 'POST' && item.pathname === '/api/confirmations/monthly').length, 1);
  assert.equal(requests.filter((item) => item.method === 'POST' && item.pathname === '/api/review/confirm').length, 1);
  assert.equal(requests.filter((item) => item.method === 'POST' && item.pathname === '/api/rebalances/1/confirm').length, 1);
  assert.equal(requests.filter((item) => item.method === 'PATCH' && item.pathname === '/api/import-review/1').length, 1);
  assert.equal(requests.some((item) => item.pathname.startsWith('/api/workbook-review')), false);
  const ruleRequests = requests.filter((item) => item.method === 'PUT' && item.pathname === '/api/risk-rules');
  assert.equal(ruleRequests.length, 2);
  assert.deepEqual(ruleRequests.map((item) => item.body.rule_key).sort(), ['risk', 'temperature']);
  assert.deepEqual(diagnostics.consoleProblems, []);
  assert.deepEqual(diagnostics.exceptions, []);
} finally {
  cdp?.close();
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
