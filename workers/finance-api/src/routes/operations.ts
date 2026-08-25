import { apiError, json } from '../lib/http';
import { isCalendarIsoDay, ISO_DAY_PATTERN, isIsoDay } from '../lib/dates';
import { requireFinanceRole, type FinanceEnv } from './auth';

const ENTITY_TYPES = new Set([
  'trade', 'cash_flow', 'account_event', 'investment_plan', 'investment_rule',
  'memo', 'monthly_record', 'annual_review', 'workbook_review',
]);
const ACTIONS = new Set(['created', 'updated', 'deleted', 'confirmed', 'resolved']);
const SHANGHAI_OFFSET_MS = 8 * 60 * 60 * 1_000;
const MAX_CURSOR_LENGTH = 2_048;

type JsonObject = Record<string, unknown>;

export interface ChangeLogFilterSignature {
  entity_type: string | null;
  action: string | null;
  actor: string | null;
  from: string | null;
  to: string | null;
}

export interface ChangeLogCursorPosition {
  occurred_at: string;
  change_key: string;
}

interface ChangeLogCursorPayload extends ChangeLogCursorPosition {
  filter: ChangeLogFilterSignature;
}

export interface ChangeLogRow {
  change_key: string;
  occurred_at: string;
  actor: string;
  action: string;
  entity_type: string;
  entity_id: string;
  business_date: string | null;
  before_json: string | null;
  after_json: string | null;
}

export async function handleChangeLog(request: Request, env: FinanceEnv): Promise<Response> {
  if (request.method !== 'GET') return apiError(405, 'method_not_allowed', 'Method is not allowed');
  const session = await requireFinanceRole(request, env, ['admin']);
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
    return apiError(400, 'invalid_filter', 'Change log filters are invalid');
  }

  const filter: ChangeLogFilterSignature = {
    entity_type: entityType || null,
    action: action || null,
    actor: actor || null,
    from: from ?? null,
    to: to ?? null,
  };

  let cursor: ChangeLogCursorPosition | null = null;
  const cursorValue = url.searchParams.get('cursor');
  if (cursorValue) {
    try {
      cursor = decodeChangeLogCursor(cursorValue, filter);
    } catch {
      return apiError(400, 'invalid_cursor', 'Change log cursor is invalid');
    }
  }

  const built = buildChangeLogQuery({ filter, cursor, limit });
  const sourceResults = await Promise.all(built.queries.map(({ query, values }) => env.DB.prepare(query).bind(...values).all<ChangeLogRow>()));
  const rows = sourceResults.flatMap((result) => result.results)
    .sort((left, right) => right.occurred_at.localeCompare(left.occurred_at) || right.change_key.localeCompare(left.change_key));
  const page = rows.slice(0, limit);
  const last = page.at(-1);
  return json({
    items: page.map(humanizeChange),
    nextCursor: rows.length > limit && last
      ? encodeChangeLogCursor({ occurred_at: last.occurred_at, change_key: last.change_key, filter })
      : null,
    coverage: {
      note: '这是管理员数据变更审计，不是账户流水。Investment Memo、月度记录与年度复盘的完整版本历史从本次审计迁移后开始；迁移前从未保存的旧版本不会反推或伪造。',
      timezone: 'Asia/Shanghai',
    },
  });
}

export function buildChangeLogQuery(input: {
  filter: ChangeLogFilterSignature;
  cursor: ChangeLogCursorPosition | null;
  limit: number;
}) {
  const clauses = ['1 = 1'];
  const values: unknown[] = [];
  if (input.filter.entity_type) { clauses.push('entity_type = ?'); values.push(input.filter.entity_type); }
  if (input.filter.action) { clauses.push('action = ?'); values.push(input.filter.action); }
  if (input.filter.actor) { clauses.push('actor = ?'); values.push(input.filter.actor); }
  if (input.filter.from) { clauses.push('occurred_at >= ?'); values.push(shanghaiBoundary(input.filter.from)); }
  if (input.filter.to) { clauses.push('occurred_at < ?'); values.push(shanghaiBoundary(input.filter.to, 1)); }
  if (input.cursor) {
    clauses.push('(occurred_at < ? OR (occurred_at = ? AND change_key < ?))');
    values.push(input.cursor.occurred_at, input.cursor.occurred_at, input.cursor.change_key);
  }
  return {
    queries: auditSources().map((source) => ({
      query: `SELECT * FROM (${source}) changes
        WHERE ${clauses.join(' AND ')}
        ORDER BY occurred_at DESC, change_key DESC
        LIMIT ?`,
      values: [...values, input.limit + 1],
    })),
  };
}

