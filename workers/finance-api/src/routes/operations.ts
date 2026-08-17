import { apiError, json } from '../lib/http';
import { requireFinanceRole, type FinanceEnv } from './auth';

const ENTITY_TYPES = new Set([
  'trade', 'cash_flow', 'account_event', 'investment_plan', 'investment_rule',
  'memo', 'monthly_record', 'annual_review', 'workbook_review', 'rebalance',
  'monthly_confirmation', 'circuit', 'circuit_resolution', 'asset_reconciliation',
  'historical_import',
]);
const ACTIONS = new Set(['created', 'updated', 'deleted', 'confirmed', 'resolved', 'reconciled']);
const isoDay = /^\d{4}-\d{2}-\d{2}$/;
const SHANGHAI_OFFSET_MS = 8 * 60 * 60 * 1_000;
const MAX_CURSOR_LENGTH = 2_048;

type JsonObject = Record<string, unknown>;
type AuditStrength = 'audit' | 'domain' | 'provenance';
export interface OperationFilterSignature {
  entity_type: string | null;
  action: string | null;
  actor: string | null;
  from: string | null;
  to: string | null;
}
export interface OperationCursorPosition {
  occurred_at: string;
  operation_key: string;
}
interface OperationCursorPayload extends OperationCursorPosition {
  filter: OperationFilterSignature;
}
export interface OperationRow {
  operation_key: string;
  occurred_at: string;
  actor: string;
  action: string;
  entity_type: string;
  entity_id: string;
  business_date: string | null;
  before_json: string | null;
  after_json: string | null;
  audit_strength: AuditStrength;
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
  if ((entityType && !ENTITY_TYPES.has(entityType)) || (action && !ACTIONS.has(action))
    || actor.length > 64 || from === undefined || to === undefined || (from && to && from > to)
    || !Number.isInteger(limit) || limit < 1 || limit > 100) {
    return apiError(400, 'invalid_filter', 'Operation history filters are invalid');
  }

  const filter: OperationFilterSignature = {
    entity_type: entityType || null,
    action: action || null,
    actor: actor || null,
    from: from ?? null,
    to: to ?? null,
  };
  let cursor: OperationCursorPosition | null = null;
  const cursorValue = url.searchParams.get('cursor');
  if (cursorValue) {
    try {
      cursor = decodeOperationCursor(cursorValue, filter);
    } catch {
      return apiError(400, 'invalid_cursor', 'Operation history cursor is invalid');
    }
  }

  const includeAdminReview = session.role === 'admin';
  const built = buildOperationsQuery({ includeWorkbookReview: includeAdminReview, filter, cursor, limit });
  const rows = await env.DB.prepare(built.query).bind(...built.values).all<OperationRow>();
  const page = rows.results.slice(0, limit);
  const last = page.at(-1);
  return json({
    items: page.map(humanizeOperation),
    nextCursor: rows.results.length > limit && last
      ? encodeOperationCursor({ occurred_at: last.occurred_at, operation_key: last.operation_key, filter })
      : null,
    coverage: {
      note: 'Investment Memo、月度记录与年度复盘的完整版本历史从 Operation History 审计迁移后开始；迁移前从未保存的旧版本不会反推或伪造。Trade、现金流、账户事件若发现旧写路径缺少对应 audit，只展示行级 provenance，不虚构 before / after。',
      timezone: 'Asia/Shanghai',
      security_access_log_included: false,
      legacy_import_review_included: includeAdminReview,
    },
  });
}

export function buildOperationsQuery(input: {
  includeWorkbookReview: boolean;
  filter: OperationFilterSignature;
  cursor: OperationCursorPosition | null;
  limit: number;
}) {
  const sources = baseSources();
  if (input.includeWorkbookReview) sources.push(...workbookReviewSources());
  const clauses = ['1 = 1'];
  const values: unknown[] = [];
  if (input.filter.entity_type) { clauses.push('entity_type = ?'); values.push(input.filter.entity_type); }
  if (input.filter.action) { clauses.push('action = ?'); values.push(input.filter.action); }
  if (input.filter.actor) { clauses.push('actor = ?'); values.push(input.filter.actor); }
  if (input.filter.from) { clauses.push('occurred_at >= ?'); values.push(shanghaiBoundary(input.filter.from)); }
  if (input.filter.to) { clauses.push('occurred_at < ?'); values.push(shanghaiBoundary(input.filter.to, 1)); }
  if (input.cursor) {
    clauses.push('(occurred_at < ? OR (occurred_at = ? AND operation_key < ?))');
    values.push(input.cursor.occurred_at, input.cursor.occurred_at, input.cursor.operation_key);
  }
  return {
    query: `SELECT * FROM (${sources.join('\nUNION ALL\n')}) operations
      WHERE ${clauses.join(' AND ')}
      ORDER BY occurred_at DESC, operation_key DESC
      LIMIT ?`,
    values: [...values, input.limit + 1],
  };
}

