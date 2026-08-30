import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { connectCdp, delay } from './lib/cdp-session.mjs';
import { launchIsolatedBrowser } from './lib/isolated-browser.mjs';
import { startFinancePreview } from './finance-preview.mjs';

const preview = startFinancePreview(0);
if (!preview.listening) await once(preview, 'listening');
const address = preview.address();
if (!address || typeof address === 'string') throw new Error('Finance motion preview did not expose a TCP port');
const baseUrl = `http://127.0.0.1:${address.port}`;
const screenshotDir = process.env.FINANCE_MOTION_SCREENSHOT_DIR;
const diagnostics = { consoleProblems: [], exceptions: [], desktop: null, workspaces: [], responsive: [], mobile: null };

let browser;
try {
  browser = await launchIsolatedBrowser();
  const cdp = await connectCdp(browser.target, (message) => {
    if (message.method === 'Runtime.exceptionThrown') diagnostics.exceptions.push(message.params.exceptionDetails);
    if (message.method === 'Runtime.consoleAPICalled' && ['warning', 'error'].includes(message.params.type)) {
      diagnostics.consoleProblems.push(message.params.args.map((value) => value.value ?? value.description ?? value.type).join(' '));
    }
  });
  const { send, evaluate, waitFor } = cdp;
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: baseUrl });
  await waitFor(`document.readyState === 'complete' && Boolean(document.querySelector('[data-login-form]'))`, 'Finance motion login');
  await evaluate(`(() => {
    const form = document.querySelector('[data-login-form]');
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    set.call(form.elements.username, 'motion-admin');
    form.elements.username.dispatchEvent(new Event('input', { bubbles: true }));
    set.call(form.elements.password, 'local-motion-password');
    form.elements.password.dispatchEvent(new Event('input', { bubbles: true }));
    form.requestSubmit();
  })()`);
  await waitFor(`document.querySelector('[data-app]')?.hidden === false
    && document.querySelector('[data-dashboard]')?.getAttribute('aria-busy') === 'false'`, 'Finance motion dashboard');
  await waitFor(`document.querySelector('[data-cash-value]')?.textContent !== '—'
    && document.querySelector('[data-pnl-value]')?.textContent !== '—'`, 'Finance motion portfolio metrics');
  await delay(1400);

  diagnostics.desktop = await evaluate(`(() => {
    const round = (value) => Math.round(value * 10) / 10;
    const box = (node) => { const rect = node.getBoundingClientRect(); return { left: round(rect.left), top: round(rect.top), right: round(rect.right), bottom: round(rect.bottom), width: round(rect.width), height: round(rect.height) }; };
    const metrics = [...document.querySelectorAll('.summary-grid > .metric')];
    const metricBoxes = metrics.map(box);
    const sessionControls = [...document.querySelector('.session-tools').children].filter((node) => !node.hidden).map((node) => node.getBoundingClientRect());
    const recentRail = document.querySelector('[data-overview-trades]');
    const recentCard = recentRail.querySelector(':scope > *');
    const chart = document.querySelector('.net-worth-chart svg');
    const chartLine = chart?.querySelector('path:not(.net-worth-area)');
    const heroRange = document.createRange();
    heroRange.selectNodeContents(document.querySelector('.app-header h1'));
    const heroRows = [...heroRange.getClientRects()].sort((left, right) => left.top - right.top).reduce((rows, rect) => {
      const row = rows.find((candidate) => rect.top < candidate.bottom && rect.bottom > candidate.top);
      if (row) { row.top = Math.min(row.top, rect.top); row.bottom = Math.max(row.bottom, rect.bottom); }
      else rows.push({ top: rect.top, bottom: rect.bottom });
      return rows;
    }, []);
    return {
      gsapReady: typeof window.gsap?.timeline === 'function' && Boolean(window.ScrollTrigger),
      activeAnimations: window.gsap?.globalTimeline?.getChildren?.().length ?? 0,
      motionStylesheetLoaded: [...document.styleSheets].some((sheet) => sheet.href?.endsWith('/motion.css')),
      heroLines: heroRows.length,
      metrics: metricBoxes,
      summary: box(document.querySelector('.summary-grid')),
      gridColumns: getComputedStyle(document.querySelector('.summary-grid')).gridTemplateColumns.split(' ').length,
      cash: document.querySelector('[data-cash-value]').textContent,
      pnl: document.querySelector('[data-pnl-value]').textContent,
      font: getComputedStyle(document.documentElement).fontFamily,
      noHorizontalOverflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      carouselButtons: document.querySelectorAll('[data-carousel-controls] button').length,
      carouselStatus: document.querySelector('[data-carousel-status]')?.textContent ?? '',
      sessionControlsAligned: sessionControls.every((rect) => Math.abs((rect.top + rect.bottom) / 2 - (sessionControls[0].top + sessionControls[0].bottom) / 2) < 2),
      recentCardFillsRail: recentCard ? recentCard.getBoundingClientRect().width >= recentRail.clientWidth - 4 : true,
      chart: {
        gradients: chart?.querySelectorAll('linearGradient, radialGradient').length ?? 0,
        gridLines: chart?.querySelectorAll('[data-chart-grid]').length ?? 0,
        usesCurve: /[CQ]/.test(chartLine?.getAttribute('d') ?? ''),
        linecap: chartLine ? getComputedStyle(chartLine).strokeLinecap : '',
      },
    };
  })()`);

  if (screenshotDir) {
    await mkdir(screenshotDir, { recursive: true });
    const image = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    await writeFile(resolve(screenshotDir, 'finance-motion-desktop.png'), Buffer.from(image.data, 'base64'));
    await evaluate(`window.scrollTo(0, document.querySelector('.summary-grid').getBoundingClientRect().top + window.scrollY - 90)`);
    await delay(500);
    const dashboardImage = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    await writeFile(resolve(screenshotDir, 'finance-motion-dashboard.png'), Buffer.from(dashboardImage.data, 'base64'));
    await evaluate(`window.scrollTo(0, 0)`);
  }

  for (const tab of ['entry', 'holdings', 'review', 'planning', 'records', 'overview']) {
    await evaluate(`document.querySelector('[data-tab="${tab}"]').click()`);
    await delay(280);
    diagnostics.workspaces.push(await evaluate(`(() => {
      const active = document.querySelector('[data-tab].is-active')?.dataset.tab;
      const panes = [...document.querySelectorAll('[data-pane="${tab}"]')].filter((node) => !node.hidden);
      return {
        tab: '${tab}',
        active,
        paneCount: panes.length,
        panelsInsideViewport: panes.every((node) => { const rect = node.getBoundingClientRect(); return rect.left >= 0 && rect.right <= document.documentElement.clientWidth + 1; }),
        noHorizontalOverflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        activeBackground: getComputedStyle(document.querySelector('[data-tab].is-active')).backgroundColor,
      };
    })()`));
  }

  for (const width of [3440, 2560, 2000, 1920, 1600, 1440, 1366, 1101, 1100, 1024, 900, 899, 768, 681, 680, 430, 390, 360]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width <= 680 });
    await evaluate(`document.querySelector('[data-tab="overview"]').click()`);
    await delay(55);
    await evaluate(`window.gsap?.globalTimeline?.getChildren?.().forEach((animation) => animation.progress(1))`);
    await delay(10);
    const overviewGeometry = await evaluate(`(() => {
      const tolerance = 1.5;
      const box = (node) => { const rect = node.getBoundingClientRect(); return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height }; };
      const near = (left, right) => Math.abs(left - right) <= tolerance;
      const shell = box(document.querySelector('.app-shell'));
      const tabs = box(document.querySelector('.finance-tabs'));
      const summary = box(document.querySelector('.summary-grid'));
      const overview = box(document.querySelector('.overview-grid'));
      const footer = box(document.querySelector('.app-footer'));
      const heroCopy = box(document.querySelector('.hero-copy'));
      const sessionTools = box(document.querySelector('.session-tools'));
      const metricRects = [...document.querySelectorAll('.summary-grid > .metric:not(.metric--wide)')].map(box);
      const metricRows = metricRects.reduce((rows, rect) => {
        const row = rows.find((candidate) => near(candidate.top, rect.top));
        if (row) row.items.push(rect); else rows.push({ top: rect.top, items: [rect] });
        return rows;
      }, []);
      const chart = box(document.querySelector('[aria-labelledby="net-worth-title"]'));
      const trades = box(document.querySelector('[aria-labelledby="overview-trades-title"]'));
      const allocation = box(document.querySelector('[data-portfolio-allocation]'));
      const allocationPlot = box(document.querySelector('[data-portfolio-allocation-plot]'));
      const allocationSvg = box(document.querySelector('[data-portfolio-allocation-plot] svg'));
      const stackedOverview = window.innerWidth <= 1100;
      return {
        width: window.innerWidth,
        noHorizontalOverflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        shellCentered: near(shell.left, document.documentElement.clientWidth - shell.right),
        sharedOuterEdges: [summary, overview, footer].every((rect) => near(rect.left, tabs.left) && near(rect.right, tabs.right)),
        summaryColumns: getComputedStyle(document.querySelector('.summary-grid')).gridTemplateColumns.split(' ').length,
        metricRowsAligned: metricRows.every((row) => row.items.every((rect) => near(rect.bottom, row.items[0].bottom))),
        headerAligned: window.innerWidth <= 1100
          ? sessionTools.top >= heroCopy.bottom - tolerance && near(sessionTools.left, tabs.left)
          : sessionTools.left >= heroCopy.right - tolerance && sessionTools.right <= tabs.right + tolerance,
        overviewAligned: stackedOverview
          ? [chart, trades, allocation].every((rect) => near(rect.left, overview.left) && near(rect.right, overview.right))
          : near(chart.left, overview.left) && near(trades.right, overview.right) && near(chart.top, trades.top) && near(chart.bottom, trades.bottom) && near(allocation.left, overview.left) && near(allocation.right, overview.right),
        allocationEmptyBand: Math.max(0, allocationPlot.bottom - allocationSvg.bottom),
      };
    })()`);

    const workspaceGeometry = [];
    for (const tab of ['entry', 'holdings', 'review', 'planning', 'records']) {
      await evaluate(`document.querySelector('[data-tab="${tab}"]').click()`);
      await delay(55);
      await evaluate(`window.gsap?.globalTimeline?.getChildren?.().forEach((animation) => animation.progress(1))`);
      await delay(10);
      workspaceGeometry.push(await evaluate(`(() => {
        const tolerance = 1.5;
        const near = (left, right) => Math.abs(left - right) <= tolerance;
        const gridNode = document.querySelector('.dashboard-grid');
        const grid = gridNode.getBoundingClientRect();
        const panelNodes = [...document.querySelectorAll('.dashboard-grid > [data-pane="${tab}"]')].filter((node) => !node.hidden && node.getClientRects().length);
        const panels = panelNodes.map((node) => ({
          left: node.offsetLeft - gridNode.offsetLeft,
          right: node.offsetLeft - gridNode.offsetLeft + node.offsetWidth,
          width: node.offsetWidth,
          top: node.offsetTop - gridNode.offsetTop,
          bottom: node.offsetTop - gridNode.offsetTop + node.offsetHeight,
        }));
        const gap = 12;
        const third = (grid.width - gap * 2) / 3;
        const allowedLeft = [0, third + gap, (third + gap) * 2];
        const allowedWidths = [third, third * 2 + gap, grid.width];
        const usesFullWidth = window.innerWidth <= 1100;
        const panelAlignment = panels.map((rect) => usesFullWidth
          ? near(rect.left, 0) && near(rect.right, grid.width)
          : allowedLeft.some((value) => near(rect.left, value)) && allowedWidths.some((value) => near(rect.width, value)));
        const rows = panels.reduce((groups, rect) => {
          const row = groups.find((candidate) => near(candidate.top, rect.top));
          if (row) row.items.push(rect); else groups.push({ top: rect.top, items: [rect] });
          return groups;
        }, []);
        const rowsAligned = rows.every((row) => row.items.every((rect) => near(rect.bottom, row.items[0].bottom)));
        return {
          tab: '${tab}',
          panelCount: panels.length,
          aligned: panelAlignment.every(Boolean) && rowsAligned,
        };
      })()`));
    }
    diagnostics.responsive.push({ ...overviewGeometry, workspaces: workspaceGeometry });

    if (screenshotDir && [2560, 2000, 1440, 1024, 768, 390].includes(width)) {
      await evaluate(`document.querySelector('[data-tab="overview"]').click()`);
      await delay(180);
      await evaluate(`window.scrollTo(0, 0)`);
      const image = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      await writeFile(resolve(screenshotDir, `finance-motion-${width}.png`), Buffer.from(image.data, 'base64'));
      if ([2560, 1440, 1024].includes(width)) {
        await evaluate(`document.querySelector('[data-tab="planning"]').click()`);
        await delay(55);
        await evaluate(`window.gsap?.globalTimeline?.getChildren?.().forEach((animation) => animation.progress(1))`);
        await delay(20);
        await evaluate(`window.scrollTo(0, document.querySelector('.dashboard-grid').getBoundingClientRect().top + window.scrollY - 90)`);
        const planningImage = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
        await writeFile(resolve(screenshotDir, `finance-motion-planning-${width}.png`), Buffer.from(planningImage.data, 'base64'));
      }
    }
  }

  await send('Emulation.setDeviceMetricsOverride', { width: 430, height: 932, deviceScaleFactor: 1, mobile: true });
  await evaluate(`document.querySelector('[data-tab="overview"]').click()`);
  await delay(80);
  await delay(450);
  diagnostics.mobile = await evaluate(`(() => {
    const metrics = [...document.querySelectorAll('.summary-grid > .metric')].map((node) => node.getBoundingClientRect());
    const heroRange = document.createRange();
    heroRange.selectNodeContents(document.querySelector('.app-header h1'));
    const heroRows = [...heroRange.getClientRects()].sort((left, right) => left.top - right.top).reduce((rows, rect) => {
      const row = rows.find((candidate) => rect.top < candidate.bottom && rect.bottom > candidate.top);
      if (row) { row.top = Math.min(row.top, rect.top); row.bottom = Math.max(row.bottom, rect.bottom); }
      else rows.push({ top: rect.top, bottom: rect.bottom });
      return rows;
    }, []);
    return {
      columns: getComputedStyle(document.querySelector('.summary-grid')).gridTemplateColumns.split(' ').length,
      aligned: metrics.every((rect) => Math.abs(rect.left - metrics[0].left) < 1 && Math.abs(rect.width - metrics[0].width) < 1),
      ordered: metrics.every((rect, index) => index === 0 || rect.top > metrics[index - 1].top),
      noHorizontalOverflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      heroLines: heroRows.length,
      tabsScrollbarHidden: getComputedStyle(document.querySelector('.finance-tabs')).scrollbarWidth === 'none',
    };
  })()`);

  if (screenshotDir) {
    const image = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    await writeFile(resolve(screenshotDir, 'finance-motion-mobile.png'), Buffer.from(image.data, 'base64'));
  }

  const [total, market, risk, cash, pnl] = diagnostics.desktop.metrics;
  assert.equal(diagnostics.desktop.gsapReady, true, 'GSAP and ScrollTrigger must load locally');
  assert.ok(diagnostics.desktop.activeAnimations >= 3, 'the motion system must create active GSAP animations');
  assert.equal(diagnostics.desktop.motionStylesheetLoaded, true);
  assert.ok(diagnostics.desktop.heroLines <= 2, 'the editorial hero must remain within two lines');
  assert.equal(diagnostics.desktop.gridColumns, 12, 'desktop summary must use the 12-column dense grid');
  assert.equal(diagnostics.desktop.metrics.length, 5);
  assert.ok(Math.abs(total.top - market.top) < 2 && Math.abs(total.top - risk.top) < 2, 'top Bento row must align');
  assert.ok(cash.top > market.top && pnl.top > risk.top, 'cash and P&L must occupy the second Bento row');
  assert.ok(Math.abs(total.bottom - cash.bottom) < 2 && Math.abs(total.bottom - pnl.bottom) < 2, 'Bento rows must close without a bottom gap');
  assert.ok(Math.abs(total.right - market.left) < 16, 'Bento columns must remain contiguous');
  assert.ok(Math.abs(market.right - risk.left) < 16, 'top-right Bento cells must remain contiguous');
  assert.match(diagnostics.desktop.cash, /^¥/);
  assert.match(diagnostics.desktop.pnl, /^[+\-]?¥/);
  assert.match(diagnostics.desktop.font, /^Geist/);
  assert.equal(diagnostics.desktop.noHorizontalOverflow, true);
  assert.equal(diagnostics.desktop.carouselButtons, 0);
  assert.equal(diagnostics.desktop.carouselStatus, 'NEW / 1');
  assert.equal(diagnostics.desktop.sessionControlsAligned, true, 'desktop session controls must stay on one row');
  assert.equal(diagnostics.desktop.recentCardFillsRail, true, 'recent activity cards must fill the side rail');
  assert.equal(diagnostics.workspaces.every((workspace) => workspace.tab === workspace.active
    && workspace.paneCount > 0
    && workspace.panelsInsideViewport
    && workspace.noHorizontalOverflow), true, 'every Finance workspace must remain reachable without horizontal overflow');
  assert.deepEqual(diagnostics.workspaces.map(({ tab, activeBackground }) => ({ tab, activeBackground })), [
    { tab: 'entry', activeBackground: 'rgb(94, 175, 158)' },
    { tab: 'holdings', activeBackground: 'rgb(212, 201, 78)' },
    { tab: 'review', activeBackground: 'rgb(255, 184, 41)' },
    { tab: 'planning', activeBackground: 'rgb(183, 130, 242)' },
    { tab: 'records', activeBackground: 'rgb(90, 104, 120)' },
    { tab: 'overview', activeBackground: 'rgb(53, 86, 253)' },
  ], 'Finance tabs must preserve their original workspace colors');
  assert.deepEqual(diagnostics.desktop.chart, { gradients: 1, gridLines: 3, usesCurve: true, linecap: 'round' }, 'the total-assets chart must keep its polished visual structure');
  assert.equal(diagnostics.responsive.every((viewport) => viewport.noHorizontalOverflow
    && viewport.shellCentered
    && viewport.sharedOuterEdges
    && viewport.metricRowsAligned
    && viewport.headerAligned
    && viewport.overviewAligned
    && viewport.workspaces.every((workspace) => workspace.panelCount > 0 && workspace.aligned)), true, 'Finance panels must share the same responsive grid at every breakpoint');
  assert.equal(diagnostics.responsive.every((viewport) => viewport.allocationEmptyBand <= 2), true,
    `Allocation Map must not leave an empty band below the SVG: ${JSON.stringify(diagnostics.responsive.map(({ width, allocationEmptyBand }) => ({ width, allocationEmptyBand })))}`);
  assert.deepEqual(diagnostics.responsive.map(({ width, summaryColumns }) => ({ width, summaryColumns })), [
    { width: 3440, summaryColumns: 12 },
    { width: 2560, summaryColumns: 12 },
    { width: 2000, summaryColumns: 12 },
    { width: 1920, summaryColumns: 12 },
    { width: 1600, summaryColumns: 12 },
    { width: 1440, summaryColumns: 12 },
    { width: 1366, summaryColumns: 12 },
    { width: 1101, summaryColumns: 12 },
    { width: 1100, summaryColumns: 2 },
    { width: 1024, summaryColumns: 2 },
    { width: 900, summaryColumns: 2 },
    { width: 899, summaryColumns: 2 },
    { width: 768, summaryColumns: 2 },
    { width: 681, summaryColumns: 2 },
    { width: 680, summaryColumns: 1 },
    { width: 430, summaryColumns: 1 },
    { width: 390, summaryColumns: 1 },
    { width: 360, summaryColumns: 1 },
  ], 'Finance summary columns must change only at the intended breakpoints');
  assert.deepEqual(diagnostics.mobile, { columns: 1, aligned: true, ordered: true, noHorizontalOverflow: true, heroLines: 1, tabsScrollbarHidden: true });
  assert.deepEqual(diagnostics.consoleProblems, []);
  assert.deepEqual(diagnostics.exceptions, []);

  console.log(JSON.stringify(diagnostics, null, 2));
  console.log('Finance motion UI regression passed.');
} finally {
  await browser?.close();
  await new Promise((resolve) => preview.close(resolve));
}
