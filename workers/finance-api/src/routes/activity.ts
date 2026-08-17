import { apiError, json } from '../lib/http';
import { requireFinanceRole, type FinanceEnv } from './auth';

const KINDS = new Set(['trade', 'cash_flow', 'account_event', 'reconciliation']);
const isoDay = /^\d{4}-\d{2}-\d{2}$/;
const MAX_CURSOR_LENGTH = 2_048;

type JsonObject = Record<string, unknown>;

export interface ActivityFilterSignature {
  kind: string | null;
  ticker: string | null;
  from: string | null;
  to: string | null;
}

export interface ActivityCursorPosition {
  business_date: string;
  sort_time: string;
  event_key: string;
}

interface ActivityCursorPayload extends ActivityCursorPosition {
  filter: ActivityFilterSignature;
}

export interface ActivityRow {
  event_key: string;
  business_date: string;
  business_time: string | null;
  sort_time: string;
  kind: string;
  ticker: string | null;
  ticker_name: string | null;
  payload_json: string;
}

export async function handleActivity(request: Request, env: FinanceEnv): Promise<Response> {
  if (request.method !== 'GET') return apiError(405, 'method_not_allowed', 'Method is not allowed');
  const session = await requireFinanceRole(request, env);
  if (session instanceof Response) return session;

  const url = new URL(request.url);
  const kind = (url.searchParams.get('kind') ?? '').trim();
  const ticker = (url.searchParams.get('ticker') ?? '').trim().toUpperCase();
  const from = optionalDay(url.searchParams.get('from'));
  const to = optionalDay(url.searchParams.get('to'));
  const limit = Number(url.searchParams.get('limit') ?? '50');
  if ((kind && !KINDS.has(kind)) || ticker.length > 24 || from === undefined || to === undefined
    || (from && to && from > to) || !Number.isInteger(limit) || limit < 1 || limit > 100) {
    return apiError(400, 'invalid_filter', 'Activity filters are invalid');
  }

  const filter: ActivityFilterSignature = {
    kind: kind || null,
    ticker: ticker || null,
    from: from ?? null,
    to: to ?? null,
  };
  let cursor: ActivityCursorPosition | null = null;
  const cursorValue = url.searchParams.get('cursor');
  if (cursorValue) {
    try {
      cursor = decodeActivityCursor(cursorValue, filter);
    } catch {
      return apiError(400, 'invalid_cursor', 'Activity cursor is invalid');
    }
  }

  const built = buildActivityQuery({ filter, cursor, limit });
  const rows = await env.DB.prepare(built.query).bind(...built.values).all<ActivityRow>();
  const page = rows.results.slice(0, limit);
  const last = page.at(-1);
  return json({
    items: page.map(humanizeActivity),
    nextCursor: rows.results.length > limit && last
      ? encodeActivityCursor({ business_date: last.business_date, sort_time: last.sort_time, event_key: last.event_key, filter })
      : null,
    coverage: {
      note: '账户动态直接来自当前有效的交易、外部现金流、账户事件和完整的人工/券商对账记录；数据修改审计与登录记录不属于这里。',
      timezone: 'Asia/Shanghai',
    },
  });
}

export function buildActivityQuery(input: {
  filter: ActivityFilterSignature;
  cursor: ActivityCursorPosition | null;
  limit: number;
}) {
  const clauses = ['1 = 1'];
  const values: unknown[] = [];
  if (input.filter.kind) { clauses.push('kind = ?'); values.push(input.filter.kind); }
  if (input.filter.ticker) { clauses.push('ticker = ?'); values.push(input.filter.ticker); }
  if (input.filter.from) { clauses.push('business_date >= ?'); values.push(input.filter.from); }
  if (input.filter.to) { clauses.push('business_date <= ?'); values.push(input.filter.to); }
  if (input.cursor) {
    clauses.push(`(
      business_date < ?
      OR (business_date = ? AND sort_time < ?)
      OR (business_date = ? AND sort_time = ? AND event_key < ?)
    )`);
    values.push(
      input.cursor.business_date,
      input.cursor.business_date, input.cursor.sort_time,
      input.cursor.business_date, input.cursor.sort_time, input.cursor.event_key,
    );
  }
  return {
    query: `SELECT * FROM (${activitySources().join('\nUNION ALL\n')}) activity
      WHERE ${clauses.join(' AND ')}
      ORDER BY business_date DESC, sort_time DESC, event_key DESC
      LIMIT ?`,
    values: [...values, input.limit + 1],
  };
}