export function encodeOperationCursor(value: OperationCursorPayload): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function decodeOperationCursor(value: string, filter: OperationFilterSignature): OperationCursorPosition {
  if (!value || value.length > MAX_CURSOR_LENGTH) throw new Error('invalid cursor');
  const source = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(source + '='.repeat((4 - source.length % 4) % 4));
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  const parsed = JSON.parse(new TextDecoder().decode(bytes)) as Partial<OperationCursorPayload>;
  if (typeof parsed.occurred_at !== 'string' || !Number.isFinite(Date.parse(parsed.occurred_at))
    || typeof parsed.operation_key !== 'string' || parsed.operation_key.length < 1 || parsed.operation_key.length > 256
    || JSON.stringify(parsed.filter) !== JSON.stringify(filter)) throw new Error('invalid cursor');
  return { occurred_at: parsed.occurred_at, operation_key: parsed.operation_key };
}

function baseSources(): string[] {
  return [
    `SELECT 'trade:' || a.id AS operation_key, a.occurred_at AS occurred_at, a.actor AS actor,
      a.action AS action, 'trade' AS entity_type, CAST(a.trade_id AS TEXT) AS entity_id,
      COALESCE(json_extract(a.after_json, '$.trade_date'), json_extract(a.before_json, '$.trade_date'), t.trade_date) AS business_date,
      a.before_json AS before_json, a.after_json AS after_json, 'audit' AS audit_strength
      FROM finance_trade_audit a LEFT JOIN trades t ON t.id = a.trade_id`,
    ...tradeProvenanceSources(),
    `SELECT 'cash-flow:' || a.id, a.occurred_at, a.actor, a.action, 'cash_flow', CAST(a.cash_flow_id AS TEXT),
      COALESCE(json_extract(a.after_json, '$.occurred_on'), json_extract(a.before_json, '$.occurred_on'), f.occurred_on),
      a.before_json, a.after_json, 'audit'
      FROM finance_cash_flow_audit a LEFT JOIN finance_cash_flows f ON f.id = a.cash_flow_id`,
    ...cashFlowProvenanceSources(),
    `SELECT 'account-event:' || a.id, a.occurred_at, a.actor, a.action, 'account_event', CAST(a.account_event_id AS TEXT),
      COALESCE(json_extract(a.after_json, '$.event_date'), json_extract(a.before_json, '$.event_date'), e.event_date),
      a.before_json, a.after_json, 'audit'
      FROM finance_account_event_audit a LEFT JOIN finance_account_events e ON e.id = a.account_event_id`,
    ...accountEventProvenanceSources(),
    `SELECT 'plan:' || a.id, a.occurred_at, a.actor,
      CASE WHEN a.before_json IS NULL THEN 'created' ELSE 'updated' END,
      'investment_plan', '1', NULL, a.before_json, a.after_json, 'audit'
      FROM finance_plan_audit a`,
    `SELECT 'rule:' || a.id, a.occurred_at, a.actor,
      CASE WHEN a.before_json IS NULL THEN 'created' ELSE 'updated' END,
      'investment_rule', a.rule_key, NULL, a.before_json, a.after_json, 'audit'
      FROM finance_rule_audit a`,
    `SELECT 'memo:' || a.id, a.occurred_at, a.actor, a.action, 'memo', CAST(a.memo_id AS TEXT),
      COALESCE(json_extract(a.after_json, '$.memo_date'), json_extract(a.before_json, '$.memo_date'), m.memo_date),
      a.before_json, a.after_json, 'audit'
      FROM finance_memo_audit a LEFT JOIN finance_memos m ON m.id = a.memo_id`,
    `SELECT 'monthly:' || a.id, a.occurred_at, a.actor, a.action, 'monthly_record', CAST(a.monthly_record_id AS TEXT),
      NULL, a.before_json, a.after_json, 'audit'
      FROM finance_monthly_record_audit a`,
    `SELECT 'annual-review:' || a.id, a.occurred_at, a.actor, a.action, 'annual_review', CAST(a.review_year AS TEXT),
      NULL, a.before_json, a.after_json, 'audit'
      FROM finance_review_audit a`,
    `SELECT 'rebalance-created:' || r.id, r.created_at, r.created_by, 'created', 'rebalance', CAST(r.id AS TEXT),
      r.executed_on, NULL, json_object('year', r.year, 'executed_on', r.executed_on, 'adjustments', r.adjustments, 'reason', r.reason), 'domain'
      FROM finance_rebalance_records r`,
    `SELECT 'rebalance-confirmed:' || r.id, r.confirmed_at, r.confirmed_by, 'confirmed', 'rebalance', CAST(r.id AS TEXT),
      r.executed_on, NULL, json_object('year', r.year, 'executed_on', r.executed_on), 'domain'
      FROM finance_rebalance_records r WHERE r.confirmed_at IS NOT NULL AND r.confirmed_by IS NOT NULL`,
    `SELECT 'monthly-confirmed:' || mc.period || ':' || mc.username, mc.confirmed_at, mc.username, 'confirmed',
      'monthly_confirmation', mc.period || ':' || mc.username, NULL, NULL,
      json_object('period', mc.period, 'username', mc.username), 'domain'
      FROM monthly_confirmations mc`,
    `SELECT 'circuit:' || c.id, c.triggered_at,
      COALESCE(
        CASE WHEN json_valid(c.reason) THEN json_extract(c.reason, '$.objection_by') END,
        CASE WHEN json_valid(c.reason) THEN json_extract(c.reason, '$.triggered_by') END,
        'system:risk-engine'
      ),
      'created', 'circuit', CAST(c.id AS TEXT), NULL, NULL,
      CASE WHEN json_valid(c.reason)
        THEN json_object('level', c.level, 'detail', json(c.reason))
        ELSE json_object('level', c.level, 'detail', c.reason)
      END, 'domain'
      FROM circuit_breaker_log c`,
    `SELECT 'circuit-resolved:' || c.id, c.resolved_at, 'system:circuit-state', 'resolved', 'circuit', CAST(c.id AS TEXT),
      NULL, NULL, json_object('level', c.level, 'resolved_at', c.resolved_at), 'domain'
      FROM circuit_breaker_log c WHERE c.resolved_at IS NOT NULL`,
    `SELECT 'circuit-resolution:' || c.rowid, c.confirmed_at, c.username, 'confirmed', 'circuit_resolution', CAST(c.circuit_id AS TEXT),
      NULL, NULL, json_object('role', c.role, 'note', c.note), 'domain'
      FROM finance_circuit_resolution_confirmations c`,
    `SELECT 'asset-reconciliation:' || s.id, s.created_at, s.created_by, 'reconciled', 'asset_reconciliation', CAST(s.id AS TEXT),
      s.snapshot_date, NULL,
      json_object('snapshot_at', s.snapshot_at, 'snapshot_date', s.snapshot_date, 'holdings_value', s.holdings_value,
        'cash_value', s.cash_value, 'total_value', s.total_value, 'source', s.source, 'is_complete', s.is_complete), 'domain'
      FROM finance_asset_snapshots s
      WHERE s.deleted_at IS NULL
        AND s.created_by NOT LIKE 'historical-import:%'
        AND lower(s.source) NOT IN ('auto_close', 'historical_backfill', 'history_import')`,
    `SELECT 'historical-import:' || i.rowid, i.created_at, 'system:historical-import', 'created', 'historical_import', i.batch_id,
      NULL, NULL,
      json_object('batch_id', i.batch_id, 'source_name', i.source_name, 'source_rows', i.source_rows,
        'imported_rows', i.imported_rows, 'review_rows', i.review_rows), 'domain'
      FROM finance_workbook_imports i`,
  ];
}

