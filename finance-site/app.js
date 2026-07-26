const apiBase = document.querySelector('meta[name="finance-api-base"]')?.content.replace(/\/$/, '') ?? '';
const state = { session: null, holdings: null, trades: [], pe: [], circuit: null, reviews: [], notifications: null, accessLog: [], importReview: [] };
const $ = (selector, root = document) => root.querySelector(selector);

const money = new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', maximumFractionDigits: 2 });
const decimal = new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 4 });
const percent = new Intl.NumberFormat('zh-CN', { style: 'percent', maximumFractionDigits: 2 });
const text = (value, fallback = '—') => value === null || value === undefined || value === '' ? fallback : String(value);
const dialogReturnFocus = new WeakMap();

async function request(path, options = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    credentials: 'include',
    ...options,
    headers: { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers ?? {}) },
  });
  const payload = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(payload?.error?.message ?? `Request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return payload;
}

function setStatus(node, message, tone = '') {
  if (!node) return;
  node.textContent = message;
  if (tone) node.dataset.tone = tone;
  else delete node.dataset.tone;
}

async function boot() {
  try {
    const session = await request('/api/auth/session');
    if (!session.authenticated) return showLogin();
    state.session = session;
    showApp();
    await loadDashboard();
  } catch {
    showLogin();
  }
}

function showLogin() {
  $('[data-login]').hidden = false;
  $('[data-app]').hidden = true;
}

function showApp() {
  $('[data-login]').hidden = true;
  $('[data-app]').hidden = false;
  $('[data-role]').textContent = state.session.role === 'admin' ? 'ADMIN · READ / WRITE' : 'CATI · READ ONLY';
  $('[data-open-trade]').hidden = state.session.role !== 'admin';
  $('[data-confirm-month]').hidden = state.session.role !== 'viewer';
  $('[data-open-review]').hidden = state.session.role !== 'admin';
  $('[data-export-archive]').hidden = state.session.role !== 'admin';
  $('[data-open-risk]').hidden = state.session.role !== 'admin';
  $('[data-resolve-circuit]').hidden = state.session.role !== 'admin';
  $('[data-access-panel]').hidden = state.session.role !== 'admin';
  $('[data-import-review-panel]').hidden = state.session.role !== 'admin';
}

async function loadDashboard() {
  const status = $('[data-dashboard-status]');
  setStatus(status, '正在读取最新有效快照…');
  try {
    const [holdings, trades, pe, circuit, reviews, notifications, access, importReview] = await Promise.all([
      request('/api/holdings'),
      request('/api/trades?limit=100'),
      request('/api/pe'),
      request('/api/circuit'),
      request('/api/review'),
      request('/api/notifications'),
      state.session.role === 'admin' ? request('/api/access-log?limit=50') : Promise.resolve({ access_log: [] }),
      state.session.role === 'admin' ? request('/api/import-review?status=pending&limit=100') : Promise.resolve({ review: [] }),
    ]);
    state.holdings = holdings;
    state.trades = trades.trades;
    state.pe = pe.indexes;
    state.circuit = circuit.active;
    state.reviews = reviews.reviews;
    state.notifications = notifications;
    state.accessLog = access.access_log;
    state.importReview = importReview.review;
    renderDashboard();
    const warning = notifications.unconfirmed_viewers?.length
      ? ` · 未确认：${notifications.unconfirmed_viewers.join('、')}`
      : notifications.annual_review_due ? ' · 请完成年度复盘' : '';
    setStatus(status, `已更新 · ${new Date().toLocaleTimeString('zh-CN')}${warning}`, warning ? 'error' : 'success');
    showPendingNotification();
  } catch (error) {
    if (error.status === 401) return showLogin();
    setStatus(status, `读取失败：${error.message}`, 'error');
  }
}

function renderDashboard() {
  renderSummary();
  renderHoldings();
  renderPositions();
  renderPe();
  renderTrades();
  renderReviews();
  renderCircuitBanner();
  renderAccessLog();
  renderImportReview();
}

function renderCircuitBanner() {
  const banner = $('[data-circuit-banner]');
  banner.hidden = !state.circuit;
  if (!state.circuit) return;
  banner.dataset.level = state.circuit.level;
  $('[data-circuit-banner-title]').textContent = circuitLabel(state.circuit.level);
  $('[data-circuit-banner-copy]').textContent = circuitReason(state.circuit.reason);
}

function renderSummary() {
  const holdings = state.holdings?.holdings ?? [];
  $('[data-total-value]').textContent = Number.isFinite(state.holdings?.total_market_value)
    ? money.format(state.holdings.total_market_value)
    : '—';
  $('[data-holding-count]').textContent = String(holdings.length);
  const timestamps = holdings.map((row) => Date.parse(row.fetched_at)).filter(Number.isFinite);
  $('[data-market-freshness]').textContent = timestamps.length
    ? `行情快照 ${new Date(Math.max(...timestamps)).toLocaleString('zh-CN')}${holdings.some((row) => row.stale) ? ' · 可能过期' : ''}`
    : '等待行情供应商写入真实快照';
  $('[data-circuit-level]').textContent = state.circuit ? circuitLabel(state.circuit.level) : '正常';
  $('[data-circuit-action]').textContent = state.circuit ? circuitReason(state.circuit.reason) : '未触发熔断';
}

function renderHoldings() {
  const body = $('[data-holdings-body]');
  const rows = state.holdings?.holdings ?? [];
  body.replaceChildren(...rows.map((row) => {
    const tr = document.createElement('tr');
    const values = [row.ticker, decimal.format(row.quantity), money.format(row.avg_cost), row.price === null ? '—' : money.format(row.price), row.market_value === null ? '—' : money.format(row.market_value), row.pnl === null ? '—' : money.format(row.pnl)];
    values.forEach((value, index) => {
      const cell = document.createElement('td');
      cell.textContent = value;
      if (index === 5 && row.pnl !== null) cell.className = row.pnl >= 0 ? 'value-up' : 'value-down';
      tr.append(cell);
    });
    return tr;
  }));
  $('[data-holdings-empty]').hidden = rows.length > 0;
}

function renderPositions() {
  const root = $('[data-position-list]');
  const positions = (state.holdings?.positions ?? []).filter((row) => row.status !== 'unconfigured');
  root.replaceChildren(...positions.map((row) => {
    const article = document.createElement('article');
    article.className = 'position-row';
    const header = document.createElement('header');
    const name = document.createElement('span');
    name.textContent = row.position_category;
    const value = document.createElement('strong');
    value.className = `state-${row.status}`;
    value.textContent = row.current_ratio === null ? '—' : percent.format(row.current_ratio);
    header.append(name, value);
    const detail = document.createElement('p');
    detail.textContent = `目标 ${percent.format(row.target_ratio)} · 区间 ${percent.format(row.lower_ratio)}–${percent.format(row.upper_ratio)} · ${positionSuggestion(row)}`;
    article.append(header, detail);
    return article;
  }));
  $('[data-position-empty]').hidden = positions.length > 0;
}

function renderPe() {
  const root = $('[data-pe-list]');
  const rows = state.pe.filter((row) => row.pe_ttm !== null && row.temperature);
  root.replaceChildren(...rows.map((row) => {
    const article = document.createElement('article');
    article.className = 'pe-row';
    const header = document.createElement('header');
    const ticker = document.createElement('span');
    ticker.textContent = row.ticker.replace('_PE', '');
    const value = document.createElement('strong');
    value.className = `state-${row.temperature.zone}`;
    value.textContent = decimal.format(row.pe_ttm);
    header.append(ticker, value);
    const suggestion = document.createElement('p');
    suggestion.textContent = `${peSuggestion(row.temperature.suggestion)}${row.stale ? ' · 数据可能过期' : ''}`;
    const scale = document.createElement('div');
    scale.className = 'pe-scale';
    scale.setAttribute('aria-label', `PE 温度：${row.temperature.zone}`);
    for (const zone of ['freeze', 'low', 'normal', 'high', 'overheat']) {
      const segment = document.createElement('span');
      segment.className = `pe-scale__segment pe-scale__segment--${zone}`;
      if (zone === row.temperature.zone) segment.dataset.active = '';
      scale.append(segment);
    }
    article.append(header, scale, suggestion);
    return article;
  }));
  $('[data-pe-empty]').hidden = rows.length > 0;
}

function renderTrades() {
  const body = $('[data-trades-body]');
  body.replaceChildren(...state.trades.map((trade) => {
    const tr = document.createElement('tr');
    if (trade.needs_review) {
      tr.className = 'needs-review';
      tr.title = '此导入交易需要人工复核';
    }
    [trade.trade_date, trade.ticker, trade.direction === 'buy' ? '买入' : '卖出', decimal.format(trade.quantity), money.format(trade.price), trade.position_category, text(trade.reason, '')]
      .forEach((value, index) => {
        const cell = document.createElement('td');
        cell.textContent = value;
        if (index === 2) cell.className = trade.direction === 'buy' ? 'value-up' : 'value-down';
        tr.append(cell);
      });
    return tr;
  }));
  $('[data-trades-empty]').hidden = state.trades.length > 0;
}

function renderImportReview() {
  const root = $('[data-import-review-list]');
  if (state.session.role !== 'admin') return root.replaceChildren();
  root.replaceChildren(...state.importReview.map((item) => {
    const article = document.createElement('article');
    article.className = 'import-review-row';
    const header = document.createElement('header');
    const title = document.createElement('strong');
    title.textContent = `${item.record_kind === 'trade' ? '交易' : '持仓快照'} · 第 ${item.row_number} 行`;
    const batch = document.createElement('span');
    batch.textContent = item.batch_id;
    header.append(title, batch);
    const raw = document.createElement('pre');
    raw.textContent = JSON.stringify(item.raw, null, 2);
    const controls = document.createElement('div');
    controls.className = 'import-review-controls';
    const label = document.createElement('label');
    label.textContent = '结案说明';
    const input = document.createElement('input');
    input.maxLength = 2000;
    input.placeholder = '例如：已通过在线交易录入修正';
    label.append(input);
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = '标记已解决';
    button.addEventListener('click', async () => {
      const note = input.value.trim();
      if (!note) {
        input.setCustomValidity('请填写结案说明');
        input.reportValidity();
        return;
      }
      input.setCustomValidity('');
      button.disabled = true;
      try {
        await request(`/api/import-review/${item.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ resolution_note: note }),
        });
        await loadDashboard();
      } catch (error) {
        setStatus($('[data-dashboard-status]'), error.message, 'error');
        button.disabled = false;
      }
    });
    controls.append(label, button);
    article.append(header, raw, controls);
    return article;
  }));
  $('[data-import-review-empty]').hidden = state.importReview.length > 0;
}