export function encodeChangeLogCursor(value: ChangeLogCursorPayload): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function decodeChangeLogCursor(value: string, filter: ChangeLogFilterSignature): ChangeLogCursorPosition {
  if (!value || value.length > MAX_CURSOR_LENGTH) throw new Error('invalid cursor');
  const source = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(source + '='.repeat((4 - source.length % 4) % 4));
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  const parsed = JSON.parse(new TextDecoder().decode(bytes)) as Partial<ChangeLogCursorPayload>;
  if (typeof parsed.occurred_at !== 'string' || !Number.isFinite(Date.parse(parsed.occurred_at))
    || typeof parsed.change_key !== 'string' || parsed.change_key.length < 1 || parsed.change_key.length > 256
    || JSON.stringify(parsed.filter) !== JSON.stringify(filter)) throw new Error('invalid cursor');
  return { occurred_at: parsed.occurred_at, change_key: parsed.change_key };
}

function auditSources(): string[] {
  return [
    `SELECT 'trade:' || a.id AS change_key, a.occurred_at AS occurred_at, a.actor AS actor,
      a.action AS action, 'trade' AS entity_type, CAST(a.trade_id AS TEXT) AS entity_id,
      COALESCE(json_extract(a.after_json, '$.trade_date'), json_extract(a.before_json, '$.trade_date'), t.trade_date) AS business_date,
      a.before_json AS before_json, a.after_json AS after_json
      FROM finance_trade_audit a LEFT JOIN trades t ON t.id = a.trade_id`,
    `SELECT 'cash-flow:' || a.id AS change_key, a.occurred_at AS occurred_at, a.actor AS actor, a.action AS action,
      'cash_flow' AS entity_type, CAST(a.cash_flow_id AS TEXT) AS entity_id,
      COALESCE(json_extract(a.after_json, '$.occurred_on'), json_extract(a.before_json, '$.occurred_on'), f.occurred_on) AS business_date,
      a.before_json AS before_json, a.after_json AS after_json
      FROM finance_cash_flow_audit a LEFT JOIN finance_cash_flows f ON f.id = a.cash_flow_id`,
    `SELECT 'account-event:' || a.id AS change_key, a.occurred_at AS occurred_at, a.actor AS actor, a.action AS action,
      'account_event' AS entity_type, CAST(a.account_event_id AS TEXT) AS entity_id,
      COALESCE(json_extract(a.after_json, '$.event_date'), json_extract(a.before_json, '$.event_date'), e.event_date) AS business_date,
      a.before_json AS before_json, a.after_json AS after_json
      FROM finance_account_event_audit a LEFT JOIN finance_account_events e ON e.id = a.account_event_id`,
    `SELECT 'plan:' || a.id AS change_key, a.occurred_at AS occurred_at, a.actor AS actor,
      CASE WHEN a.before_json IS NULL THEN 'created' ELSE 'updated' END AS action,
      'investment_plan' AS entity_type, '1' AS entity_id, NULL AS business_date, a.before_json AS before_json, a.after_json AS after_json
      FROM finance_plan_audit a`,
    `SELECT 'rule:' || a.id AS change_key, a.occurred_at AS occurred_at, a.actor AS actor,
      CASE WHEN a.before_json IS NULL THEN 'created' ELSE 'updated' END AS action,
      'investment_rule' AS entity_type, a.rule_key AS entity_id, NULL AS business_date, a.before_json AS before_json, a.after_json AS after_json
      FROM finance_rule_audit a`,
    `SELECT 'memo:' || a.id AS change_key, a.occurred_at AS occurred_at, a.actor AS actor, a.action AS action,
      'memo' AS entity_type, CAST(a.memo_id AS TEXT) AS entity_id,
      COALESCE(json_extract(a.after_json, '$.memo_date'), json_extract(a.before_json, '$.memo_date'), m.memo_date) AS business_date,
      a.before_json AS before_json, a.after_json AS after_json
      FROM finance_memo_audit a LEFT JOIN finance_memos m ON m.id = a.memo_id`,
    `SELECT 'monthly:' || a.id AS change_key, a.occurred_at AS occurred_at, a.actor AS actor, a.action AS action,
      'monthly_record' AS entity_type, CAST(a.monthly_record_id AS TEXT) AS entity_id,
      NULL AS business_date, a.before_json AS before_json, a.after_json AS after_json
      FROM finance_monthly_record_audit a`,
    `SELECT 'annual-review:' || a.id AS change_key, a.occurred_at AS occurred_at, a.actor AS actor, a.action AS action,
      'annual_review' AS entity_type, CAST(a.review_year AS TEXT) AS entity_id,
      NULL AS business_date, a.before_json AS before_json, a.after_json AS after_json
      FROM finance_review_audit a`,
    `SELECT 'workbook-review:' || a.id AS change_key, a.occurred_at AS occurred_at, a.actor AS actor, a.action AS action,
      'workbook_review' AS entity_type, CAST(a.review_id AS TEXT) AS entity_id,
      NULL AS business_date, a.before_json AS before_json, a.after_json AS after_json
      FROM finance_workbook_review_audit a`,
    `SELECT 'legacy-import-review:' || a.id AS change_key, a.occurred_at AS occurred_at, a.actor AS actor, a.action AS action,
      'workbook_review' AS entity_type, 'legacy:' || CAST(a.review_id AS TEXT) AS entity_id,
      NULL AS business_date, a.before_json AS before_json, a.after_json AS after_json
      FROM finance_legacy_import_review_audit a`,
  ];
}