function tradeProvenanceSources(): string[] {
  const payload = `json_object('trade_date', t.trade_date, 'ticker', t.ticker, 'ticker_name', t.ticker_name,
    'direction', t.direction, 'quantity', t.quantity, 'price', t.price, 'fee', t.fee,
    'net_cash_amount', t.net_cash_amount, 'position_category', t.position_category, 'provenance_fallback', 1)`;
  return [
    `SELECT 'trade-provenance-created:' || t.id, t.created_at, t.created_by, 'created', 'trade', CAST(t.id AS TEXT),
      t.trade_date, NULL, ${payload}, 'provenance'
      FROM trades t
      WHERE t.created_at IS NOT NULL AND t.created_by IS NOT NULL
        AND t.created_by <> 'legacy-import' AND t.created_by NOT LIKE 'historical-import:%'
        AND NOT EXISTS (SELECT 1 FROM finance_trade_audit a WHERE a.trade_id = t.id AND a.action = 'created')`,
    `SELECT 'trade-provenance-updated:' || t.id, t.updated_at, t.updated_by, 'updated', 'trade', CAST(t.id AS TEXT),
      t.trade_date, NULL, ${payload}, 'provenance'
      FROM trades t
      WHERE t.updated_at IS NOT NULL AND t.updated_by IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM finance_trade_audit a WHERE a.trade_id = t.id AND a.action = 'updated' AND a.occurred_at = t.updated_at)`,
    `SELECT 'trade-provenance-deleted:' || t.id, t.deleted_at, t.deleted_by, 'deleted', 'trade', CAST(t.id AS TEXT),
      t.trade_date, ${payload}, NULL, 'provenance'
      FROM trades t
      WHERE t.deleted_at IS NOT NULL AND t.deleted_by IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM finance_trade_audit a WHERE a.trade_id = t.id AND a.action = 'deleted' AND a.occurred_at = t.deleted_at)`,
  ];
}

