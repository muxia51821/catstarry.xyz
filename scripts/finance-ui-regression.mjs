import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { connectCdp, delay } from './lib/cdp-session.mjs';
import { launchIsolatedBrowser } from './lib/isolated-browser.mjs';

const requests = [];
let currentRole = null;
let viewerConfirmed = false;
let initialSessionRequest = true;
let riskSignalsFailure = false;
const historicalMemos = Array.from({ length: 13 }, (_, index) => {
  const id = 13 - index;
  return {
    id,
    trade_id: id === 1 ? 1 : 100 + id,
    memo_date: `2026-07-${String(10 + id).padStart(2, '0')}`,
    ticker: '510300',
    ticker_name: '沪深300ETF',
    trade_quantity: 100,
    trade_price: 12,
    position_category: 'A股宽基指数底仓',
    operation_type: 'buy',
    reason: id === 1 ? 'historical fixture memo' : `newer fixture memo ${id}`,
    note: null,
    stop_loss_triggered: 0,
    created_at: '2026-07-24T09:00:00.000Z',
    updated_at: '2026-07-24T09:00:00.000Z',
  };
});
const fixtures = {
  '/api/auth/session': { authenticated: false, username: null, role: null },
  '/api/holdings': {
    total_market_value: 12600,
    market_data_complete: true,
    holdings: [
      { ticker: '510300', ticker_name: '沪深300ETF', quantity: 100, avg_cost: 66, price: 72, market_value: 7200, pnl: 600, pnl_ratio: 600 / 6600, position_category: 'A股宽基指数底仓', fetched_at: '2026-07-25T10:00:00.000Z' },
      { ticker: '513100', ticker_name: '纳斯达克100ETF', quantity: 100, avg_cost: 33, price: 36, market_value: 3600, pnl: 300, pnl_ratio: null, position_category: '美股ETF（A股跨境ETF）', fetched_at: '2026-07-25T10:00:00.000Z' },
      { ticker: '518880', ticker_name: '黄金ETF', quantity: 100, avg_cost: 16, price: null, market_value: null, pnl: null, pnl_ratio: null, position_category: '黄金ETF', fetched_at: '2026-07-25T10:00:00.000Z' },
    ],
    positions: [{ position_category: 'core', current_ratio: 1, target_ratio: 1, lower_ratio: 0.8, upper_ratio: 1, suggestedChange: 0, status: 'normal' }],
    market_overview: { label: '上证指数', current_value: 3452.17, change: 18.24, change_pct: .5312, market_time: '2026-07-30 15:00' },
  },
  '/api/trades': { trades: [{ id: 1, trade_date: '2026-07-24', ticker: '510300', ticker_name: '沪深300ETF', direction: 'buy', quantity: 100, price: 12, position_category: 'A股宽基指数底仓', reason: 'fixture trade', created_by: 'contract-admin', memo_id: 1, memo_reason: 'historical fixture memo', memo_reason_source: 'original' }] },
  '/api/pe': { indexes: [{ ticker: 'CSI300_PE', display_name: '沪深 300 PE-TTM', pe_ttm: 12.5, temperature: { zone: 'normal', suggestion: 'normal_dca' } }, { ticker: 'CSI500_PE', display_name: '中证 500 PE-TTM', pe_ttm: 22.8 }, { ticker: 'CSI1000_PE', display_name: '中证 1000 PE-TTM', pe_ttm: 31.4 }, { ticker: 'STAR50_PE', display_name: '科创 50 PE-TTM', pe_ttm: 48.2 }, { ticker: 'NASDAQ100_PE', display_name: '纳斯达克 100 PE', pe_ttm: 36.1 }] },
  '/api/circuit': { active: null },
  '/api/review': { reviews: [{ year: 2026, summary: 'fixture annual review', calculation: { dietz: { returnRate: .08 } }, confirmed_at: null, confirmed_by: null }] },
  '/api/monthly': { records: [{ id: 1, year_month: '2026-06', muxia_invest: 5000, cati_invest: 0, end_total: 12000, blue_chip_temp: 'normal', summary: 'fixture monthly record' }, { id: 2, year_month: '2026-07', muxia_invest: 5000, cati_invest: 0, end_total: 12600, blue_chip_temp: 'normal', summary: 'fixture monthly record' }] },
  '/api/assets/series': { view: 'month', series: [{ snapshot_date: '2026-06-30', total_value: 12000 }, { snapshot_date: '2026-07-31', total_value: 12600 }], source_model: 'derived_valuation', coverage: { note: 'fixture complete valuations' } },
  '/api/cash-flows': { cash_flows: [{ id: 1, occurred_on: '2026-07-28', contributor: 'muxia', flow_type: 'bonus_investment', confirmed_amount: 10000, manager_share_offset: 1000, net_amount: 9000, note: 'fixture cash flow' }] },
  '/api/assets/snapshots': { snapshots: [{ id: 1, snapshot_at: '2026-07-31T15:00', snapshot_date: '2026-07-31', total_value: 12600, source: 'fixture statement', is_complete: 1, incomplete_reason: null, created_at: '2026-07-31T15:10:00.000Z' }] },
  '/api/risk/signals': { single_position_loss: null, worst_ticker: null, monthly_drawdown: null, annual_drawdown: null, data_complete: false, missing_reasons: ['完整资产快照不足，组合回撤数据积累中。'], signals: [{ level: 'yellow', reason: 'fixture signal' }] },
  '/api/plan': { plan: { initial_capital: 100000, monthly_invest: 5000, months_year1: 7, months_year2plus: 12, rate_low: .03, rate_base: .06, rate_high: .1, bonus1: 50000, bonus2to4: 35000, start_year: 2026, end_year: 2030, updated_at: '2026-07-25T10:00:00.000Z' } },
  '/api/memos': { memos: historicalMemos },
  '/api/risk-rules': { rules: [{ rule_key: 'risk', value: { single_position_active_cap: .5, loss_pause_ratio: .15, stop_loss_ratio: .3, rebalance_deviation: .05 } }, { rule_key: 'temperature', value: { freeze: 10, low: 12, normal: 16, high: 20 } }] },
  '/api/rebalances': { rebalances: [{ id: 1, year: 2026, executed_on: '2026-12-20', adjustments: 'fixture rebalance', reason: 'fixture', confirmed_at: null, confirmed_by: null }] },
  '/api/access-log': { access_log: [{ username: 'contract-admin', action: 'login', occurred_at: '2026-07-25T10:00:00.000Z' }] },
  '/api/import-review': { review: [{ id: 1, batch_id: 'fixture-batch', row_number: 3, record_kind: 'trade', status: 'pending', raw: { ticker: 'BAD' } }] },
};

