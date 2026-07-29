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
function replace(node, children) { node.replaceChildren(...children); }
const apiBase = document.querySelector('meta[name="finance-api-base"]')?.content.replace(/\/$/, '') ?? '';
const money = new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', maximumFractionDigits: 2 });
const number = new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2 });
const state = {
  session: null, holdings: null, trades: [], pe: [], circuit: null, reviews: [], notifications: null,
  accessLog: [], importReview: [], monthly: [], plan: null, memos: [], rules: [], rebalances: [], editingTrade: null,
};
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
  for (const node of $$('[data-open-trade], [data-open-trade-secondary], [data-open-review], [data-open-risk], [data-export-archive], [data-open-monthly], [data-open-plan], [data-open-memo], [data-open-rules]')) node.hidden = !isAdmin();
}

async function loadDashboard() {
  setStatus($('[data-dashboard-status]'), '正在读取已持久化的 Finance 数据…');
  const calls = [
    request('/api/holdings'), request('/api/trades'), request('/api/pe'), request('/api/circuit'), request('/api/review'),
    request('/api/notifications'), request('/api/monthly'), request('/api/plan'), request('/api/memos'), request('/api/risk-rules'), request('/api/rebalances'),
  ];
  if (isAdmin()) calls.push(request('/api/access-log'), request('/api/import-review'));
  const results = await Promise.all(calls);
  [state.holdings, { trades: state.trades }, { indexes: state.pe }, { active: state.circuit }, { reviews: state.reviews }, state.notifications,
    { records: state.monthly }, { plan: state.plan }, { memos: state.memos }, { rules: state.rules }, { rebalances: state.rebalances }] = results.slice(0, 11);
  if (isAdmin()) {
    state.accessLog = results[11].access_log;
    state.importReview = results[12].review;
  } else {
    state.accessLog = [];
    state.importReview = [];
  }
  renderDashboard();
  setStatus($('[data-dashboard-status]'), '');
}

function renderDashboard() {
  renderCircuitBanner(); renderSummary(); renderHoldings(); renderPositions(); renderPe(); renderTrades(); renderMonthly(); renderPlan(); renderReviews(); renderMemos(); renderRules(); renderAccessLog(); renderImportReview(); showPendingNotification();
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
  $('[data-total-value]').textContent = holdings?.total_market_value === null ? '行情不完整' : valueOrDash(holdings?.total_market_value, money);
  $('[data-holding-count]').textContent = String(holdings?.holdings?.length ?? 0);
  const stale = holdings?.holdings?.some((item) => item.stale);
  $('[data-market-freshness]').textContent = !holdings?.holdings?.length ? '没有持仓数据' : !holdings.market_data_complete ? '部分标的没有行情快照' : stale ? '含超过 30 分钟的行情快照' : '行情快照完整且在有效窗口内';
  $('[data-circuit-level]').textContent = state.circuit ? circuitLabel(state.circuit.level) : '正常';
  $('[data-circuit-action]').textContent = state.circuit ? circuitReason(state.circuit.reason) : '未发现未解除的熔断记录';
}

function renderHoldings() {
  const rows = state.holdings?.holdings ?? [];
  replace($('[data-holdings-body]'), rows.map((row) => el('tr', {},
    el('td', {}, el('strong', { text: row.ticker }), row.stale ? el('small', { className: 'stale-flag', text: '行情过期' }) : null),
    ...[valueOrDash(row.quantity), valueOrDash(row.avg_cost, money), valueOrDash(row.price, money), valueOrDash(row.market_value, money)].map((value) => el('td', { text: value })),
    el('td', { className: Number(row.pnl) >= 0 ? 'value-up' : 'value-down', text: valueOrDash(row.pnl, money) }),
  )));
  $('[data-holdings-empty]').hidden = rows.length > 0;
  $('[data-holdings-state]').textContent = !rows.length ? '无数据' : state.holdings.market_data_complete ? '真实行情' : '行情不完整';
}

function renderPositions() {
  const rows = state.holdings?.positions ?? [];
  replace($('[data-position-list]'), rows.map((row) => {
    const current = row.current_ratio === null ? null : Number(row.current_ratio); const target = row.target_ratio === undefined ? null : Number(row.target_ratio);
    const track = el('div', { className: 'allocation-track', attrs: { 'aria-label': `当前 ${formatPercent(current)}，目标 ${formatPercent(target)}` } },
      el('i', { style: { width: `${Math.min(100, Math.max(0, (current ?? 0) * 100))}%` } }), el('b', { style: { left: `${Math.min(100, Math.max(0, (target ?? 0) * 100))}%` } }));
    return el('article', { className: 'position-row' }, el('header', {}, el('strong', { text: row.position_category }), el('span', { className: `state-${row.status}`, text: positionSuggestion(row) })), track, el('p', { text: `当前 ${formatPercent(current)} · 目标 ${formatPercent(target)} · 建议 ${formatPercent(row.suggestedChange)}` }));
  }));
  $('[data-position-empty]').hidden = rows.length > 0;
}

