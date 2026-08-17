import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { connectCdp } from './lib/cdp-session.mjs';
import { launchIsolatedBrowser } from './lib/isolated-browser.mjs';

const html = `<!doctype html><html lang="zh-CN"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/portfolio.css">
</head><body>
<div class="app-shell">
  <header class="app-header"><div><p class="eyebrow">PRIVATE LEDGER</p><h1>投资工作台</h1><p class="header-copy">先录入今天的操作，再核对持仓变化和风险。</p></div><div class="session-tools"><button>刷新</button></div></header>
  <nav class="finance-tabs" aria-label="Finance 工作区">
    <button class="finance-tab is-active" data-tab="overview">总览</button>
    <button class="finance-tab" data-tab="entry">交易记录</button>
    <button class="finance-tab" data-tab="holdings">持仓</button>
    <button class="finance-tab" data-tab="review">复盘与风险</button>
    <button class="finance-tab" data-tab="planning">资金与计划</button>
    <button class="finance-tab" data-tab="records">管理记录</button>
  </nav>
  <section class="overview-grid">
    <section class="panel panel--span-2" data-wide-chart><h2>总资产</h2><div style="height:180px"></div></section>
    <section class="panel panel--span-3" data-wide-recent><h2>最近交易</h2><div style="height:180px"></div></section>
  </section>
</div>
</body></html>`;

const server = createServer(async (request, response) => {
  const pathname = new URL(request.url, 'http://local.test').pathname;
  if (pathname === '/' || pathname === '/index.html') {
    response.setHeader('Content-Type', 'text/html; charset=utf-8'); response.end(html); return;
  }
  if (pathname === '/styles.css') {
    response.setHeader('Content-Type', 'text/css; charset=utf-8'); response.end(await readFile('finance-site/styles.css')); return;
  }
  if (pathname === '/portfolio.css') {
    response.setHeader('Content-Type', 'text/css; charset=utf-8'); response.end(await readFile('finance-site/portfolio.css')); return;
  }
  response.statusCode = 404; response.end();
});
await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
const address = server.address();
if (!address || typeof address === 'string') throw new Error('Wide-layout fixture did not bind');

let browser;
let cdp;
try {
  browser = await launchIsolatedBrowser();
  cdp = await connectCdp(browser.target);
  const { send, evaluate, waitFor } = cdp;
  await send('Runtime.enable'); await send('Page.enable');
  await send('Page.navigate', { url: `http://127.0.0.1:${address.port}/` });
  await waitFor(`document.readyState === 'complete'`, 'wide-layout fixture');

  async function measure(width) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: false });
    return evaluate(`(() => {
      const shell=document.querySelector('.app-shell').getBoundingClientRect();
      const title=document.querySelector('.app-header h1');
      const tabs=document.querySelector('.finance-tabs');
      const tabWidths=[...document.querySelectorAll('.finance-tab')].map((node)=>node.getBoundingClientRect().width);
      const chart=document.querySelector('[data-wide-chart]').getBoundingClientRect();
      const recent=document.querySelector('[data-wide-recent]').getBoundingClientRect();
      return {
        viewport: innerWidth,
        shell:{x:shell.x,width:shell.width,right:shell.right},
        titleSize:parseFloat(getComputedStyle(title).fontSize),
        tabWidths,
        tabs:{clientWidth:tabs.clientWidth,scrollWidth:tabs.scrollWidth,overflowX:getComputedStyle(tabs).overflowX},
        chart:{x:chart.x,y:chart.y,width:chart.width,bottom:chart.bottom},
        recent:{x:recent.x,y:recent.y,width:recent.width,bottom:recent.bottom},
      };
    })()`);
  }

  const at1440 = await measure(1440);
  assert.ok(at1440.shell.width >= 1439, `1440px desktop should use the viewport instead of an artificial narrow shell: ${at1440.shell.width}`);
  assert.ok(at1440.titleSize >= 59.5 && at1440.titleSize <= 60.5, `1440px title should establish the larger desktop hierarchy: ${at1440.titleSize}`);
  assert.ok(Math.max(...at1440.tabWidths) - Math.min(...at1440.tabWidths) <= 1.5, 'desktop tabs should share the row evenly');
  assert.ok(at1440.tabs.scrollWidth <= at1440.tabs.clientWidth + 1, 'desktop tabs should not require horizontal scrolling');
  assert.ok(at1440.recent.y >= at1440.chart.bottom - 1, '1440px keeps overview panels stacked for comfortable chart width');

  const at1920 = await measure(1920);
  assert.ok(at1920.shell.width >= 1919, `1920px desktop should use the full available canvas: ${at1920.shell.width}`);
  assert.ok(at1920.titleSize >= 68 && at1920.titleSize <= 70, `1920px title should scale without becoming oversized: ${at1920.titleSize}`);
  assert.ok(Math.max(...at1920.tabWidths) - Math.min(...at1920.tabWidths) <= 1.5, '1920px tabs should remain equal-width');
  assert.ok(Math.abs(at1920.chart.y - at1920.recent.y) <= 1, 'wide overview panels should share a row');
  const wideRatio = at1920.chart.width / at1920.recent.width;
  assert.ok(wideRatio > 1.85 && wideRatio < 2.15, `wide overview should use an 8/4 composition, received ${wideRatio}`);

  const at2560 = await measure(2560);
  assert.ok(at2560.shell.width >= 1919 && at2560.shell.width <= 1921, `ultrawide shell should stop near 1920px: ${at2560.shell.width}`);
  assert.ok(Math.abs(at2560.shell.x - 320) <= 1.5, `ultrawide shell should stay centered: ${at2560.shell.x}`);
  assert.ok(at2560.titleSize >= 71.5 && at2560.titleSize <= 72.5, `ultrawide title must cap at 72px: ${at2560.titleSize}`);

  const mobile = await measure(390);
  assert.ok(mobile.shell.width >= 389, 'mobile shell should continue to use the viewport');
  assert.equal(mobile.tabs.overflowX, 'auto');
  assert.ok(mobile.tabs.scrollWidth > mobile.tabs.clientWidth + 20, 'mobile tabs should preserve readable natural widths and horizontal scrolling');
  assert.ok(Math.max(...mobile.tabWidths) > Math.min(...mobile.tabWidths) + 4, 'mobile tabs should not be forced into equal narrow cells');
  assert.ok(mobile.titleSize <= 40, 'mobile title should keep the existing compact scale');

  console.log('Finance 1440/1920/2560/mobile wide-layout browser regression passed.');
} finally {
  cdp?.close();
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
