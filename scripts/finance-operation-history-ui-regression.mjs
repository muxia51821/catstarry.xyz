import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { connectCdp, delay } from './lib/cdp-session.mjs';
import { launchIsolatedBrowser } from './lib/isolated-browser.mjs';

const requests = [];
let mode = 'admin';
let pendingReview = [{ id: 7, batch_id: 'fixture-batch', sheet_name: '操作记录', row_number: 12, record_kind: 'trade', reason: 'fixture review', raw: { ticker: 'BAD' } }];
const firstChange = {
  key: 'trade:2', occurred_at: '2026-08-17T01:00:00.000Z', actor: 'muxia', action: 'updated', entity_type: 'trade', entity_id: '9',
  business_date: '2026-08-16', title: '修改交易 · 深科技', summary: '价格 37.37 → 37.27',
  changes: [{ field: 'price', label: '价格', before: 37.37, after: 37.27 }],
};
const secondChange = {
  key: 'memo:1', occurred_at: '2026-08-17T00:30:00.000Z', actor: 'muxia', action: 'updated', entity_type: 'memo', entity_id: '1',
  business_date: '2026-08-16', title: '修改投资备忘录 · 深科技', summary: '理由 已更新', changes: [],
};
const firstActivity = {
  key: 'reconciliation:1', business_date: '2026-08-16', business_time: '10:29:00', kind: 'reconciliation', ticker: null, ticker_name: null,
  title: '资产对账', summary: '总资产 ¥130,424.2 · Broker Cash ¥20,725.5', details: {},
};
const secondActivity = {
  key: 'trade:9', business_date: '2026-08-14', business_time: '14:55', kind: 'trade', ticker: '300750', ticker_name: '宁德时代',
  title: '买入 · 宁德时代', summary: '100 股 × ¥393.93', details: {},
};

const html = `<!doctype html><html><head>
<meta charset="utf-8"><meta name="finance-api-base" content="">
<style>body{font-family:sans-serif}.dashboard-grid{display:grid;gap:12px}.panel,.metric{border:1px solid #ccc;padding:12px}.is-active{font-weight:700}.record-filters{display:flex;gap:8px;flex-wrap:wrap}</style>
<link rel="stylesheet" href="/operations.css">
</head><body>
<div data-app>
  <nav><button data-tab="overview" class="is-active">总览</button><button data-tab="records">管理记录</button><button data-refresh>刷新</button></nav>
  <section class="summary-grid" data-pane="overview"><article class="metric"><span>总资产</span><strong data-total-value>130,424.20</strong></article></section>
  <div class="dashboard-grid">
    <details class="panel" data-access-panel data-pane="records" hidden><summary>安全访问记录</summary><div data-access-list><p>legacy access fallback</p></div></details>
    <section class="panel" data-import-review-panel data-pane="records" hidden><h2>旧 Import Review</h2><div data-import-review-list><p>legacy review fallback</p></div></section>
  </div>
</div>
<script>
window.__fetchBeforeOperations = window.fetch;
for (const button of document.querySelectorAll('[data-tab]')) button.addEventListener('click', () => {
  for (const tab of document.querySelectorAll('[data-tab]')) tab.classList.toggle('is-active', tab === button);
  for (const pane of document.querySelectorAll('[data-pane]')) pane.hidden = pane.dataset.pane !== button.dataset.tab;
});
</script>
<script src="/operations-ui.js" defer></script>
</body></html>`;

const server = createServer(async (request, response) => {
  const url = new URL(request.url, 'http://local.test');
  requests.push({ method: request.method, pathname: url.pathname, search: url.search, mode });
  if (url.pathname === '/' || url.pathname === '/index.html') {
    mode = url.searchParams.get('mode') || 'admin';
    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    response.end(html);
    return;
  }
  if (url.pathname === '/operations.css') return file(response, 'finance-site/operations.css', 'text/css; charset=utf-8');
  if (url.pathname === '/operations-ui.js') return file(response, 'finance-site/operations-ui.js', 'text/javascript; charset=utf-8');
  if (url.pathname === '/api/activity') {
    if (mode === 'fail') return json(response, 503, { message: 'activity unavailable' });
    const cursor = url.searchParams.get('cursor');
    return json(response, 200, {
      items: cursor ? [secondActivity] : [firstActivity],
      nextCursor: cursor ? null : 'activity-cursor-1',
      coverage: { note: 'fixture business activity', timezone: 'Asia/Shanghai' },
    });
  }
  if (url.pathname === '/api/change-log') {
    if (mode === 'fail') return json(response, 503, { message: 'change log unavailable' });
    if (mode === 'viewer') return json(response, 403, { message: 'forbidden' });
    const cursor = url.searchParams.get('cursor');
    return json(response, 200, {
      items: cursor ? [secondChange] : [firstChange],
      nextCursor: cursor ? null : 'change-cursor-1',
      coverage: { note: 'fixture audit coverage', timezone: 'Asia/Shanghai' },
    });
  }
  if (url.pathname === '/api/workbook-review' && request.method === 'GET') {
    if (mode === 'viewer') return json(response, 403, { message: 'forbidden' });
    if (mode === 'fail') return json(response, 503, { message: 'review unavailable' });
    return json(response, 200, { review: pendingReview });
  }
  if (url.pathname === '/api/workbook-review/7' && request.method === 'PATCH') {
    pendingReview = [];
    return json(response, 200, { id: 7, status: 'resolved' });
  }
  response.statusCode = 404;
  response.end();
});