function renderPe() {
  const rows = state.pe ?? []; const zones = ['freeze', 'low', 'normal', 'high', 'overheat'];
  replace($('[data-pe-list]'), rows.map((row) => el('article', { className: 'pe-row' },
    el('header', {}, el('strong', { text: row.ticker }), el('span', { className: `state-${row.temperature?.zone ?? 'unavailable'}`, text: row.pe_ttm === null ? '数据不可用' : `${number.format(row.pe_ttm)} PE` })),
    el('div', { className: 'pe-scale' }, ...zones.map((zone) => el('i', { className: `pe-scale__segment pe-scale__segment--${zone}`, attrs: row.temperature?.zone === zone ? { 'data-active': '' } : {} }))),
    el('p', { text: row.temperature ? peSuggestion(row.temperature) : row.stale ? 'PE 数据过期或不可用。' : '暂无 PE 数据。' }),
  )));
  $('[data-pe-empty]').hidden = rows.length > 0;
}

function renderTrades() {
  const rows = state.trades ?? [];
  replace($('[data-trades-body]'), rows.map((row) => {
    const actions = el('td', { text: '—' });
    if (isAdmin()) { const edit = el('button', { className: 'text-button', text: '修改', attrs: { type: 'button' }, dataset: { editTrade: row.id } }); const remove = el('button', { className: 'text-button text-button--danger', text: '删除', attrs: { type: 'button' }, dataset: { deleteTrade: row.id } }); actions.replaceChildren(el('div', { className: 'row-actions' }, edit, remove)); }
    return el('tr', {}, ...[row.trade_date, row.ticker_name || row.ticker].map((value) => el('td', { text: value })), el('td', { className: row.direction === 'buy' ? 'value-up' : 'value-down', text: row.direction === 'buy' ? '买入' : '卖出' }), el('td', { text: valueOrDash(row.quantity) }), el('td', { text: valueOrDash(row.price, money) }), el('td', { text: row.position_category }), el('td', { text: row.reason || '—' }), actions);
  }));
  $('[data-trades-empty]').hidden = rows.length > 0;
  for (const button of $$('[data-edit-trade]')) button.addEventListener('click', () => openTradeEdit(Number(button.dataset.editTrade)));
  for (const button of $$('[data-delete-trade]')) button.addEventListener('click', () => deleteTrade(Number(button.dataset.deleteTrade)));
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

function renderPlan() {
  const plan = state.plan; const configured = Boolean(plan?.updated_at);
  replace($('[data-plan-overview]'), configured ? [el('div', { className: 'plan-grid' }, ...[['起始资金', valueOrDash(plan.initial_capital, money)], ['每月投入', valueOrDash(plan.monthly_invest, money)], ['基准年化', formatPercent(plan.rate_base)], ['周期', `${plan.start_year}–${plan.end_year}`]].map(([label, value]) => el('span', { text: label }, el('strong', { text: value }))))] : []);
  $('[data-plan-empty]').hidden = configured;
}

function renderMemos() {
  const rows = state.memos ?? [];
  replace($('[data-memo-list]'), rows.slice(0, 12).map((row) => el('article', { className: 'memo-row' }, el('header', {}, el('strong', { text: `${row.memo_date} · ${row.ticker || '共同账户'}` }), el('span', { text: row.operation_type || '记录' })), el('p', { text: row.reason }), row.note ? el('p', { text: row.note }) : null, row.stop_loss_triggered ? el('span', { className: 'state-overheat', text: '已触发止损' }) : null)));
  $('[data-memo-empty]').hidden = rows.length > 0;
}
function renderRules() {
  const risk = (state.rules ?? []).find((row) => row.rule_key === 'risk')?.value;
  const temp = (state.rules ?? []).find((row) => row.rule_key === 'temperature')?.value;
  replace($('[data-rules-list]'), risk || temp ? [el('p', { text: `单标的上限 ${formatPercent(risk?.single_position_active_cap)} · 亏损暂停 ${formatPercent(risk?.loss_pause_ratio)} · 强制止损 ${formatPercent(risk?.stop_loss_ratio)} · 再平衡偏离 ${formatPercent(risk?.rebalance_deviation)}` }), el('p', { text: temp ? `PE 温度：冰点 < ${temp.freeze} · 低温 < ${temp.low} · 常温 < ${temp.normal} · 高温 ≤ ${temp.high}` : 'PE 温度规则未配置。' })] : [el('p', { text: '风险规则尚未配置。' })]);
  replace($('[data-rebalance-list]'), (state.rebalances ?? []).slice(0, 6).map((row) => el('article', { className: 'memo-row' }, el('strong', { text: `${row.year} · ${row.executed_on}` }), el('p', { text: `${row.adjustments} · ${row.reason}` }), el('span', { text: row.confirmed_at ? `已由 ${row.confirmed_by} 确认` : '待 CATI 确认' }), !isAdmin() && !row.confirmed_at ? el('button', { className: 'button-secondary', text: '确认再平衡记录', attrs: { type: 'button' }, dataset: { confirmRebalance: row.id } }) : null)));
  for (const button of $$('[data-confirm-rebalance]')) button.addEventListener('click', () => confirmRebalance(Number(button.dataset.confirmRebalance), button));
}

function renderReviews() {
  const rows = state.reviews ?? [];
  replace($('[data-review-list]'), rows.slice(0, 3).map((row) => el('article', { className: 'review-row' }, el('header', {}, el('strong', { text: `${row.year} 年` }), el('span', { text: row.confirmed_at ? '已确认' : '待确认' })), el('p', { text: row.summary || '没有文字总结。' }), el('p', { text: `回报 ${formatPercent(row.calculation?.dietz?.returnRate)}` }), !isAdmin() && !row.confirmed_at ? el('button', { className: 'button-secondary', text: '确认年度复盘', attrs: { type: 'button' }, dataset: { confirmReview: row.year } }) : null)));
  $('[data-review-empty]').hidden = rows.length > 0;
  for (const button of $$('[data-confirm-review]')) button.addEventListener('click', () => confirmReview(Number(button.dataset.confirmReview), button));
}

function renderAccessLog() {
  const panel = $('[data-access-panel]');
  panel.hidden = !isAdmin();
  replace($('[data-access-list]'), (state.accessLog ?? []).map((row) => el('p', { text: `${row.occurred_at} · ${row.username} · ${row.action}` })));
  $('[data-access-empty]').hidden = (state.accessLog ?? []).length > 0;
}

function renderImportReview() {
  const panel = $('[data-import-review-panel]');
  panel.hidden = !isAdmin();
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
  if (!confirmation || confirmation.confirmed) return;
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
function openTradeNew(trigger) {
  state.editingTrade = null; tradeForm.reset(); tradeForm.elements.trade_date.value = localDateForInput(); $('[data-trade-dialog-title]').textContent = '录入交易'; $('[data-trade-dialog-copy]').textContent = '先填写标的，再确认本次买卖。保存后会保留日期和仓位类别，方便连续录入。'; $('[data-trade-submit]').textContent = '保存并继续录入'; setStatus($('[data-trade-status]'), ''); setTradeTotal(); openDialog(tradeDialog, trigger); tradeForm.elements.ticker.focus();
}
function openTradeEdit(id) {
  const trade = state.trades.find((item) => Number(item.id) === id); if (!trade) return; state.editingTrade = trade; for (const [key, value] of Object.entries(trade)) if (tradeForm.elements[key]) tradeForm.elements[key].value = value ?? ''; $('[data-trade-dialog-title]').textContent = '修改最新交易'; $('[data-trade-dialog-copy]').textContent = '只允许修改最新且独立的线上交易，以避免重写导入历史或后续持仓。'; $('[data-trade-submit]').textContent = '保存修改'; setTradeTotal(Number(trade.quantity) * Number(trade.price)); openDialog(tradeDialog, document.querySelector(`[data-edit-trade="${id}"]`)); tradeForm.elements.ticker.focus();
}
async function deleteTrade(id) {
  if (!window.confirm('删除后会保留审计记录，并回滚这一笔最新交易形成的持仓快照。是否继续？')) return;
  try { await request(`/api/trades/${id}`, { method: 'DELETE', body: '{}' }); setStatus($('[data-dashboard-status]'), '交易已删除，持仓已回滚。', 'success'); await loadDashboard(); }
  catch (error) { setStatus($('[data-dashboard-status]'), error.message, 'error'); }
}
function setTradeTotal(value) { const total = $('[data-trade-total]'); if (Number.isFinite(value) && value > 0) { total.textContent = money.format(value); delete total.dataset.placeholder; } else { total.textContent = '输入数量和价格后自动计算'; total.dataset.placeholder = 'true'; } }
for (const name of ['quantity', 'price']) tradeForm.elements[name].addEventListener('input', () => setTradeTotal(Number(tradeForm.elements.quantity.value) * Number(tradeForm.elements.price.value)));
tradeForm.addEventListener('submit', async (event) => {
  event.preventDefault(); const status = $('[data-trade-status]'); const submit = $('[data-trade-submit]'); submit.disabled = true; setStatus(status, '正在保存…');
  try { const data = Object.fromEntries(new FormData(tradeForm)); data.quantity = Number(data.quantity); data.price = Number(data.price); const editing = state.editingTrade; await request(editing ? `/api/trades/${editing.id}` : '/api/trades', { method: editing ? 'PATCH' : 'POST', body: JSON.stringify(data) }); if (editing) { setDialogOpen(tradeDialog, false); } else { const date = tradeForm.elements.trade_date.value; const category = tradeForm.elements.position_category.value; tradeForm.reset(); tradeForm.elements.trade_date.value = date; tradeForm.elements.position_category.value = category; setTradeTotal(); setStatus(status, '已保存，可继续录入下一笔。', 'success'); } await loadDashboard(); if (editing) setStatus($('[data-dashboard-status]'), '交易已更新，持仓已重新计算。', 'success'); if (!editing) tradeForm.elements.ticker.focus(); }
  catch (error) { setStatus(status, error.message, 'error'); } finally { submit.disabled = false; }
});

function connectSimpleDialog(selector, triggerSelector, fill, submitPath, afterSave) {
  const dialog = $(selector); const form = $('form', dialog); for (const trigger of $$(triggerSelector)) trigger.addEventListener('click', () => { form.reset(); fill(form); openDialog(dialog, trigger); });
  form.addEventListener('submit', async (event) => { event.preventDefault(); const status = $('[data-' + selector.slice(6, -7) + '-status]', dialog) ?? $('.form-status', dialog); const submit = $('button[type="submit"]', form); submit.disabled = true; try { const data = Object.fromEntries(new FormData(form)); await request(typeof submitPath === 'function' ? submitPath(data) : submitPath, { method: 'PUT', body: JSON.stringify(data) }); setDialogOpen(dialog, false); await loadDashboard(); afterSave?.(); } catch (error) { setStatus(status, error.message, 'error'); } finally { submit.disabled = false; } }); return dialog;
}
connectSimpleDialog('[data-monthly-dialog]', '[data-open-monthly]', (form) => { form.elements.year_month.value = new Date().toISOString().slice(0, 7); }, '/api/monthly');
connectSimpleDialog('[data-plan-dialog]', '[data-open-plan]', (form) => { if (state.plan) for (const [key, value] of Object.entries(state.plan)) if (form.elements[key]) form.elements[key].value = value; }, '/api/plan');
const memoDialog = $('[data-memo-dialog]'); const memoForm = $('[data-memo-form]');
$('[data-open-memo]').addEventListener('click', (event) => { memoForm.reset(); memoForm.elements.memo_date.value = localDateForInput(); setStatus($('[data-memo-status]'), ''); openDialog(memoDialog, event.currentTarget); });
memoForm.addEventListener('submit', async (event) => { event.preventDefault(); const submit = memoForm.querySelector('button[type="submit"]'); submit.disabled = true; try { const input = Object.fromEntries(new FormData(memoForm)); input.stop_loss_triggered = memoForm.elements.stop_loss_triggered.checked; await request('/api/memos', { method: 'POST', body: JSON.stringify(input) }); setDialogOpen(memoDialog, false); await loadDashboard(); } catch (error) { setStatus($('[data-memo-status]'), error.message, 'error'); } finally { submit.disabled = false; } });

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
function setTab(tab) { for (const button of $$('[data-tab]')) button.classList.toggle('is-active', button.dataset.tab === tab); for (const pane of $$('[data-pane]')) pane.hidden = pane.dataset.pane !== tab; window.scrollTo({ top: 0, behavior: 'smooth' }); }
$('[data-export-archive]').addEventListener('click', () => { const year = state.reviews[0]?.year ?? new Date().getFullYear(); window.location.assign(`${apiBase}/api/archive?year=${encodeURIComponent(year)}`); });
const notificationDialog = $('[data-notification-dialog]');
$('[data-confirm-notification]').addEventListener('click', async (event) => { const period = state.notifications?.monthly_confirmation?.period; if (!period) return; await confirmMonth(period, event.currentTarget, $('[data-notification-status]')); setDialogOpen(notificationDialog, false); await loadDashboard(); });
$('[data-confirm-month]').addEventListener('click', (event) => { const period = state.notifications?.monthly_confirmation?.period; if (period) confirmMonth(period, event.currentTarget, $('[data-dashboard-status]')); });
async function confirmMonth(period, button, status) { button.disabled = true; try { const result = await request('/api/confirmations/monthly', { method: 'POST', body: JSON.stringify({ period }) }); setStatus(status, result.created ? `已确认 ${period} 月记录。` : `${period} 月记录此前已确认。`, 'success'); } catch (error) { setStatus(status, error.message, 'error'); } finally { button.disabled = false; } }

for (const dialog of $$('dialog')) { dialog.addEventListener('close', () => restoreDialog(dialog)); for (const button of $$('[data-close-dialog]', dialog)) button.addEventListener('click', () => setDialogOpen(dialog, false)); }
$('[data-cancel-trade]').addEventListener('click', () => setDialogOpen(tradeDialog, false));
setTab('entry');
boot();
