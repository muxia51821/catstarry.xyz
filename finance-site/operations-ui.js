(() => {
  const apiBase = document.querySelector('meta[name="finance-api-base"]')?.content.replace(/\/$/, '') ?? '';
  const app = document.querySelector('[data-app]');
  const grid = document.querySelector('.dashboard-grid');
  const oldImportPanel = document.querySelector('[data-import-review-panel]');
  if (!app || !grid) return;

  const actionLabels = { created: '新增', updated: '修改', deleted: '删除', confirmed: '确认', resolved: '解决', reconciled: '对账' };
  const entityLabels = {
    trade: '交易', cash_flow: '现金流', account_event: '账户事件', investment_plan: '投资计划', investment_rule: '投资规则',
    memo: '投资备忘录', monthly_record: '月度记录', annual_review: '年度复盘', workbook_review: '导入异常', rebalance: '再平衡',
    monthly_confirmation: '月度查阅确认', circuit: '熔断事件', circuit_resolution: '熔断恢复确认', asset_reconciliation: '资产对账', historical_import: '历史数据迁移',
  };
  const rawFetch = window.fetch.bind(window);

  const historyPanel = node('section', { className: 'panel panel--span-3 operation-history-panel', 'data-pane': 'records', hidden: '' });
  const historyHeader = node('header', { className: 'panel-header' },
    node('div', {}, node('p', { className: 'eyebrow', textContent: 'CHANGE HISTORY' }), node('h2', { id: 'operation-history-title', textContent: '变更记录' })),
    node('span', { className: 'data-state', 'data-operation-state': '', textContent: '等待读取' }),
  );
  historyPanel.setAttribute('aria-labelledby', 'operation-history-title');
  const historyCopy = node('p', { className: 'panel-copy', textContent: '记录谁在什么时候新增、修改、删除、确认或对账。金融业务日期与实际修改时间分开显示；时间统一按北京时间（Asia/Shanghai），登录和 session 不属于这里。' });
  const filters = node('form', { className: 'record-filters operation-filters', 'data-operation-filters': '' },
    selectLabel('对象', 'entity_type', [['', '全部'], ...Object.entries(entityLabels).map(([value, label]) => [value, label])]),
    selectLabel('动作', 'action', [['', '全部'], ...Object.entries(actionLabels).map(([value, label]) => [value, label])]),
    inputLabel('用户', 'actor', 'text', { maxlength: '64', placeholder: '例如 muxia' }),
    inputLabel('开始', 'from', 'date'), inputLabel('结束', 'to', 'date'),
    node('button', { className: 'button-secondary', type: 'submit', textContent: '筛选' }),
    node('button', { className: 'text-button', type: 'reset', textContent: '清除' }),
  );
  const historyList = node('div', { className: 'operation-list', 'data-operation-list': '' });
  const historyEmpty = node('p', { className: 'empty-state', 'data-operation-empty': '', textContent: '当前筛选条件下没有变更记录。' });
  const historyError = node('p', { className: 'empty-state', 'data-operation-error': '' }); historyError.hidden = true;
  const coverage = node('p', { className: 'operation-coverage', 'data-operation-coverage': '' });
  const more = node('button', { className: 'button-secondary operation-more', type: 'button', 'data-operation-more': '', textContent: '加载更多' }); more.hidden = true;
  historyPanel.append(historyHeader, historyCopy, filters, historyList, historyEmpty, historyError, coverage, more);
  grid.insertBefore(historyPanel, oldImportPanel ?? null);

  const reviewPanel = node('section', { className: 'panel panel--span-3 operation-review-panel', 'data-pane': 'records', hidden: '' });
  reviewPanel.setAttribute('aria-labelledby', 'canonical-import-review-title');
  reviewPanel.append(
    node('header', { className: 'panel-header' },
      node('div', {}, node('p', { className: 'eyebrow', textContent: 'IMPORT REVIEW' }), node('h2', { id: 'canonical-import-review-title', textContent: '导入异常审阅' })),
      node('span', { className: 'data-state', 'data-canonical-review-state': '', textContent: '等待读取' }),
    ),
    node('p', { className: 'panel-copy', textContent: '这里只使用带 before / after 审计的 Workbook Review。旧 Import Review 保留为兼容读取面；新产品界面不再从旧写入口结案。' }),
  );
  const reviewList = node('div', { className: 'import-review-list', 'data-canonical-review-list': '' });
  const reviewEmpty = node('p', { className: 'empty-state', 'data-canonical-review-empty': '', textContent: '没有待处理的导入异常。' });
  const reviewError = node('p', { className: 'empty-state', 'data-canonical-review-error': '' }); reviewError.hidden = true;
  reviewPanel.append(reviewList, reviewEmpty, reviewError);
  grid.insertBefore(reviewPanel, oldImportPanel ?? null);

  let items = [];
  let nextCursor = null;
  let loading = false;
  let canReview = null;
  let refreshTimer = null;

  function recordsActive() { return document.querySelector('[data-tab="records"]')?.classList.contains('is-active') ?? false; }
  function syncVisibility() {
    const active = recordsActive();
    historyPanel.hidden = !active;
    reviewPanel.hidden = !(active && canReview === true);
    if (active && !app.hidden) scheduleRefresh();
  }

  async function loadOperations({ append = false } = {}) {
    if (loading || app.hidden || !recordsActive()) return;
    loading = true;
    historyError.hidden = true;
    historyPanel.querySelector('[data-operation-state]').textContent = '正在读取';
    try {
      const params = new URLSearchParams(new FormData(filters));
      for (const [key, value] of [...params.entries()]) if (!String(value).trim()) params.delete(key);
      params.set('limit', '50');
      if (append && nextCursor) params.set('cursor', nextCursor);
      const response = await rawFetch(`${apiBase}/api/operations?${params}`, { credentials: 'include' });
      if (!response.ok) throw new Error(await responseMessage(response, '变更记录暂时无法读取'));
      const body = await response.json();
      items = append ? [...items, ...(body.items ?? [])] : body.items ?? [];
      nextCursor = body.nextCursor ?? null;
      renderOperations();
      coverage.textContent = body.coverage?.note ?? '';
      historyPanel.querySelector('[data-operation-state]').textContent = `${items.length} 条记录`;
      document.documentElement.classList.add('operation-history-ready');
    } catch (error) {
      historyError.textContent = error instanceof Error ? error.message : '变更记录暂时无法读取';
      historyError.hidden = false;
      historyPanel.querySelector('[data-operation-state]').textContent = '读取失败';
    } finally {
      loading = false;
    }
  }

  function renderOperations() {
    historyList.replaceChildren(...items.map((item) => {
      const details = node('details', { className: 'operation-row' });
      const summary = node('summary', {},
        node('span', { className: 'operation-time', textContent: formatTime(item.occurred_at) }),
        node('span', { className: 'operation-main' }, node('strong', { textContent: item.title }), node('small', { textContent: item.summary || '' })),
        node('span', { className: 'operation-actor', textContent: item.actor || '—' }),
      );
      const body = node('div', { className: 'operation-detail' });
      if (item.business_date) body.append(node('p', { className: 'operation-business-date', textContent: `业务日期：${item.business_date}` }));
      if (item.changes?.length) {
        const changeList = node('dl', { className: 'operation-changes' });
        for (const change of item.changes) changeList.append(
          node('div', {}, node('dt', { textContent: change.label }), node('dd', {},
            node('span', { textContent: formatValue(change.before) }), node('b', { textContent: '→' }), node('span', { textContent: formatValue(change.after) }),
          )),
        );
        body.append(changeList);
      } else {
        body.append(node('p', { className: 'operation-no-diff', textContent: '这是一条新增、确认、删除或对账事件，没有需要展开的字段差异。' }));
      }
      details.append(summary, body);
      return details;
    }));
    historyEmpty.hidden = items.length > 0;
    more.hidden = !nextCursor;
  }

  async function loadWorkbookReview() {
    if (app.hidden || !recordsActive() || canReview === false) return;
    const state = reviewPanel.querySelector('[data-canonical-review-state]');
    state.textContent = '正在读取';
    reviewError.hidden = true;
    try {
      const response = await rawFetch(`${apiBase}/api/workbook-review?status=pending`, { credentials: 'include' });
      if (response.status === 403) {
        canReview = false;
        reviewPanel.hidden = true;
        document.documentElement.classList.add('operation-workbook-review-ready');
        return;
      }
      if (!response.ok) throw new Error(await responseMessage(response, '导入异常暂时无法读取'));
      const body = await response.json();
      canReview = true;
      renderWorkbookReview(body.review ?? []);
      reviewPanel.hidden = !recordsActive();
      state.textContent = `${body.review?.length ?? 0} 条待处理`;
      document.documentElement.classList.add('operation-workbook-review-ready');
    } catch (error) {
      reviewError.textContent = error instanceof Error ? error.message : '导入异常暂时无法读取';
      reviewError.hidden = false;
      state.textContent = '读取失败';
    }
  }

  function renderWorkbookReview(rows) {
    reviewList.replaceChildren(...rows.map((row) => {
      const input = node('input', { maxlength: '2000', placeholder: '说明修正或结案依据', 'data-canonical-resolution-note': String(row.id) });
      const button = node('button', { type: 'button', textContent: '结案', 'data-canonical-resolve-review': String(row.id) });
      button.addEventListener('click', () => resolveWorkbookReview(row.id, input, button));
      return node('article', { className: 'import-review-row' },
        node('header', {}, node('strong', { textContent: `${row.record_kind} · ${row.sheet_name ?? 'sheet'} #${row.row_number}` }), node('span', { textContent: row.batch_id })),
        node('p', { textContent: row.reason || '待审阅' }),
        node('pre', { textContent: JSON.stringify(row.raw ?? {}, null, 2) }),
        node('div', { className: 'import-review-controls' }, node('label', { textContent: '结案说明' }, input), button),
      );
    }));
    reviewEmpty.hidden = rows.length > 0;
  }

  async function resolveWorkbookReview(id, input, button) {
    const note = input.value.trim();
    if (!note) { input.focus(); return; }
    button.disabled = true;
    try {
      const response = await rawFetch(`${apiBase}/api/workbook-review/${id}`, {
        method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ resolution_note: note }),
      });
      if (!response.ok) throw new Error(await responseMessage(response, '结案失败'));
      await Promise.all([loadWorkbookReview(), loadOperations()]);
    } catch (error) {
      reviewError.textContent = error instanceof Error ? error.message : '结案失败';
      reviewError.hidden = false;
    } finally {
      button.disabled = false;
    }
  }

  function scheduleRefresh() {
    if (app.hidden || !recordsActive()) return;
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => {
      loadOperations();
      loadWorkbookReview();
    }, 80);
  }

  filters.addEventListener('submit', (event) => { event.preventDefault(); nextCursor = null; loadOperations(); });
  filters.addEventListener('reset', () => setTimeout(() => { nextCursor = null; loadOperations(); }));
  more.addEventListener('click', () => loadOperations({ append: true }));
  for (const tab of document.querySelectorAll('[data-tab]')) tab.addEventListener('click', () => setTimeout(syncVisibility));
  document.querySelector('[data-refresh]')?.addEventListener('click', () => setTimeout(scheduleRefresh));

  const observer = new MutationObserver(() => {
    if (!app.hidden) syncVisibility();
  });
  observer.observe(app, { attributes: true, attributeFilter: ['hidden'] });
  if (!app.hidden) syncVisibility();

  function node(tag, attrs = {}, ...children) {
    const element = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (key === 'className') element.className = value;
      else if (key === 'textContent') element.textContent = value;
      else if (key === 'hidden') element.hidden = true;
      else element.setAttribute(key, value);
    }
    element.append(...children.filter(Boolean));
    return element;
  }
  function inputLabel(label, name, type, attrs = {}) { return node('label', { textContent: label }, node('input', { name, type, ...attrs })); }
  function selectLabel(label, name, options) { return node('label', { textContent: label }, node('select', { name }, ...options.map(([value, text]) => node('option', { value, textContent: text })))); }
  function formatTime(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value ?? '—') : new Intl.DateTimeFormat('zh-CN', {
      timeZone: 'Asia/Shanghai', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
    }).format(date);
  }
  function formatValue(value) {
    if (value === null || value === undefined || value === '') return '—';
    if (typeof value === 'object') return '已更新';
    const text = String(value);
    return text.length > 90 ? `${text.slice(0, 87)}…` : text;
  }
  async function responseMessage(response, fallback) {
    try { return (await response.json())?.message ?? fallback; } catch { return fallback; }
  }
})();
