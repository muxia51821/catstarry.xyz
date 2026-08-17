import { apiError, json } from '../lib/http';
import { requireFinanceRole, type FinanceEnv } from './auth';

const ENTITY_TYPES = new Set([
  'trade', 'cash_flow', 'account_event', 'investment_plan', 'investment_rule',
  'memo', 'monthly_record', 'annual_review', 'workbook_review', 'rebalance',
  'review_confirmation', 'monthly_confirmation', 'circuit', 'circuit_resolution',
  'asset_reconciliation', 'historical_import',
]);
const ACTIONS = new Set(['created', 'updated', 'deleted', 'confirmed', 'resolved', 'reconciled']);
const isoDay = /^\d{4}-\d{2}-\d{2}$/;

type JsonObject = Record<string, unknown>;
interface OperationRow {
  operation_key: string;
  occurred_at: string;
  actor: string;
  action: string;
  entity_type: string;
  entity_id: string;
  business_date: string | null;
  before_json: string | null;
  after_json: string | null;
  sort_id: number;
}

export async function handleOperations(request: Request, env: FinanceEnv): Promise<Response> {
  if (request.method !== 'GET') return apiError(405, 'method_not_allowed', 'Method is not allowed');
  const session = await requireFinanceRole(request, env);
  if (session instanceof Response) return session;

  const url = new URL(request.url);
  const entityType = (url.searchParams.get('entity_type') ?? '').trim();
  const action = (url.searchParams.get('action') ?? '').trim();
  const actor = (url.searchParams.get('actor') ?? '').trim();
  const from = optionalDay(url.searchParams.get('from'));
  const to = optionalDay(url.searchParams.get('to'));
  const limit = Number(url.searchParams.get('limit') ?? '50');
  const offset = Number(url.searchParams.get('offset') ?? '0');
  if ((entityType && !ENTITY_TYPES.has(entityType)) || (action && !ACTIONS.has(action))
    || actor.length > 64 || from === undefined || to === undefined || (from && to && from > to)
    || !Number.isInteger(limit) || limit < 1 || limit > 100
    || !Number.isInteger(offset) || offset < 0 || offset > 10_000) {
    return apiError(400, 'invalid_filter', 'Operation history filters are invalid');
  }

  const sources = baseSources();
  if (session.role === 'admin') sources.push(workbookReviewSource());
  const clauses = ['1 = 1'];
  const values: unknown[] = [];
  if (entityType) { clauses.push('entity_type = ?'); values.push(entityType); }
  if (action) { clauses.push('action = ?'); values.push(action); }
  if (actor) { clauses.push('actor = ?'); values.push(actor); }
  if (from) { clauses.push('occurred_at >= ?'); values.push(`${from}T00:00:00.000Z`); }
  if (to) { clauses.push('occurred_at <= ?'); values.push(`${to}T23:59:59.999Z`); }

  const query = `SELECT * FROM (${sources.join('\nUNION ALL\n')}) operations
    WHERE ${clauses.join(' AND ')}
    ORDER BY occurred_at DESC, sort_id DESC
    LIMIT ? OFFSET ?`;
  const rows = await env.DB.prepare(query).bind(...values, limit + 1, offset).all<OperationRow>();
  const page = rows.results.slice(0, limit);
  return json({
    items: page.map(humanizeOperation),
    nextOffset: rows.results.length > limit ? offset + limit : null,
    coverage: {
      note: 'Investment Memo、月度记录与年度复盘的完整版本历史从 Operation History 审计迁移后开始；迁移前从未保存的旧版本不会反推或伪造。',
      security_access_log_included: false,
    },
  });
}

