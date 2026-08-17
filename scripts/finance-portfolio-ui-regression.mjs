import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { connectCdp, delay } from './lib/cdp-session.mjs';
import { launchIsolatedBrowser } from './lib/isolated-browser.mjs';

const requests = [];
let mode = 'normal';
const trades = [
  { id: 2, trade_date: '2026-08-13', ticker: '000021', ticker_name: '深科技', direction: 'buy', quantity: 100, price: 40.23 },
  { id: 1, trade_date: '2026-08-07', ticker: '300750', ticker_name: '宁德时代', direction: 'buy', quantity: 100, price: 393.93 },
];

const html = `<!doctype html><html><head>
<meta charset="utf-8"><meta name="finance-api-base" content="">
<style>.metric{padding:12px}.overview-trade{display:flex;justify-content:space-between}</style>
<link rel="stylesheet" href="/portfolio.css">
</head><body>
<div data-app hidden>
  <button data-refresh>刷新</button>
  <main data-dashboard aria-busy="false">
    <article class="metric"><span>总资产</span><strong data-total-value>—</strong><small data-market-freshness>等待账户状态</small></article>
    <button data-asset-view="month" class="is-active">月</button><button data-asset-view="week">周</button>
    <span data-net-worth-state>3 个已核验月末快照</span>
    <p data-net-worth-empty>旧快照文案</p>
    <div data-overview-trades></div><p data-overview-trades-empty>empty</p>
  </main>
</div>
<script>window.__fetchBeforePortfolio = window.fetch;</script>
<script src="/portfolio-ui.js" defer></script>
</body></html>`;

const server = createServer(async (request, response) => {
  const url = new URL(request.url, 'http://local.test');
  requests.push({ pathname: url.pathname, search: url.search, mode });
  if (url.pathname === '/' || url.pathname === '/index.html') {
    mode = url.searchParams.get('mode') || 'normal';
    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    response.end(html);
    return;
  }
  if (url.pathname === '/portfolio.css') return file(response, 'finance-site/portfolio.css', 'text/css; charset=utf-8');
  if (url.pathname === '/portfolio-ui.js') return file(response, 'finance-site/portfolio-ui.js', 'text/javascript; charset=utf-8');
  if (url.pathname === '/api/account-state') {
    if (mode === 'fail') return json(response, 503, { message: 'account unavailable' });
    return json(response, 200, {
      reconciliation: { through_date: '2026-08-16', observed_at: '2026-08-16T02:29:00.000Z', cash_value: 20725.50 },
      holdings: { market_value: 109698.70, complete: true, missing_tickers: [] },
      cash: { value: 20725.50, known_value: 20725.50, status: 'reconciled', replayed_facts: 0, problems: [] },
      other_assets: { value: 0, known_value: 0, status: 'clear', problems: [] },
      total_assets: 130424.20,
      total_status: 'reconciled',
    });
  }
  if (url.pathname === '/api/trades') {
    if (mode === 'fail') return json(response, 503, { message: 'trades unavailable' });
    assert.equal(url.searchParams.get('limit'), '5');
    return json(response, 200, { trades, nextCursor: null });
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
if (!address || typeof address === 'string') throw new Error('Portfolio UI fixture server did not bind');
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

  await send('Page.navigate', { url: `${baseUrl}/?mode=normal` });
  await waitFor(`document.readyState === 'complete' && Boolean(document.querySelector('[data-app]'))`, 'Portfolio UI fixture');
  await delay(150);
  assert.equal(requests.filter((item) => item.pathname.startsWith('/api/')).length, 0, 'Portfolio UI must not read private account data while the app is hidden');
  assert.equal(await evaluate(`window.fetch === window.__fetchBeforePortfolio`), true, 'Portfolio UI must not monkey-patch global fetch');

  await evaluate(`(() => { const app=document.querySelector('[data-app]'); const dashboard=document.querySelector('[data-dashboard]'); dashboard.setAttribute('aria-busy','true'); app.hidden=false; })()`);
  await delay(80);
  assert.equal(requests.filter((item) => item.pathname.startsWith('/api/')).length, 0, 'Portfolio UI must wait for the main dashboard load boundary');
  await evaluate(`document.querySelector('[data-dashboard]').setAttribute('aria-busy','false')`);
  await waitFor(`document.querySelector('[data-account-breakdown]') && document.querySelectorAll('[data-overview-trades] .portfolio-overview-trade').length === 2`, 'Portfolio overview data');

  const overview = await evaluate(`({
    total: document.querySelector('[data-total-value]')?.textContent,
    status: document.querySelector('[data-market-freshness]')?.textContent,
    breakdown: document.querySelector('[data-account-breakdown]')?.textContent,
    firstTrade: document.querySelector('[data-overview-trades] .portfolio-overview-trade strong')?.textContent,
    historyState: document.querySelector('[data-net-worth-state]')?.textContent,
    historyEmpty: document.querySelector('[data-net-worth-empty]')?.textContent,
  })`);
  assert.match(overview.total ?? '', /130,424\.20/);
  assert.match(overview.status ?? '', /已对账.*2026-08-16/);
  assert.match(overview.breakdown ?? '', /证券市值.*109,698\.70.*Broker Cash.*20,725\.50/s);
  assert.match(overview.firstTrade ?? '', /买入.*100.*40\.23/);
  assert.equal(overview.historyState, '3 个完整月末历史估值');
  assert.match(overview.historyEmpty ?? '', /canonical raw close/);

  // Asset view copy remains derived-history language after the legacy app rewrites its state text.
  await evaluate(`(() => { document.querySelector('[data-net-worth-state]').textContent='4 个已核验周末快照'; document.querySelector('[data-asset-view="month"]').classList.remove('is-active'); document.querySelector('[data-asset-view="week"]').classList.add('is-active'); document.querySelector('[data-asset-view="week"]').click(); })()`);
  await waitFor(`document.querySelector('[data-net-worth-state]')?.textContent === '4 个完整周末历史估值'`, 'Portfolio historical valuation copy');

  await evaluate(`document.querySelector('[data-app]').hidden=true`);
  await waitFor(`!document.querySelector('[data-account-breakdown]')`, 'Portfolio session reset');

  await send('Page.navigate', { url: `${baseUrl}/?mode=fail` });
  await waitFor(`document.readyState === 'complete' && Boolean(document.querySelector('[data-app]'))`, 'Portfolio failure fixture');
  await evaluate(`document.querySelector('[data-app]').hidden=false`);
  await waitFor(`document.querySelector('[data-market-freshness]')?.textContent.includes('暂时无法读取')`, 'Portfolio failure state');
  assert.equal(await evaluate(`document.querySelector('[data-total-value]')?.textContent`), '待核验');
  assert.equal(await evaluate(`Boolean(document.querySelector('[data-account-breakdown]'))`), false);

  assert.deepEqual(diagnostics.consoleProblems, []);
  assert.deepEqual(diagnostics.exceptions, []);
  console.log('Finance portfolio overview browser regression passed.');
} finally {
  cdp?.close();
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
