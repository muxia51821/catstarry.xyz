const portfolioApiBase = document.querySelector('meta[name="finance-api-base"]')?.content.replace(/\/$/, '') ?? '';
const portfolioMoney = new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', maximumFractionDigits: 2 });
const portfolioNumber = new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2 });
const PORTFOLIO_ROLES = [
  ['主动操作仓（A股）', '主动操作仓', '#6685ff'],
  ['A股宽基指数底仓', 'A股宽基指数', '#d4c94e'],
  ['美股ETF（A股跨境ETF）', '美股 ETF', '#b782f2'],
  ['黄金ETF', '黄金 ETF', '#d9a441'],
  ['机动仓（货币ETF）', '机动仓', '#5eaf9e'],
  ['其他', '其他', '#848e9c'],
];
const PORTFOLIO_ROLE_MAP = new Map(PORTFOLIO_ROLES.map(([key, label, color]) => [key, { label, color }]));

const portfolioApp = document.querySelector('[data-app]');
const portfolioDashboard = document.querySelector('[data-dashboard]');
const portfolioTotal = document.querySelector('[data-total-value]');
const portfolioStatus = document.querySelector('[data-market-freshness]');
const portfolioRecent = document.querySelector('[data-overview-trades]');
const portfolioRecentEmpty = document.querySelector('[data-overview-trades-empty]');
const portfolioHistoryState = document.querySelector('[data-net-worth-state]');
const portfolioHistoryEmpty = document.querySelector('[data-net-worth-empty]');
const portfolioHoldingsBody = document.querySelector('[data-holdings-body]');
const portfolioTradesBody = document.querySelector('[data-trades-body]');

let portfolioEpoch = 0;
let portfolioScheduled = false;
let portfolioHoldings = [];
let portfolioSecurities = new Map();
let portfolioTradeCatalog = [];

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