function baseSources(): string[] {
  return [
    `SELECT 'trade:' || a.id AS operation_key, a.occurred_at AS occurred_at, a.actor AS actor,
      a.action AS action, 'trade' AS entity_type, CAST(a.trade_id AS TEXT) AS entity_id,
      COALESCE(json_extract(a.after_json, '$.trade_date'), json_extract(a.before_json, '$.trade_date'), t.trade_date) AS business_date,
      a.before_json AS before_json, a.after_json AS after_json, a.id AS sort_id
      FROM finance_trade_audit a LEFT JOIN trades t ON t.id = a.trade_id`,
    `SELECT 'cash-flow:' || a.id, a.occurred_at, a.actor, a.action, 'cash_flow', CAST(a.cash_flow_id AS TEXT),
      COALESCE(json_extract(a.after_json, '$.occurred_on'), json_extract(a.before_json, '$.occurred_on'), f.occurred_on),
      a.before_json, a.after_json, a.id
      FROM finance_cash_flow_audit a LEFT JOIN finance_cash_flows f ON f.id = a.cash_flow_id`,
    `SELECT 'account-event:' || a.id, a.occurred_at, a.actor, a.action, 'account_event', CAST(a.account_event_id AS TEXT),
      COALESCE(json_extract(a.after_json, '$.event_date'), json_extract(a.before_json, '$.event_date'), e.event_date),
      a.before_json, a.after_json, a.id
      FROM finance_account_event_audit a LEFT JOIN finance_account_events e ON e.id = a.account_event_id`,
    `SELECT 'plan:' || a.id, a.occurred_at, a.actor,
      CASE WHEN a.before_json IS NULL THEN 'created' ELSE 'updated' END,
      'investment_plan', '1', NULL, a.before_json, a.after_json, a.id
      FROM finance_plan_audit a`,
    `SELECT 'rule:' || a.id, a.occurred_at, a.actor,
      CASE WHEN a.before_json IS NULL THEN 'created' ELSE 'updated' END,
      'investment_rule', a.rule_key, NULL, a.before_json, a.after_json, a.id
      FROM finance_rule_audit a`,
    `SELECT 'memo:' || a.id, a.occurred_at, a.actor, a.action, 'memo', CAST(a.memo_id AS TEXT),
      COALESCE(json_extract(a.after_json, '$.memo_date'), json_extract(a.before_json, '$.memo_date'), m.memo_date),
      a.before_json, a.after_json, a.id
      FROM finance_memo_audit a LEFT JOIN finance_memos m ON m.id = a.memo_id`,
    `SELECT 'monthly:' || a.id, a.occurred_at, a.actor, a.action, 'monthly_record', CAST(a.monthly_record_id AS TEXT),
      COALESCE(json_extract(a.after_json, '$.year_month'), json_extract(a.before_json, '$.year_month'), r.year_month) || '-01',
      a.before_json, a.after_json, a.id
      FROM finance_monthly_record_audit a LEFT JOIN monthly_records r ON r.id = a.monthly_record_id`,
    `SELECT 'annual-review:' || a.id, a.occurred_at, a.actor, a.action, 'annual_review', CAST(a.review_year AS TEXT),
      CAST(a.review_year AS TEXT) || '-12-31', a.before_json, a.after_json, a.id
      FROM finance_review_audit a`,
    `SELECT 'rebalance-created:' || r.id, r.created_at, r.created_by, 'created', 'rebalance', CAST(r.id AS TEXT),
      r.executed_on, NULL,
      json_object('year', r.year, 'executed_on', r.executed_on, 'adjustments', r.adjustments, 'reason', r.reason), r.id
      FROM finance_rebalance_records r`,
    `SELECT 'rebalance-confirmed:' || r.id, r.confirmed_at, r.confirmed_by, 'confirmed', 'rebalance', CAST(r.id AS TEXT),
      r.executed_on, NULL, json_object('year', r.year, 'executed_on', r.executed_on), r.id
      FROM finance_rebalance_records r WHERE r.confirmed_at IS NOT NULL AND r.confirmed_by IS NOT NULL`,
    `SELECT 'review-confirmed:' || ar.year, ar.confirmed_at, ar.confirmed_by, 'confirmed', 'review_confirmation', CAST(ar.year AS TEXT),
      CAST(ar.year AS TEXT) || '-12-31', NULL, json_object('year', ar.year), ar.year
      FROM annual_reviews ar WHERE ar.confirmed_at IS NOT NULL AND ar.confirmed_by IS NOT NULL`,
    `SELECT 'monthly-confirmed:' || mc.period || ':' || mc.username, mc.confirmed_at, mc.username, 'confirmed',
      'monthly_confirmation', mc.period || ':' || mc.username, mc.period || '-01', NULL,
      json_object('period', mc.period, 'username', mc.username), rowid
      FROM monthly_confirmations mc`,
    `SELECT 'circuit-objection:' || c.id, c.triggered_at,
      CASE WHEN json_valid(c.reason) THEN json_extract(c.reason, '$.objection_by') END,
      'created', 'circuit', CAST(c.id AS TEXT), substr(c.triggered_at, 1, 10), NULL, c.reason, c.id
      FROM circuit_breaker_log c
      WHERE CASE WHEN json_valid(c.reason) THEN json_extract(c.reason, '$.objection_by') IS NOT NULL ELSE 0 END`,
    `SELECT 'circuit-resolution:' || c.rowid, c.confirmed_at, c.username, 'confirmed', 'circuit_resolution', CAST(c.circuit_id AS TEXT),
      substr(c.confirmed_at, 1, 10), NULL, json_object('role', c.role, 'note', c.note), c.rowid
      FROM finance_circuit_resolution_confirmations c`,
    `SELECT 'asset-reconciliation:' || s.id, s.created_at, s.created_by, 'reconciled', 'asset_reconciliation', CAST(s.id AS TEXT),
      s.snapshot_date, NULL,
      json_object('snapshot_at', s.snapshot_at, 'snapshot_date', s.snapshot_date, 'holdings_value', s.holdings_value,
        'cash_value', s.cash_value, 'total_value', s.total_value, 'source', s.source, 'is_complete', s.is_complete), s.id
      FROM finance_asset_snapshots s
      WHERE s.deleted_at IS NULL
        AND s.created_by NOT LIKE 'historical-import:%'
        AND lower(s.source) NOT IN ('auto_close', 'historical_backfill', 'history_import')`,
    `SELECT 'historical-import:' || i.rowid, i.created_at, 'system:historical-import', 'created', 'historical_import', i.batch_id,
      NULL, NULL,
      json_object('batch_id', i.batch_id, 'source_name', i.source_name, 'source_rows', i.source_rows,
        'imported_rows', i.imported_rows, 'review_rows', i.review_rows), i.rowid
      FROM finance_workbook_imports i`,
  ];
}