export function humanizeChange(row: ChangeLogRow) {
  const before = parseJson(row.before_json);
  const after = parseJson(row.after_json);
  const data = after ?? before ?? {};
  const changes = changedFields(row.entity_type, before, after);
  const subject = subjectFor(row.entity_type, data, row.entity_id);
  return {
    key: row.change_key,
    occurred_at: row.occurred_at,
    actor: row.actor,
    action: row.action,
    entity_type: row.entity_type,
    entity_id: row.entity_id,
    business_date: row.business_date,
    before,
    after,
    title: `${ACTION_LABEL[row.action] ?? row.action}${ENTITY_LABEL[row.entity_type] ?? row.entity_type}${subject ? ` · ${subject}` : ''}`,
    summary: summaryFor(row.entity_type, row.action, data, changes),
    changes,
  };
}

const ACTION_LABEL: Record<string, string> = {
  created: '新增', updated: '修改', deleted: '删除', confirmed: '确认', resolved: '结案',
};
const ENTITY_LABEL: Record<string, string> = {
  trade: '交易', cash_flow: '现金流', account_event: '账户事件', investment_plan: '投资计划', investment_rule: '投资规则',
  memo: '投资备忘录', monthly_record: '月度记录', annual_review: '年度复盘', workbook_review: '导入异常',
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
  resolution_note: '结案说明', status: '状态', calculation_json: '计算结果', confirmed_by: '确认人', confirmed_at: '确认时间',
  initial_capital: '初始资金', monthly_invest: '共同月度投入', months_year1: '首年投入月数', months_year2plus: '后续投入月数',
  rate_low: '低情景年化', rate_base: '基准年化', rate_high: '高情景年化', bonus1: '首年奖金投入', bonus2to4: '后续奖金投入',
  start_year: '起始年份', end_year: '结束年份', single_position_active_cap: '主动仓单标的上限',
  loss_pause_ratio: '亏损暂停加仓阈值', stop_loss_ratio: '止损阈值', take_profit_ratio: '止盈阈值', rebalance_deviation: '再平衡偏离阈值',
  freeze: '冻结温度线', low: '低温线', normal: '正常温度线', high: '高温线',
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
  if (entityType === 'monthly_record') return String(data.year_month ?? fallback);
  if (entityType === 'annual_review') return String(data.year ?? fallback);
  if (entityType === 'investment_rule') return RULE_LABEL[fallback] ?? fallback;
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
  return isCalendarIsoDay(value) ? value : undefined;
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
