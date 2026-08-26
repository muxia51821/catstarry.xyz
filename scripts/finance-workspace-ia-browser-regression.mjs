import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { connectCdp } from './lib/cdp-session.mjs';
import { launchIsolatedBrowser } from './lib/isolated-browser.mjs';

const html = `<!doctype html><html lang="zh-CN"><head>
<meta charset="utf-8"><meta name="finance-api-base" content="">
<link rel="stylesheet" href="/portfolio.css">
</head><body>
<div data-app hidden>
  <main data-dashboard aria-busy="false">
    <div class="dashboard-grid">
      <section class="panel panel--action" data-pane="review" aria-labelledby="review-title"><h2 id="review-title">复盘与风险</h2></section>
      <section class="panel panel--span-2" data-pane="review" aria-labelledby="risk-signals-title"><h2 id="risk-signals-title">自动风险信号</h2></section>
      <section class="panel panel--action" data-pane="review" aria-labelledby="confirm-title"><h2 id="confirm-title">共同确认</h2></section>
      <section class="panel panel--span-2" data-pane="review" aria-labelledby="memo-title"><header class="panel-header"><h2 id="memo-title">投资备忘录</h2></header></section>
      <details class="panel panel--span-2 rules-disclosure" data-pane="review"><summary>规则</summary></details>

      <section class="panel" data-pane="planning" aria-labelledby="monthly-title"><p class="panel-copy">旧月度文案</p><h2 id="monthly-title">月度总结</h2></section>
      <section class="panel" data-pane="planning" aria-labelledby="plan-title"><h2 id="plan-title">计划参数</h2></section>
      <section class="panel panel--span-2" data-pane="planning" aria-labelledby="cash-flows-title"><h2 id="cash-flows-title">现金流</h2></section>
      <section class="panel panel--span-2" data-pane="planning" aria-labelledby="account-events-title"><h2 id="account-events-title">账户事件</h2><table><thead><tr><th>日期</th><th>类型</th></tr></thead><tbody></tbody></table></section>
      <section class="panel panel--span-2" data-pane="planning" aria-labelledby="asset-snapshots-title">
        <header class="panel-header"><div><p class="eyebrow">ASSET SNAPSHOT</p><h2 id="asset-snapshots-title">资产快照</h2></div><button data-open-asset-snapshot>记录资产快照</button></header>
        <table><thead><tr><th>快照日期</th><th>总资产</th></tr></thead><tbody data-asset-snapshots-body></tbody></table>
        <p data-asset-snapshots-empty>还没有资产快照。</p><p data-asset-snapshots-error>错误</p>
      </section>
    </div>
  </main>
</div>

<dialog data-monthly-dialog><form><p class="dialog-intro">旧月度弹窗文案</p></form></dialog>
<dialog data-account-event-dialog><form data-account-event-form><p class="dialog-intro">旧事件文案</p><label>日期<input name="event_date"></label><label>数量<input name="quantity"></label></form></dialog>
<dialog data-asset-snapshot-dialog><form data-asset-snapshot-form>
  <p class="eyebrow">ASSET SNAPSHOT</p><h2>记录资产快照</h2><p class="dialog-intro">旧快照文案</p>
  <label>快照时间<input name="snapshot_at"></label>
  <label>数据来源<input name="source"></label>
  <label>已核验持仓市值<input name="holdings_value"></label>
  <label>现金余额<input name="cash_value"></label>
  <label><input name="is_complete" type="checkbox"><span>数据完整，可进入资产曲线</span></label>
  <label>不完整原因<textarea name="incomplete_reason"></textarea></label>
  <button type="submit">保存资产快照</button>
</form></dialog>
<script src="/finance-shared.js" defer></script>
<script src="/portfolio-ui.js" defer></script>
</body></html>`;

const server = createServer(async (request, response) => {
  const path = new URL(request.url, 'http://local.test').pathname;
  if (path === '/' || path === '/index.html') {
    response.setHeader('Content-Type', 'text/html; charset=utf-8'); response.end(html); return;
  }
  if (path === '/portfolio.css') {
    response.setHeader('Content-Type', 'text/css; charset=utf-8'); response.end(await readFile('finance-site/portfolio.css')); return;
  }
  if (path === '/finance-shared.js') {
    response.setHeader('Content-Type', 'text/javascript; charset=utf-8'); response.end(await readFile('finance-site/finance-shared.js')); return;
  }
  if (path === '/portfolio-ui.js') {
    response.setHeader('Content-Type', 'text/javascript; charset=utf-8'); response.end(await readFile('finance-site/portfolio-ui.js')); return;
  }
  response.statusCode = 404; response.end();
});
await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
const address = server.address();
if (!address || typeof address === 'string') throw new Error('Workspace IA fixture did not bind');