function renderReviews() {
  const root = $('[data-review-list]');
  root.replaceChildren(...state.reviews.map((review) => {
    const article = document.createElement('article');
    article.className = 'review-row';
    const header = document.createElement('header');
    const year = document.createElement('strong');
    year.textContent = `${review.year} 年`;
    const stateLabel = document.createElement('span');
    stateLabel.textContent = review.confirmed_at ? `已由 ${review.confirmed_by} 确认` : '等待确认';
    header.append(year, stateLabel);
    const detail = document.createElement('p');
    const split = review.calculation?.split;
    const dietz = review.calculation?.dietz;
    detail.textContent = split && dietz
      ? `期初 ${money.format(dietz.beginningValue)} · 期末 ${money.format(dietz.endingValue)} · 净资金流 ${money.format(dietz.netCashFlow)} · 加权资本 ${money.format(dietz.weightedCapital)} · Modified Dietz ${(dietz.returnRate * 100).toFixed(2)}% · 基准 ${(split.benchmarkRate * 100).toFixed(2)}% · 高水位 ${money.format(split.highWaterMark)} · 超额 ${money.format(split.excessValue)} · 50% 分成 ${money.format(split.managerShare)}`
      : '计算明细不可用';
    article.append(header, detail);
    if (review.summary) {
      const summary = document.createElement('p');
      summary.textContent = review.summary;
      article.append(summary);
    }
    if (state.session.role === 'viewer' && !review.confirmed_at) {
      const confirm = document.createElement('button');
      confirm.type = 'button';
      confirm.textContent = '确认年度复盘';
      confirm.addEventListener('click', async () => {
        confirm.disabled = true;
        try {
          await request('/api/review/confirm', { method: 'POST', body: JSON.stringify({ year: review.year }) });
          await loadDashboard();
        } catch (error) {
          setStatus($('[data-dashboard-status]'), error.message, 'error');
          confirm.disabled = false;
        }
      });
      article.append(confirm);
    }
    return article;
  }));
  $('[data-review-empty]').hidden = state.reviews.length > 0;
}

