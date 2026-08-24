const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
function el(tag, { className, text, attrs, dataset, style } = {}, ...children) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = String(text);
  for (const [name, value] of Object.entries(attrs ?? {})) node.setAttribute(name, String(value));
  for (const [name, value] of Object.entries(dataset ?? {})) node.dataset[name] = String(value);
  Object.assign(node.style, style ?? {});
  node.append(...children.filter(Boolean));
  return node;
}
function svgEl(tag, { className, text, attrs } = {}, ...children) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  if (className) node.setAttribute('class', className);
  if (text !== undefined) node.textContent = String(text);
  for (const [name, value] of Object.entries(attrs ?? {})) node.setAttribute(name, String(value));
  node.append(...children.filter(Boolean));
  return node;
}
function replace(node, children) { node.replaceChildren(...children); }
const apiBase = document.querySelector('meta[name="finance-api-base"]')?.content.replace(/\/$/, '') ?? '';
const money = new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', maximumFractionDigits: 2 });
const number = new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2 });
const CATEGORY_PRESENTATION = [
  { key: '主动操作仓（A股）', label: '主动操作仓', color: '#6685ff' },
  { key: 'A股宽基指数底仓', label: 'A股宽基指数', color: '#d4c94e' },
  { key: '美股ETF（A股跨境ETF）', label: '美股 ETF', color: '#b782f2' },
  { key: '黄金ETF', label: '黄金 ETF', color: '#d9a441' },
  { key: '机动仓（货币ETF）', label: '机动仓', color: '#5eaf9e' },
  { key: '其他', label: '其他', color: '#848e9c' },
];
const CATEGORY_ALIASES = new Map([
  ['主动仓', '主动操作仓（A股）'], ['美股宽基指数底仓', '美股ETF（A股跨境ETF）'],
  ['货币基金/现金', '机动仓（货币ETF）'], ['机动仓', '机动仓（货币ETF）'], ['港股宽基指数底仓', '其他'],
]);
const state = {
  session: null, holdings: null, trades: [], pe: [], circuit: null, reviews: [], notifications: null,
  accessLog: [], importReview: [], monthly: [], cashFlows: [], accountEvents: [], assetSnapshots: [], riskSignals: null, cashFlowsError: null, assetSnapshotsError: null, riskSignalsError: null, assetSeries: null, assetView: 'month', plan: null, memos: [], rules: [], rebalances: [], editingTrade: null, editingMemo: null, editingCashFlow: null, editingAccountEvent: null,
  tradePaging: { cursors: [null], nextCursor: null, page: 0 }, accessPaging: { cursors: [null], nextCursor: null, page: 0 },
};
const viewerGuidance = { hasVisitedHoldings: false, monthlyPromptShown: false };
let authStateVersion = 0;

function localDateForInput() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

async function request(path, options = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    credentials: 'include',
    headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers ?? {}) },
    ...options,
  });
  if (response.status === 401) {
    state.session = null;
    showLogin(true);
    throw new Error('登录已过期，请重新登录。');
  }
  const body = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.message ?? `请求失败（${response.status}）`);
  return body;
}

function setStatus(node, message, tone = '') {
  node.textContent = message;
  node.dataset.tone = tone;
}

function isAdmin() { return state.session?.role === 'admin'; }
function valueOrDash(value, formatter = number) { return value === null || value === undefined ? '—' : formatter.format(Number(value)); }
function formatPercent(value) { return value === null || value === undefined ? '—' : `${(Number(value) * 100).toFixed(1)}%`; }
function formatPnl(row) {
  if (row.pnl === null || row.pnl === undefined) return '—';
  const ratioValue = Number(row.pnl_ratio);
  const ratio = row.pnl_ratio === null || row.pnl_ratio === undefined ? '—' : `${ratioValue > 0 ? '+' : ''}${(ratioValue * 100).toFixed(2)}%`;
  const pnl = Number(row.pnl);
  return `${pnl > 0 ? '+' : ''}${money.format(pnl)} (${ratio})`;
}
function escapeHtml(value) { return String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]); }

async function boot() {
  const version = ++authStateVersion;
  try {
    const session = await request('/api/auth/session');
    if (version !== authStateVersion || state.session?.authenticated) return;
    if (session.authenticated) { state.session = session; showApp(); await loadDashboard(); }
    else showLogin();
  } catch (error) {
    if (version === authStateVersion) setStatus($('[data-login-status]'), error.message, 'error');
  }
}

function showLogin(force = false) {
  if (!force && state.session?.authenticated) return;
  $('[data-app]').hidden = true;
  $('[data-login]').hidden = false;
}

function showApp() {
  $('[data-login]').hidden = true;
  $('[data-app]').hidden = false;
  $('[data-role]').textContent = isAdmin() ? 'ADMIN · READ / WRITE' : 'CATI · READ ONLY';
  viewerGuidance.hasVisitedHoldings = false;
  viewerGuidance.monthlyPromptShown = false;
  for (const node of $$('[data-open-trade], [data-open-review], [data-open-risk], [data-export-archive], [data-open-monthly], [data-open-plan], [data-open-memo], [data-open-rules], [data-open-cash-flow], [data-open-account-event], [data-open-asset-snapshot]')) node.hidden = !isAdmin();
}

async function loadDashboard() {
  const dashboard = $('[data-dashboard]');
  dashboard.setAttribute('aria-busy', 'true');
  setStatus($('[data-dashboard-status]'), '正在读取已持久化的 Finance 数据…');
  try {
    const calls = [
      request('/api/holdings'), request('/api/trades'), request('/api/pe'), request('/api/circuit'), request('/api/review'),
      request('/api/notifications'), request('/api/monthly'), request('/api/plan'), request('/api/memos'), request('/api/risk-rules'), request('/api/rebalances'),
    ];
    const results = await Promise.all(calls);
    [state.holdings, { trades: state.trades, nextCursor: state.tradePaging.nextCursor }, { indexes: state.pe }, { active: state.circuit }, { reviews: state.reviews }, state.notifications,
      { records: state.monthly }, { plan: state.plan }, { memos: state.memos }, { rules: state.rules }, { rebalances: state.rebalances }] = results.slice(0, 11);
    if (isAdmin()) {
      const [accessLog, importReview] = await Promise.all([
        request('/api/access-log').catch(() => null),
        request('/api/import-review').catch(() => null),
      ]);
      state.accessLog = accessLog?.access_log ?? [];
      state.accessPaging.nextCursor = accessLog?.nextCursor ?? null;
      state.importReview = importReview?.review ?? [];
    } else {
      state.accessLog = [];
      state.importReview = [];
    }
    state.assetSeries = await request(`/api/assets/series?view=${state.assetView}`).catch(() => null);
    const optional = await Promise.all([
      request('/api/cash-flows').then((data) => ({ data, error: null })).catch((error) => ({ data: null, error })),
      request('/api/account-events').then((data) => ({ data, error: null })).catch((error) => ({ data: null, error })),
      request('/api/assets/snapshots').then((data) => ({ data, error: null })).catch((error) => ({ data: null, error })),
      request('/api/risk/signals').then((data) => ({ data, error: null })).catch((error) => ({ data: null, error })),
    ]);
    state.cashFlows = optional[0].data?.cash_flows ?? [];
    state.cashFlowsError = optional[0].error;
    state.accountEvents = optional[1].data?.account_events ?? [];
    state.assetSnapshots = optional[2].data?.snapshots ?? [];
    state.assetSnapshotsError = optional[2].error;
    state.riskSignals = optional[3].data;
    state.riskSignalsError = optional[3].error;
    renderDashboard();
    setStatus($('[data-dashboard-status]'), '');
  } catch (error) {
    setStatus($('[data-dashboard-status]'), error instanceof Error ? error.message : 'Finance 数据暂时无法读取。', 'error');
    throw error;
  } finally {
    dashboard.setAttribute('aria-busy', 'false');
  }
}

function renderDashboard() {
  state.tradePaging.cursors = [null]; state.tradePaging.page = 0; state.accessPaging.cursors = [null]; state.accessPaging.page = 0;
  renderCircuitBanner(); renderSummary(); renderOverview(); renderHoldings(); renderPositions(); renderPe(); renderTrades(); renderMonthly(); renderCashFlows(); renderAccountEvents(); renderAssetSnapshots(); renderPlan(); renderReviews(); renderRiskSignals(); renderMemos(); renderRules(); renderAccessLog(); renderImportReview();
}

