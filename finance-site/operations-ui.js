(() => {
  const apiBase = document.querySelector('meta[name="finance-api-base"]')?.content.replace(/\/$/, '') ?? '';
  const app = document.querySelector('[data-app]');
  const grid = document.querySelector('.dashboard-grid');
  const oldImportPanel = document.querySelector('[data-import-review-panel]');
  const oldAccessPanel = document.querySelector('[data-access-panel]');
  if (!app || !grid) return;

  const actionLabels = { created: '新增', updated: '修改', deleted: '删除', confirmed: '确认', resolved: '结案' };
  const entityLabels = {
    trade: '交易', cash_flow: '现金流', account_event: '账户事件', investment_plan: '投资计划', investment_rule: '投资规则',
    memo: '投资备忘录', monthly_record: '月度记录', annual_review: '年度复盘', workbook_review: '导入异常',
  };
  const rawFetch = window.fetch.bind(window);

  const changeLogPanel = node('details', { className: 'panel panel--span-3 operation-history-panel', 'data-pane': 'records', hidden: '' });
  const changeLogSummary = node('summary', { className: 'operation-panel-summary' },
    node('span', {}, node('span', { className: 'eyebrow', textContent: 'DATA CHANGE LOG' }), node('strong', { id: 'operation-history-title', textContent: '数据变更记录' })),
    node('span', { className: 'data-state', 'data-operation-state': '', textContent: '管理员审计' }),
  );
  changeLogPanel.setAttribute('aria-labelledby', 'operation-history-title');
  const changeLogCopy = node('p', { className: 'panel-copy', textContent: '这里只回答“谁修改了什么数据”。它不是账户流水，也不展示买卖、分红、对账等业务事件本身；登录与 session 仍在下方安全访问记录中。' });
  const filters = node('form', { className: 'record-filters operation-filters', 'data-operation-filters': '' },
    selectLabel('对象', 'entity_type', [['', '全部'], ...Object.entries(entityLabels).map(([value, label]) => [value, label])]),
    selectLabel('动作', 'action', [['', '全部'], ...Object.entries(actionLabels).map(([value, label]) => [value, label])]),
    inputLabel('用户', 'actor', 'text', { maxlength: '64', placeholder: '例如 muxia' }),
    inputLabel('开始', 'from', 'date'), inputLabel('结束', 'to', 'date'),
    node('button', { className: 'button-secondary', type: 'submit', textContent: '筛选' }),
    node('button', { className: 'text-button', type: 'reset', textContent: '清除' }),
  );
  const changeLogList = node('div', { className: 'operation-list', 'data-operation-list': '' });
  const changeLogEmpty = node('p', { className: 'empty-state', 'data-operation-empty': '', textContent: '当前筛选条件下没有数据变更记录。' });
  const changeLogError = node('p', { className: 'empty-state', 'data-operation-error': '' }); changeLogError.hidden = true;
  const coverage = node('p', { className: 'operation-coverage', 'data-operation-coverage': '' });
  const more = node('button', { className: 'button-secondary operation-more', type: 'button', 'data-operation-more': '', textContent: '加载更多' }); more.hidden = true;
  changeLogPanel.append(changeLogSummary, changeLogCopy, filters, changeLogList, changeLogEmpty, changeLogError, coverage, more);
  grid.insertBefore(changeLogPanel, oldImportPanel ?? null);

  const reviewPanel = node('section', { className: 'panel panel--span-3 operation-review-panel', 'data-pane': 'records', hidden: '' });
  reviewPanel.setAttribute('aria-labelledby', 'canonical-import-review-title');
  reviewPanel.append(
    node('header', { className: 'panel-header' },
      node('div', {}, node('p', { className: 'eyebrow', textContent: 'IMPORT REVIEW' }), node('h2', { id: 'canonical-import-review-title', textContent: '导入异常审阅' })),
      node('span', { className: 'data-state', 'data-canonical-review-state': '', textContent: '等待读取' }),
    ),
    node('p', { className: 'panel-copy', textContent: '异常导入继续使用 canonical Workbook Review 处理。旧 Import Review 只保留兼容路径，不再作为正常产品入口。' }),
  );
  const reviewList = node('div', { className: 'import-review-list', 'data-canonical-review-list': '' });
  const reviewEmpty = node('p', { className: 'empty-state', 'data-canonical-review-empty': '', textContent: '没有待处理的导入异常。' });
  const reviewError = node('p', { className: 'empty-state', 'data-canonical-review-error': '' }); reviewError.hidden = true;
  reviewPanel.append(reviewList, reviewEmpty, reviewError);
  grid.insertBefore(reviewPanel, oldImportPanel ?? null);

  let changes = [];
  let nextCursor = null;
  let loadingChanges = false;
  let canAdmin = null;
  let refreshTimer = null;
  let sessionEpoch = 0;

  function recordsActive() { return document.querySelector('[data-tab="records"]')?.classList.contains('is-active') ?? false; }
  function syncVisibility() {
    const active = recordsActive();
    reviewPanel.hidden = !(active && canAdmin === true);
    changeLogPanel.hidden = !(active && canAdmin === true);
    if (active && !app.hidden) scheduleRefresh();
  }

  async function loadChangeLog({ append = false } = {}) {
    if (loadingChanges || app.hidden || !recordsActive() || canAdmin !== true || !changeLogPanel.open) return;
    const epoch = sessionEpoch;
    loadingChanges = true;
    changeLogError.hidden = true;
    changeLogPanel.querySelector('[data-operation-state]').textContent = '正在读取';
    try {
      const params = new URLSearchParams(new FormData(filters));
      for (const [key, value] of [...params.entries()]) if (!String(value).trim()) params.delete(key);
      params.set('limit', '50');
      if (append && nextCursor) params.set('cursor', nextCursor);
      const response = await rawFetch(`${apiBase}/api/change-log?${params}`, { credentials: 'include' });
      if (!response.ok) throw new Error(await responseMessage(response, '数据变更记录暂时无法读取'));
      const body = await response.json();
      if (epoch !== sessionEpoch || app.hidden) return;
      changes = append ? [...changes, ...(body.items ?? [])] : body.items ?? [];
      nextCursor = body.nextCursor ?? null;
      renderChangeLog();
      coverage.textContent = body.coverage?.note ?? '';
      changeLogPanel.querySelector('[data-operation-state]').textContent = `${changes.length} 条`;
      document.documentElement.classList.add('operation-history-ready');
    } catch (error) {
      if (epoch !== sessionEpoch || app.hidden) return;
      changeLogError.textContent = error instanceof Error ? error.message : '数据变更记录暂时无法读取';
      changeLogError.hidden = false;
      changeLogPanel.querySelector('[data-operation-state]').textContent = '读取失败';
    } finally {
      if (epoch === sessionEpoch) loadingChanges = false;
    }
  }

  function renderChangeLog() {
    changeLogList.replaceChildren(...changes.map((item) => {
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
        body.append(node('p', { className: 'operation-no-diff', textContent: '这条审计记录没有可展开的字段差异。' }));
      }
      details.append(summary, body);
      return details;
    }));
    changeLogEmpty.hidden = changes.length > 0;
    more.hidden = !nextCursor;
  }

  async function loadWorkbookReview() {
    if (app.hidden || !recordsActive() || canAdmin === false) return;
    const epoch = sessionEpoch;
    const state = reviewPanel.querySelector('[data-canonical-review-state]');
    state.textContent = '正在读取';
    reviewError.hidden = true;
    try {
      const response = await rawFetch(`${apiBase}/api/workbook-review?status=pending`, { credentials: 'include' });
      if (response.status === 403) {
        if (epoch !== sessionEpoch || app.hidden) return;
        canAdmin = false;
        reviewList.replaceChildren();
        reviewPanel.hidden = true;
        changeLogPanel.hidden = true;
        document.documentElement.classList.add('operation-workbook-review-ready');
        return;
      }
      if (!response.ok) throw new Error(await responseMessage(response, '导入异常暂时无法读取'));
      const body = await response.json();
      if (epoch !== sessionEpoch || app.hidden) return;
      canAdmin = true;
      renderWorkbookReview(body.review ?? []);
      reviewPanel.hidden = !recordsActive();
      changeLogPanel.hidden = !recordsActive();
      state.textContent = `${body.review?.length ?? 0} 条待处理`;
      document.documentElement.classList.add('operation-workbook-review-ready');
      if (changeLogPanel.open) loadChangeLog();
    } catch (error) {
      if (epoch !== sessionEpoch || app.hidden) return;
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
    const epoch = sessionEpoch;
    button.disabled = true;
    try {
      const response = await rawFetch(`${apiBase}/api/workbook-review/${id}`, {
        method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ resolution_note: note }),
      });
      if (!response.ok) throw new Error(await responseMessage(response, '结案失败'));
      if (epoch !== sessionEpoch || app.hidden) return;
      await loadWorkbookReview();
      if (changeLogPanel.open) await loadChangeLog();
    } catch (error) {
      if (epoch !== sessionEpoch || app.hidden) return;
      reviewError.textContent = error instanceof Error ? error.message : '结案失败';
      reviewError.hidden = false;
    } finally {
      if (epoch === sessionEpoch) button.disabled = false;
    }
  }

  function scheduleRefresh() {
    if (app.hidden || !recordsActive()) return;
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => {
      loadWorkbookReview();
      if (changeLogPanel.open) loadChangeLog();
    }, 80);
  }

  function resetSessionSurfaces() {
    sessionEpoch += 1;
    clearTimeout(refreshTimer);
    refreshTimer = null;
    loadingChanges = false;
    canAdmin = null;
    changes = [];
    nextCursor = null;
    changeLogList.replaceChildren();
    reviewList.replaceChildren();
    oldAccessPanel?.querySelector('[data-access-list]')?.replaceChildren();
    oldImportPanel?.querySelector('[data-import-review-list]')?.replaceChildren();
    changeLogEmpty.hidden = false;
    reviewEmpty.hidden = false;
    changeLogError.hidden = true;
    reviewError.hidden = true;
    coverage.textContent = '';
    changeLogPanel.querySelector('[data-operation-state]').textContent = '管理员审计';
    reviewPanel.querySelector('[data-canonical-review-state]').textContent = '等待读取';
    changeLogPanel.open = false;
    changeLogPanel.hidden = true;
    reviewPanel.hidden = true;
    document.documentElement.classList.remove('operation-history-ready', 'operation-workbook-review-ready');
  }

  filters.addEventListener('submit', (event) => { event.preventDefault(); nextCursor = null; loadChangeLog(); });
  filters.addEventListener('reset', () => setTimeout(() => { nextCursor = null; loadChangeLog(); }));
  more.addEventListener('click', () => loadChangeLog({ append: true }));
  changeLogPanel.addEventListener('toggle', () => { if (changeLogPanel.open) loadChangeLog(); });
  for (const tab of document.querySelectorAll('[data-tab]')) tab.addEventListener('click', () => setTimeout(syncVisibility));
  document.querySelector('[data-refresh]')?.addEventListener('click', () => setTimeout(scheduleRefresh));

  const observer = new MutationObserver(() => {
    if (app.hidden) resetSessionSurfaces();
    else syncVisibility();
  });
  observer.observe(app, { attributes: true, attributeFilter: ['hidden'] });
  if (app.hidden) resetSessionSurfaces(); else syncVisibility();

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