async function loadPortfolioTradeCatalog() {
  const rows = [];
  let cursor = null;
  for (let page = 0; page < 20; page += 1) {
    const result = await portfolioRequest(`/api/trades?limit=50${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`);
    rows.push(...(result?.trades ?? []));
    cursor = result?.nextCursor ?? null;
    if (!cursor) return rows;
  }
  throw new Error('交易记录分页超过 Portfolio UI 的安全上限');
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
      const [accountState, holdingsPage, securitiesPage, tradeCatalog, reconciliationPage] = await Promise.all([
        portfolioRequest('/api/account-state'),
        portfolioRequest('/api/holdings'),
        portfolioRequest('/api/securities'),
        loadPortfolioTradeCatalog(),
        portfolioRequest('/api/assets/snapshots').catch(() => null),
      ]);
      if (epoch !== portfolioEpoch || !portfolioCanRender()) return;
      portfolioHoldings = holdingsPage?.holdings ?? [];
      portfolioSecurities = new Map((securitiesPage?.securities ?? []).map((row) => [row.ticker, row]));
      portfolioTradeCatalog = tradeCatalog;
      renderPortfolioAccountState(accountState);
      renderPortfolioRecentTrades(tradeCatalog);
      installPortfolioClassificationFilters();
      renderPortfolioHoldings();
      decoratePortfolioTradeTable();
      if (reconciliationPage) renderPortfolioReconciliations(reconciliationPage.snapshots ?? reconciliationPage.reconciliations ?? []);
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

function installPortfolioClassificationFilters() {
  installHoldingsFilters();
  installTradeFilters();
}

function installHoldingsFilters() {
  if (!portfolioHoldingsBody || document.querySelector('[data-holdings-classification-filters]')) return;
  const panel = portfolioHoldingsBody.closest('.panel');
  const tableScroll = portfolioHoldingsBody.closest('.table-scroll');
  if (!panel || !tableScroll) return;
  const form = portfolioElement('form', 'portfolio-classification-filters');
  form.dataset.holdingsClassificationFilters = '';
  form.append(classificationSelect('组合角色', 'portfolio_holding_role', PORTFOLIO_ROLES.map(([value, label]) => [value, label])));
  form.append(classificationSelect('证券属性', 'portfolio_holding_attribute', securityAttributeOptions()));
  form.addEventListener('change', renderPortfolioHoldings);
  tableScroll.before(form);
}

function installTradeFilters() {
  const form = document.querySelector('[data-trade-filters]');
  if (!form || form.querySelector('[data-portfolio-trade-role-filter]')) return;
  const role = classificationSelect('组合角色', 'position_category', PORTFOLIO_ROLES.map(([value, label]) => [value, label]));
  role.dataset.portfolioTradeRoleFilter = '';
  const attribute = classificationSelect('证券属性', 'security_attribute', securityAttributeOptions());
  attribute.dataset.portfolioTradeAttributeFilter = '';
  const submit = form.querySelector('button[type="submit"]');
  form.insertBefore(role, submit);
  form.insertBefore(attribute, submit);
}

function classificationSelect(label, name, options) {
  const wrapper = portfolioElement('label', 'portfolio-classification-filter');
  wrapper.append(document.createTextNode(label));
  const select = document.createElement('select');
  select.name = name;
  select.append(portfolioOption('', '全部'));
  for (const [value, text] of options) select.append(portfolioOption(value, text));
  wrapper.append(select);
  return wrapper;
}

function portfolioOption(value, text) {
  const option = document.createElement('option');
  option.value = value;
  option.textContent = text;
  return option;
}

function securityAttributeOptions() {
  return [...new Set([...portfolioSecurities.values()].map((row) => row.security_attribute).filter(Boolean))]
    .sort((left, right) => left.localeCompare(right, 'zh-CN')).map((value) => [value, value]);
}

function renderPortfolioHoldings() {
  if (!portfolioHoldingsBody) return;
  const role = document.querySelector('[name="portfolio_holding_role"]')?.value ?? '';
  const attribute = document.querySelector('[name="portfolio_holding_attribute"]')?.value ?? '';
  const rows = portfolioHoldings.filter((row) => {
    const security = portfolioSecurities.get(row.ticker);
    return (!role || row.position_category === role) && (!attribute || security?.security_attribute === attribute);
  });

  const table = portfolioHoldingsBody.closest('table');
  const header = table?.querySelector('thead tr');
  if (header && !header.dataset.portfolioClassificationReady) {
    header.replaceChildren(...['标的', '组合角色', '证券属性', '数量', '成本', '现价', '市值', '盈亏'].map((label) => portfolioElement('th', '', label)));
    header.dataset.portfolioClassificationReady = 'true';
  }

  portfolioHoldingsBody.replaceChildren(...rows.map((row) => {
    const security = portfolioSecurities.get(row.ticker);
    const title = portfolioElement('td', 'table-text');
    title.append(portfolioElement('strong', '', row.ticker_name || row.ticker));
    if (row.ticker_name) title.append(portfolioElement('small', 'portfolio-ticker-code', row.ticker));
    if (row.stale) title.append(portfolioElement('small', 'stale-flag', '行情过期'));
    const pnl = finiteNumber(row.pnl);
    return holdingRow([
      title,
      roleCell(row.position_category),
      securityAttributeCell(security?.security_attribute),
      dataCell(portfolioNumber.format(Number(row.quantity))),
      dataCell(maybeMoney(row.avg_cost)),
      dataCell(maybeMoney(row.price)),
      dataCell(maybeMoney(row.market_value)),
      dataCell(maybeMoney(row.pnl), pnl === null ? '' : pnl >= 0 ? 'value-up' : 'value-down'),
    ]);
  }));

  const empty = document.querySelector('[data-holdings-empty]');
  if (empty) {
    empty.hidden = rows.length > 0;
    if (!rows.length && portfolioHoldings.length) empty.textContent = '没有符合当前分类筛选的持仓。';
  }
}

function holdingRow(cells) {
  const row = document.createElement('tr');
  row.append(...cells);
  return row;
}

function roleCell(role) {
  const cell = portfolioElement('td', 'portfolio-role-cell');
  const presentation = PORTFOLIO_ROLE_MAP.get(role) ?? { label: role || '其他', color: '#848e9c' };
  const badge = portfolioElement('span', 'portfolio-role-badge', presentation.label);
  badge.style.setProperty('--portfolio-role-color', presentation.color);
  cell.append(badge);
  return cell;
}

function securityAttributeCell(attribute) {
  const cell = portfolioElement('td', 'portfolio-security-cell');
  cell.append(portfolioElement('span', 'portfolio-security-attribute', attribute || '—'));
  return cell;
}

function dataCell(text, extraClass = '') {
  return portfolioElement('td', `table-data${extraClass ? ` ${extraClass}` : ''}`, text);
}

function maybeMoney(value) {
  const number = finiteNumber(value);
  return number === null ? '—' : portfolioMoney.format(number);
}

function decoratePortfolioTradeTable() {
  if (!portfolioTradesBody) return;
  const table = portfolioTradesBody.closest('table');
  const header = table?.querySelector('thead tr');
  if (header) {
    const headers = [...header.children];
    if (headers[5]) headers[5].textContent = '组合角色';
    if (!header.querySelector('[data-security-attribute-column]')) {
      const cell = portfolioElement('th', '', '证券属性');
      cell.dataset.securityAttributeColumn = '';
      headers[5]?.after(cell);
    }
  }
  const attributeByLabel = tradeAttributeByLabel();
  for (const row of portfolioTradesBody.querySelectorAll('tr')) {
    const cells = [...row.children];
    const roleCellNode = cells[5];
    if (!roleCellNode) continue;
    let attributeCell = row.querySelector('[data-security-attribute-cell]');
    if (!attributeCell) {
      attributeCell = securityAttributeCell('—');
      attributeCell.dataset.securityAttributeCell = '';
      roleCellNode.after(attributeCell);
    }
    const label = cells[1]?.textContent?.trim() ?? '';
    attributeCell.replaceChildren(portfolioElement('span', 'portfolio-security-attribute', attributeByLabel.get(label) ?? '—'));
  }
}

function tradeAttributeByLabel() {
  const result = new Map();
  const conflicts = new Set();
  for (const row of portfolioTradeCatalog) {
    const label = row.ticker_name || row.ticker;
    const attribute = row.security_attribute || portfolioSecurities.get(row.ticker)?.security_attribute || '—';
    if (result.has(label) && result.get(label) !== attribute) conflicts.add(label);
    else result.set(label, attribute);
  }
  for (const label of conflicts) result.set(label, '—');
  return result;
}

function renderPortfolioReconciliations(rows) {
  const body = document.querySelector('[data-asset-snapshots-body]');
  if (!body) return;
  const table = body.closest('table');
  const header = table?.querySelector('thead tr');
  if (header) {
    header.replaceChildren(...['对账时间', '证券市值', 'Broker Cash', '其他账户资产', '观测总资产', '状态与来源'].map((label) => portfolioElement('th', '', label)));
  }
  body.replaceChildren(...rows.slice(0, 12).map((row) => {
    const state = Number(row.is_complete) === 1 ? '完整' : `不完整${row.incomplete_reason ? ` · ${row.incomplete_reason}` : ''}`;
    return holdingRow([
      dataCell(row.snapshot_at || row.snapshot_date || '—'),
      dataCell(maybeMoney(row.holdings_value)),
      dataCell(maybeMoney(row.cash_value)),
      dataCell(maybeMoney(row.other_assets_value ?? 0)),
      dataCell(maybeMoney(row.total_value)),
      portfolioElement('td', 'table-text', `${state} · ${row.source || '—'}`),
    ]);
  }));
  const empty = document.querySelector('[data-asset-snapshots-empty]');
  if (empty) empty.hidden = rows.length > 0;
}

function normalizeWorkspaceIa() {
  const memoPanel = document.querySelector('[data-pane="review"][aria-labelledby="memo-title"]');
  if (memoPanel && !memoPanel.querySelector('[data-memo-workspace-note]')) {
    const note = portfolioElement('p', 'portfolio-workspace-note', '投资备忘录是独立的判断记录；共同确认与熔断属于治理动作，不是备忘录的上级流程。');
    note.dataset.memoWorkspaceNote = '';
    memoPanel.querySelector('.panel-header')?.after(note);
  }

  const monthlyPanel = document.querySelector('[data-pane="planning"][aria-labelledby="monthly-title"] .panel-copy');
  if (monthlyPanel) monthlyPanel.textContent = '月度总结保留叙事与复盘；真实现金流、账户对账与历史估值分别由各自的事实记录提供。';

  const accountPanel = document.querySelector('[data-pane="planning"][aria-labelledby="account-events-title"]');
  const accountHeader = accountPanel?.querySelector('thead th:first-child');
  if (accountHeader) accountHeader.textContent = '财务生效日';

  const reconciliationPanel = document.querySelector('[data-pane="planning"][aria-labelledby="asset-snapshots-title"]');
  if (reconciliationPanel) {
    const eyebrow = reconciliationPanel.querySelector('.eyebrow');
    const title = reconciliationPanel.querySelector('#asset-snapshots-title');
    const button = reconciliationPanel.querySelector('[data-open-asset-snapshot]');
    const empty = reconciliationPanel.querySelector('[data-asset-snapshots-empty]');
    const error = reconciliationPanel.querySelector('[data-asset-snapshots-error]');
    if (eyebrow) eyebrow.textContent = 'ASSET RECONCILIATION';
    if (title) title.textContent = '资产对账';
    if (button) button.textContent = '记录资产对账';
    if (empty) empty.textContent = '还没有人工或券商账户对账。';
    if (error) error.textContent = '资产对账暂时无法读取';
  }

  const monthlyDialog = document.querySelector('[data-monthly-dialog]');
  const monthlyIntro = monthlyDialog?.querySelector('.dialog-intro');
  if (monthlyIntro) monthlyIntro.textContent = 'PE 与温度由行情接入写入；月度记录只保存总结与历史兼容字段。总资产曲线由事实记录与 canonical raw close 派生，不由月度表或人工对账直接生成。';

  const accountDialog = document.querySelector('[data-account-event-dialog]');
  const accountForm = accountDialog?.querySelector('[data-account-event-form]');
  if (accountForm) {
    replaceDirectLabelText(accountForm.elements.event_date?.closest('label'), '财务生效日');
    replaceDirectLabelText(accountForm.elements.quantity?.closest('label'), '数量（分拆时＝拆分前持仓）');
    const intro = accountDialog.querySelector('.dialog-intro');
    if (intro) intro.textContent = '账户内部事件不会写入外部现金流。红利按实际到账日生效；ETF 分拆的数量填写拆分前持仓数量。';
  }

  const reconciliationDialog = document.querySelector('[data-asset-snapshot-dialog]');
  const reconciliationForm = reconciliationDialog?.querySelector('[data-asset-snapshot-form]');
  if (reconciliationForm) {
    const eyebrow = reconciliationDialog.querySelector('.eyebrow');
    const title = reconciliationDialog.querySelector('h2');
    const intro = reconciliationDialog.querySelector('.dialog-intro');
    const submit = reconciliationForm.querySelector('button[type="submit"]');
    if (eyebrow) eyebrow.textContent = 'ASSET RECONCILIATION';
    if (title) title.textContent = '记录资产对账';
    if (intro) intro.textContent = '对账是券商或人工观测证据，不是历史曲线数据源。观测总资产 = 证券市值 + Broker Cash + 其他账户资产。';
    if (submit) submit.textContent = '保存资产对账';
    replaceDirectLabelText(reconciliationForm.elements.snapshot_at?.closest('label'), '对账时间');
    replaceDirectLabelText(reconciliationForm.elements.holdings_value?.closest('label'), '已核验证券市值');
    replaceDirectLabelText(reconciliationForm.elements.cash_value?.closest('label'), 'Broker Cash');
    replaceDirectLabelText(reconciliationForm.elements.incomplete_reason?.closest('label'), '对账缺口说明（不完整时必填）');
    const source = reconciliationForm.elements.source;
    if (source) source.placeholder = '例如：券商账户截图';
    const completeness = reconciliationForm.elements.is_complete?.closest('label');
    const completenessText = completeness?.querySelector('span');
    if (completenessText) completenessText.textContent = '本次账户观测完整，可作为 reconciliation anchor';
    installOtherAssetsField(reconciliationForm);
  }
}

function installOtherAssetsField(form) {
  if (form.elements.other_assets_value) return;
  const field = portfolioElement('label', 'portfolio-reconciliation-field');
  field.append(document.createTextNode('其他账户资产（逆回购等）'));
  const input = document.createElement('input');
  input.name = 'other_assets_value';
  input.type = 'number';
  input.min = '0';
  input.step = 'any';
  input.value = '0';
  const note = portfolioElement('small', '', '没有未到期逆回购等账户内其他资产时保持 0。');
  field.append(input, note);
  form.elements.is_complete?.closest('label')?.before(field);
}

function replaceDirectLabelText(label, text) {
  if (!label) return;
  const node = [...label.childNodes].find((child) => child.nodeType === Node.TEXT_NODE);
  if (node) node.textContent = text;
  else label.prepend(document.createTextNode(text));
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
  portfolioHoldings = [];
  portfolioSecurities = new Map();
  portfolioTradeCatalog = [];
  portfolioTotal?.closest('.metric')?.querySelector('[data-account-breakdown]')?.remove();
  if (portfolioTotal) portfolioTotal.textContent = '—';
  if (portfolioStatus) portfolioStatus.textContent = '等待账户状态';
  portfolioRecent?.replaceChildren();
}

function finiteNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

normalizeWorkspaceIa();

if (portfolioApp && portfolioDashboard) {
  const observer = new MutationObserver(() => {
    if (portfolioApp.hidden) resetPortfolioUi();
    else schedulePortfolioRefresh();
  });
  observer.observe(portfolioApp, { attributes: true, attributeFilter: ['hidden'] });
  observer.observe(portfolioDashboard, { attributes: true, attributeFilter: ['aria-busy'] });
  const tradeObserver = new MutationObserver(() => decoratePortfolioTradeTable());
  if (portfolioTradesBody) tradeObserver.observe(portfolioTradesBody, { childList: true });
  document.querySelector('[data-refresh]')?.addEventListener('click', () => setTimeout(schedulePortfolioRefresh, 0));
  for (const button of document.querySelectorAll('[data-asset-view]')) {
    button.addEventListener('click', () => setTimeout(normalizePortfolioHistoryCopy, 0));
  }
  normalizePortfolioHistoryCopy();
  schedulePortfolioRefresh();
}