function cashFlowProvenanceSources(): string[] {
  const payload = `json_object('occurred_on', f.occurred_on, 'contributor', f.contributor, 'flow_type', f.flow_type,
    'confirmed_amount', f.confirmed_amount, 'manager_share_offset', f.manager_share_offset,
    'net_amount', f.net_amount, 'note', f.note, 'provenance_fallback', 1)`;
  return [
    `SELECT 'cash-flow-provenance-created:' || f.id, f.created_at, f.created_by, 'created', 'cash_flow', CAST(f.id AS TEXT),
      f.occurred_on, NULL, ${payload}, 'provenance'
      FROM finance_cash_flows f
      WHERE f.created_at IS NOT NULL AND f.created_by IS NOT NULL AND f.created_by NOT LIKE 'historical-import:%'
        AND NOT EXISTS (SELECT 1 FROM finance_cash_flow_audit a WHERE a.cash_flow_id = f.id AND a.action = 'created')`,
    `SELECT 'cash-flow-provenance-updated:' || f.id, f.updated_at, f.updated_by, 'updated', 'cash_flow', CAST(f.id AS TEXT),
      f.occurred_on, NULL, ${payload}, 'provenance'
      FROM finance_cash_flows f
      WHERE f.updated_at IS NOT NULL AND f.updated_by IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM finance_cash_flow_audit a WHERE a.cash_flow_id = f.id AND a.action = 'updated' AND a.occurred_at = f.updated_at)`,
    `SELECT 'cash-flow-provenance-deleted:' || f.id, f.deleted_at, f.deleted_by, 'deleted', 'cash_flow', CAST(f.id AS TEXT),
      f.occurred_on, ${payload}, NULL, 'provenance'
      FROM finance_cash_flows f
      WHERE f.deleted_at IS NOT NULL AND f.deleted_by IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM finance_cash_flow_audit a WHERE a.cash_flow_id = f.id AND a.action = 'deleted' AND a.occurred_at = f.deleted_at)`,
  ];
}

