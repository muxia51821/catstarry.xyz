import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { connectCdp, delay } from './lib/cdp-session.mjs';
import { launchIsolatedBrowser } from './lib/isolated-browser.mjs';

const requests = [];
let mode = 'normal';
const securities = [
  { ticker: '000021', instrument_type: 'stock', security_attribute: '消费电子', attribute_source: 'eastmoney' },
  { ticker: '300750', instrument_type: 'stock', security_attribute: '电池', attribute_source: 'eastmoney' },
];
const holdings = [
  { ticker: '000021', ticker_name: '深科技', quantity: 100, avg_cost: 39.97, price: 40.23, market_value: 4023, pnl: 26, pnl_ratio: 26 / 3997, position_category: '主动操作仓（A股）', stale: false },
  { ticker: '300750', ticker_name: '宁德时代', quantity: 100, avg_cost: 395, price: 393.93, market_value: 39393, pnl: -107, pnl_ratio: -107 / 39500, position_category: '主动操作仓（A股）', stale: false },
];
const trades = [
  { id: 2, trade_date: '2026-08-13', ticker: '000021', ticker_name: '深科技', direction: 'buy', quantity: 100, price: 40.23, position_category: '主动操作仓（A股）', security_attribute: '消费电子' },
  { id: 1, trade_date: '2026-08-07', ticker: '300750', ticker_name: '宁德时代', direction: 'buy', quantity: 100, price: 393.93, position_category: '主动操作仓（A股）', security_attribute: '电池' },
];