function renderAccessLog() {
  const root = $('[data-access-list]');
  if (state.session.role !== 'admin') return root.replaceChildren();
  root.replaceChildren(...state.accessLog.map((entry) => {
    const row = document.createElement('p');
    row.textContent = `${new Date(entry.occurred_at).toLocaleString('zh-CN')} · ${entry.username} · ${entry.action}`;
    return row;
  }));
  $('[data-access-empty]').hidden = state.accessLog.length > 0;
}

function showPendingNotification() {
  const confirmation = state.notifications?.monthly_confirmation;
  const dialog = $('[data-notification-dialog]');
  if (!confirmation || confirmation.confirmed || dialog.open) return;
  $('[data-notification-copy]').textContent = `请确认已查阅 ${confirmation.period} 月投资记录。`;
  setDialogOpen(dialog, true);
}

function positionSuggestion(row) {
  if (row.status === 'unavailable') return '等待完整行情后计算';
  if (row.status === 'above_upper') return `建议降低 ${money.format(Math.abs(row.target_value_change))}`;
  if (row.status === 'below_lower') return `建议增加 ${money.format(Math.abs(row.target_value_change))}`;
  return '区间内';
}

function peSuggestion(value) {
  return ({ aggressively_add: '宽基双倍定投 ¥1,500/月', moderately_add: '宽基 1.5 倍定投 ¥1,125/月', normal_dca: '按计划定投 ¥750/月', reduce_investment: '正常定投，不加倍', pause_or_reduce: '维持最低定投 ¥375/月' })[value] ?? value;
}