function accountEventProvenanceSources(): string[] {
  const payload = `json_object('event_date', e.event_date, 'event_time', e.event_time, 'event_type', e.event_type,
    'ticker', e.ticker, 'ticker_name', e.ticker_name, 'quantity', e.quantity, 'reference_value', e.reference_value,
    'amount', e.amount, 'position_category', e.position_category, 'note', e.note, 'provenance_fallback', 1)`;
  return [
    `SELECT 'account-event-provenance-created:' || e.id, e.created_at, e.created_by, 'created', 'account_event', CAST(e.id AS TEXT),
      e.event_date, NULL, ${payload}, 'provenance'
      FROM finance_account_events e
      WHERE e.created_at IS NOT NULL AND e.created_by IS NOT NULL AND e.created_by NOT LIKE 'historical-import:%'
        AND NOT EXISTS (SELECT 1 FROM finance_account_event_audit a WHERE a.account_event_id = e.id AND a.action = 'created')`,
    `SELECT 'account-event-provenance-updated:' || e.id, e.updated_at, e.updated_by, 'updated', 'account_event', CAST(e.id AS TEXT),
      e.event_date, NULL, ${payload}, 'provenance'
      FROM finance_account_events e
      WHERE e.updated_at IS NOT NULL AND e.updated_by IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM finance_account_event_audit a WHERE a.account_event_id = e.id AND a.action = 'updated' AND a.occurred_at = e.updated_at)`,
    `SELECT 'account-event-provenance-deleted:' || e.id, e.deleted_at, e.deleted_by, 'deleted', 'account_event', CAST(e.id AS TEXT),
      e.event_date, ${payload}, NULL, 'provenance'
      FROM finance_account_events e
      WHERE e.deleted_at IS NOT NULL AND e.deleted_by IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM finance_account_event_audit a WHERE a.account_event_id = e.id AND a.action = 'deleted' AND a.occurred_at = e.deleted_at)`,
  ];
}

function workbookReviewSources(): string[] {
  return [
    `SELECT 'workbook-review:' || a.id, a.occurred_at, a.actor, a.action, 'workbook_review', CAST(a.review_id AS TEXT),
      NULL, a.before_json, a.after_json, 'audit'
      FROM finance_workbook_review_audit a`,
    `SELECT 'legacy-import-review:' || a.id, a.occurred_at, a.actor, a.action, 'workbook_review', 'legacy:' || CAST(a.review_id AS TEXT),
      NULL, a.before_json, a.after_json, 'audit'
      FROM finance_legacy_import_review_audit a`,
  ];
}

export function humanizeOperation(row: OperationRow) {
  const before = parseJson(row.before_json);
  const after = parseJson(row.after_json);
  const data = after ?? before ?? {};
  const changes = changedFields(row.entity_type, before, after);
  const subject = subjectFor(row.entity_type, data, row.entity_id);
  return {
    key: row.operation_key,
    occurred_at: row.occurred_at,
    actor: row.actor,
    action: row.action,
    entity_type: row.entity_type,
    entity_id: row.entity_id,
    business_date: row.business_date,
    before,
    after,
    audit_strength: row.audit_strength,
    title: `${ACTION_LABEL[row.action] ?? row.action}${ENTITY_LABEL[row.entity_type] ?? row.entity_type}${subject ? ` · ${subject}` : ''}`,
    summary: row.audit_strength === 'provenance'
      ? `${summaryFor(row.entity_type, row.action, data, changes)} · 行级 provenance；旧版本字段差异不可还原`
      : summaryFor(row.entity_type, row.action, data, changes),
    changes,
  };
}