export function encodeActivityCursor(value: ActivityCursorPayload): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function decodeActivityCursor(value: string, filter: ActivityFilterSignature): ActivityCursorPosition {
  if (!value || value.length > MAX_CURSOR_LENGTH) throw new Error('invalid cursor');
  const source = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(source + '='.repeat((4 - source.length % 4) % 4));
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  const parsed = JSON.parse(new TextDecoder().decode(bytes)) as Partial<ActivityCursorPayload>;
  if (typeof parsed.business_date !== 'string' || !isoDay.test(parsed.business_date)
    || typeof parsed.sort_time !== 'string' || parsed.sort_time.length > 16
    || typeof parsed.event_key !== 'string' || parsed.event_key.length < 1 || parsed.event_key.length > 256
    || JSON.stringify(parsed.filter) !== JSON.stringify(filter)) throw new Error('invalid cursor');
  return { business_date: parsed.business_date, sort_time: parsed.sort_time, event_key: parsed.event_key };
}

function activitySources(): string[] {
  return [
    `SELECT 'trade:' || t.id AS event_key, t.trade_date AS business_date, t.trade_time AS business_time,
      CASE WHEN t.trade_time IS NULL OR t.trade_time = '' THEN '00:00:00' WHEN length(t.trade_time) = 5 THEN t.trade_time || ':00' ELSE t.trade_time END AS sort_time,
      'trade' AS kind, t.ticker AS ticker, t.ticker_name AS ticker_name,
      json_object(
        'direction', t.direction, 'quantity', t.quantity, 'price', t.price, 'fee', t.fee,
        'net_cash_amount', t.net_cash_amount, 'position_category', t.position_category, 'reason', t.reason
      ) AS payload_json
      FROM trades t WHERE t.deleted_at IS NULL`,
    `SELECT 'cash-flow:' || f.id, f.occurred_on, NULL, '00:00:00', 'cash_flow', NULL, NULL,
      json_object(
        'contributor', f.contributor, 'flow_type', f.flow_type, 'confirmed_amount', f.confirmed_amount,
        'manager_share_offset', f.manager_share_offset, 'net_amount', f.net_amount, 'note', f.note
      )
      FROM finance_cash_flows f WHERE f.deleted_at IS NULL`,
    `SELECT 'account-event:' || e.id, e.event_date, e.event_time,
      CASE WHEN e.event_time IS NULL OR e.event_time = '' THEN '00:00:00' WHEN length(e.event_time) = 5 THEN e.event_time || ':00' ELSE e.event_time END,
      'account_event', e.ticker, e.ticker_name,
      json_object(
        'event_type', e.event_type, 'quantity', e.quantity, 'reference_value', e.reference_value,
        'amount', e.amount, 'position_category', e.position_category, 'note', e.note
      )
      FROM finance_account_events e WHERE e.deleted_at IS NULL`,
    `SELECT 'reconciliation:' || s.id, s.snapshot_date,
      CASE WHEN s.snapshot_at IS NULL OR s.snapshot_at = '' THEN NULL ELSE strftime('%H:%M:%S', s.snapshot_at, '+8 hours') END,
      CASE WHEN s.snapshot_at IS NULL OR s.snapshot_at = '' THEN '00:00:00' ELSE COALESCE(strftime('%H:%M:%S', s.snapshot_at, '+8 hours'), '00:00:00') END,
      'reconciliation', NULL, NULL,
      json_object(
        'snapshot_at', s.snapshot_at, 'holdings_value', s.holdings_value, 'cash_value', s.cash_value,
        'other_assets_value', s.other_assets_value, 'total_value', s.total_value,
        'source', s.source, 'is_complete', s.is_complete, 'incomplete_reason', s.incomplete_reason
      )
      FROM finance_asset_snapshots s
      WHERE s.deleted_at IS NULL
        AND s.is_complete = 1
        AND lower(COALESCE(s.source, '')) NOT IN ('auto_close', 'historical_backfill', 'history_import')`,
  ];
}