function renderCircuitBanner() {
  const banner = $('[data-circuit-banner]');
  const active = state.circuit;
  banner.hidden = !active;
  if (!active) return;
  banner.dataset.level = active.level;
  $('[data-circuit-banner-title]').textContent = `${circuitLabel(active.level)}熔断生效`;
  $('[data-circuit-banner-copy]').textContent = circuitReason(active.reason);
  $('[data-resolve-circuit]').hidden = active.level !== 'black';
  $('[data-resolve-circuit]').textContent = isAdmin() ? '确认恢复计划' : '确认恢复计划';
}

function renderSummary() {
  const holdings = state.holdings;
  const market = holdings?.market_overview; const change = Number(market?.change_pct); const indexValue = Number(market?.current_value); const hasChange = Number.isFinite(change); const hasValue = Number.isFinite(indexValue);
  const marketSummary = hasValue ? number.format(indexValue) : '—';
  const marketFreshness = !holdings?.holdings?.length ? '暂无持仓' : !holdings.market_data_complete ? '部分持仓缺少价格，市值与占比不展示。' : hasValue && hasChange ? `${market?.label ?? '上证指数'} ${change > 0 ? '+' : ''}${Number(market?.change ?? 0).toFixed(2)} · ${change > 0 ? '+' : ''}${change.toFixed(2)}%${market?.market_time ? ` · 截至 ${market.market_time}` : ''}` : '上证指数快照尚未接入当前 API。';
  const summary = $('[data-market-summary]'); summary.textContent = marketSummary; summary.className = hasChange ? (change >= 0 ? 'value-up' : 'value-down') : '';
  $('[data-market-freshness-copy]').textContent = marketFreshness;
  $('[data-circuit-level]').textContent = state.circuit ? circuitLabel(state.circuit.level) : '正常';
  $('[data-circuit-action]').textContent = state.circuit ? circuitReason(state.circuit.reason) : '未发现未解除的熔断记录';
}

function renderOverview() {
  const snapshots = state.assetSeries?.series ?? [];
  const records = snapshots.map((row) => ({ year_month: state.assetView === 'week' ? String(row.snapshot_date) : String(row.snapshot_date).slice(0, 7), end_total: row.total_value }));
  const chart = $('[data-net-worth-chart]'); const empty = $('[data-net-worth-empty]');
  empty.hidden = records.length > 0; chart.hidden = records.length === 0;
  $('[data-net-worth-state]').textContent = records.length ? `${records.length} 个已核验${state.assetView === 'week' ? '周' : '月'}末快照` : '数据积累中';
  for (const button of $$('[data-asset-view]')) { const active = button.dataset.assetView === state.assetView; button.classList.toggle('is-active', active); button.setAttribute('aria-pressed', String(active)); }
  if (records.length) renderNetWorthChart(chart, records);
  const recent = state.trades.slice(0, 5);
  replace($('[data-overview-trades]'), recent.map((row) => el('article', { className: 'overview-trade' }, el('span', { text: `${row.trade_date} · ${row.ticker_name || row.ticker}` }), el('strong', { className: row.direction === 'sell' ? 'trade-sell' : 'trade-buy', text: row.direction === 'sell' ? '卖出' : '买入' }))));
  $('[data-overview-trades-empty]').hidden = recent.length > 0;
}

for (const button of $$('[data-asset-view]')) button.addEventListener('click', async () => {
  const view = button.dataset.assetView; if (!view || view === state.assetView) return;
  state.assetView = view;
  state.assetSeries = await request(`/api/assets/series?view=${view}`).catch(() => null);
  renderOverview();
});

function renderNetWorthChart(node, records) {
  const width = 760; const height = 240; const padding = { top: 20, right: 20, bottom: 32, left: 54 };
  const values = records.map((row) => Number(row.end_total)); const min = Math.min(...values); const max = Math.max(...values); const range = max - min || Math.max(max * .1, 1);
  const x = (index) => padding.left + (records.length === 1 ? (width - padding.left - padding.right) / 2 : index * (width - padding.left - padding.right) / (records.length - 1));
  const y = (value) => padding.top + (max - value) * (height - padding.top - padding.bottom) / range;
  const points = values.map((value, index) => `${x(index).toFixed(1)},${y(value).toFixed(1)}`).join(' ');
  const area = `${padding.left},${height - padding.bottom} ${points} ${x(records.length - 1).toFixed(1)},${height - padding.bottom}`;
  const gradientId = 'net-worth-gradient';
  replace(node, [svgEl('svg', { attrs: { viewBox: `0 0 ${width} ${height}`, role: 'img', 'aria-label': '月度总资产趋势' } }, svgEl('defs', {}, svgEl('linearGradient', { attrs: { id: gradientId, x1: 0, x2: 0, y1: 0, y2: 1 } }, svgEl('stop', { attrs: { offset: '0%', 'stop-color': 'var(--blue)', 'stop-opacity': '.34' } }), svgEl('stop', { attrs: { offset: '100%', 'stop-color': 'var(--blue)', 'stop-opacity': '0' } }))), svgEl('polygon', { className: 'net-worth-area', attrs: { points: area, fill: `url(#${gradientId})` } }), svgEl('polyline', { attrs: { points } }), ...records.map((row, index) => svgEl('circle', { className: 'net-worth-dot', attrs: { cx: x(index), cy: y(values[index]), r: 4, tabindex: 0, 'aria-label': `${row.year_month} ${money.format(values[index])}` } }, svgEl('title', { text: `${row.year_month} ${money.format(values[index])}` }))), ...records.map((row, index) => svgEl('text', { className: 'net-worth-label', text: row.year_month, attrs: { x: x(index), y: height - 10, 'text-anchor': 'middle' } })))]);
}

function renderHoldings() {
  const rows = state.holdings?.holdings ?? [];
  replace($('[data-holdings-body]'), rows.map((row) => {
    const hasPnl = row.pnl !== null && row.pnl !== undefined;
    return el('tr', {},
    el('td', { className: 'table-text' }, el('strong', { text: row.ticker_name || row.ticker }), row.stale ? el('small', { className: 'stale-flag', text: '行情过期' }) : null),
    ...[valueOrDash(row.quantity), valueOrDash(row.avg_cost, money), valueOrDash(row.price, money), valueOrDash(row.market_value, money)].map((value) => el('td', { className: 'table-data', text: value })),
    el('td', { className: `table-data ${hasPnl ? (Number(row.pnl) >= 0 ? 'value-up' : 'value-down') : ''}`, text: formatPnl(row) }),
  );
  }));
  $('[data-holdings-empty]').hidden = rows.length > 0;
  renderHoldingsSummary(rows);
}

function categoryPresentation(category) {
  const key = CATEGORY_ALIASES.get(category) ?? category;
  return CATEGORY_PRESENTATION.find((item) => item.key === key) ?? { key: '其他', label: category || '其他', color: '#848e9c' };
}

function categoryLabel(category) {
  const item = categoryPresentation(category);
  return el('span', { className: 'category-label', style: { '--category-color': item.color } }, el('i'), el('span', { text: item.label }));
}

function renderHoldingsSummary(rows) {
  const usable = Boolean(state.holdings?.market_data_complete && Number(state.holdings?.total_market_value) > 0);
  const total = Number(state.holdings?.total_market_value); const summaryState = $('[data-holdings-summary-state]');
  summaryState.textContent = !rows.length ? '暂无持仓' : usable ? '按当前市值' : '行情不完整';
  const top = usable ? [...rows].sort((left, right) => Number(right.market_value) - Number(left.market_value)).slice(0, 3) : [];
  replace($('[data-top-holdings]'), top.map((row) => el('p', {}, el('span', { className: 'table-text', text: row.ticker_name || row.ticker }), el('strong', { className: 'table-data', text: formatPercent(Number(row.market_value) / total) }))));
  $('[data-top-holdings-empty]').hidden = top.length > 0;
  const categories = new Map();
  if (usable) for (const row of rows) { const item = categoryPresentation(row.position_category); categories.set(item.key, { ...item, value: (categories.get(item.key)?.value ?? 0) + Number(row.market_value) }); }
  replace($('[data-category-distribution]'), [...categories.values()].sort((left, right) => right.value - left.value).map((item) => el('article', { className: 'category-distribution-row' }, categoryLabel(item.key), el('div', { className: 'category-bar', attrs: { 'aria-label': `${item.label} ${formatPercent(item.value / total)}` } }, el('span', { style: { width: formatPercent(item.value / total), background: item.color } })), el('strong', { className: 'table-data', text: formatPercent(item.value / total) }))));
  $('[data-category-distribution-empty]').hidden = categories.size > 0;
}