const ACTION_LABEL: Record<string, string> = {
  created: '新增', updated: '修改', deleted: '删除', confirmed: '确认', resolved: '解除', reconciled: '对账',
};
const ENTITY_LABEL: Record<string, string> = {
  trade: '交易', cash_flow: '现金流', account_event: '账户事件', investment_plan: '投资计划', investment_rule: '投资规则',
  memo: '投资备忘录', monthly_record: '月度记录', annual_review: '年度复盘', workbook_review: '导入异常', rebalance: '再平衡',
  monthly_confirmation: '月度查阅', circuit: '熔断事件', circuit_resolution: '熔断恢复确认', asset_reconciliation: '资产', historical_import: '历史数据迁移',
};
const RULE_LABEL: Record<string, string> = {
  risk: '风险阈值', temperature: '市场温度规则', contributions: '投入规则',
};
const FIELD_LABEL: Record<string, string> = {
  trade_date: '交易日期', trade_time: '交易时间', ticker: '代码', ticker_name: '标的', direction: '方向',
  quantity: '数量', price: '价格', fee: '税费', net_cash_amount: '实际资金变化', position_category: '组合角色', reason: '理由',
  occurred_on: '发生日期', contributor: '贡献人', flow_type: '资金类型', confirmed_amount: '确认金额', manager_share_offset: '管理者份额抵扣',
  net_amount: '净金额', event_date: '事件日期', event_time: '事件时间', event_type: '事件类型', amount: '金额', reference_value: '参考值',
  memo_date: '备忘日期', operation_type: '操作类型', stop_loss_triggered: '止损标记', note: '备注', year_month: '月份',
  muxia_invest: '木下投入', cati_invest: 'CATI投入', end_total: '月末资产', sse300_pe: '沪深300 PE',
  sse500_pe: '中证500 PE', sse1000_pe: '中证1000 PE', blue_chip_temp: '市场温度', summary: '总结', remark: '备注',
  resolution_note: '结案说明', status: '状态', adjustments: '调整内容', total_value: '总资产', holdings_value: '证券市值', cash_value: '现金',
  source: '来源', calculation_json: '计算结果', confirmed_by: '确认人', confirmed_at: '确认时间',
  initial_capital: '初始资金', monthly_invest: '共同月度投入', months_year1: '首年投入月数', months_year2plus: '后续投入月数',
  rate_low: '低情景年化', rate_base: '基准年化', rate_high: '高情景年化', bonus1: '首年奖金投入', bonus2to4: '后续奖金投入',
  start_year: '起始年份', end_year: '结束年份', level: '熔断级别',
  single_position_active_cap: '主动仓单标的上限', loss_pause_ratio: '亏损暂停加仓阈值', stop_loss_ratio: '止损阈值',
  take_profit_ratio: '止盈阈值', rebalance_deviation: '再平衡偏离阈值', freeze: '冻结温度线', low: '低温线', normal: '正常温度线', high: '高温线',
  muxia_monthly_invest: '木下月度投入', cati_monthly_invest: 'CATI月度投入', muxia_bonus_year1: '木下首年奖金投入',
  muxia_bonus_later: '木下后续奖金投入', cati_bonus_year1: 'CATI首年奖金投入', cati_bonus_later: 'CATI后续奖金投入',
};
const BUSINESS_FIELDS: Record<string, string[]> = {
  trade: ['ticker_name', 'direction', 'quantity', 'price', 'trade_time', 'fee', 'net_cash_amount', 'position_category', 'reason'],
  cash_flow: ['occurred_on', 'contributor', 'flow_type', 'confirmed_amount', 'manager_share_offset', 'net_amount', 'note'],
  account_event: ['event_date', 'event_time', 'event_type', 'ticker', 'ticker_name', 'quantity', 'reference_value', 'amount', 'position_category', 'note'],
  investment_plan: ['initial_capital', 'monthly_invest', 'months_year1', 'months_year2plus', 'rate_low', 'rate_base', 'rate_high', 'bonus1', 'bonus2to4', 'start_year', 'end_year'],
  memo: ['reason', 'stop_loss_triggered', 'note'],
  monthly_record: ['muxia_invest', 'cati_invest', 'end_total', 'sse300_pe', 'sse500_pe', 'sse1000_pe', 'blue_chip_temp', 'summary', 'remark'],
  annual_review: ['summary', 'calculation_json', 'confirmed_by', 'confirmed_at'],
  workbook_review: ['status', 'resolution_note'],
};

function changedFields(entityType: string, before: JsonObject | null, after: JsonObject | null) {
  if (!before || !after) return [];
  const fields = BUSINESS_FIELDS[entityType] ?? [...new Set([...Object.keys(before), ...Object.keys(after)])];
  return fields.filter((field) => !same(before[field], after[field])).map((field) => ({
    field,
    label: FIELD_LABEL[field] ?? field,
    before: displayChangeValue(field, before[field], 'before'),
    after: displayChangeValue(field, after[field], 'after'),
  }));
}

function displayChangeValue(field: string, value: unknown, side: 'before' | 'after') {
  if (field === 'calculation_json' && value !== null && value !== undefined) return side === 'before' ? '旧计算结果' : '新计算结果';
  return value ?? null;
}

function subjectFor(entityType: string, data: JsonObject, fallback: string) {
  if (entityType === 'trade' || entityType === 'memo' || entityType === 'account_event') return String(data.ticker_name ?? data.ticker ?? fallback);
  if (entityType === 'monthly_record' || entityType === 'monthly_confirmation') return String(data.year_month ?? data.period ?? fallback);
  if (entityType === 'annual_review' || entityType === 'rebalance') return String(data.year ?? fallback);
  if (entityType === 'investment_rule') return RULE_LABEL[fallback] ?? fallback;
  if (entityType === 'historical_import') return String(data.source_name ?? fallback);
  if (entityType === 'circuit') return String(data.level ?? '');
  return '';
}

