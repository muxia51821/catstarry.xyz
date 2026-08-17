const portfolioApiBase = document.querySelector('meta[name="finance-api-base"]')?.content.replace(/\/$/, '') ?? '';
const portfolioMoney = new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', maximumFractionDigits: 2 });
const portfolioNumber = new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2 });

const portfolioApp = document.querySelector('[data-app]');
const portfolioDashboard = document.querySelector('[data-dashboard]');
const portfolioTotal = document.querySelector('[data-total-value]');
const portfolioStatus = document.querySelector('[data-market-freshness]');
const portfolioRecent = document.querySelector('[data-overview-trades]');
const portfolioRecentEmpty = document.querySelector('[data-overview-trades-empty]');
const portfolioHistoryState = document.querySelector('[data-net-worth-state]');
const portfolioHistoryEmpty = document.querySelector('[data-net-worth-empty]');

let portfolioEpoch = 0;
let portfolioScheduled = false;

function portfolioElement(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = String(text);
  return node;
}

async function portfolioRequest(path) {
  const response = await fetch(`${portfolioApiBase}${path}`, { credentials: 'include' });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.message ?? `请求失败（${response.status}）`);
  return body;
}

function portfolioCanRender() {
  return Boolean(portfolioApp && !portfolioApp.hidden && portfolioDashboard?.getAttribute('aria-busy') !== 'true');
}

function schedulePortfolioRefresh() {
  if (portfolioScheduled) return;
  portfolioScheduled = true;
  queueMicrotask(async () => {
    portfolioScheduled = false;
    if (!portfolioCanRender()) return;
    const epoch = ++portfolioEpoch;
    try {
      const [accountState, tradePage] = await Promise.all([
        portfolioRequest('/api/account-state'),
        portfolioRequest('/api/trades?limit=5'),
      ]);
      if (epoch !== portfolioEpoch || !portfolioCanRender()) return;
      renderPortfolioAccountState(accountState);
      renderPortfolioRecentTrades(tradePage?.trades ?? []);
      normalizePortfolioHistoryCopy();
    } catch (error) {
      if (epoch !== portfolioEpoch || !portfolioCanRender()) return;
      renderPortfolioUnavailable(error);
      normalizePortfolioHistoryCopy();
    }
  });
}

function renderPortfolioAccountState(accountState) {
  if (!portfolioTotal || !portfolioStatus) return;
  const total = finiteNumber(accountState?.total_assets);
  portfolioTotal.textContent = total === null ? '待核验' : portfolioMoney.format(total);
  portfolioTotal.dataset.numeric = String(total !== null);
  portfolioStatus.textContent = accountStateStatus(accountState);

  const metric = portfolioTotal.closest('.metric');
  if (!metric) return;
  metric.querySelector('[data-account-breakdown]')?.remove();
  const breakdown = portfolioElement('div', 'portfolio-account-breakdown');
  breakdown.dataset.accountBreakdown = '';

  const holdings = finiteNumber(accountState?.holdings?.market_value);
  breakdown.append(accountBreakdownRow('证券市值', holdings === null ? '行情不完整' : portfolioMoney.format(holdings)));

  const cash = finiteNumber(accountState?.cash?.value);
  const knownCash = finiteNumber(accountState?.cash?.known_value);
  breakdown.append(accountBreakdownRow('Broker Cash', cash !== null ? portfolioMoney.format(cash) : knownCash !== null ? `${portfolioMoney.format(knownCash)} · 待核验` : '待对账'));

  const other = finiteNumber(accountState?.other_assets?.value);
  const knownOther = finiteNumber(accountState?.other_assets?.known_value);
  if ((other ?? knownOther ?? 0) > 0 || accountState?.other_assets?.status === 'incomplete') {
    breakdown.append(accountBreakdownRow('其他账户资产', other !== null ? portfolioMoney.format(other) : knownOther !== null ? `${portfolioMoney.format(knownOther)} · 待核验` : '待核验'));
  }
  portfolioStatus.before(breakdown);
}