function renderPositions() {
  const rows = state.holdings?.positions ?? [];
  replace($('[data-position-list]'), rows.map((row) => {
    const current = row.current_ratio === null ? null : Number(row.current_ratio); const target = row.target_ratio === undefined ? null : Number(row.target_ratio);
    const track = el('div', { className: 'allocation-track', attrs: { 'aria-label': `当前 ${formatPercent(current)}，目标 ${formatPercent(target)}` } },
      el('i', { style: { width: `${Math.min(100, Math.max(0, (current ?? 0) * 100))}%` } }), el('b', { style: { left: `${Math.min(100, Math.max(0, (target ?? 0) * 100))}%` } }));
    return el('article', { className: 'position-row' }, el('header', {}, el('strong', { className: 'table-text', text: categoryPresentation(row.position_category).label }), el('span', { className: `state-${row.status}`, text: positionSuggestion(row) })), track, el('p', { text: `当前 ${formatPercent(current)} · 目标 ${formatPercent(target)} · 建议 ${formatPercent(row.suggestedChange)}` }));
  }));
  $('[data-position-empty]').hidden = rows.length > 0;
}

function renderPe() {
  const rows = state.pe ?? []; const zones = ['freeze', 'low', 'normal', 'high', 'overheat'];
  replace($('[data-pe-list]'), rows.map((row) => {
    const hasPe = row.pe_ttm !== null && row.pe_ttm !== undefined;
    const historical = row.historical_position;
    const historicalBand = { historical_low: '历史低位', normal_range: '常态区间', historical_high: '历史高位' };
    const unavailableHistory = {
      missing_history: 'CSI 历史 PE 尚未导入。',
      insufficient_history: 'CSI 历史 PE 覆盖不足 3 年。',
      history_stale: 'CSI 历史 PE 已过期。',
      current_pe_unavailable: '当前 PE 暂不可用，无法计算历史位置。',
    };
    const historicalStatus = !hasPe ? row.stale ? 'PE 数据过期或不可用。' : '暂无 PE 数据。'
      : !historical ? '历史估值位置仅覆盖 CSI 指数。'
        : historical.status !== 'available' ? unavailableHistory[historical.reason] ?? '历史估值位置暂不可用。'
          : `历史${formatPercent(historical.percentile)} · ${historicalBand[historical.band] ?? '常态区间'}`;
    const historicalDetails = historical?.status === 'available'
      ? el('dl', { className: 'pe-history' },
        el('div', {}, el('dt', { text: 'P20' }), el('dd', { text: number.format(historical.p20) })),
        el('div', {}, el('dt', { text: 'P50' }), el('dd', { text: number.format(historical.p50) })),
        el('div', {}, el('dt', { text: 'P80' }), el('dd', { text: number.format(historical.p80) })),
        el('div', {}, el('dt', { text: 'CSI 截至' }), el('dd', { text: historical.source_date || '—' })),
        el('div', {}, el('dt', { text: '窗口' }), el('dd', { text: historical.window_start && historical.window_end ? `${historical.window_start} - ${historical.window_end}` : '—' })),
        el('div', {}, el('dt', { text: '样本' }), el('dd', { text: historical.observation_count === null || historical.observation_count === undefined ? '—' : String(historical.observation_count) })),
      ) : historical?.source_date ? el('p', { className: 'pe-source', text: `CSI 最近数据：${historical.source_date}` }) : null;
    const historicalPercentileBand = historical?.status === 'available' && Number.isFinite(Number(historical.percentile))
      ? Math.min(4, Math.max(0, Math.floor(Number(historical.percentile) * 5))) : null;
    const scale = row.temperature
      ? el('div', { className: 'pe-scale', attrs: { 'aria-label': 'PE temperature' } }, ...zones.map((zone) => el('i', { className: `pe-scale__segment pe-scale__segment--${zone}`, attrs: row.temperature?.zone === zone ? { 'data-active': '' } : {} })))
      : historicalPercentileBand === null ? null
        : el('div', { className: 'pe-scale pe-scale--historical', attrs: { 'aria-label': 'Historical PE percentile' } }, ...zones.map((zone, index) => el('i', { className: `pe-scale__segment pe-scale__segment--${zone}`, attrs: historicalPercentileBand === index ? { 'data-active': '' } : {} })));
    const scopeNote = historical?.status === 'available'
      ? row.ticker === 'STAR50_PE'
        ? 'PE 仅作历史位置描述，不单独形成综合估值结论。'
        : '本项为 PE 历史位置，不代表综合估值或交易结论。'
      : null;
    const status = row.temperature ? `${peSuggestion(row.temperature)} ${historicalStatus}` : historicalStatus;
    return el('article', { className: 'pe-row' },
    el('header', {}, el('strong', { text: row.display_name || row.ticker }), el('span', { className: `state-${row.temperature?.zone ?? 'unavailable'}`, text: row.pe_ttm === null ? '数据不可用' : `${number.format(row.pe_ttm)} PE` })),
    scale,
    el('p', { text: status }),
    historicalDetails,
    scopeNote ? el('p', { className: 'pe-scope', text: scopeNote }) : null,
  );
  }));
  $('[data-pe-empty]').hidden = rows.length > 0;
}

function renderTrades() {
  const rows = state.trades ?? [];
  replace($('[data-trades-body]'), rows.map((row) => {
    const actions = el('td', { className: 'trade-cell--action', text: '—' });
    if (isAdmin()) { const edit = el('button', { className: 'text-button', text: '修改', attrs: { type: 'button' }, dataset: { editTrade: row.id } }); const remove = el('button', { className: 'text-button text-button--danger', text: '删除', attrs: { type: 'button' }, dataset: { deleteTrade: row.id } }); actions.replaceChildren(el('div', { className: 'row-actions' }, edit, remove)); }
    const memo = row.memo_reason ? `${row.memo_reason_source === 'reconstructed_confirmed' ? '事后确认：' : '原始记录：'}${row.memo_reason.slice(0, 44)}${row.memo_reason.length > 44 ? '…' : ''}` : '—';
    if (isAdmin() && row.memo_id) actions.firstElementChild?.append(el('button', { className: 'text-button', text: '改理由', attrs: { type: 'button' }, dataset: { editMemoFromTrade: row.memo_id } }));
    if (isAdmin() && !row.memo_id) actions.firstElementChild?.append(el('button', { className: 'text-button', text: '补理由', attrs: { type: 'button' }, dataset: { memoTrade: row.id } }));
    return el('tr', {}, el('td', { className: 'table-data trade-cell--date', text: row.trade_date }), el('td', { className: 'table-text trade-cell--text', text: row.ticker_name || row.ticker }), el('td', { className: `trade-cell--text ${row.direction === 'sell' ? 'trade-sell' : 'trade-buy'}`, text: row.direction === 'buy' ? '买入' : '卖出' }), el('td', { className: 'table-data trade-cell--number', text: valueOrDash(row.quantity) }), el('td', { className: 'table-data trade-cell--number', text: valueOrDash(row.price, money) }), el('td', { className: 'table-text trade-cell--text' }, categoryLabel(row.position_category)), el('td', { className: 'table-text trade-cell--text', text: memo }), actions);
  }));
  $('[data-trades-empty]').hidden = rows.length > 0;
  renderPagination('trade');
  for (const button of $$('[data-edit-trade]')) button.addEventListener('click', () => openTradeEdit(Number(button.dataset.editTrade)));
  for (const button of $$('[data-delete-trade]')) button.addEventListener('click', () => deleteTrade(Number(button.dataset.deleteTrade)));
  for (const button of $$('[data-memo-trade]')) button.addEventListener('click', () => openMemoForTrade(Number(button.dataset.memoTrade), button));
  for (const button of $$('[data-edit-memo-from-trade]')) button.addEventListener('click', () => openMemoEdit(Number(button.dataset.editMemoFromTrade), button));
}

function renderMonthly() {
  const rows = state.monthly ?? [];
  replace($('[data-monthly-list]'), rows.slice(0, 5).map((row) => {
    const actions = isAdmin() ? el('div', { className: 'row-actions' }, el('button', { className: 'text-button text-button--danger', text: '删除', attrs: { type: 'button' }, dataset: { deleteMonthly: row.id } })) : null;
    return el('article', { className: 'monthly-row' }, el('header', {}, el('strong', { text: row.year_month }), el('span', { text: valueOrDash(row.end_total, money) })), el('p', { text: `投入 ${valueOrDash(Number(row.muxia_invest) + Number(row.cati_invest), money)} · ${row.blue_chip_temp || '未记录温度'}` }), el('p', { text: row.summary || '没有月度总结。' }), actions);
  }));
  $('[data-monthly-empty]').hidden = rows.length > 0;
  for (const button of $$('[data-delete-monthly]')) button.addEventListener('click', () => deleteMonthly(Number(button.dataset.deleteMonthly)));
}

