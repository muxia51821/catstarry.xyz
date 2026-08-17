import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { connectCdp, delay } from './lib/cdp-session.mjs';
import { launchIsolatedBrowser } from './lib/isolated-browser.mjs';

const requests = [];
let mode = 'admin';
let pendingReview = [{ id: 7, batch_id: 'fixture-batch', sheet_name: '操作记录', row_number: 12, record_kind: 'trade', reason: 'fixture review', raw: { ticker: 'BAD' } }];
const firstItem = {
  key: 'trade:2', occurred_at: '2026-08-17T01:00:00.000Z', actor: 'muxia', action: 'updated', entity_type: 'trade', entity_id: '9',
  business_date: '2026-08-16', title: '修改交易 · 深科技', summary: '价格 37.37 → 37.27',
  changes: [{ field: 'price', label: '价格', before: 37.37, after: 37.27 }],
};
const secondItem = {
  key: 'cash-flow:1', occurred_at: '2026-08-17T00:30:00.000Z', actor: 'muxia', action: 'created', entity_type: 'cash_flow', entity_id: '1',
  business_date: '2026-08-16', title: '新增现金流', summary: 'muxia · +¥5,000', changes: [],
};

const html = `<!doctype html><html><head>
<meta charset="utf-8"><meta name="finance-api-base" content="">
<style>body{font-family:sans-serif}.dashboard-grid{display:grid;gap:12px}.panel{border:1px solid #ccc;padding:12px}.is-active{font-weight:700}.record-filters{display:flex;gap:8px;flex-wrap:wrap}</style>
<link rel="stylesheet" href="/operations.css">
</head><body>
<div data-app>
  <nav><button data-tab="overview" class="is-active">总览</button><button data-tab="records">管理记录</button><button data-refresh>刷新</button></nav>
  <div class="dashboard-grid">
    <section class="panel" data-pane="overview">overview</section>
    <details class="panel" data-access-panel data-pane="records" hidden open><summary>旧安全访问记录</summary><p>legacy access fallback</p></details>
    <section class="panel" data-import-review-panel data-pane="records" hidden><h2>旧 Import Review</h2><p>legacy review fallback</p></section>
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
  if (url.pathname === '/api/operations') {
    if (mode === 'fail') return json(response, 503, { message: 'operation history unavailable' });
    const cursor = url.searchParams.get('cursor');
    return json(response, 200, {
      items: cursor ? [secondItem] : [firstItem],
      nextCursor: cursor ? null : 'cursor-1',
      coverage: { note: 'fixture coverage', timezone: 'Asia/Shanghai' },
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
if (!address || typeof address === 'string') throw new Error('Operation History fixture server did not bind');
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

  // Admin happy path: no eager reads outside Records, no global fetch monkey-patch, cursor paging and canonical review work.
  await send('Page.navigate', { url: `${baseUrl}/?mode=admin` });
  await waitFor(`document.readyState === 'complete' && Boolean(document.querySelector('[data-tab="records"]'))`, 'Operation History admin fixture');
  await delay(250);
  assert.equal(requests.filter((item) => item.mode === 'admin' && item.pathname === '/api/operations').length, 0, 'Operation History must not eagerly read while another Finance tab is active');
  await evaluate(`document.querySelector('[data-tab="records"]').click()`);
  await waitFor(`document.querySelectorAll('[data-operation-list] .operation-row').length === 1 && document.documentElement.classList.contains('operation-history-ready')`, 'Operation History first page');
  await waitFor(`document.querySelectorAll('[data-canonical-review-list] .import-review-row').length === 1 && document.documentElement.classList.contains('operation-workbook-review-ready')`, 'canonical Workbook Review');
  const admin = await evaluate(`({
    fetchPreserved: window.fetch === window.__fetchBeforeOperations,
    time: document.querySelector('.operation-time')?.textContent,
    legacyAccessHidden: getComputedStyle(document.querySelector('[data-access-panel]')).display === 'none',
    legacyReviewHidden: getComputedStyle(document.querySelector('[data-import-review-panel]')).display === 'none',
    historyTitle: document.querySelector('#operation-history-title')?.textContent,
    reviewTitle: document.querySelector('#canonical-import-review-title')?.textContent,
  })`);
  assert.equal(admin.fetchPreserved, true, 'Operation History must not replace global window.fetch');
  assert.match(admin.time ?? '', /09:00/, 'operation timestamp must render in Asia/Shanghai');
  assert.equal(admin.legacyAccessHidden, true);
  assert.equal(admin.legacyReviewHidden, true);
  assert.equal(admin.historyTitle, '变更记录');
  assert.equal(admin.reviewTitle, '导入异常审阅');

  await evaluate(`document.querySelector('[data-operation-more]').click()`);
  await waitFor(`document.querySelectorAll('[data-operation-list] .operation-row').length === 2`, 'Operation History cursor page');
  const cursorRequest = requests.find((item) => item.pathname === '/api/operations' && item.search.includes('cursor='));
  assert.ok(cursorRequest?.search.includes('cursor=cursor-1'));
  assert.ok(!cursorRequest?.search.includes('offset='), 'browser integration must use cursor instead of offset');

  await evaluate(`(() => {
    const input = document.querySelector('[data-canonical-resolution-note="7"]');
    input.value = 'fixture resolved';
    document.querySelector('[data-canonical-resolve-review="7"]').click();
  })()`);
  await waitFor(`document.querySelector('[data-canonical-review-empty]')?.hidden === false`, 'canonical Workbook Review resolution');
  assert.equal(requests.filter((item) => item.pathname === '/api/workbook-review/7' && item.method === 'PATCH').length, 1);

  // Backend failure: legacy panels remain available because takeover classes are success-gated.
  await send('Page.navigate', { url: `${baseUrl}/?mode=fail` });
  await waitFor(`document.readyState === 'complete' && Boolean(document.querySelector('[data-tab="records"]'))`, 'Operation History fallback fixture');
  await evaluate(`document.querySelector('[data-tab="records"]').click()`);
  await waitFor(`document.querySelector('[data-operation-error]')?.hidden === false`, 'Operation History failure state');
  const fallback = await evaluate(`({
    historyReady: document.documentElement.classList.contains('operation-history-ready'),
    workbookReady: document.documentElement.classList.contains('operation-workbook-review-ready'),
    legacyAccessVisible: getComputedStyle(document.querySelector('[data-access-panel]')).display !== 'none',
    legacyReviewVisible: getComputedStyle(document.querySelector('[data-import-review-panel]')).display !== 'none',
  })`);
  assert.deepEqual(fallback, { historyReady: false, workbookReady: false, legacyAccessVisible: true, legacyReviewVisible: true });

  // Viewer: product history remains readable, canonical Workbook Review stays admin-only, old admin review surface is not exposed.
  await send('Page.navigate', { url: `${baseUrl}/?mode=viewer` });
  await waitFor(`document.readyState === 'complete' && Boolean(document.querySelector('[data-tab="records"]'))`, 'Operation History viewer fixture');
  await evaluate(`document.querySelector('[data-tab="records"]').click()`);
  await waitFor(`document.documentElement.classList.contains('operation-history-ready') && document.documentElement.classList.contains('operation-workbook-review-ready')`, 'Operation History viewer permissions');
  const viewer = await evaluate(`({
    historyVisible: document.querySelector('[data-operation-list] .operation-row') !== null,
    canonicalReviewHidden: document.querySelector('.operation-review-panel').hidden,
    legacyReviewHidden: getComputedStyle(document.querySelector('[data-import-review-panel]')).display === 'none',
    fetchPreserved: window.fetch === window.__fetchBeforeOperations,
  })`);
  assert.deepEqual(viewer, { historyVisible: true, canonicalReviewHidden: true, legacyReviewHidden: true, fetchPreserved: true });

  assert.deepEqual(diagnostics.consoleProblems, []);
  assert.deepEqual(diagnostics.exceptions, []);
  console.log('Finance Operation History browser regression passed.');
} finally {
  cdp?.close();
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
