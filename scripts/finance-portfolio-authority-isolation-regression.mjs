import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { connectCdp, delay } from './lib/cdp-session.mjs';
import { launchIsolatedBrowser } from './lib/isolated-browser.mjs';

const requests = [];
let mode = 'auxfail';
const holdings = [
  { ticker: '000021', ticker_name: '深科技', quantity: 100, avg_cost: 39.97, price: 40.23, market_value: 4023, pnl: 26, position_category: '主动操作仓（A股）', stale: false },
];
const securities = [
  { ticker: '000021', instrument_type: 'stock', security_attribute: '消费电子', attribute_source: 'eastmoney' },
];
const trade = { id: 1, trade_date: '2026-08-13', ticker: '000021', ticker_name: '深科技', direction: 'buy', quantity: 100, price: 40.23, position_category: '主动操作仓（A股）', security_attribute: '消费电子' };

const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="finance-api-base" content=""></head><body>
<div data-app hidden>
  <button data-refresh>刷新</button>
  <main data-dashboard aria-busy="false">
    <article class="metric"><span>总资产</span><strong data-total-value>—</strong><small data-market-freshness>等待账户状态</small></article>
    <span data-net-worth-state>3 个已核验月末快照</span><p data-net-worth-empty>旧快照文案</p>
    <div data-overview-trades></div><p data-overview-trades-empty hidden></p>
    <section class="panel"><div class="table-scroll"><table><thead><tr><th>标的</th><th>数量</th><th>成本</th><th>现价</th><th>市值</th><th>盈亏</th></tr></thead><tbody data-holdings-body></tbody></table></div><p data-holdings-empty hidden></p></section>
    <section class="panel"><form data-trade-filters><label>开始<input name="start"></label><label>结束<input name="end"></label><label>标的<input name="ticker"></label><label>方向<select name="direction"><option value="">全部</option></select></label><button type="submit">筛选</button></form><div class="table-scroll"><table><thead><tr><th>日期</th><th>标的</th><th>方向</th><th>数量</th><th>价格</th><th>类别</th><th>理由</th><th>操作</th></tr></thead><tbody data-trades-body></tbody></table></div></section>
  </main>
</div>
<script src="/portfolio-ui.js" defer></script>
</body></html>`;

const server = createServer(async (request, response) => {
  const url = new URL(request.url, 'http://local.test');
  requests.push({ pathname: url.pathname, search: url.search, mode });
  if (url.pathname === '/' || url.pathname === '/index.html') {
    mode = url.searchParams.get('mode') || 'auxfail';
    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    response.end(html);
    return;
  }
  if (url.pathname === '/portfolio-ui.js') {
    response.setHeader('Content-Type', 'text/javascript; charset=utf-8');
    response.end(await readFile('finance-site/portfolio-ui.js'));
    return;
  }
  if (url.pathname === '/api/account-state') {
    if (mode === 'accountfail') return json(response, 503, { message: 'account unavailable' });
    return json(response, 200, {
      reconciliation: { through_date: '2026-08-16', observed_at: '2026-08-16T02:29:00.000Z' },
      holdings: { market_value: 109698.70, complete: true, missing_tickers: [], stale_tickers: [], problems: [] },
      cash: { value: 20725.50, known_value: 20725.50, status: 'reconciled', replayed_facts: 0, problems: [] },
      other_assets: { value: 0, known_value: 0, status: 'clear', problems: [] },
      total_assets: 130424.20,
      total_status: 'reconciled',
    });
  }
  if (url.pathname === '/api/holdings') {
    if (mode === 'auxfail') return json(response, 503, { message: 'holdings unavailable' });
    return json(response, 200, { holdings, total_market_value: 4023 });
  }
  if (url.pathname === '/api/securities') {
    if (mode === 'auxfail') return json(response, 503, { message: 'securities unavailable' });
    return json(response, 200, { securities });
  }
  if (url.pathname === '/api/trades') {
    if (mode === 'auxfail') return json(response, 503, { message: 'trades unavailable' });
    if (mode === 'overflow') {
      const pageTrades = Array.from({ length: 50 }, (_, index) => ({ ...trade, id: index + 1 }));
      return json(response, 200, { trades: pageTrades, nextCursor: `cursor-${requests.filter((item) => item.mode === 'overflow' && item.pathname === '/api/trades').length}` });
    }
    return json(response, 200, { trades: [trade], nextCursor: null });
  }
  if (url.pathname === '/api/assets/snapshots') {
    if (mode === 'auxfail') return json(response, 503, { message: 'reconciliation unavailable' });
    return json(response, 200, { snapshots: [] });
  }
  response.statusCode = 404;
  response.end();
});

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
if (!address || typeof address === 'string') throw new Error('Portfolio authority fixture server did not bind');
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

  // Auxiliary failures must not revoke the authoritative Total Assets surface.
  await send('Page.navigate', { url: `${baseUrl}/?mode=auxfail` });
  await waitFor(`document.readyState === 'complete' && Boolean(document.querySelector('[data-app]'))`, 'auxiliary failure fixture');
  await evaluate(`document.querySelector('[data-app]').hidden=false`);
  await waitFor(`document.querySelector('[data-total-value]')?.textContent.includes('130,424.20')`, 'authoritative total survives auxiliary failures');
  assert.match(await evaluate(`document.querySelector('[data-market-freshness]')?.textContent ?? ''`), /已对账.*2026-08-16/);

  // The deterministic 20 x 50 trade-catalog ceiling is a decoration failure only.
  await send('Page.navigate', { url: `${baseUrl}/?mode=overflow` });
  await waitFor(`document.readyState === 'complete' && Boolean(document.querySelector('[data-app]'))`, 'trade overflow fixture');
  await evaluate(`document.querySelector('[data-app]').hidden=false`);
  await waitFor(`document.querySelector('[data-total-value]')?.textContent.includes('130,424.20')`, 'total renders before trade catalog completes');
  for (let attempt = 0; attempt < 80 && requests.filter((item) => item.mode === 'overflow' && item.pathname === '/api/trades').length < 20; attempt += 1) await delay(25);
  assert.equal(requests.filter((item) => item.mode === 'overflow' && item.pathname === '/api/trades').length, 20, 'trade catalog still enforces its existing 1000-row safety ceiling');
  assert.match(await evaluate(`document.querySelector('[data-total-value]')?.textContent ?? ''`), /130,424\.20/);

  // Account-state failure revokes only the authoritative total; auxiliary holdings still enhance locally.
  await send('Page.navigate', { url: `${baseUrl}/?mode=accountfail` });
  await waitFor(`document.readyState === 'complete' && Boolean(document.querySelector('[data-app]'))`, 'account failure fixture');
  await evaluate(`document.querySelector('[data-app]').hidden=false`);
  await waitFor(`document.querySelector('[data-total-value]')?.textContent === '待核验'`, 'account authority failure state');
  await waitFor(`document.querySelector('[data-holdings-body]')?.textContent.includes('深科技')`, 'auxiliary holdings continue independently');
  assert.match(await evaluate(`document.querySelector('[data-market-freshness]')?.textContent ?? ''`), /account unavailable/);

  assert.deepEqual(diagnostics.consoleProblems, []);
  assert.deepEqual(diagnostics.exceptions, []);
  console.log('Finance Portfolio authoritative Total Assets failure isolation regression passed.');
} finally {
  cdp?.close();
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