const CASH_FLOW_TYPES = {
  monthly_investment: '月度投入', bonus_investment: '奖金投入', additional_investment: '额外投入', withdrawal: '取出', adjustment: '调整',
};
const CONTRIBUTORS = { muxia: '木下', cati: 'cati' };

function renderCashFlows() {
  const rows = state.cashFlows ?? [];
  replace($('[data-cash-flows-body]'), rows.slice(0, 12).map((row) => el('tr', {},
    el('td', { className: 'table-data', text: row.occurred_on || '—' }),
    el('td', { text: CONTRIBUTORS[row.contributor] ?? row.contributor ?? '—' }),
    el('td', { text: CASH_FLOW_TYPES[row.flow_type] ?? row.flow_type ?? '—' }),
    el('td', { className: 'table-data', text: valueOrDash(row.confirmed_amount, money) }),
    el('td', { className: 'table-data', text: valueOrDash(row.manager_share_offset, money) }),
    el('td', { className: 'table-data', text: valueOrDash(row.net_amount, money) }),
    el('td', { text: row.note || '—' }),
    el('td', {}, isAdmin() ? el('div', { className: 'row-actions' }, el('button', { className: 'text-button', text: '编辑', attrs: { type: 'button' }, dataset: { editCashFlow: row.id } }), el('button', { className: 'text-button text-button--danger', text: '删除', attrs: { type: 'button' }, dataset: { deleteCashFlow: row.id } })) : null),
  )));
  $('[data-cash-flows-empty]').hidden = Boolean(state.cashFlowsError) || rows.length > 0;
  $('[data-cash-flows-error]').hidden = !state.cashFlowsError;
  for (const button of $$('[data-edit-cash-flow]')) button.addEventListener('click', () => openCashFlowEdit(Number(button.dataset.editCashFlow), button));
  for (const button of $$('[data-delete-cash-flow]')) button.addEventListener('click', () => deleteCashFlow(Number(button.dataset.deleteCashFlow)));
}

const ACCOUNT_EVENT_TYPES = { dividend: '红利', dividend_tax: '红利税', split: 'ETF 分拆', repo_start: '逆回购发生', repo_maturity: '逆回购回款', refund: '退款', other: '其他' };
function renderAccountEvents() {
  const rows = state.accountEvents ?? [];
  replace($('[data-account-events-body]'), rows.slice(0, 16).map((row) => el('tr', {}, el('td', { className: 'table-data', text: `${row.event_date}${row.event_time ? ` ${row.event_time}` : ''}` }), el('td', { text: ACCOUNT_EVENT_TYPES[row.event_type] ?? row.event_type }), el('td', { text: row.ticker_name || row.ticker || '—' }), el('td', { className: 'table-data', text: valueOrDash(row.amount, money) }), el('td', { text: row.note || '—' }), el('td', {}, isAdmin() ? el('div', { className: 'row-actions' }, el('button', { className: 'text-button', text: '编辑', attrs: { type: 'button' }, dataset: { editAccountEvent: row.id } }), el('button', { className: 'text-button text-button--danger', text: '删除', attrs: { type: 'button' }, dataset: { deleteAccountEvent: row.id } })) : null))));
  $('[data-account-events-empty]').hidden = rows.length > 0;
  for (const button of $$('[data-edit-account-event]')) button.addEventListener('click', () => openAccountEventEdit(Number(button.dataset.editAccountEvent), button));
  for (const button of $$('[data-delete-account-event]')) button.addEventListener('click', () => deleteAccountEvent(Number(button.dataset.deleteAccountEvent)));
}

function renderAssetSnapshots() {
  const rows = state.assetSnapshots ?? [];
  replace($('[data-asset-snapshots-body]'), rows.slice(0, 12).map((row) => el('tr', {},
    el('td', { className: 'table-data', text: row.snapshot_at || row.snapshot_date || '—' }),
    el('td', { className: 'table-data', text: valueOrDash(row.total_value, money) }),
    el('td', { text: Number(row.is_complete) === 1 ? '完整' : '不完整' }),
    el('td', { text: row.incomplete_reason || row.source || '—' }),
    el('td', { className: 'table-data', text: row.created_at || '—' }),
  )));
  $('[data-asset-snapshots-empty]').hidden = Boolean(state.assetSnapshotsError) || rows.length > 0;
  $('[data-asset-snapshots-error]').hidden = !state.assetSnapshotsError;
}

function renderPlan() {
  const plan = state.plan; const configured = Boolean(plan?.updated_at);
  replace($('[data-plan-overview]'), configured ? [el('div', { className: 'plan-grid' }, ...[['起始资金', valueOrDash(plan.initial_capital, money)], ['每月投入', valueOrDash(plan.monthly_invest, money)], ['基准年化', formatPercent(plan.rate_base)], ['周期', `${plan.start_year}–${plan.end_year}`]].map(([label, value]) => el('span', { text: label }, el('strong', { text: value }))))] : []);
  $('[data-plan-empty]').hidden = configured;
}

function renderMemos() {
  const rows = state.memos ?? [];
  replace($('[data-memo-list]'), rows.slice(0, 12).map((row) => {
    const title = `${row.memo_date} · ${tradeLabel(row) || '共同账户'}`;
    const card = el('article', { className: `memo-row${isAdmin() ? ' memo-row--editable' : ''}`, attrs: isAdmin() ? { role: 'button', tabindex: 0, 'aria-label': `编辑备忘录：${title}` } : {}, dataset: isAdmin() ? { editMemo: row.id } : {} },
      el('header', {}, el('strong', { className: 'table-text', text: title }), el('span', { className: row.operation_type === 'sell' ? 'trade-sell' : 'trade-buy', text: row.operation_type === 'sell' ? '卖出' : row.operation_type === 'buy' ? '买入' : row.operation_type || '记录' })),
      el('p', { text: row.reason }), row.note ? el('p', { text: row.note }) : null,
      row.position_category ? el('div', { className: 'memo-category' }, categoryLabel(row.position_category)) : null,
      el('p', { className: 'memo-meta', text: `最后更新：${row.updated_at || row.created_at || '—'}` }),
      row.stop_loss_triggered ? el('span', { className: 'state-overheat', text: '已触发止损' }) : null,
      isAdmin() ? el('div', { className: 'row-actions' }, el('button', { className: 'text-button', text: '编辑', attrs: { type: 'button' }, dataset: { editMemo: row.id } }), el('button', { className: 'text-button text-button--danger', text: '删除', attrs: { type: 'button' }, dataset: { deleteMemo: row.id } })) : null);
    return card;
  }));
  $('[data-memo-empty]').hidden = rows.length > 0;
  for (const node of $$('[data-edit-memo]')) {
    const edit = () => openMemoEdit(Number(node.dataset.editMemo), node);
    node.addEventListener('click', (event) => { event.stopPropagation(); edit(); });
    if (node.matches('article')) node.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); edit(); } });
  }
  for (const button of $$('[data-delete-memo]')) button.addEventListener('click', async (event) => { event.stopPropagation(); await deleteMemo(Number(button.dataset.deleteMemo)); });
}
function renderRules() {
  const risk = (state.rules ?? []).find((row) => row.rule_key === 'risk')?.value;
  const temp = (state.rules ?? []).find((row) => row.rule_key === 'temperature')?.value;
  replace($('[data-rules-list]'), risk || temp ? [el('p', { text: `单标的上限 ${formatPercent(risk?.single_position_active_cap)} · 亏损暂停 ${formatPercent(risk?.loss_pause_ratio)} · 强制止损 ${formatPercent(risk?.stop_loss_ratio)} · 再平衡偏离 ${formatPercent(risk?.rebalance_deviation)}` }), el('p', { text: temp ? `PE 温度：冰点 < ${temp.freeze} · 低温 < ${temp.low} · 常温 < ${temp.normal} · 高温 ≤ ${temp.high}` : 'PE 温度规则未配置。' })] : [el('p', { text: '风险规则尚未配置。' })]);
  replace($('[data-rebalance-list]'), (state.rebalances ?? []).slice(0, 6).map((row) => el('article', { className: 'memo-row rebalance-row' }, el('header', {}, el('strong', { className: 'table-data', text: `${row.year} · ${row.executed_on}` }), el('span', { text: row.confirmed_at ? `已由 ${row.confirmed_by} 确认` : '待 CATI 确认' })), el('p', { className: 'rebalance-adjustments', text: row.adjustments }), el('p', { className: 'rebalance-reason', text: `调整原因：${row.reason}` }), !isAdmin() && !row.confirmed_at ? el('button', { className: 'button-secondary', text: '确认再平衡记录', attrs: { type: 'button' }, dataset: { confirmRebalance: row.id } }) : null)));
  for (const button of $$('[data-confirm-rebalance]')) button.addEventListener('click', () => confirmRebalance(Number(button.dataset.confirmRebalance), button));
}