function circuitLabel(level) {
  return ({ yellow: '黄色预警', red: '红色熔断', black: '黑色熔断' })[level] ?? level;
}

function circuitReason(raw) {
  try {
    const value = JSON.parse(raw);
    return value.reason ?? ({ pause_all: '全部暂停', route_dca_to_cash: '主动仓暂停，月投转入机动仓', pause_active_additions: '暂停主动仓新增' })[value.action] ?? '按熔断规则执行';
  } catch { return '按熔断规则执行'; }
}

function setDialogOpen(dialog, open) {
  const app = $('[data-app]');
  if (open) {
    if (document.activeElement instanceof HTMLElement && document.activeElement !== document.body) {
      dialogReturnFocus.set(dialog, document.activeElement);
    }
    app.inert = true;
    dialog.showModal();
  } else {
    dialog.close();
  }
}

function restoreDialog(dialog) {
  $('[data-app]').inert = false;
  const target = dialogReturnFocus.get(dialog);
  dialogReturnFocus.delete(dialog);
  if (target instanceof HTMLElement && target.isConnected && !target.hidden) queueMicrotask(() => target.focus());
}

$('[data-login-form]').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const status = $('[data-login-status]');
  const submit = form.querySelector('button[type="submit"]');
  submit.disabled = true;
  setStatus(status, '正在验证…');
  try {
    const data = new FormData(form);
    state.session = await request('/api/auth/login', { method: 'POST', body: JSON.stringify({ username: data.get('username'), password: data.get('password') }) });
    form.reset();
    showApp();
    await loadDashboard();
  } catch (error) {
    setStatus(status, error.message, 'error');
  } finally { submit.disabled = false; }
});