async function file(response, path, contentType) {
  response.setHeader('Content-Type', contentType);
  response.end(await readFile(path));
}
function json(response, status, body) {
  response.statusCode = status;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(body));
}
await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolve);
});
const address = server.address();
if (!address || typeof address === 'string') throw new Error('Finance records fixture server did not bind');
const baseUrl = `http://127.0.0.1:${address.port}`;

const diagnostics = { consoleProblems: [], exceptions: [] };
let browser;
let cdp;
try {
  browser = await launchIsolatedBrowser();
  cdp = await connectCdp(browser.target, (message) => {
    if (message.method === 'Runtime.exceptionThrown') diagnostics.exceptions.push(message.params.exceptionDetails);
    if (message.method === 'Runtime.consoleAPICalled' && ['warning', 'error'].includes(message.params.type)) {
      diagnostics.consoleProblems.push(message.params.args.map((value) => value.value ?? value.description ?? value.type).join(' '));
    }
  });
  const { send, evaluate, waitFor } = cdp;
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

  // Operation History owns business Activity and administrator audit only. The
  // Portfolio layer owns current account state and must not be relabeled or duplicated here.
  await send('Page.navigate', { url: `${baseUrl}/?mode=admin` });
  await waitFor(`document.readyState === 'complete' && document.querySelector('[data-tab="records"]')?.textContent === '账户动态'`, 'operation history admin fixture');
  const ownership = await evaluate(`({
    summaryLabel: document.querySelector('[data-total-value]')?.closest('.metric')?.querySelector('span')?.textContent,
    duplicateAccountPanel: Boolean(document.querySelector('.account-state-panel')),
    fetchPreserved: window.fetch === window.__fetchBeforeOperations,
  })`);
  assert.deepEqual(ownership, { summaryLabel: '总资产', duplicateAccountPanel: false, fetchPreserved: true });
  assert.equal(requests.filter((item) => item.pathname === '/api/account-state').length, 0, 'Operation History must not query the Portfolio account-state authority');

  await delay(100);
  assert.equal(requests.filter((item) => item.mode === 'admin' && item.pathname === '/api/activity').length, 0, 'Activity stays lazy until Records is opened');
  assert.equal(requests.filter((item) => item.mode === 'admin' && item.pathname === '/api/change-log').length, 0, 'Audit stays lazy and collapsed');
  await evaluate(`document.querySelector('[data-tab="records"]').click()`);
  await waitFor(`document.querySelectorAll('[data-activity-list] .activity-row').length === 1`, 'account activity first page');
  await waitFor(`document.querySelectorAll('[data-canonical-review-list] .import-review-row').length === 1 && document.documentElement.classList.contains('operation-workbook-review-ready')`, 'canonical Workbook Review');
  const adminBeforeOpen = await evaluate(`({
    activityTitle: document.querySelector('#account-activity-title')?.textContent,
    activityFirst: document.querySelector('[data-activity-list] .activity-main strong')?.textContent,
    changeLogVisible: getComputedStyle(document.querySelector('.operation-history-panel')).display !== 'none',
    changeLogCollapsed: document.querySelector('.operation-history-panel')?.open === false,
    securityAccessVisible: getComputedStyle(document.querySelector('[data-access-panel]')).display !== 'none',
    securityAccessCollapsed: document.querySelector('[data-access-panel]')?.open === false,
    legacyReviewHidden: getComputedStyle(document.querySelector('[data-import-review-panel]')).display === 'none',
  })`);
  assert.deepEqual(adminBeforeOpen, {
    activityTitle: '账户动态', activityFirst: '资产对账', changeLogVisible: true, changeLogCollapsed: true,
    securityAccessVisible: true, securityAccessCollapsed: true, legacyReviewHidden: true,
  });
  assert.equal(requests.filter((item) => item.pathname === '/api/change-log').length, 0, 'collapsed change log must not query audit data');

  await evaluate(`document.querySelector('[data-activity-more]').click()`);
  await waitFor(`document.querySelectorAll('[data-activity-list] .activity-row').length === 2`, 'activity cursor page');
  const activityCursorRequest = requests.find((item) => item.pathname === '/api/activity' && item.search.includes('cursor='));
  assert.ok(activityCursorRequest?.search.includes('cursor=activity-cursor-1'));
  assert.ok(!activityCursorRequest?.search.includes('offset='));

  await evaluate(`document.querySelector('.operation-history-panel').open = true`);
  await waitFor(`document.querySelectorAll('[data-operation-list] .operation-row').length === 1 && document.documentElement.classList.contains('operation-history-ready')`, 'change log first page');
  assert.match(await evaluate(`document.querySelector('.operation-time')?.textContent ?? ''`), /09:00/);
  await evaluate(`document.querySelector('[data-operation-more]').click()`);
  await waitFor(`document.querySelectorAll('[data-operation-list] .operation-row').length === 2`, 'change log cursor page');
  const changeCursorRequest = requests.find((item) => item.pathname === '/api/change-log' && item.search.includes('cursor='));
  assert.ok(changeCursorRequest?.search.includes('cursor=change-cursor-1'));

  await evaluate(`document.querySelector('[data-canonical-resolution-note]').value='reviewed'; document.querySelector('[data-canonical-resolve-review]').click()`);
  await waitFor(`document.querySelectorAll('[data-canonical-review-list] .import-review-row').length === 0`, 'Workbook Review resolution');

  // Same-document logout/session reset purges Operation History surfaces without
  // owning or rewriting the Portfolio summary.
  await evaluate(`document.querySelector('[data-app]').hidden = true`);
  await waitFor(`document.querySelectorAll('[data-activity-list] .activity-row').length === 0 && document.querySelectorAll('[data-operation-list] .operation-row').length === 0 && document.querySelectorAll('[data-canonical-review-list] .import-review-row').length === 0`, 'records session reset');
  const reset = await evaluate(`({
    summaryLabel: document.querySelector('[data-total-value]')?.closest('.metric')?.querySelector('span')?.textContent,
    summaryValue: document.querySelector('[data-total-value]')?.textContent,
    activityRows: document.querySelectorAll('[data-activity-list] .activity-row').length,
    changeRows: document.querySelectorAll('[data-operation-list] .operation-row').length,
    reviewRows: document.querySelectorAll('[data-canonical-review-list] .import-review-row').length,
    legacyAccessRows: document.querySelector('[data-access-list]')?.children.length ?? 0,
    legacyReviewRows: document.querySelector('[data-import-review-list]')?.children.length ?? 0,
  })`);
  assert.deepEqual(reset, { summaryLabel: '总资产', summaryValue: '130,424.20', activityRows: 0, changeRows: 0, reviewRows: 0, legacyAccessRows: 0, legacyReviewRows: 0 });

  // Backend failure remains local to Records and leaves legacy fallbacks visible.
  pendingReview = [{ id: 7, batch_id: 'fixture-batch', sheet_name: '操作记录', row_number: 12, record_kind: 'trade', reason: 'fixture review', raw: { ticker: 'BAD' } }];
  await send('Page.navigate', { url: `${baseUrl}/?mode=fail` });
  await waitFor(`document.readyState === 'complete' && Boolean(document.querySelector('[data-tab="records"]'))`, 'records fallback fixture');
  await evaluate(`document.querySelector('[data-tab="records"]').click()`);
  await waitFor(`document.querySelector('[data-activity-error]')?.hidden === false && document.querySelector('[data-canonical-review-error]')?.hidden === false`, 'records failure state');
  const fallback = await evaluate(`({
    workbookReady: document.documentElement.classList.contains('operation-workbook-review-ready'),
    legacyAccessVisible: getComputedStyle(document.querySelector('[data-access-panel]')).display !== 'none',
    legacyReviewVisible: getComputedStyle(document.querySelector('[data-import-review-panel]')).display !== 'none',
  })`);
  assert.deepEqual(fallback, { workbookReady: false, legacyAccessVisible: true, legacyReviewVisible: true });

  // Viewer keeps Activity but never receives administrator review/change-log data.
  await send('Page.navigate', { url: `${baseUrl}/?mode=viewer` });
  await waitFor(`document.readyState === 'complete' && document.querySelector('[data-tab="records"]')?.textContent === '账户动态'`, 'viewer operation history');
  await evaluate(`document.querySelector('[data-tab="records"]').click()`);
  await waitFor(`document.querySelectorAll('[data-activity-list] .activity-row').length === 1 && document.documentElement.classList.contains('operation-workbook-review-ready')`, 'records viewer permissions');
  const viewer = await evaluate(`({
    activityVisible: document.querySelector('[data-activity-list] .activity-row') !== null,
    canonicalReviewHidden: document.querySelector('.operation-review-panel').hidden,
    changeLogHidden: document.querySelector('.operation-history-panel').hidden,
    legacyReviewHidden: getComputedStyle(document.querySelector('[data-import-review-panel]')).display === 'none',
    fetchPreserved: window.fetch === window.__fetchBeforeOperations,
  })`);
  assert.deepEqual(viewer, { activityVisible: true, canonicalReviewHidden: true, changeLogHidden: true, legacyReviewHidden: true, fetchPreserved: true });
  assert.equal(requests.filter((item) => item.mode === 'viewer' && item.pathname === '/api/change-log').length, 0);
  assert.equal(requests.filter((item) => item.pathname === '/api/account-state').length, 0);

  assert.deepEqual(diagnostics.consoleProblems, []);
  assert.deepEqual(diagnostics.exceptions, []);
  console.log('Finance Activity + data change-log ownership browser regression passed.');
} finally {
  cdp?.close();
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