function renderReviews() {
  const rows = state.reviews ?? [];
  replace($('[data-review-list]'), rows.slice(0, 3).map((row) => el('article', { className: 'review-row' }, el('header', {}, el('strong', { text: `${row.year} 年` }), el('span', { text: row.confirmed_at ? '已确认' : '待确认' })), el('p', { text: row.summary || '没有文字总结。' }), el('p', { text: `回报 ${formatPercent(row.calculation?.dietz?.returnRate)}` }), !isAdmin() && !row.confirmed_at ? el('button', { className: 'button-secondary', text: '确认年度复盘', attrs: { type: 'button' }, dataset: { confirmReview: row.year } }) : null)));
  $('[data-review-empty]').hidden = rows.length > 0;
  for (const button of $$('[data-confirm-review]')) button.addEventListener('click', () => confirmReview(Number(button.dataset.confirmReview), button));
}

function renderRiskSignals() {
  const error = state.riskSignalsError;
  const signals = state.riskSignals;
  const rows = error || !signals ? [] : [
    ['单标的最大亏损', signals.single_position_loss === null || signals.single_position_loss === undefined ? '数据积累中' : formatPercent(signals.single_position_loss)],
    ['对应标的', signals.worst_ticker?.ticker_name || signals.worst_ticker?.ticker || '数据积累中'],
    ['月度回撤', signals.monthly_drawdown === null || signals.monthly_drawdown === undefined ? '数据积累中' : formatPercent(signals.monthly_drawdown)],
    ['年度回撤', signals.annual_drawdown === null || signals.annual_drawdown === undefined ? '数据积累中' : formatPercent(signals.annual_drawdown)],
    ['数据完整性', signals.data_complete ? '完整' : '数据积累中'],
    ['数据缺失原因', signals.missing_reasons?.length ? signals.missing_reasons.join('；') : '—'],
    ['当前信号', signals.signals?.some((signal) => signal.level === 'stop_loss') ? '强制止损提示' : signals.signals?.some((signal) => signal.level === 'yellow') ? '黄色关注' : '无信号'],
  ];
  replace($('[data-risk-signals-list]'), rows.map(([label, value]) => el('article', { className: 'risk-signal-row' }, el('span', { text: label }), el('strong', { text: value }))));
  $('[data-risk-signals-empty]').hidden = Boolean(error) || Boolean(signals);
  $('[data-risk-signals-error]').hidden = !error;
}

function renderAccessLog() {
  const panel = $('[data-access-panel]');
  panel.hidden = !isAdmin();
  replace($('[data-access-rows]'), (state.accessLog ?? []).map((row) => el('article', { className: 'access-log__row' },
    el('time', { className: 'access-log__time', text: row.occurred_at || '—', attrs: { datetime: row.occurred_at || '' }, dataset: { label: '时间' } }),
    el('span', { className: 'access-log__user', text: row.username || '—', dataset: { label: '用户' } }),
    el('span', { className: 'access-log__action', text: row.action || '—', dataset: { label: '动作' } }),
  )));
  $('[data-access-empty]').hidden = (state.accessLog ?? []).length > 0;
  renderPagination('access');
}

function renderPagination(kind) {
  const paging = kind === 'trade' ? state.tradePaging : state.accessPaging; const panel = $(`[data-${kind}-pagination]`);
  panel.hidden = !paging.nextCursor && paging.page === 0; $(`[data-${kind}-prev]`).disabled = paging.page === 0; $(`[data-${kind}-next]`).disabled = !paging.nextCursor; $(`[data-${kind}-page]`).textContent = `第 ${paging.page + 1} 页`;
}

function filtersFor(kind) { return Object.fromEntries([...new FormData($(`[data-${kind}-filters]`))].filter(([, value]) => String(value).trim())); }
async function loadPage(kind, cursor = null, reset = false, move = 1) {
  const paging = kind === 'trade' ? state.tradePaging : state.accessPaging; const params = new URLSearchParams(filtersFor(kind)); if (cursor) params.set('cursor', cursor); params.set('limit', '50');
  const result = await request(`/api/${kind === 'trade' ? 'trades' : 'access-log'}?${params}`); if (kind === 'trade') state.trades = result.trades; else state.accessLog = result.access_log;
  if (reset) { paging.cursors = [null]; paging.page = 0; } else if (cursor && move > 0) { paging.cursors.push(cursor); paging.page += 1; }
  paging.nextCursor = result.nextCursor; if (kind === 'trade') { renderTrades(); renderOverview(); } else renderAccessLog();
}

function renderImportReview() {
  const panel = $('[data-import-review-panel]');
  panel.hidden = true;
  replace($('[data-import-review-list]'), (state.importReview ?? []).map((row) => {
    const input = el('input', { attrs: { maxlength: 2000, placeholder: '说明如何在正式流程中修正' }, dataset: { resolutionNote: row.id } });
    const button = el('button', { text: '结案', attrs: { type: 'button' }, dataset: { resolveReview: row.id } });
    return el('article', { className: 'import-review-row' }, el('header', {}, el('strong', { text: `${row.record_kind} · #${row.row_number}` }), el('span', { text: row.batch_id })), el('pre', { text: JSON.stringify(row.raw, null, 2) }), el('div', { className: 'import-review-controls' }, el('label', { text: '结案说明' }, input), button));
  }));
  $('[data-import-review-empty]').hidden = (state.importReview ?? []).length > 0;
  for (const button of $$('[data-resolve-review]')) button.addEventListener('click', () => resolveImportReview(Number(button.dataset.resolveReview)));
}

function showPendingNotification() {
  const confirmation = state.notifications?.monthly_confirmation;
  if (isAdmin() || !viewerGuidance.hasVisitedHoldings || viewerGuidance.monthlyPromptShown || !confirmation || confirmation.confirmed) return;
  viewerGuidance.monthlyPromptShown = true;
  $('[data-notification-copy]').textContent = `请确认已查阅 ${confirmation.period} 月投资记录。`;
  setDialogOpen($('[data-notification-dialog]'), true);
  $('[data-confirm-month]').hidden = false;
}

function positionSuggestion(row) { return { above_upper: '高于上限', below_lower: '低于下限', normal: '在目标区间', unavailable: '行情不可用', unconfigured: '未配置' }[row.status] ?? '待计算'; }
function peSuggestion(value) { return { aggressively_add: '低估区间：可按计划加仓。', moderately_add: '偏低区间：可适度增加。', normal_dca: '正常区间：按计划定投。', reduce_investment: '偏高区间：降低投入。', pause_or_reduce: '过热区间：暂停或降低投入。' }[value.suggestion] ?? '暂无建议。'; }
function circuitLabel(level) { return { yellow: '黄色', red: '红色', black: '黑色' }[level] ?? level; }
function circuitReason(raw) { try { const parsed = JSON.parse(raw); return parsed.action ?? parsed.reason ?? raw; } catch { return raw || '未记录原因'; } }

function setDialogOpen(dialog, open) {
  if (open) { if (!dialog.open) dialog.showModal(); $('[data-app]').inert = true; }
  else if (dialog.open) dialog.close();
}
function restoreDialog(dialog) { if (![...$$('dialog')].some((item) => item.open)) $('[data-app]').inert = false; const trigger = dialog._trigger; if (trigger) trigger.focus(); }
function openDialog(dialog, trigger) { dialog._trigger = trigger; setDialogOpen(dialog, true); }

async function resolveImportReview(id) {
  const input = $(`[data-resolution-note="${id}"]`);
  try { await request(`/api/import-review/${id}`, { method: 'PATCH', body: JSON.stringify({ resolution_note: input.value }) }); await loadDashboard(); }
  catch (error) { setStatus($('[data-dashboard-status]'), error.message, 'error'); }
}

async function confirmReview(year, button) {
  button.disabled = true;
  try { await request('/api/review/confirm', { method: 'POST', body: JSON.stringify({ year }) }); await loadDashboard(); }
  catch (error) { setStatus($('[data-dashboard-status]'), error.message, 'error'); } finally { button.disabled = false; }
}

async function confirmRebalance(id, button) {
  button.disabled = true;
  try { await request(`/api/rebalances/${id}/confirm`, { method: 'POST', body: '{}' }); await loadDashboard(); }
  catch (error) { setStatus($('[data-dashboard-status]'), error.message, 'error'); } finally { button.disabled = false; }
}