function workbookReviewSource(): string {
  return `SELECT 'workbook-review:' || a.id, a.occurred_at, a.actor, a.action, 'workbook_review', CAST(a.review_id AS TEXT),
    substr(a.occurred_at, 1, 10), a.before_json, a.after_json, a.id FROM finance_workbook_review_audit a`;
}

function humanizeOperation(row: OperationRow) {
  const before = parseJson(row.before_json);
  const after = parseJson(row.after_json);
  const data = after ?? before ?? {};
  const changes = changedFields(row.entity_type, before, after);
  const subject = subjectFor(row.entity_type, data, row.entity_id);
  return {
    key: row.operation_key, occurred_at: row.occurred_at, actor: row.actor, action: row.action,
    entity_type: row.entity_type, entity_id: row.entity_id, business_date: row.business_date,
    title: `${ACTION_LABEL[row.action] ?? row.action}${ENTITY_LABEL[row.entity_type] ?? row.entity_type}${subject ? ` · ${subject}` : ''}`,
    summary: summaryFor(row.entity_type, row.action, data, changes), changes,
  };
}

const ACTION_LABEL: Record<string, string> = {
  created: '新增', updated: '修改', deleted: '删除', confirmed: '确认', resolved: '解决', reconciled: '对账',
};
const ENTITY_LABEL: Record<string, string> = {
  trade: '交易', cash_flow: '现金流', account_event: '账户事件', investment_plan: '投资计划',
  investment_rule: '投资规则', memo: '投资备忘录', monthly_record: '月度记录', annual_review: '年度复盘',
  workbook_review: '导入异常', rebalance: '再平衡', review_confirmation: '年度复盘', monthly_confirmation: '月度查阅',
  circuit: '重大异议', circuit_resolution: '熔断恢复', asset_reconciliation: '资产', historical_import: '历史数据迁移',
};
const FIELD_LABEL: Record<string, string> = {
  trade_date: '交易日期', trade_time: '交易时间', ticker: '代码', ticker_name: '标的', direction: '方向',
  quantity: '数量', price: '价格', fee: '税费', net_cash_amount: '实际资金变化', position_category: '组合角色', reason: '理由',
  occurred_on: '发生日期', contributor: '贡献人', flow_type: '资金类型', confirmed_amount: '确认金额', manager_share_offset: '管理者份额抵扣',
  net_amount: '净金额', event_date: '事件日期', event_time: '事件时间', event_type: '事件类型', amount: '金额', reference_value: '参考值',
  memo_date: '备忘日期', operation_type: '操作类型', stop_loss_triggered: '止损标记', note: '备注', year_month: '月份',
  muxia_invest: '木下投入', cati_invest: 'CATI投入', end_total: '月末资产', blue_chip_temp: '市场温度', summary: '总结', remark: '备注',
  resolution_note: '结案说明', status: '状态', adjustments: '调整内容', total_value: '总资产', holdings_value: '证券市值', cash_value: '现金',
  source: '来源', calculation_json: '计算结果',
};
const BUSINESS_FIELDS: Record<string, string[]> = {
  trade: ['direction', 'quantity', 'price', 'fee', 'net_cash_amount', 'position_category', 'reason'],
  cash_flow: ['occurred_on', 'contributor', 'flow_type', 'confirmed_amount', 'manager_share_offset', 'net_amount', 'note'],
  account_event: ['event_date', 'event_time', 'event_type', 'ticker', 'quantity', 'reference_value', 'amount', 'position_category', 'note'],
  memo: ['reason', 'stop_loss_triggered', 'note'],
  monthly_record: ['muxia_invest', 'cati_invest', 'end_total', 'sse300_pe', 'sse500_pe', 'sse1000_pe', 'blue_chip_temp', 'summary', 'remark'],
  annual_review: ['summary', 'calculation_json'], workbook_review: ['status', 'resolution_note'],
};