$('[data-refresh]').addEventListener('click', loadDashboard);
$('[data-logout]').addEventListener('click', async () => {
  await request('/api/auth/logout', { method: 'POST', body: '{}' }).catch(() => null);
  state.session = null;
  showLogin();
});

const tradeDialog = $('[data-trade-dialog]');
const tradeForm = $('[data-trade-form]');
$('[data-open-trade]').addEventListener('click', () => {
  tradeForm.elements.trade_date.value = new Date().toISOString().slice(0, 10);
  setDialogOpen(tradeDialog, true);
  tradeForm.elements.ticker.focus();
});
tradeForm.querySelector('[data-close-dialog]').addEventListener('click', () => setDialogOpen(tradeDialog, false));
tradeDialog.addEventListener('close', () => restoreDialog(tradeDialog));
for (const name of ['quantity', 'price']) tradeForm.elements[name].addEventListener('input', () => {
  const value = Number(tradeForm.elements.quantity.value) * Number(tradeForm.elements.price.value);
  $('[data-trade-total]').textContent = Number.isFinite(value) && value > 0 ? money.format(value) : '—';
});
tradeForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const status = $('[data-trade-status]');
  const submit = tradeForm.querySelector('button[type="submit"]');
  submit.disabled = true;
  try {
    const data = Object.fromEntries(new FormData(tradeForm));
    data.quantity = Number(data.quantity);
    data.price = Number(data.price);
    await request('/api/trades', { method: 'POST', body: JSON.stringify(data) });
    const date = tradeForm.elements.trade_date.value;
    const category = tradeForm.elements.position_category.value;
    tradeForm.reset();
    tradeForm.elements.trade_date.value = date;
    tradeForm.elements.position_category.value = category;
    $('[data-trade-total]').textContent = '—';
    setStatus(status, '已保存，可继续录入下一笔。', 'success');
    await loadDashboard();
    tradeForm.elements.ticker.focus();
  } catch (error) { setStatus(status, error.message, 'error'); }
  finally { submit.disabled = false; }
});

const objectionDialog = $('[data-objection-dialog]');
const objectionForm = $('[data-objection-form]');
$('[data-objection]').addEventListener('click', () => setDialogOpen(objectionDialog, true));
objectionForm.querySelector('[data-close-dialog]').addEventListener('click', () => setDialogOpen(objectionDialog, false));
objectionDialog.addEventListener('close', () => restoreDialog(objectionDialog));
objectionForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const status = $('[data-objection-status]');
  try {
    const reason = new FormData(objectionForm).get('reason');
    await request('/api/circuit/objection', { method: 'POST', body: JSON.stringify({ reason }) });
    objectionForm.reset();
    setDialogOpen(objectionDialog, false);
    await loadDashboard();
  } catch (error) { setStatus(status, error.message, 'error'); }
});

const reviewDialog = $('[data-review-dialog]');
const reviewForm = $('[data-review-form]');
$('[data-open-review]').addEventListener('click', () => {
  reviewForm.elements.year.value = String(new Date().getFullYear());
  if (Number.isFinite(state.holdings?.total_market_value)) {
    reviewForm.elements.endingValue.value = String(state.holdings.total_market_value);
    reviewForm.elements.currentValue.value = String(state.holdings.total_market_value);
  }
  setDialogOpen(reviewDialog, true);
  reviewForm.elements.beginningValue.focus();
});
reviewForm.querySelector('[data-close-dialog]').addEventListener('click', () => setDialogOpen(reviewDialog, false));
reviewDialog.addEventListener('close', () => restoreDialog(reviewDialog));
reviewForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const status = $('[data-review-status]');
  const submit = reviewForm.querySelector('button[type="submit"]');
  submit.disabled = true;
  try {
    const data = new FormData(reviewForm);
    const cashFlows = String(data.get('cashFlows') ?? '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => {
      const parts = line.split(',').map((value) => Number(value.trim()));
      if (parts.length !== 2 || parts.some((value) => !Number.isFinite(value))) throw new Error(`资金流格式无效：${line}`);
      return { amount: parts[0], day: parts[1] };
    });
    await request('/api/review/calculate', {
      method: 'POST',
      body: JSON.stringify({
        year: Number(data.get('year')),
        modifiedDietz: {
          beginningValue: Number(data.get('beginningValue')),
          endingValue: Number(data.get('endingValue')),
          periodDays: Number(data.get('periodDays')),
          cashFlows,
        },
        currentValue: Number(data.get('currentValue')),
        historicalMaximumValue: Number(data.get('historicalMaximumValue')),
        summary: data.get('summary'),
      }),
    });
    setDialogOpen(reviewDialog, false);
    await loadDashboard();
  } catch (error) { setStatus(status, error.message, 'error'); }
  finally { submit.disabled = false; }
});