async function deleteMonthly(id) { if (!window.confirm('删除后会保留审计字段，是否继续？')) return; try { await request(`/api/monthly/${id}`, { method: 'DELETE', body: '{}' }); await loadDashboard(); } catch (error) { setStatus($('[data-dashboard-status]'), error.message, 'error'); } }

const loginForm = $('[data-login-form]');
loginForm.addEventListener('submit', async (event) => {
  event.preventDefault(); const status = $('[data-login-status]'); const submit = loginForm.querySelector('button[type="submit"]'); submit.disabled = true; setStatus(status, '正在验证…');
  try { await request('/api/auth/login', { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(loginForm))) }); window.location.reload(); }
  catch (error) { setStatus(status, error.message, 'error'); submit.disabled = false; }
});

$('[data-refresh]').addEventListener('click', () => loadDashboard().catch((error) => setStatus($('[data-dashboard-status]'), error.message, 'error')));
$('[data-logout]').addEventListener('click', async () => { await request('/api/auth/logout', { method: 'POST', body: '{}' }); state.session = null; ++authStateVersion; showLogin(true); });

const tradeDialog = $('[data-trade-dialog]'); const tradeForm = $('[data-trade-form]');
for (const trigger of $$('[data-open-trade], [data-open-trade-secondary]')) trigger.addEventListener('click', () => openTradeNew(trigger));
function setTradeCategoryIndicator() {
  const item = categoryPresentation(tradeForm.elements.position_category.value);
  $('[data-trade-category-control]').style.setProperty('--category-color', item.color);
}
function openTradeNew(trigger) {
  state.editingTrade = null; tradeForm.reset(); tradeForm.elements.trade_date.value = localDateForInput(); $('[data-trade-dialog-title]').textContent = '录入交易'; $('[data-trade-dialog-copy]').textContent = '先填写标的，再确认本次买卖。保存后会保留日期和仓位类别，方便连续录入。'; $('[data-trade-submit]').textContent = '保存并继续录入'; setStatus($('[data-trade-status]'), ''); setTradeTotal(); setTradeCategoryIndicator(); openDialog(tradeDialog, trigger); tradeForm.elements.ticker.focus();
}
function openTradeEdit(id) {
  const trade = state.trades.find((item) => Number(item.id) === id); if (!trade) return; state.editingTrade = trade; for (const [key, value] of Object.entries(trade)) if (tradeForm.elements[key]) tradeForm.elements[key].value = value ?? ''; $('[data-trade-dialog-title]').textContent = '修改最新交易'; $('[data-trade-dialog-copy]').textContent = '只允许修改最新且独立的线上交易，以避免重写导入历史或后续持仓。'; $('[data-trade-submit]').textContent = '保存修改'; setTradeTotal(Number(trade.quantity) * Number(trade.price)); setTradeCategoryIndicator(); openDialog(tradeDialog, document.querySelector(`[data-edit-trade="${id}"]`)); tradeForm.elements.ticker.focus();
}
async function deleteTrade(id) {
  if (!window.confirm('删除后会保留审计记录，并回滚这一笔最新交易形成的持仓快照。是否继续？')) return;
  try { await request(`/api/trades/${id}`, { method: 'DELETE', body: '{}' }); setStatus($('[data-dashboard-status]'), '交易已删除，持仓已回滚。', 'success'); await loadDashboard(); }
  catch (error) { setStatus($('[data-dashboard-status]'), error.message, 'error'); }
}
function setTradeTotal(value) { const total = $('[data-trade-total]'); if (Number.isFinite(value) && value > 0) { total.textContent = money.format(value); delete total.dataset.placeholder; } else { total.textContent = '输入数量和价格后自动计算'; total.dataset.placeholder = 'true'; } }
for (const name of ['quantity', 'price']) tradeForm.elements[name].addEventListener('input', () => setTradeTotal(Number(tradeForm.elements.quantity.value) * Number(tradeForm.elements.price.value)));
tradeForm.elements.position_category.addEventListener('change', setTradeCategoryIndicator);
tradeForm.addEventListener('submit', async (event) => {
  event.preventDefault(); const status = $('[data-trade-status]'); const submit = $('[data-trade-submit]'); submit.disabled = true; setStatus(status, '正在保存…');
  try { const data = Object.fromEntries(new FormData(tradeForm)); data.quantity = Number(data.quantity); data.price = Number(data.price); const editing = state.editingTrade; await request(editing ? `/api/trades/${editing.id}` : '/api/trades', { method: editing ? 'PATCH' : 'POST', body: JSON.stringify(data) }); if (editing) { setDialogOpen(tradeDialog, false); } else { const date = tradeForm.elements.trade_date.value; const category = tradeForm.elements.position_category.value; tradeForm.reset(); tradeForm.elements.trade_date.value = date; tradeForm.elements.position_category.value = category; setTradeTotal(); setTradeCategoryIndicator(); setStatus(status, '已保存，可继续录入下一笔。', 'success'); } await loadDashboard(); if (editing) setStatus($('[data-dashboard-status]'), '交易已更新，持仓已重新计算。', 'success'); if (!editing) tradeForm.elements.ticker.focus(); }
  catch (error) { setStatus(status, error.message, 'error'); } finally { submit.disabled = false; }
});