function summaryFor(entityType: string, action: string, data: JsonObject, changes: ReturnType<typeof changedFields>) {
  if (entityType === 'annual_review' && action === 'updated') {
    const parts = [];
    if (changes.some((change) => change.field === 'calculation_json')) parts.push('计算结果已重新计算');
    const visible = changes.filter((change) => change.field !== 'calculation_json').slice(0, 2)
      .map((change) => `${change.label} ${shortValue(change.before)} → ${shortValue(change.after)}`);
    parts.push(...visible);
    if (changes.filter((change) => change.field !== 'calculation_json').length > 2) parts.push('另有其他字段变化');
    return parts.join('；') || '年度复盘已重算';
  }
  if (action === 'updated' && changes.length) {
    const visible = changes.slice(0, 2).map((change) => `${change.label} ${shortValue(change.before)} → ${shortValue(change.after)}`);
    return visible.join('；') + (changes.length > 2 ? `；另有 ${changes.length - 2} 项变化` : '');
  }
  if (entityType === 'trade') return `${directionLabel(data.direction)} ${shortValue(data.quantity)} 股 × ${moneyValue(data.price)}`;
  if (entityType === 'cash_flow') return `${String(data.contributor ?? '')} · ${signedMoney(data.net_amount)}`;
  if (entityType === 'account_event') return `${String(data.event_type ?? '')}${data.amount !== null && data.amount !== undefined ? ` · ${signedMoney(data.amount)}` : ''}`;
  if (entityType === 'memo') return action === 'deleted' ? '备忘录已删除，原内容保留在审计记录中。' : String(data.reason ?? '投资判断已记录');
  if (entityType === 'monthly_record') return `${String(data.year_month ?? '')} 月度记录`;
  if (entityType === 'annual_review') {
    if (action === 'confirmed') return `${String(data.year ?? '')} 年度复盘已由 ${String(data.confirmed_by ?? '用户')} 确认`;
    return `${String(data.year ?? '')} 年度复盘由计算引擎${action === 'created' ? '生成' : '重算'}`;
  }
  if (entityType === 'workbook_review') return String(data.resolution_note ?? data.reason ?? '导入异常已结案');
  if (entityType === 'rebalance') return String(data.adjustments ?? '再平衡记录');
  if (entityType === 'asset_reconciliation') return `总资产 ${moneyValue(data.total_value)}`;
  if (entityType === 'historical_import') return `${shortValue(data.imported_rows)} 条记录 · ${shortValue(data.review_rows)} 条待审阅`;
  if (entityType === 'circuit') {
    if (action === 'resolved') return `${String(data.level ?? '熔断')} · 熔断状态已解除`;
    const detail = data.detail;
    const reason = detail && typeof detail === 'object' && !Array.isArray(detail)
      ? (detail as JsonObject).reason ?? (detail as JsonObject).action
      : detail;
    return `${String(data.level ?? '熔断')} · ${shortValue(reason ?? '状态已记录')}`;
  }
  return `${ENTITY_LABEL[entityType] ?? entityType}${ACTION_LABEL[action] ?? action}`;
}

function parseJson(value: string | null): JsonObject | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as JsonObject : null;
  } catch {
    return null;
  }
}
function same(left: unknown, right: unknown) { return JSON.stringify(left ?? null) === JSON.stringify(right ?? null); }
function optionalDay(value: string | null): string | null | undefined {
  if (value === null || value === '') return null;
  if (!isoDay.test(value)) return undefined;
  const [year, month, day] = value.split('-').map(Number);
  const candidate = new Date(Date.UTC(year, month - 1, day));
  return candidate.getUTCFullYear() === year && candidate.getUTCMonth() === month - 1 && candidate.getUTCDate() === day ? value : undefined;
}
function shanghaiBoundary(day: string, dayOffset = 0) {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, date + dayOffset) - SHANGHAI_OFFSET_MS).toISOString();
}
function directionLabel(value: unknown) { return value === 'sell' ? '卖出' : value === 'buy' ? '买入' : String(value ?? ''); }
function moneyValue(value: unknown) { const number = Number(value); return Number.isFinite(number) ? `¥${number.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}` : '—'; }
function signedMoney(value: unknown) { const number = Number(value); return Number.isFinite(number) ? `${number >= 0 ? '+' : '-'}¥${Math.abs(number).toLocaleString('zh-CN', { maximumFractionDigits: 2 })}` : '—'; }
function shortValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'object') return '已更新';
  const text = String(value);
  return text.length > 56 ? `${text.slice(0, 53)}…` : text;
}