const riskDialog = $('[data-risk-dialog]');
const riskForm = $('[data-risk-form]');
$('[data-open-risk]').addEventListener('click', () => {
  setDialogOpen(riskDialog, true);
  riskForm.elements.annualDrawdown.focus();
});
riskForm.querySelector('[data-close-dialog]').addEventListener('click', () => setDialogOpen(riskDialog, false));
riskDialog.addEventListener('close', () => restoreDialog(riskDialog));
riskForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const status = $('[data-risk-status]');
  try {
    const data = new FormData(riskForm);
    const result = await request('/api/circuit/evaluate', {
      method: 'POST',
      body: JSON.stringify({
        annualDrawdown: Number(data.get('annualDrawdown')),
        monthlyDrawdown: Number(data.get('monthlyDrawdown')),
        maximumPositionLoss: Number(data.get('maximumPositionLoss')),
        catiObjection: false,
      }),
    });
    setDialogOpen(riskDialog, false);
    setStatus($('[data-dashboard-status]'), result.state.level === 'none' ? '当前指标未触发熔断。' : '熔断状态已记录。', result.state.level === 'none' ? 'success' : 'error');
    await loadDashboard();
  } catch (error) { setStatus(status, error.message, 'error'); }
});

$('[data-resolve-circuit]').addEventListener('click', async (event) => {
  if (!state.circuit?.id) return;
  const button = event.currentTarget;
  button.disabled = true;
  try {
    await request(`/api/circuit/${state.circuit.id}/resolve`, { method: 'PATCH', body: '{}' });
    await loadDashboard();
  } catch (error) { setStatus($('[data-dashboard-status]'), error.message, 'error'); }
  finally { button.disabled = false; }
});

$('[data-export-archive]').addEventListener('click', () => {
  const year = state.reviews[0]?.year ?? new Date().getFullYear();
  window.location.assign(`${apiBase}/api/archive?year=${encodeURIComponent(year)}`);
});

const notificationDialog = $('[data-notification-dialog]');
notificationDialog.addEventListener('close', () => restoreDialog(notificationDialog));
$('[data-confirm-notification]').addEventListener('click', async (event) => {
  const period = state.notifications?.monthly_confirmation?.period;
  if (!period) return;
  await confirmMonth(period, event.currentTarget, $('[data-notification-status]'));
  setDialogOpen(notificationDialog, false);
  await loadDashboard();
});

$('[data-confirm-month]').addEventListener('click', async (event) => {
  const period = state.notifications?.monthly_confirmation?.period;
  if (!period) {
    setStatus($('[data-dashboard-status]'), '确认周期暂时不可用，请刷新后重试。', 'error');
    return;
  }
  await confirmMonth(period, event.currentTarget, $('[data-dashboard-status]'));
});

async function confirmMonth(period, button, status) {
  button.disabled = true;
  try {
    const result = await request('/api/confirmations/monthly', { method: 'POST', body: JSON.stringify({ period }) });
    setStatus(status, result.created ? `已确认 ${period} 月记录。` : `${period} 月记录此前已确认。`, 'success');
  } catch (error) { setStatus(status, error.message, 'error'); }
  finally { button.disabled = false; }
}

boot();