function connectSimpleDialog(selector, triggerSelector, fill, submitPath, afterSave) {
  const dialog = $(selector); const form = $('form', dialog); for (const trigger of $$(triggerSelector)) trigger.addEventListener('click', () => { form.reset(); fill(form); openDialog(dialog, trigger); });
  form.addEventListener('submit', async (event) => { event.preventDefault(); const status = $('[data-' + selector.slice(6, -7) + '-status]', dialog) ?? $('.form-status', dialog); const submit = $('button[type="submit"]', form); submit.disabled = true; try { const data = Object.fromEntries(new FormData(form)); await request(typeof submitPath === 'function' ? submitPath(data) : submitPath, { method: 'PUT', body: JSON.stringify(data) }); setDialogOpen(dialog, false); await loadDashboard(); afterSave?.(); } catch (error) { setStatus(status, error.message, 'error'); } finally { submit.disabled = false; } }); return dialog;
}
connectSimpleDialog('[data-monthly-dialog]', '[data-open-monthly]', (form) => { form.elements.year_month.value = new Date().toISOString().slice(0, 7); }, '/api/monthly');
connectSimpleDialog('[data-plan-dialog]', '[data-open-plan]', (form) => { if (state.plan) for (const [key, value] of Object.entries(state.plan)) if (form.elements[key]) form.elements[key].value = value; }, '/api/plan');
function connectPostDialog(selector, triggerSelector, fill, path, normalize) {
  const dialog = $(selector); const form = $('form', dialog);
  for (const trigger of $$(triggerSelector)) trigger.addEventListener('click', () => { form.reset(); fill(form); setStatus($('.form-status', dialog), ''); openDialog(dialog, trigger); });
  form.addEventListener('submit', async (event) => { event.preventDefault(); const submit = $('button[type="submit"]', form); const status = $('.form-status', dialog); submit.disabled = true; try { await request(path, { method: 'POST', body: JSON.stringify(normalize(Object.fromEntries(new FormData(form)), form)) }); setDialogOpen(dialog, false); await loadDashboard(); } catch (error) { setStatus(status, error.message, 'error'); } finally { submit.disabled = false; } });
}
const cashFlowDialog = $('[data-cash-flow-dialog]'); const cashFlowForm = $('[data-cash-flow-form]');
function openCashFlowNew(trigger) {
  state.editingCashFlow = null; cashFlowForm.reset(); cashFlowForm.elements.occurred_on.value = localDateForInput(); cashFlowForm.elements.manager_share_offset.value = '0';
  $('h2', cashFlowDialog).textContent = '记录真实现金流'; $('button[type="submit"]', cashFlowForm).textContent = '保存现金流'; setStatus($('.form-status', cashFlowDialog), ''); openDialog(cashFlowDialog, trigger);
}
function openCashFlowEdit(id, trigger) {
  const cashFlow = state.cashFlows.find((row) => Number(row.id) === id); if (!cashFlow) return;
  state.editingCashFlow = cashFlow; cashFlowForm.reset(); for (const [key, value] of Object.entries(cashFlow)) if (cashFlowForm.elements[key]) cashFlowForm.elements[key].value = value ?? '';
  $('h2', cashFlowDialog).textContent = '编辑真实现金流'; $('button[type="submit"]', cashFlowForm).textContent = '保存修改'; setStatus($('.form-status', cashFlowDialog), ''); openDialog(cashFlowDialog, trigger);
}
for (const trigger of $$('[data-open-cash-flow]')) trigger.addEventListener('click', (event) => openCashFlowNew(event.currentTarget));
cashFlowForm.addEventListener('submit', async (event) => {
  event.preventDefault(); const submit = $('button[type="submit"]', cashFlowForm); const status = $('.form-status', cashFlowDialog); submit.disabled = true;
  try { const editing = state.editingCashFlow; await request(editing ? `/api/cash-flows/${editing.id}` : '/api/cash-flows', { method: editing ? 'PATCH' : 'POST', body: JSON.stringify(Object.fromEntries(new FormData(cashFlowForm))) }); setDialogOpen(cashFlowDialog, false); await loadDashboard(); }
  catch (error) { setStatus(status, error.message, 'error'); } finally { submit.disabled = false; }
});
async function deleteCashFlow(id) {
  if (!window.confirm('删除后会保留审计记录，是否继续？')) return;
  try { await request(`/api/cash-flows/${id}`, { method: 'DELETE', body: '{}' }); await loadDashboard(); setStatus($('[data-dashboard-status]'), '现金流已删除。', 'success'); }
  catch (error) { setStatus($('[data-dashboard-status]'), error.message, 'error'); }
}
const accountEventDialog = $('[data-account-event-dialog]'); const accountEventForm = $('[data-account-event-form]');
function openAccountEventNew(trigger) { state.editingAccountEvent = null; accountEventForm.reset(); accountEventForm.elements.event_date.value = localDateForInput(); $('h2', accountEventDialog).textContent = '记录账户事件'; $('button[type="submit"]', accountEventForm).textContent = '保存账户事件'; setStatus($('[data-account-event-status]'), ''); openDialog(accountEventDialog, trigger); }
function openAccountEventEdit(id, trigger) { const event = state.accountEvents.find((row) => Number(row.id) === id); if (!event) return; state.editingAccountEvent = event; accountEventForm.reset(); for (const [key, value] of Object.entries(event)) if (accountEventForm.elements[key]) accountEventForm.elements[key].value = value ?? ''; $('h2', accountEventDialog).textContent = '编辑账户事件'; $('button[type="submit"]', accountEventForm).textContent = '保存修改'; setStatus($('[data-account-event-status]'), ''); openDialog(accountEventDialog, trigger); }
for (const trigger of $$('[data-open-account-event]')) trigger.addEventListener('click', (event) => openAccountEventNew(event.currentTarget));
accountEventForm.addEventListener('submit', async (event) => { event.preventDefault(); const submit = $('button[type="submit"]', accountEventForm); submit.disabled = true; try { const editing = state.editingAccountEvent; await request(editing ? `/api/account-events/${editing.id}` : '/api/account-events', { method: editing ? 'PATCH' : 'POST', body: JSON.stringify(Object.fromEntries(new FormData(accountEventForm))) }); setDialogOpen(accountEventDialog, false); await loadDashboard(); } catch (error) { setStatus($('[data-account-event-status]'), error.message, 'error'); } finally { submit.disabled = false; } });
async function deleteAccountEvent(id) { if (!window.confirm('删除后会保留审计记录，是否继续？')) return; try { await request(`/api/account-events/${id}`, { method: 'DELETE', body: '{}' }); await loadDashboard(); setStatus($('[data-dashboard-status]'), '账户事件已删除。', 'success'); } catch (error) { setStatus($('[data-dashboard-status]'), error.message, 'error'); } }
connectPostDialog('[data-asset-snapshot-dialog]', '[data-open-asset-snapshot]', (form) => { form.elements.snapshot_at.value = new Date().toISOString().slice(0, 16); form.elements.is_complete.checked = true; }, '/api/assets/snapshots', (data, form) => ({ ...data, is_complete: form.elements.is_complete.checked }));
const memoDialog = $('[data-memo-dialog]'); const memoForm = $('[data-memo-form]');
$('[data-open-memo]').addEventListener('click', (event) => openMemoNew(event.currentTarget));
function tradeLabel(trade) { return trade.ticker_name ? `${trade.ticker} · ${trade.ticker_name}` : trade.ticker; }
function memoSnapshotSource() {
  const editing = state.editingMemo;
  if (editing) return { trade_date: editing.memo_date, ticker: editing.ticker, ticker_name: editing.ticker_name, position_category: editing.position_category, direction: editing.operation_type, quantity: editing.trade_quantity, price: editing.trade_price };
  return state.trades.find((row) => String(row.id) === memoForm.elements.trade_id.value) ?? null;
}
function populateMemoTrades(selectedId = '') {
  const select = memoForm.elements.trade_id;
  replace(select, [el('option', { text: '请选择交易', attrs: { value: '' } }), ...state.trades.map((trade) => el('option', { text: `${trade.trade_date} · ${tradeLabel(trade)} · ${trade.direction === 'sell' ? '卖出' : '买入'}`, attrs: { value: trade.id } }))]);
  select.value = String(selectedId);
}
function setMemoTradeSnapshot() {
  const trade = memoSnapshotSource(); const snapshot = $('[data-memo-trade-snapshot]'); snapshot.hidden = !trade; if (!trade) return;
  const quantity = Number(trade.quantity); const price = Number(trade.price);
  $('[data-memo-trade-date]').textContent = trade.trade_date || '—';
  $('[data-memo-trade-ticker]').textContent = tradeLabel(trade) || '—';
  $('[data-memo-trade-category]').replaceChildren(categoryLabel(trade.position_category));
  $('[data-memo-trade-direction]').textContent = trade.direction === 'sell' ? '卖出' : trade.direction === 'buy' ? '买入' : '—';
  $('[data-memo-trade-quantity]').textContent = Number.isFinite(quantity) ? number.format(quantity) : '—';
  $('[data-memo-trade-price]').textContent = Number.isFinite(price) ? money.format(price) : '—';
  $('[data-memo-trade-total]').textContent = Number.isFinite(quantity * price) ? money.format(quantity * price) : '—';
}
function openMemoNew(trigger) {
  state.editingMemo = null; memoForm.reset(); memoForm.elements.trade_id.disabled = false; populateMemoTrades(); setMemoTradeSnapshot();
  $('[data-memo-dialog-title]').textContent = '记录投资判断'; $('[data-memo-dialog-copy]').textContent = '每笔交易只能关联一条备忘录。交易信息会作为历史快照保存，不能在备忘录中修改。'; $('[data-memo-submit]').textContent = '保存备忘录'; setStatus($('[data-memo-status]'), ''); openDialog(memoDialog, trigger);
}
function openMemoForTrade(id, trigger) { openMemoNew(trigger); memoForm.elements.trade_id.value = String(id); setMemoTradeSnapshot(); }
function openMemoEdit(id, trigger) {
  const memo = state.memos.find((row) => Number(row.id) === id); if (!memo) return;
  state.editingMemo = memo; memoForm.reset(); populateMemoTrades(memo.trade_id); memoForm.elements.trade_id.disabled = true; memoForm.elements.reason.value = memo.reason ?? ''; memoForm.elements.note.value = memo.note ?? ''; memoForm.elements.stop_loss_triggered.checked = Boolean(memo.stop_loss_triggered); setMemoTradeSnapshot();
  $('[data-memo-dialog-title]').textContent = '编辑投资备忘录'; $('[data-memo-dialog-copy]').textContent = '关联交易和历史快照已锁定；可修改判断内容与止损标记。'; $('[data-memo-submit]').textContent = '保存修改'; setStatus($('[data-memo-status]'), ''); openDialog(memoDialog, trigger); memoForm.elements.reason.focus();
}
async function deleteMemo(id) {
  if (!window.confirm('删除后会保留审计字段，是否继续？')) return;
  try { await request(`/api/memos/${id}`, { method: 'DELETE', body: '{}' }); setStatus($('[data-dashboard-status]'), '备忘录已删除。', 'success'); await loadDashboard(); }
  catch (error) { setStatus($('[data-dashboard-status]'), error.message, 'error'); }
}
memoForm.elements.trade_id.addEventListener('change', setMemoTradeSnapshot);
memoForm.addEventListener('submit', async (event) => { event.preventDefault(); const submit = $('[data-memo-submit]'); submit.disabled = true; try { const input = Object.fromEntries(new FormData(memoForm)); const editing = state.editingMemo; input.trade_id = Number(editing?.trade_id ?? input.trade_id); input.stop_loss_triggered = memoForm.elements.stop_loss_triggered.checked; await request(editing ? `/api/memos/${editing.id}` : '/api/memos', { method: editing ? 'PATCH' : 'POST', body: JSON.stringify(input) }); setDialogOpen(memoDialog, false); await loadDashboard(); setStatus($('[data-dashboard-status]'), editing ? '备忘录已更新。' : '备忘录已保存。', 'success'); } catch (error) { setStatus($('[data-memo-status]'), error.message, 'error'); } finally { submit.disabled = false; } });
$('[data-cancel-memo]').addEventListener('click', () => setDialogOpen(memoDialog, false));