function accountBreakdownRow(label, value) {
  const row = portfolioElement('span', 'portfolio-account-breakdown__row');
  row.append(portfolioElement('i', '', label), portfolioElement('b', '', value));
  return row;
}

function accountStateStatus(accountState) {
  const reconciliationDate = accountState?.reconciliation?.through_date;
  const cash = accountState?.cash;
  if (!accountState?.reconciliation) return '尚无 Broker Cash 对账';
  if (accountState?.total_status === 'incomplete' || cash?.status === 'incomplete') {
    const firstProblem = cash?.problems?.[0] ?? accountState?.other_assets?.problems?.[0];
    return firstProblem ? `账户状态不完整 · ${firstProblem}` : '账户状态不完整，等待核验';
  }
  if (cash?.status === 'projected') {
    return `基于 ${reconciliationDate ?? '最近一次'} 对账 + ${cash.replayed_facts ?? 0} 笔后续资金变化`;
  }
  return `已对账 · ${reconciliationDate ?? '最近一次核验'}`;
}

function renderPortfolioRecentTrades(rows) {
  if (!portfolioRecent || !portfolioRecentEmpty) return;
  portfolioRecent.replaceChildren(...rows.slice(0, 5).map((row) => {
    const card = portfolioElement('article', 'overview-trade portfolio-overview-trade');
    const heading = portfolioElement('span', '', `${row.trade_date} · ${row.ticker_name || row.ticker}`);
    const detail = portfolioElement('strong', row.direction === 'sell' ? 'trade-sell' : 'trade-buy');
    detail.textContent = `${row.direction === 'sell' ? '卖出' : '买入'} · ${portfolioNumber.format(Number(row.quantity))} 股 × ${portfolioMoney.format(Number(row.price))}`;
    card.append(heading, detail);
    return card;
  }));
  portfolioRecentEmpty.hidden = rows.length > 0;
}

function renderPortfolioUnavailable(error) {
  if (!portfolioTotal || !portfolioStatus) return;
  portfolioTotal.textContent = '待核验';
  portfolioTotal.dataset.numeric = 'false';
  portfolioStatus.textContent = `账户状态暂时无法读取${error?.message ? ` · ${error.message}` : ''}`;
  portfolioTotal.closest('.metric')?.querySelector('[data-account-breakdown]')?.remove();
}

function normalizePortfolioHistoryCopy() {
  if (portfolioHistoryEmpty) {
    portfolioHistoryEmpty.textContent = '尚无完整的历史估值。曲线只使用事实记录与 canonical raw close 重建出的完整数据。';
  }
  if (!portfolioHistoryState) return;
  const match = portfolioHistoryState.textContent?.match(/^(\d+)/);
  if (!match) return;
  const activeView = document.querySelector('[data-asset-view].is-active')?.dataset.assetView;
  portfolioHistoryState.textContent = `${match[1]} 个完整${activeView === 'week' ? '周末' : '月末'}历史估值`;
}

function resetPortfolioUi() {
  portfolioEpoch += 1;
  portfolioTotal?.closest('.metric')?.querySelector('[data-account-breakdown]')?.remove();
}

function finiteNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

if (portfolioApp && portfolioDashboard) {
  const observer = new MutationObserver(() => {
    if (portfolioApp.hidden) resetPortfolioUi();
    else schedulePortfolioRefresh();
  });
  observer.observe(portfolioApp, { attributes: true, attributeFilter: ['hidden'] });
  observer.observe(portfolioDashboard, { attributes: true, attributeFilter: ['aria-busy'] });
  document.querySelector('[data-refresh]')?.addEventListener('click', () => setTimeout(schedulePortfolioRefresh, 0));
  for (const button of document.querySelectorAll('[data-asset-view]')) {
    button.addEventListener('click', () => setTimeout(normalizePortfolioHistoryCopy, 0));
  }
  normalizePortfolioHistoryCopy();
  schedulePortfolioRefresh();
}