function changedFields(entityType: string, before: JsonObject | null, after: JsonObject | null) {
  if (!before || !after) return [];
  const fields = BUSINESS_FIELDS[entityType] ?? [...new Set([...Object.keys(before), ...Object.keys(after)])];
  return fields.filter((field) => !same(before[field], after[field])).map((field) => ({
    field, label: FIELD_LABEL[field] ?? field, before: before[field] ?? null, after: after[field] ?? null,
  }));
}

function subjectFor(entityType: string, data: JsonObject, fallback: string) {
  if (entityType === 'trade' || entityType === 'memo' || entityType === 'account_event') return String(data.ticker_name ?? data.ticker ?? fallback);
  if (entityType === 'monthly_record' || entityType === 'monthly_confirmation') return String(data.year_month ?? data.period ?? fallback);
  if (entityType === 'annual_review' || entityType === 'review_confirmation' || entityType === 'rebalance') return String(data.year ?? fallback);
  if (entityType === 'investment_rule') return fallback;
  if (entityType === 'historical_import') return String(data.source_name ?? fallback);
  return '';
}

function summaryFor(entityType: string, action: string, data: JsonObject, changes: ReturnType<typeof changedFields>) {
  if (action === 'updated' && changes.length) {
    const visible = changes.slice(0, 2).map((change) => `${change.label} ${shortValue(change.before)} → ${shortValue(change.after)}`);
    return visible.join('；') + (changes.length > 2 ? `；另有 ${changes.length - 2} 项变化` : '');
  }
  if (entityType === 'trade') return `${directionLabel(data.direction)} ${shortValue(data.quantity)} 股 × ${moneyValue(data.price)}`;
  if (entityType === 'cash_flow') return `${String(data.contributor ?? '')} · ${signedMoney(data.net_amount)}`;
  if (entityType === 'account_event') return `${String(data.event_type ?? '')}${data.amount !== null && data.amount !== undefined ? ` · ${signedMoney(data.amount)}` : ''}`;
  if (entityType === 'memo') return action === 'deleted' ? '备忘录已删除，原内容保留在审计记录中。' : String(data.reason ?? '投资判断已记录');
  if (entityType === 'monthly_record') return `${String(data.year_month ?? '')} 月度记录`;
  if (entityType === 'annual_review') return `${String(data.year ?? '')} 年度复盘由计算引擎${action === 'created' ? '生成' : '重算'}`;
  if (entityType === 'workbook_review') return String(data.resolution_note ?? data.reason ?? '导入异常已结案');
  if (entityType === 'rebalance') return String(data.adjustments ?? '再平衡记录');
  if (entityType === 'asset_reconciliation') return `总资产 ${moneyValue(data.total_value)}`;
  if (entityType === 'historical_import') return `${shortValue(data.imported_rows)} 条记录 · ${shortValue(data.review_rows)} 条待审阅`;
  if (entityType === 'circuit') return String(data.reason ?? '已提出重大异议');
  return `${ENTITY_LABEL[entityType] ?? entityType}${ACTION_LABEL[action] ?? action}`;
}

function parseJson(value: string | null): JsonObject | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as JsonObject : null;
  } catch { return null; }
}
function same(left: unknown, right: unknown) { return JSON.stringify(left ?? null) === JSON.stringify(right ?? null); }
function optionalDay(value: string | null): string | null | undefined { return value === null || value === '' ? null : isoDay.test(value) ? value : undefined; }
function directionLabel(value: unknown) { return value === 'sell' ? '卖出' : value === 'buy' ? '买入' : String(value ?? ''); }
function moneyValue(value: unknown) { const number = Number(value); return Number.isFinite(number) ? `¥${number.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}` : '—'; }
function signedMoney(value: unknown) { const number = Number(value); return Number.isFinite(number) ? `${number >= 0 ? '+' : '-'}¥${Math.abs(number).toLocaleString('zh-CN', { maximumFractionDigits: 2 })}` : '—'; }
function shortValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'object') return '已更新';
  const text = String(value);
  return text.length > 56 ? `${text.slice(0, 53)}…` : text;
}