let browser;
let cdp;
try {
  browser = await launchIsolatedBrowser();
  cdp = await connectCdp(browser.target);
  const { send, evaluate, waitFor } = cdp;
  await send('Runtime.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: `http://127.0.0.1:${address.port}/` });
  await waitFor(`document.readyState === 'complete' && Boolean(document.querySelector('[name="other_assets_value"]'))`, 'Workspace IA normalization');

  const desktop = await evaluate(`(() => {
    const memo=document.querySelector('[aria-labelledby="memo-title"]');
    const review=document.querySelector('[aria-labelledby="review-title"]');
    const confirm=document.querySelector('[aria-labelledby="confirm-title"]');
    const cash=document.querySelector('[aria-labelledby="cash-flows-title"]');
    const events=document.querySelector('[aria-labelledby="account-events-title"]');
    const reconciliation=document.querySelector('[aria-labelledby="asset-snapshots-title"]');
    const form=document.querySelector('[data-asset-snapshot-form]');
    const other=form.elements.other_assets_value;
    const before=other.value;
    other.value='123'; form.reset();
    return {
      memoOrder:getComputedStyle(memo).order, reviewOrder:getComputedStyle(review).order, confirmOrder:getComputedStyle(confirm).order,
      memoColumn:getComputedStyle(memo).gridColumn, cashColumn:getComputedStyle(cash).gridColumn,
      eventsColumn:getComputedStyle(events).gridColumn, reconciliationColumn:getComputedStyle(reconciliation).gridColumn,
      memoNote:memo.textContent, monthly:document.querySelector('[aria-labelledby="monthly-title"] .panel-copy').textContent,
      reconciliationTitle:reconciliation.textContent, accountHeader:events.querySelector('th').textContent,
      accountDialog:document.querySelector('[data-account-event-dialog]').textContent,
      reconciliationDialog:document.querySelector('[data-asset-snapshot-dialog]').textContent,
      otherBefore:before, otherAfterReset:other.value,
      otherName:other.name, sourcePlaceholder:form.elements.source.placeholder,
    };
  })()`);
  assert.equal(desktop.memoOrder, '100');
  assert.ok(Number(desktop.memoOrder) < Number(desktop.reviewOrder));
  assert.ok(Number(desktop.memoOrder) < Number(desktop.confirmOrder));
  assert.equal(desktop.memoColumn, '1 / -1');
  assert.equal(desktop.cashColumn, '1 / -1');
  assert.equal(desktop.eventsColumn, '1 / -1');
  assert.equal(desktop.reconciliationColumn, '1 / -1');
  assert.match(desktop.memoNote, /独立的判断记录/);
  assert.match(desktop.monthly, /历史估值分别由各自的事实记录提供/);
  assert.match(desktop.reconciliationTitle, /资产对账/);
  assert.equal(desktop.accountHeader, '财务生效日');
  assert.match(desktop.accountDialog, /拆分前持仓/);
  assert.match(desktop.reconciliationDialog, /reconciliation anchor|账户观测完整/);
  assert.equal(desktop.otherName, 'other_assets_value');
  assert.equal(desktop.otherBefore, '0');
  assert.equal(desktop.otherAfterReset, '0', 'form.reset() must preserve the zero default for no open repo');
  assert.match(desktop.sourcePlaceholder, /券商账户截图/);

  await send('Emulation.setDeviceMetricsOverride', { width: 720, height: 900, deviceScaleFactor: 1, mobile: false });
  const mobile = await evaluate(`({ memo:getComputedStyle(document.querySelector('[aria-labelledby="memo-title"]')).gridColumn, plan:getComputedStyle(document.querySelector('[aria-labelledby="plan-title"]')).gridColumn })`);
  assert.equal(mobile.memo, '1 / -1');
  assert.equal(mobile.plan, '1 / -1');

  console.log('Finance Review/Planning workspace IA browser regression passed.');
} finally {
  cdp?.close();
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}

await import('./finance-wide-layout-browser-regression.mjs');