const rulesDialog = $('[data-rules-dialog]'); const rulesForm = $('[data-rules-form]');
$('[data-open-rules]').addEventListener('click', (event) => { const risk = (state.rules ?? []).find((row) => row.rule_key === 'risk')?.value ?? {}; const temperature = (state.rules ?? []).find((row) => row.rule_key === 'temperature')?.value ?? {}; for (const [key, value] of Object.entries({ ...risk, ...temperature })) if (rulesForm.elements[key]) rulesForm.elements[key].value = value; setStatus($('[data-rules-status]'), ''); openDialog(rulesDialog, event.currentTarget); });
rulesForm.addEventListener('submit', async (event) => { event.preventDefault(); const submit = rulesForm.querySelector('button[type="submit"]'); submit.disabled = true; try { const value = Object.fromEntries(new FormData(rulesForm)); const risk = {}; const temperature = {}; for (const [key, raw] of Object.entries(value)) (['freeze', 'low', 'normal', 'high'].includes(key) ? temperature : risk)[key] = Number(raw); await request('/api/risk-rules', { method: 'PUT', body: JSON.stringify({ rule_key: 'risk', value: risk }) }); await request('/api/risk-rules', { method: 'PUT', body: JSON.stringify({ rule_key: 'temperature', value: temperature }) }); setDialogOpen(rulesDialog, false); await loadDashboard(); } catch (error) { setStatus($('[data-rules-status]'), error.message, 'error'); } finally { submit.disabled = false; } });

const objectionDialog = $('[data-objection-dialog]'); const objectionForm = $('[data-objection-form]');
$('[data-objection]').addEventListener('click', (event) => openDialog(objectionDialog, event.currentTarget)); objectionForm.addEventListener('submit', async (event) => { event.preventDefault(); try { await request('/api/circuit/objection', { method: 'POST', body: JSON.stringify({ reason: new FormData(objectionForm).get('reason') }) }); objectionForm.reset(); setDialogOpen(objectionDialog, false); await loadDashboard(); } catch (error) { setStatus($('[data-objection-status]'), error.message, 'error'); } });

const reviewDialog = $('[data-review-dialog]'); const reviewForm = $('[data-review-form]');
$('[data-open-review]').addEventListener('click', (event) => { reviewForm.elements.year.value = String(new Date().getFullYear()); setStatus($('[data-review-status]'), ''); openDialog(reviewDialog, event.currentTarget); reviewForm.elements.year.focus(); });
reviewForm.addEventListener('submit', async (event) => { event.preventDefault(); const submit = $('button[type="submit"]', reviewForm); submit.disabled = true; try { const data = new FormData(reviewForm); await request('/api/review/calculate', { method: 'POST', body: JSON.stringify({ year: Number(data.get('year')), summary: data.get('summary') }) }); setDialogOpen(reviewDialog, false); await loadDashboard(); } catch (error) { setStatus($('[data-review-status]'), error.message, 'error'); } finally { submit.disabled = false; } });

const riskDialog = $('[data-risk-dialog]'); const riskForm = $('[data-risk-form]');
$('[data-open-risk]').addEventListener('click', (event) => { openDialog(riskDialog, event.currentTarget); riskForm.elements.annualDrawdown.focus(); }); riskForm.addEventListener('submit', async (event) => { event.preventDefault(); try { const data = new FormData(riskForm); const result = await request('/api/circuit/evaluate', { method: 'POST', body: JSON.stringify({ annualDrawdown: Number(data.get('annualDrawdown')), monthlyDrawdown: Number(data.get('monthlyDrawdown')), maximumPositionLoss: Number(data.get('maximumPositionLoss')), catiObjection: false }) }); setDialogOpen(riskDialog, false); setStatus($('[data-dashboard-status]'), result.state.level === 'none' ? '当前指标未触发熔断。' : '熔断状态已记录。', result.state.level === 'none' ? 'success' : 'error'); await loadDashboard(); } catch (error) { setStatus($('[data-risk-status]'), error.message, 'error'); } });

$('[data-resolve-circuit]').addEventListener('click', async (event) => { if (!state.circuit?.id) return; event.currentTarget.disabled = true; try { const result = await request(`/api/circuit/${state.circuit.id}/confirm-resolve`, { method: 'POST', body: JSON.stringify({ note: 'Confirmed through Finance workspace' }) }); setStatus($('[data-dashboard-status]'), result.resolved ? '双方已确认，黑色暂停已解除。' : `已记录确认，等待 ${result.waiting_for === 'viewer' ? 'CATI' : '木下'} 确认。`, 'success'); await loadDashboard(); } catch (error) { setStatus($('[data-dashboard-status]'), error.message, 'error'); } finally { event.currentTarget.disabled = false; } });

for (const tab of $$('[data-tab]')) tab.addEventListener('click', () => setTab(tab.dataset.tab));
function setTab(tab) {
  const previousTab = $('[data-tab].is-active')?.dataset.tab;
  for (const button of $$('[data-tab]')) {
    const active = button.dataset.tab === tab;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  }
  for (const pane of $$('[data-pane]')) pane.hidden = pane.dataset.pane !== tab;
  if (!isAdmin() && tab === 'holdings') viewerGuidance.hasVisitedHoldings = true;
  if (!isAdmin() && previousTab === 'holdings' && tab !== 'holdings') showPendingNotification();
  window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
}
$('[data-trade-filters]').addEventListener('submit', (event) => { event.preventDefault(); loadPage('trade', null, true).catch((error) => setStatus($('[data-dashboard-status]'), error.message, 'error')); });
$('[data-access-filters]').addEventListener('submit', (event) => { event.preventDefault(); loadPage('access', null, true).catch((error) => setStatus($('[data-dashboard-status]'), error.message, 'error')); });
for (const kind of ['trade', 'access']) { $(`[data-${kind}-filters]`).addEventListener('reset', () => setTimeout(() => loadPage(kind, null, true).catch((error) => setStatus($('[data-dashboard-status]'), error.message, 'error')))); $(`[data-${kind}-next]`).addEventListener('click', () => { const paging = kind === 'trade' ? state.tradePaging : state.accessPaging; if (paging.nextCursor) loadPage(kind, paging.nextCursor).catch((error) => setStatus($('[data-dashboard-status]'), error.message, 'error')); }); $(`[data-${kind}-prev]`).addEventListener('click', () => { const paging = kind === 'trade' ? state.tradePaging : state.accessPaging; if (!paging.page) return; paging.cursors.pop(); paging.page -= 1; loadPage(kind, paging.cursors.at(-1), false, -1).catch((error) => setStatus($('[data-dashboard-status]'), error.message, 'error')); }); }
$('[data-export-archive]').addEventListener('click', () => { const year = state.reviews[0]?.year ?? new Date().getFullYear(); window.location.assign(`${apiBase}/api/archive?year=${encodeURIComponent(year)}`); });
const notificationDialog = $('[data-notification-dialog]');
$('[data-confirm-notification]').addEventListener('click', async (event) => { const period = state.notifications?.monthly_confirmation?.period; if (!period) return; await confirmMonth(period, event.currentTarget, $('[data-notification-status]')); setDialogOpen(notificationDialog, false); await loadDashboard(); });
$('[data-confirm-month]').addEventListener('click', (event) => { const period = state.notifications?.monthly_confirmation?.period; if (period) confirmMonth(period, event.currentTarget, $('[data-dashboard-status]')); });
async function confirmMonth(period, button, status) { button.disabled = true; try { const result = await request('/api/confirmations/monthly', { method: 'POST', body: JSON.stringify({ period }) }); setStatus(status, result.created ? `已确认 ${period} 月记录。` : `${period} 月记录此前已确认。`, 'success'); } catch (error) { setStatus(status, error.message, 'error'); } finally { button.disabled = false; } }

for (const dialog of $$('dialog')) { dialog.addEventListener('close', () => restoreDialog(dialog)); for (const button of $$('[data-close-dialog]', dialog)) button.addEventListener('click', () => setDialogOpen(dialog, false)); }
$('[data-cancel-trade]').addEventListener('click', () => setDialogOpen(tradeDialog, false));
setTab('overview');
boot();