const server = createServer(async (request, response) => {
  const url = new URL(request.url, 'http://local.test');
  const requestRecord = { method: request.method, pathname: url.pathname, search: url.search };
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
  if (url.pathname === '/api/risk/signals' && riskSignalsFailure) return json(response, 503, { message: 'risk signal fixture unavailable' });
  if (url.pathname === '/api/confirmations/monthly' && request.method === 'POST') {
    viewerConfirmed = true;
    return json(response, 200, { created: true, period: '2026-06', username: 'contract-viewer' });
  }
  if (url.pathname === '/api/trades' && request.method === 'POST') return json(response, 201, { created: true });
  if (url.pathname === '/api/trades/1' && request.method === 'PATCH') return json(response, 200, { updated: true });
  if (url.pathname === '/api/trades/1' && request.method === 'DELETE') return json(response, 200, { deleted: true });
  if (url.pathname === '/api/monthly' && request.method === 'PUT') return json(response, 200, { record: JSON.parse(await readBody(request)) });
  if (url.pathname === '/api/cash-flows' && request.method === 'POST') {
    const cashFlow = { id: fixtures['/api/cash-flows'].cash_flows.length + 1, ...JSON.parse(await readBody(request)), net_amount: 1000 };
    fixtures['/api/cash-flows'].cash_flows.unshift(cashFlow);
    return json(response, 201, { cash_flow: cashFlow });
  }
  if (url.pathname === '/api/cash-flows/1' && request.method === 'PATCH') {
    Object.assign(fixtures['/api/cash-flows'].cash_flows.find((row) => row.id === 1), JSON.parse(await readBody(request)));
    return json(response, 200, { updated: true });
  }
  if (url.pathname === '/api/cash-flows/1' && request.method === 'DELETE') {
    fixtures['/api/cash-flows'].cash_flows = fixtures['/api/cash-flows'].cash_flows.filter((row) => row.id !== 1);
    return json(response, 200, { deleted: true });
  }
  if (url.pathname === '/api/assets/snapshots' && request.method === 'POST') {
    const payload = JSON.parse(await readBody(request));
    const snapshot = { id: fixtures['/api/assets/snapshots'].snapshots.length + 1, ...payload, snapshot_date: String(payload.snapshot_at).slice(0, 10), total_value: Number(payload.holdings_value) + Number(payload.cash_value), created_at: '2026-08-05T10:00:00.000Z' };
    fixtures['/api/assets/snapshots'].snapshots.unshift(snapshot);
    return json(response, 201, { created: true, total_value: snapshot.total_value });
  }
  if (url.pathname === '/api/plan' && request.method === 'PUT') return json(response, 200, { plan: JSON.parse(await readBody(request)) });
  if (url.pathname === '/api/memos' && request.method === 'POST') return json(response, 201, { memo: JSON.parse(await readBody(request)) });
  const memoMatch = url.pathname.match(/^\/api\/memos\/(\d+)$/);
  if (memoMatch && request.method === 'PATCH') {
    const memo = fixtures['/api/memos'].memos.find((row) => row.id === Number(memoMatch[1]));
    if (!memo) return json(response, 404, { message: 'memo fixture missing' });
    Object.assign(memo, JSON.parse(await readBody(request)), { updated_at: '2026-07-30T10:00:00.000Z' });
    return json(response, 200, { memo });
  }
  if (memoMatch && request.method === 'DELETE') {
    fixtures['/api/memos'].memos = fixtures['/api/memos'].memos.filter((row) => row.id !== Number(memoMatch[1]));
    return json(response, 200, { deleted: true });
  }
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
    '/fonts/Geist-Variable.ttf': ['finance-site/fonts/Geist-Variable.ttf', 'font/ttf'],
    '/fonts/JetBrainsMono-Variable.ttf': ['finance-site/fonts/JetBrainsMono-Variable.ttf', 'font/ttf'],
    '/fonts/HarmonyOS-Sans-SC.ttf': ['finance-site/fonts/HarmonyOS-Sans-SC.ttf', 'font/ttf'],
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
const screenshotDir = process.env.FINANCE_UI_SCREENSHOT_DIR;
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
  async function capture(name) {
    if (!screenshotDir) return;
    await mkdir(screenshotDir, { recursive: true });
    const image = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    await writeFile(resolve(screenshotDir, name), Buffer.from(image.data, 'base64'));
  }
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
  await waitFor(`document.querySelector('[data-app]')?.hidden === false && document.querySelector('[data-dashboard]')?.getAttribute('aria-busy') === 'false' && document.querySelectorAll('[data-holdings-body] tr').length === 3`, 'Finance dashboard');
  await delay(400);

  diagnostics.checks.rendered = await evaluate(`({
    role: document.querySelector('[data-role]').textContent,
    holdings: document.querySelectorAll('[data-holdings-body] tr').length,
    pe: document.querySelectorAll('[data-pe-list] article').length,
    peSegments: document.querySelectorAll('[data-pe-list] .pe-scale__segment').length,
    accessRows: document.querySelectorAll('[data-access-list] .access-log__row').length,
    accessLabels: [...document.querySelectorAll('[data-access-list] .access-log__header span')].map((node) => node.textContent),
    importReviewRows: document.querySelectorAll('[data-import-review-list] article').length,
    monthlyRows: document.querySelectorAll('[data-monthly-list] article').length,
    cashFlowRows: document.querySelectorAll('[data-cash-flows-body] tr').length,
    assetSnapshotRows: document.querySelectorAll('[data-asset-snapshots-body] tr').length,
    riskSignalRows: document.querySelectorAll('[data-risk-signals-list] article').length,
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
    entryStripRemoved: !document.querySelector('[data-entry-strip]'),
    overviewActive: document.querySelector('[data-tab="overview"]').classList.contains('is-active'),
    overviewChartPoints: document.querySelectorAll('[data-net-worth-chart] circle').length,
    overviewChartSvg: document.querySelector('[data-net-worth-chart] svg') instanceof SVGSVGElement && document.querySelectorAll('[data-net-worth-chart] circle title').length === 2,
    overviewUsesFullGrid: Math.abs(document.querySelector('.overview-grid').getBoundingClientRect().right - document.querySelector('.overview-grid .panel--span-2').getBoundingClientRect().right) < 1,
    dashboardNotBusy: document.querySelector('[data-dashboard]').getAttribute('aria-busy') === 'false',
    tabPressedState: [...document.querySelectorAll('[data-tab]')].map((button) => ({ tab: button.dataset.tab, pressed: button.getAttribute('aria-pressed') })),
    holdingsSummary: [...document.querySelectorAll('[data-top-holdings] p')].map((node) => node.textContent.replace(/\s+/g, ' ').trim()),
    categoryDistribution: document.querySelectorAll('[data-category-distribution] article').length,
    overviewHistory: {
      points: document.querySelectorAll('[data-net-worth-chart] circle').length,
      state: document.querySelector('[data-net-worth-state]').textContent,
    },
    holdingsPnl: [...document.querySelectorAll('[data-holdings-body] tr')].map((row) => row.cells[5].textContent),
    tradeCellSemantics: [...document.querySelector('[data-trades-body] tr').cells].map((cell) => ({ className: cell.className, align: getComputedStyle(cell).textAlign })),
    accessStructure: [...document.querySelectorAll('[data-access-list] .access-log__row')].map((row) => [...row.children].map((cell) => ({ tag: cell.tagName, label: cell.dataset.label, text: cell.textContent }))),
    unavailablePeCopy: [...document.querySelectorAll('[data-pe-list] .pe-row')].find((row) => row.querySelector('strong')?.textContent.includes('中证 500'))?.querySelector('p')?.textContent,
    fontsLoaded: document.fonts.check('16px Geist') && document.fonts.check('16px "HarmonyOS Sans SC"') && document.fonts.check('16px "JetBrains Mono"'),
  })`);
  await capture('finance-dashboard-desktop-1440.png');
  await send('Emulation.setDeviceMetricsOverride', { width: 1366, height: 768, deviceScaleFactor: 1, mobile: false });
  await delay(100);
  await capture('finance-dashboard-desktop-1366.png');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await evaluate(`document.querySelector('[data-tab="records"]').click()`);
  await delay(100);
  diagnostics.checks.mobileAccessLog = await evaluate(`(() => {
    const row = document.querySelector('[data-access-list] .access-log__row');
    return {
      headerHidden: getComputedStyle(document.querySelector('[data-access-list] .access-log__header')).display === 'none',
      singleColumn: getComputedStyle(row).gridTemplateColumns.trim().split(/\\s+/).length === 1,
      labels: [...row.children].map((cell) => cell.dataset.label),
    };
  })()`);
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await evaluate(`document.querySelector('[data-tab="overview"]').click()`);

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
    const form = document.querySelector('[data-trade-form]');
    return {
      appInert: document.querySelector('[data-app]').inert,
      activeInside: dialog.contains(document.activeElement),
      activeName: document.activeElement?.name ?? null,
      sections: [...dialog.querySelectorAll('fieldset legend')].map((legend) => legend.textContent),
      cancelVisible: Boolean(dialog.querySelector('[data-cancel-trade]')?.getClientRects().length),
      categoryOptions: [...dialog.querySelector('[name="position_category"]').options].map((option) => option.value),
      placeholderUsesUiFont: getComputedStyle(dialog.querySelector('[data-trade-total]')).fontFamily === getComputedStyle(document.documentElement).fontFamily,
      reasonAbsent: !form.elements.reason,
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

  await evaluate(`document.querySelector('[data-open-cash-flow]').click()`);
  await waitFor(`document.querySelector('[data-cash-flow-dialog]').open`, 'cash flow dialog');
  await evaluate(`(() => { const form = document.querySelector('[data-cash-flow-form]'); form.elements.confirmed_amount.value = '1234'; form.elements.note.value = 'new fixture cash flow'; form.requestSubmit(); })()`);
  await waitFor(`!document.querySelector('[data-cash-flow-dialog]').open && document.querySelectorAll('[data-cash-flows-body] tr').length === 2`, 'cash flow creation refresh');
  await evaluate(`document.querySelector('[data-edit-cash-flow="1"]').click()`);
  await waitFor(`document.querySelector('[data-cash-flow-dialog]').open && document.querySelector('[data-cash-flow-dialog] h2').textContent === '编辑真实现金流'`, 'cash flow edit dialog');
  await evaluate(`(() => { const form = document.querySelector('[data-cash-flow-form]'); form.elements.note.value = 'updated fixture cash flow'; form.requestSubmit(); })()`);
  await waitFor(`!document.querySelector('[data-cash-flow-dialog]').open`, 'cash flow edit completion');
  await evaluate(`(() => { window.confirm = () => true; document.querySelector('[data-delete-cash-flow="1"]').click(); })()`);
  await waitFor(`document.querySelectorAll('[data-cash-flows-body] tr').length === 1`, 'cash flow deletion refresh');
  diagnostics.checks.cashFlows = await evaluate(`({ rows: document.querySelectorAll('[data-cash-flows-body] tr').length, netAmount: document.querySelector('[data-cash-flows-body] tr td:nth-child(6)')?.textContent, adminActions: document.querySelectorAll('[data-edit-cash-flow], [data-delete-cash-flow]').length })`);

  const assetSeriesRequestsBeforeSnapshot = requests.filter((item) => item.pathname === '/api/assets/series').length;
  await evaluate(`document.querySelector('[data-open-asset-snapshot]').click()`);
  await waitFor(`document.querySelector('[data-asset-snapshot-dialog]').open`, 'asset snapshot dialog');
  await evaluate(`(() => { const form = document.querySelector('[data-asset-snapshot-form]'); form.elements.source.value = 'new fixture statement'; form.elements.holdings_value.value = '10000'; form.elements.cash_value.value = '2000'; form.requestSubmit(); })()`);
  await waitFor(`!document.querySelector('[data-asset-snapshot-dialog]').open && document.querySelectorAll('[data-asset-snapshots-body] tr').length === 2`, 'asset snapshot creation refresh');
  diagnostics.checks.assetSnapshots = await evaluate(`({ rows: document.querySelectorAll('[data-asset-snapshots-body] tr').length, hasReadOnlyActions: document.querySelectorAll('[data-asset-snapshots-body] button').length === 0 })`);
  assert.ok(requests.filter((item) => item.pathname === '/api/assets/series').length > assetSeriesRequestsBeforeSnapshot, 'saving an asset snapshot must refresh the total-asset series');

  diagnostics.checks.riskSignals = await evaluate(`({ rows: document.querySelectorAll('[data-risk-signals-list] article').length, signal: document.querySelector('[data-risk-signals-list] article:last-child strong')?.textContent, incomplete: document.querySelector('[data-risk-signals-list]')?.textContent.includes('数据积累中') })`);
  riskSignalsFailure = true;
  await evaluate(`document.querySelector('[data-refresh]').click()`);
  await waitFor(`!document.querySelector('[data-risk-signals-error]').hidden && document.querySelector('[data-dashboard]')?.getAttribute('aria-busy') === 'false'`, 'risk signal failure isolation');
  diagnostics.checks.riskSignalsFailureIsolated = true;
  riskSignalsFailure = false;

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
  for (const tab of ['overview', 'entry', 'holdings', 'review', 'planning', 'records']) {
    await evaluate(`document.querySelector('[data-tab="${tab}"]').click()`);
    await delay(200);
    diagnostics.checks.tabs.push(await evaluate(`(() => {
      const button = document.querySelector('[data-tab="${tab}"]');
      return { tab: '${tab}', active: button.classList.contains('is-active'), pressed: button.getAttribute('aria-pressed') === 'true', visible: [...document.querySelectorAll('[data-pane="${tab}"]')].some((node) => !node.hidden), activeBackground: getComputedStyle(button).backgroundColor };
    })()`));
  }
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  diagnostics.checks.reducedMotionTab = await evaluate(`(() => {
    let behavior = null;
    const original = window.scrollTo;
    window.scrollTo = (options) => { behavior = options.behavior; };
    document.querySelector('[data-tab="overview"]').click();
    window.scrollTo = original;
    return behavior;
  })()`);
  await send('Emulation.setEmulatedMedia', { features: [] });
  await evaluate(`document.querySelector('[data-tab="entry"]').click()`);
  await evaluate(`(() => {
    const form = document.querySelector('[data-trade-filters]');
    form.elements.ticker.value = '510300';
    form.elements.direction.value = 'buy';
    form.requestSubmit();
  })()`);
  await waitFor(`document.querySelector('[data-trade-pagination]').textContent.includes('第 1 页')`, 'trade filters');
  await evaluate(`document.querySelector('[data-trade-filters] button[type="reset"]').click()`);
  diagnostics.checks.tradeFilters = true;

  await evaluate(`document.querySelector('[data-open-memo]').click()`);
  await waitFor(`document.querySelector('[data-memo-dialog]').open`, 'memo dialog for linked trade');
  diagnostics.checks.memoTradeLink = await evaluate(`(() => {
    const dialog = document.querySelector('[data-memo-dialog]');
    const form = dialog.querySelector('[data-memo-form]');
    const select = form.elements.trade_id;
    select.value = '1';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    return {
      required: select.required,
      options: select.options.length,
      snapshot: dialog.querySelector('[data-memo-trade-snapshot]').textContent.replace(/\s+/g, ' ').trim(),
      checkboxCompact: getComputedStyle(dialog.querySelector('[name="stop_loss_triggered"]')).width !== '100%',
    };
  })()`);
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 });
  await waitFor(`!document.querySelector('[data-memo-dialog]').open`, 'memo dialog close');
  await evaluate(`document.querySelector('[data-edit-memo-from-trade="1"]').click()`);
  await waitFor(`document.querySelector('[data-memo-dialog]').open && document.querySelector('[data-memo-dialog-title]').textContent === '编辑投资备忘录'`, 'memo edit dialog');
  diagnostics.checks.memoEdit = await evaluate(`(() => {
    const form = document.querySelector('[data-memo-form]');
    return {
      tradeLocked: form.elements.trade_id.disabled,
      snapshotHasAmount: document.querySelector('[data-memo-trade-total]').textContent !== '—',
      cancelVisible: Boolean(document.querySelector('[data-cancel-memo]').getClientRects().length),
      tradeAction: document.querySelector('[data-edit-memo-from-trade="1"]').textContent,
      memoPanelHasHistorical: Boolean(document.querySelector('[data-memo-list] [data-edit-memo="1"]')),
      reason: form.elements.reason.value,
    };
  })()`);
  await evaluate(`(() => { const form = document.querySelector('[data-memo-form]'); form.elements.reason.value = 'updated fixture memo'; form.requestSubmit(); })()`);
  await waitFor(`!document.querySelector('[data-memo-dialog]').open`, 'memo edit completion');
  await evaluate(`(() => { window.confirm = () => true; document.querySelector('[data-delete-memo="13"]').click(); })()`);
  await waitFor(`!document.querySelector('[data-delete-memo="13"]')`, 'memo deletion completion');

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
  diagnostics.checks.mobileTextZoom125 = await evaluate(`(() => {
    document.documentElement.style.fontSize = '125%';
    const sessionButtons = [...document.querySelectorAll('.session-tools button:not([hidden])')];
    const sessionTops = sessionButtons.map((button) => button.getBoundingClientRect().top);
    const result = {
      noHorizontalOverflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      sessionControlsAligned: sessionTops.every((top) => Math.abs(top - sessionTops[0]) < 1),
      sessionControlsReachable: sessionButtons.every((button) => {
        const rect = button.getBoundingClientRect();
        return rect.left >= 0 && rect.right <= document.documentElement.clientWidth && rect.height >= 44;
      }),
      tabTouchTargets: [...document.querySelectorAll('[data-tab]')].every((button) => button.getBoundingClientRect().height >= 44),
    };
    document.documentElement.style.removeProperty('font-size');
    return result;
  })()`);

  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await evaluate(`document.querySelector('[data-tab="holdings"]').click()`);
  await delay(100);
  await capture('finance-holdings-mobile-390.png');
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
  await waitFor(`
    document.querySelector('[data-login]')?.hidden === true
    && document.querySelector('[data-app]')?.hidden === false
    && document.querySelector('[data-role]')?.textContent === 'CATI · READ ONLY'
    && document.querySelector('[data-dashboard]')?.getAttribute('aria-busy') === 'false'
    && document.querySelectorAll('[data-holdings-body] tr').length === 3
    && document.querySelector('[data-dashboard-status]')?.textContent === ''
    && !document.querySelector('[data-notification-dialog]')?.open
  `, 'viewer dashboard without monthly confirmation');
  diagnostics.checks.viewer = await evaluate(`({
    role: document.querySelector('[data-role]').textContent,
    tradeHidden: document.querySelector('[data-open-trade]').hidden,
    reviewHidden: document.querySelector('[data-open-review]').hidden,
    exportHidden: document.querySelector('[data-export-archive]').hidden,
    riskHidden: document.querySelector('[data-open-risk]').hidden,
    cashFlowActions: document.querySelectorAll('[data-edit-cash-flow], [data-delete-cash-flow]').length,
    prompt: document.querySelector('[data-notification-copy]').textContent,
    appInert: document.querySelector('[data-app]').inert,
  })`);
  await evaluate(`document.querySelector('[data-tab="holdings"]').click()`);
  await waitFor(`!document.querySelector('[data-notification-dialog]').open && [...document.querySelectorAll('[data-pane="holdings"]')].some((node) => !node.hidden)`, 'viewer holdings before monthly confirmation');
  diagnostics.checks.viewerHoldingsFirst = true;
  await evaluate(`document.querySelector('[data-tab="review"]').click()`);
  await waitFor(`document.querySelector('[data-notification-dialog]').open`, 'viewer monthly confirmation after holdings');
  diagnostics.checks.viewerPromptAfterHoldings = true;
  await evaluate(`document.querySelector('[data-confirm-notification]').click()`);
  await waitFor(`!document.querySelector('[data-notification-dialog]').open && document.querySelector('[data-app]').inert === false`, 'viewer monthly confirmation completion');
  await evaluate(`document.querySelector('[data-tab="planning"]').click()`);
  await waitFor(`!document.querySelector('[data-notification-dialog]').open`, 'confirmed viewer does not receive another monthly confirmation');
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
    holdings: 3,
    pe: 5,
    peSegments: 25,
    accessRows: 1,
    accessLabels: ['时间', '用户', '动作'],
    importReviewRows: 1,
    monthlyRows: 2,
    cashFlowRows: 1,
    assetSnapshotRows: 1,
    riskSignalRows: 7,
    planValues: 4,
    memoRows: 12,
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
    entryStripRemoved: true,
    overviewActive: true,
    overviewChartPoints: 2,
    overviewChartSvg: true,
    overviewUsesFullGrid: true,
    dashboardNotBusy: true,
    tabPressedState: [
      { tab: 'overview', pressed: 'true' },
      { tab: 'entry', pressed: 'false' },
      { tab: 'holdings', pressed: 'false' },
      { tab: 'review', pressed: 'false' },
      { tab: 'planning', pressed: 'false' },
      { tab: 'records', pressed: 'false' },
    ],
    holdingsSummary: ['沪深300ETF57.1%', '纳斯达克100ETF28.6%', '黄金ETF0.0%'],
    categoryDistribution: 3,
    overviewHistory: { points: 2, state: '2 个已核验月末快照' },
    holdingsPnl: ['+¥600.00 (+9.09%)', '+¥300.00 (—)', '—'],
    tradeCellSemantics: [
      { className: 'table-data trade-cell--date', align: 'left' },
      { className: 'table-text trade-cell--text', align: 'left' },
      { className: 'trade-cell--text trade-buy', align: 'left' },
      { className: 'table-data trade-cell--number', align: 'right' },
      { className: 'table-data trade-cell--number', align: 'right' },
      { className: 'table-text trade-cell--text', align: 'left' },
      { className: 'table-text trade-cell--text', align: 'left' },
      { className: 'trade-cell--action', align: 'left' },
    ],
    accessStructure: [[
      { tag: 'TIME', label: '时间', text: '2026-07-25T10:00:00.000Z' },
      { tag: 'SPAN', label: '用户', text: 'contract-admin' },
      { tag: 'SPAN', label: '动作', text: 'login' },
    ]],
    unavailablePeCopy: '估值区间暂不可用。',
    fontsLoaded: true,
  });
  assert.equal(diagnostics.checks.importReviewResolved, true);
  assert.deepEqual(diagnostics.checks.modal, { appInert: true, activeInside: true, activeName: 'ticker', sections: ['标的', '本次操作'], cancelVisible: true, categoryOptions: ['主动操作仓（A股）', 'A股宽基指数底仓', '美股ETF（A股跨境ETF）', '黄金ETF', '机动仓（货币ETF）', '其他'], placeholderUsesUiFont: true, reasonAbsent: true });
  assert.deepEqual(diagnostics.checks.tradeEntry, { remainsOpen: true, dateRetained: true, categoryRetained: true, tickerCleared: true, totalReset: true, focus: true });
  assert.deepEqual(diagnostics.checks.modalRestored, { background: true, focus: true });
  assert.deepEqual(diagnostics.checks.management, { editAvailable: true, monthlyEntryAvailable: true, planEntryAvailable: true, memoEntryAvailable: true, rulesEntryAvailable: true });
  assert.deepEqual(diagnostics.checks.cashFlows, { rows: 1, netAmount: '¥1,000.00', adminActions: 2 });
  assert.deepEqual(diagnostics.checks.mobileAccessLog, { headerHidden: true, singleColumn: true, labels: ['时间', '用户', '动作'] });
  assert.deepEqual(diagnostics.checks.assetSnapshots, { rows: 2, hasReadOnlyActions: true });
  assert.deepEqual(diagnostics.checks.riskSignals, { rows: 7, signal: '黄色关注', incomplete: true });
  assert.equal(diagnostics.checks.riskSignalsFailureIsolated, true);
  assert.equal(diagnostics.checks.tabs.every((item) => item.active && item.pressed && item.visible), true, 'each Finance path must expose its own pane and active state');
  assert.deepEqual(diagnostics.checks.tabs.map((item) => [item.tab, item.activeBackground]), [
    ['overview', 'rgb(53, 86, 253)'],
    ['entry', 'rgb(94, 175, 158)'],
    ['holdings', 'rgb(212, 201, 78)'],
    ['review', 'rgb(255, 184, 41)'],
    ['planning', 'rgb(183, 130, 242)'],
    ['records', 'rgb(90, 104, 120)'],
  ]);
  assert.equal(diagnostics.checks.reducedMotionTab, 'auto');
  assert.equal(diagnostics.checks.tradeFilters, true);
  assert.deepEqual(diagnostics.checks.memoTradeLink, { required: true, options: 2, snapshot: '交易日期2026-07-24标的510300 · 沪深300ETF买入或卖出买入成交数量100成交价格¥12.00成交金额¥1,200.00仓位类别A股宽基指数', checkboxCompact: true });
  assert.deepEqual(diagnostics.checks.memoEdit, { tradeLocked: true, snapshotHasAmount: true, cancelVisible: true, tradeAction: '改理由', memoPanelHasHistorical: false, reason: 'historical fixture memo' });
  assert.equal(diagnostics.checks.riskRuleSaved, true);
  assert.deepEqual(diagnostics.checks.reviewModal, { appInert: true, activeName: 'year' });
  assert.deepEqual(diagnostics.checks.riskModal, { appInert: true, activeName: 'annualDrawdown' });
  assert.equal(diagnostics.checks.viewports.every((item) => item.noHorizontalOverflow), true);
  assert.equal(diagnostics.checks.viewports.find((item) => item.width === 360)?.dashboardColumns, 1);
  assert.equal(diagnostics.checks.viewports.find((item) => item.width === 1440)?.dashboardColumns, 3);
  assert.deepEqual(diagnostics.checks.textZoom, { noHorizontalOverflow: true, controlsRemainVisible: true });
  assert.deepEqual(diagnostics.checks.mobileTextZoom125, { noHorizontalOverflow: true, sessionControlsAligned: true, sessionControlsReachable: true, tabTouchTargets: true });
  assert.deepEqual(diagnostics.checks.mobileTradeEntry, { noHorizontalOverflow: true, singleColumnFields: true, scrollableDialog: true, actionButtonsReachable: true });
  assert.deepEqual(diagnostics.checks.viewer, {
    role: 'CATI · READ ONLY',
    tradeHidden: true,
    reviewHidden: true,
    exportHidden: true,
    riskHidden: true,
    cashFlowActions: 0,
    prompt: '',
    appInert: false,
  });
  assert.equal(diagnostics.checks.viewerHoldingsFirst, true);
  assert.equal(diagnostics.checks.viewerPromptAfterHoldings, true);
  assert.equal(diagnostics.checks.viewerConfirmations, true);
  assert.equal(requests.filter((item) => item.method === 'POST' && item.pathname === '/api/auth/login').length, 2);
  assert.equal(requests.filter((item) => item.method === 'POST' && item.pathname === '/api/trades').length, 1);
  assert.equal(requests.filter((item) => item.method === 'PATCH' && item.pathname === '/api/trades/1').length, 1);
  assert.equal(requests.filter((item) => item.method === 'DELETE' && item.pathname === '/api/trades/1').length, 1);
  assert.equal(requests.filter((item) => item.method === 'PATCH' && item.pathname === '/api/memos/1').length, 1);
  assert.equal(requests.filter((item) => item.method === 'DELETE' && item.pathname === '/api/memos/13').length, 1);
  assert.equal(requests.filter((item) => item.method === 'POST' && item.pathname === '/api/cash-flows').length, 1);
  assert.equal(requests.filter((item) => item.method === 'PATCH' && item.pathname === '/api/cash-flows/1').length, 1);
  assert.equal(requests.filter((item) => item.method === 'DELETE' && item.pathname === '/api/cash-flows/1').length, 1);
  assert.equal(requests.filter((item) => item.method === 'POST' && item.pathname === '/api/assets/snapshots').length, 1);
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