const html = `<!doctype html><html><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="finance-api-base" content="">
<style>:root{--line:#303846;--surface-strong:#121722;--text:#edf2f7;--muted:#a8b1c0;--tab-overview:#3556fd}.metric{padding:12px}.overview-trade{display:flex;justify-content:space-between}.panel{padding:12px}.table-scroll{overflow:auto}</style>
<link rel="stylesheet" href="/portfolio.css">
</head><body>
<div data-app hidden>
  <button data-refresh>刷新</button>
  <main data-dashboard aria-busy="false">
    <article class="metric"><span>总资产</span><strong data-total-value>—</strong><small data-market-freshness>等待账户状态</small></article>
    <section class="panel portfolio-allocation" data-portfolio-allocation><span data-portfolio-allocation-total>等待账户状态</span><div class="portfolio-allocation__body" data-portfolio-allocation-body hidden><div data-portfolio-allocation-plot></div><aside class="portfolio-allocation__detail"><h3 data-portfolio-allocation-detail-title>选择角色</h3><div data-portfolio-allocation-detail></div></aside><div class="portfolio-role-composition"><table><tbody data-portfolio-role-composition-body></tbody></table></div></div><p data-portfolio-allocation-unavailable>总资产待核验，暂不展示资产配置比例。</p></section>
    <button data-asset-view="month" class="is-active">月</button><button data-asset-view="week">周</button>
    <span data-net-worth-state>3 个已核验月末快照</span>
    <p data-net-worth-empty>旧快照文案</p>
    <div data-overview-trades></div><p data-overview-trades-empty>empty</p>

    <section class="panel"><div class="table-scroll"><table><thead><tr><th>标的</th><th>数量</th><th>成本</th><th>现价</th><th>市值</th><th>盈亏</th></tr></thead><tbody data-holdings-body></tbody></table></div><p data-holdings-empty hidden></p></section>
    <section class="panel">
      <form data-trade-filters><label>开始<input name="start"></label><label>结束<input name="end"></label><label>标的<input name="ticker"></label><label>方向<select name="direction"><option value="">全部</option><option value="buy">买入</option></select></label><button type="submit">筛选</button><button type="reset">清除</button></form>
      <div class="table-scroll"><table><thead><tr><th>日期</th><th>标的</th><th>方向</th><th>数量</th><th>价格</th><th>类别</th><th>操作理由</th><th>操作</th></tr></thead><tbody data-trades-body>
        <tr><td>2026-08-13</td><td>深科技</td><td>买入</td><td>100</td><td>¥40.23</td><td>主动操作仓</td><td>—</td><td>—</td></tr>
        <tr><td>2026-08-07</td><td>宁德时代</td><td>买入</td><td>100</td><td>¥393.93</td><td>主动操作仓</td><td>—</td><td>—</td></tr>
      </tbody></table></div>
    </section>
  </main>
</div>
<script>
window.__fetchBeforePortfolio = window.fetch;
window.__tradeFilterSubmission = '';
document.querySelector('[data-trade-filters]').addEventListener('submit', (event) => { event.preventDefault(); window.__tradeFilterSubmission = new URLSearchParams(new FormData(event.currentTarget)).toString(); });
</script>
<script src="/finance-shared.js" defer></script>
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
  if (url.pathname === '/finance-shared.js') return file(response, 'finance-site/finance-shared.js', 'text/javascript; charset=utf-8');
  if (url.pathname === '/portfolio-ui.js') return file(response, 'finance-site/portfolio-ui.js', 'text/javascript; charset=utf-8');
  if (url.pathname === '/api/account-state') {
    if (mode === 'fail') return json(response, 503, { message: 'account unavailable' });
    return json(response, 200, {
      reconciliation: { through_date: '2026-08-16', observed_at: '2026-08-16T02:29:00.000Z', cash_value: 20725.50 },
      holdings: { market_value: 109698.70, complete: true, missing_tickers: [], items: [
        { ticker: '000021', position_category: '主动操作仓（A股）', market_value: 4023 },
        { ticker: '300750', position_category: '主动操作仓（A股）', market_value: 39393 },
      ] },
      cash: { value: 20725.50, known_value: 20725.50, status: 'reconciled', replayed_facts: 0, problems: [] },
      other_assets: { value: 0, known_value: 0, status: 'clear', problems: [] },
      total_assets: 130424.20,
      total_status: 'reconciled',
      performance: { status: 'available', total_contributions: 125000, pnl: 5424.20 },
      portfolio_roles: {
        total_assets: 130424.20,
        total_status: 'reconciled',
        percentage_available: true,
        roles: [
          { role: '主动操作仓（A股）', value: 43416, percentage: 43416 / 130424.20, sources: ['security_holding'] },
          { role: '机动仓', value: 20725.50, percentage: 20725.50 / 130424.20, sources: ['broker_cash'] },
        ],
        composition: [
          { role: '主动操作仓', value: 43416, percentage: 43416 / 130424.20, sources: ['security_holding'], raw_roles: ['主动操作仓（A股）'], target_ratio: .4, lower_ratio: .35, upper_ratio: .45, deviation: 43416 / 130424.20 - .4 },
          { role: '机动仓', value: 20725.50, percentage: 20725.50 / 130424.20, sources: ['broker_cash'], raw_roles: [], target_ratio: .15, lower_ratio: .1, upper_ratio: .2, deviation: 20725.50 / 130424.20 - .15 },
          { role: 'A股宽基指数', value: 0, percentage: 0, sources: [], raw_roles: [], target_ratio: .15, lower_ratio: .1, upper_ratio: .2, deviation: -.15 },
        ],
        unclassified: [],
      },
    });
  }
  if (url.pathname === '/api/holdings') {
    if (mode === 'fail') return json(response, 503, { message: 'holdings unavailable' });
    return json(response, 200, { holdings, total_market_value: 43416 });
  }
  if (url.pathname === '/api/securities') {
    if (mode === 'fail') return json(response, 503, { message: 'securities unavailable' });
    return json(response, 200, { securities, count: securities.length });
  }
  if (url.pathname === '/api/trades') {
    if (mode === 'fail') return json(response, 503, { message: 'trades unavailable' });
    assert.equal(url.searchParams.get('limit'), '50');
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
  await waitFor(`document.querySelector('[data-account-breakdown]') && document.querySelectorAll('[data-overview-trades] .portfolio-overview-trade').length === 2 && document.querySelectorAll('[data-holdings-body] tr').length === 2 && document.querySelector('[data-security-attribute-column]')`, 'Portfolio overview and classification data');

  const overview = await evaluate(`({
    total: document.querySelector('[data-total-value]')?.textContent,
    status: document.querySelector('[data-market-freshness]')?.textContent,
    breakdown: document.querySelector('[data-account-breakdown]')?.textContent,
    firstTrade: document.querySelector('[data-overview-trades] .portfolio-overview-trade strong')?.textContent,
    historyState: document.querySelector('[data-net-worth-state]')?.textContent,
    historyEmpty: document.querySelector('[data-net-worth-empty]')?.textContent,
    holdingHeaders: [...document.querySelectorAll('[data-holdings-body]')][0].closest('table').querySelector('thead tr').textContent,
    holdingFirst: document.querySelector('[data-holdings-body] tr')?.textContent,
    tradeHeaders: document.querySelector('[data-trades-body]').closest('table').querySelector('thead tr').textContent,
    tradeFirst: document.querySelector('[data-trades-body] tr')?.textContent,
    roleColor: getComputedStyle(document.querySelector('.portfolio-role-badge')).getPropertyValue('--portfolio-role-color').trim(),
    securityStyle: getComputedStyle(document.querySelector('.portfolio-security-attribute')).backgroundColor,
    allocationTotal: document.querySelector('[data-portfolio-allocation-total]')?.textContent,
    allocationCells: [...document.querySelectorAll('.portfolio-allocation__cell')].map((cell) => {
      const rect = cell.querySelector('rect');
      return { key: cell.dataset.key, share: rect?.dataset.share, x: rect?.getAttribute('x'), y: rect?.getAttribute('y') };
    }),
    allocationDetail: document.querySelector('[data-portfolio-allocation-detail]')?.textContent,
    composition: document.querySelector('[data-portfolio-role-composition-body]')?.textContent,
  })`);
  assert.match(overview.total ?? '', /130,424\.20/);
  assert.match(overview.status ?? '', /已对账.*2026-08-16/);
  assert.match(overview.breakdown ?? '', /证券市值.*109,698\.70.*Broker Cash.*20,725\.50.*累计投入.*125,000\.00.*累计盈亏.*5,424\.20/s);
  assert.match(overview.firstTrade ?? '', /买入.*100.*40\.23/);
  assert.equal(overview.historyState, '3 个完整月末历史估值');
  assert.match(overview.historyEmpty ?? '', /canonical raw close/);
  assert.match(overview.holdingHeaders ?? '', /标的组合角色证券属性数量成本现价市值总资产占比盈亏盈亏%/);
  assert.match(overview.holdingFirst ?? '', /深科技.*主动操作仓.*消费电子.*3\.1%.*¥26\.00.*0\.7%/s);
  assert.match(overview.tradeHeaders ?? '', /类别|组合角色/);
  assert.match(overview.tradeHeaders ?? '', /证券属性/);
  assert.match(overview.tradeFirst ?? '', /消费电子/);
  assert.equal(overview.roleColor, '#6685ff', 'Portfolio Role must retain its stable category color');
  assert.ok(overview.securityStyle, 'Security Attribute is rendered as a neutral badge, not a second taxonomy color system');
  assert.match(overview.allocationTotal ?? '', /130,424\.20/);
  assert.equal(overview.allocationCells.length, 3, `Allocation Map cells: ${JSON.stringify(overview.allocationCells)}`);
  assert.deepEqual(overview.allocationCells.map((cell) => cell.key), ['unclassified', '主动操作仓', '机动仓']);
  assert.ok(Math.abs(overview.allocationCells.reduce((sum, cell) => sum + Number(cell.share), 0) - 100) < .01, 'Treemap cells must account for the authoritative total, including unclassified assets');
  assert.equal(overview.allocationCells[1].x, overview.allocationCells[2].x, 'Secondary treemap cells share a column instead of forming visual stripes');
  assert.notEqual(overview.allocationCells[1].y, overview.allocationCells[2].y, 'Secondary treemap cells must stack within that column');
  assert.match(overview.allocationDetail ?? '', /未投影账户资产/);
  assert.match(overview.composition ?? '', /未投影账户资产.*66,282\.70.*50\.8%/s);
  assert.match(overview.composition ?? '', /A股主动仓.*43,416\.00.*33\.3%.*40\.0%.*-6\.7pp/s);

  await evaluate(`document.querySelector('.portfolio-allocation__cell[data-key="主动操作仓"]').dispatchEvent(new MouseEvent('click', { bubbles: true }))`);
  await waitFor(`document.querySelector('[data-portfolio-allocation-detail-title]')?.textContent === 'A股主动仓'`, 'Portfolio security composition selection');
  assert.match(await evaluate(`document.querySelector('[data-portfolio-allocation-detail]')?.textContent ?? ''`), /深科技.*000021.*宁德时代.*300750/s);

  await evaluate(`document.querySelector('.portfolio-allocation__cell[data-key="机动仓"]').dispatchEvent(new MouseEvent('click', { bubbles: true }))`);
  await waitFor(`document.querySelector('[data-portfolio-allocation-detail-title]')?.textContent === '机动仓'`, 'Portfolio allocation role selection');
  assert.match(await evaluate(`document.querySelector('[data-portfolio-allocation-detail]')?.textContent ?? ''`), /Broker Cash.*—/s);

  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  const mobileAllocation = await evaluate(`(() => {
    const plot = document.querySelector('[data-portfolio-allocation-plot]');
    const detail = document.querySelector('.portfolio-allocation__detail');
    return {
      plotWidth: Math.ceil(plot.getBoundingClientRect().width),
      viewportWidth: window.innerWidth,
      layout: getComputedStyle(document.querySelector('.portfolio-allocation__body')).gridTemplateColumns,
      detailBorder: getComputedStyle(detail).borderTopWidth,
    };
  })()`);
  assert.ok(mobileAllocation.plotWidth <= mobileAllocation.viewportWidth, `Allocation Map must fit mobile viewport: ${JSON.stringify(mobileAllocation)}`);
  assert.equal(mobileAllocation.layout.split(' ').length, 1, `Allocation detail must stack on mobile: ${JSON.stringify(mobileAllocation)}`);
  assert.equal(mobileAllocation.detailBorder, '1px');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

  // Holdings filtering operates over the complete current holdings set owned by the portfolio composition module.
  await evaluate(`(() => { const select=document.querySelector('[name="portfolio_holding_attribute"]'); select.value='电池'; select.dispatchEvent(new Event('change', { bubbles:true })); })()`);
  await waitFor(`document.querySelectorAll('[data-holdings-body] tr').length === 1 && document.querySelector('[data-holdings-body]')?.textContent.includes('宁德时代')`, 'Holdings security attribute filter');

  // Trade filters are inserted into the existing FormData contract; the main app/server remains responsible for filtering/pagination.
  const submitted = await evaluate(`(() => { const role=document.querySelector('[name="position_category"]'); const attribute=document.querySelector('[name="security_attribute"]'); role.value='主动操作仓（A股）'; attribute.value='消费电子'; document.querySelector('[data-trade-filters]').requestSubmit(); return window.__tradeFilterSubmission; })()`);
  assert.match(submitted, /position_category=/);
  assert.match(submitted, /security_attribute=/);
  assert.match(decodeURIComponent(submitted), /主动操作仓（A股）/);
  assert.match(decodeURIComponent(submitted), /消费电子/);

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
  assert.equal(await evaluate(`document.querySelector('[data-portfolio-allocation-body]').hidden`), true);

  assert.deepEqual(diagnostics.consoleProblems, []);
  assert.deepEqual(diagnostics.exceptions, []);
  console.log('Finance portfolio overview and classification browser regression passed.');
} finally {
  cdp?.close();
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