export function humanizeActivity(row: ActivityRow) {
  const data = parseJson(row.payload_json);
  const subject = row.ticker_name || row.ticker || '';
  if (row.kind === 'trade') {
    const direction = data.direction === 'sell' ? '卖出' : data.direction === 'buy' ? '买入' : String(data.direction ?? '交易');
    return activityItem(row, `${direction}${subject ? ` · ${subject}` : ''}`, `${numberValue(data.quantity)} 股 × ${moneyValue(data.price)}`, data);
  }
  if (row.kind === 'cash_flow') {
    const label = CASH_FLOW_LABEL[String(data.flow_type ?? '')] ?? '现金变化';
    return activityItem(row, label, `${String(data.contributor ?? '')} · ${signedMoney(data.net_amount)}`, data);
  }
  if (row.kind === 'account_event') {
    const eventType = String(data.event_type ?? 'other');
    const label = ACCOUNT_EVENT_LABEL[eventType] ?? '账户事件';
    if (eventType === 'split') {
      const explanation = typeof data.note === 'string' && data.note.trim() ? data.note.trim() : '份额数量已调整';
      return activityItem(row, `${label}${subject ? ` · ${subject}` : ''}`, explanation, data);
    }
    let summary = subject || '';
    if (data.amount !== null && data.amount !== undefined) summary += `${summary ? ' · ' : ''}${signedMoney(data.amount)}`;
    return activityItem(row, `${label}${subject ? ` · ${subject}` : ''}`, summary || '已记录', data);
  }
  const otherAssets = Number(data.other_assets_value);
  const otherCopy = Number.isFinite(otherAssets) && otherAssets > 0 ? ` · 其他账户资产 ${moneyValue(otherAssets)}` : '';
  return activityItem(row, '资产对账', `总资产 ${moneyValue(data.total_value)} · Broker Cash ${moneyValue(data.cash_value)}${otherCopy}`, data);
}

function activityItem(row: ActivityRow, title: string, summary: string, details: JsonObject) {
  return {
    key: row.event_key,
    business_date: row.business_date,
    business_time: row.business_time,
    kind: row.kind,
    ticker: row.ticker,
    ticker_name: row.ticker_name,
    title,
    summary,
    details,
  };
}

const CASH_FLOW_LABEL: Record<string, string> = {
  monthly_investment: '月度投入', bonus_investment: '奖金投入', additional_investment: '额外投入', withdrawal: '资金取出', adjustment: '资金调整',
};
const ACCOUNT_EVENT_LABEL: Record<string, string> = {
  dividend: '现金分红', dividend_tax: '红利税', split: '份额分拆', repo_start: '逆回购', repo_maturity: '逆回购回款', refund: '退款', other: '账户事件',
};

function parseJson(value: string): JsonObject {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as JsonObject : {};
  } catch {
    return {};
  }
}
function optionalDay(value: string | null): string | null | undefined {
  if (value === null || value === '') return null;
  if (!isoDay.test(value)) return undefined;
  const [year, month, day] = value.split('-').map(Number);
  const candidate = new Date(Date.UTC(year, month - 1, day));
  return candidate.getUTCFullYear() === year && candidate.getUTCMonth() === month - 1 && candidate.getUTCDate() === day ? value : undefined;
}
function moneyValue(value: unknown) { const number = Number(value); return Number.isFinite(number) ? `¥${number.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}` : '—'; }
function signedMoney(value: unknown) { const number = Number(value); return Number.isFinite(number) ? `${number >= 0 ? '+' : '-'}¥${Math.abs(number).toLocaleString('zh-CN', { maximumFractionDigits: 2 })}` : '—'; }
function numberValue(value: unknown) { const number = Number(value); return Number.isFinite(number) ? number.toLocaleString('zh-CN', { maximumFractionDigits: 4 }) : '—'; }
