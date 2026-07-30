import { apiError, json, readJson } from '../lib/http';
import { requireFinanceRole, type FinanceEnv } from './auth';

const PLAN_FIELDS = [
  'initial_capital', 'monthly_invest', 'months_year1', 'months_year2plus',
  'rate_low', 'rate_base', 'rate_high', 'bonus1', 'bonus2to4', 'start_year', 'end_year',
] as const;

type PlanField = typeof PLAN_FIELDS[number];

interface MonthlyRecordInput {
  year_month?: unknown;
  muxia_invest?: unknown;
  cati_invest?: unknown;
  end_total?: unknown;
  sse300_pe?: unknown;
  sse500_pe?: unknown;
  sse1000_pe?: unknown;
  blue_chip_temp?: unknown;
  summary?: unknown;
  remark?: unknown;
}

export async function handleRecords(request: Request, env: FinanceEnv, pathname: string): Promise<Response> {
  if (pathname === '/api/monthly' && request.method === 'GET') return listMonthly(request, env);
  if (pathname === '/api/monthly' && request.method === 'PUT') return saveMonthly(request, env);
  if (/^\/api\/monthly\/\d+$/.test(pathname) && request.method === 'DELETE') return deleteMonthly(request, env, Number(pathname.split('/')[3]));
  if (pathname === '/api/plan' && request.method === 'GET') return getPlan(request, env);
  if (pathname === '/api/plan' && request.method === 'PUT') return savePlan(request, env);
  if (pathname === '/api/cash-flows' && request.method === 'GET') return listCashFlows(request, env);
  if (pathname === '/api/cash-flows' && request.method === 'POST') return saveCashFlow(request, env);
  if (/^\/api\/cash-flows\/\d+$/.test(pathname) && request.method === 'PATCH') return updateCashFlow(request, env, Number(pathname.split('/')[3]));
  if (/^\/api\/cash-flows\/\d+$/.test(pathname) && request.method === 'DELETE') return deleteCashFlow(request, env, Number(pathname.split('/')[3]));
  if (pathname === '/api/assets/snapshots' && request.method === 'GET') return listAssetSnapshots(request, env);
  if (pathname === '/api/assets/snapshots' && request.method === 'POST') return saveAssetSnapshot(request, env);
  if (pathname === '/api/assets/series' && request.method === 'GET') return assetSeries(request, env);
  return apiError(404, 'not_found', 'Finance records route not found');
}

async function listMonthly(request: Request, env: FinanceEnv): Promise<Response> {
  const session = await requireFinanceRole(request, env);
  if (session instanceof Response) return session;
  const rows = await env.DB.prepare(`SELECT * FROM monthly_records
    WHERE deleted_at IS NULL ORDER BY year_month DESC LIMIT 120`).all();
  return json({ records: rows.results });
}

async function saveMonthly(request: Request, env: FinanceEnv): Promise<Response> {
  const session = await requireFinanceRole(request, env, ['admin']);
  if (session instanceof Response) return session;
  const body = await readJson<MonthlyRecordInput>(request);
  if (body instanceof Response) return body;
  const input = normalizeMonthly(body);
  if (!input) return apiError(400, 'invalid_monthly_record', 'Monthly record fields are invalid');
  const now = new Date().toISOString();
  await env.DB.prepare(`INSERT INTO monthly_records (
      year_month, muxia_invest, cati_invest, end_total, sse300_pe, sse500_pe, sse1000_pe,
      blue_chip_temp, summary, remark, created_at, created_by, updated_at, updated_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(year_month) DO UPDATE SET
      muxia_invest = excluded.muxia_invest, cati_invest = excluded.cati_invest,
      end_total = excluded.end_total, sse300_pe = excluded.sse300_pe,
      sse500_pe = excluded.sse500_pe, sse1000_pe = excluded.sse1000_pe,
      blue_chip_temp = excluded.blue_chip_temp, summary = excluded.summary, remark = excluded.remark,
      deleted_at = NULL, deleted_by = NULL, updated_at = excluded.updated_at, updated_by = excluded.updated_by`)
    .bind(input.year_month, input.muxia_invest, input.cati_invest, input.end_total, input.sse300_pe,
      input.sse500_pe, input.sse1000_pe, input.blue_chip_temp, input.summary, input.remark,
      now, session.username, now, session.username).run();
  const record = await env.DB.prepare('SELECT * FROM monthly_records WHERE year_month = ?').bind(input.year_month).first();
  return json({ record });
}

async function deleteMonthly(request: Request, env: FinanceEnv, id: number): Promise<Response> {
  const session = await requireFinanceRole(request, env, ['admin']);
  if (session instanceof Response) return session;
  if (!Number.isSafeInteger(id) || id < 1) return apiError(400, 'invalid_id', 'Record id is invalid');
  const result = await env.DB.prepare('UPDATE monthly_records SET deleted_at = ?, deleted_by = ? WHERE id = ? AND deleted_at IS NULL')
    .bind(new Date().toISOString(), session.username, id).run();
  return (result.meta.changes ?? 0) ? json({ deleted: true }) : apiError(404, 'not_found', 'Monthly record not found');
}

async function getPlan(request: Request, env: FinanceEnv): Promise<Response> {
  const session = await requireFinanceRole(request, env);
  if (session instanceof Response) return session;
  const plan = await env.DB.prepare('SELECT * FROM plan_params WHERE id = 1').first<Record<string, unknown>>();
  const contributions = await env.DB.prepare(`SELECT value_json FROM finance_investment_rules WHERE rule_key = 'contributions'`).first<{ value_json: string }>();
  return json({ plan: { ...plan, ...parseJson(contributions?.value_json) } });
}

async function savePlan(request: Request, env: FinanceEnv): Promise<Response> {
  const session = await requireFinanceRole(request, env, ['admin']);
  if (session instanceof Response) return session;
  const raw = await readJson<Record<string, unknown>>(request);
  if (raw instanceof Response) return raw;
  const input = normalizePlan(raw); const contributions = normalizeContributions(raw);
  if (!input || !contributions) return apiError(400, 'invalid_plan', 'Plan parameters are invalid');
  const before = await env.DB.prepare('SELECT * FROM plan_params WHERE id = 1').first();
  const now = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO plan_params (${PLAN_FIELDS.join(', ')}, id, updated_at, updated_by)
      VALUES (${PLAN_FIELDS.map(() => '?').join(', ')}, 1, ?, ?)
      ON CONFLICT(id) DO UPDATE SET ${PLAN_FIELDS.map((field) => `${field} = excluded.${field}`).join(', ')},
        updated_at = excluded.updated_at, updated_by = excluded.updated_by`)
      .bind(...PLAN_FIELDS.map((field) => input[field]), now, session.username),
    env.DB.prepare(`INSERT INTO finance_investment_rules (rule_key, value_json, updated_at, updated_by) VALUES ('contributions', ?, ?, ?)
      ON CONFLICT(rule_key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at, updated_by = excluded.updated_by`).bind(JSON.stringify(contributions), now, session.username),
    env.DB.prepare('INSERT INTO finance_plan_audit (actor, occurred_at, before_json, after_json) VALUES (?, ?, ?, ?)')
      .bind(session.username, now, before ? JSON.stringify(before) : null, JSON.stringify({ ...input, ...contributions })),
  ]);
  return json({ plan: { ...(await env.DB.prepare('SELECT * FROM plan_params WHERE id = 1').first<Record<string, unknown>>()), ...contributions } });
}


function normalizeMonthly(value: MonthlyRecordInput) {
  const year_month = string(value.year_month, 7);
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(year_month)) return null;
  const numeric = ['muxia_invest', 'cati_invest', 'end_total', 'sse300_pe', 'sse500_pe', 'sse1000_pe'] as const;
  const result: Record<string, string | number | null> = { year_month };
  for (const key of numeric) {
    const raw = value[key];
    const number = raw === '' || raw === null || raw === undefined ? null : Number(raw);
    if (number !== null && (!Number.isFinite(number) || Math.abs(number) > 1e15)) return null;
    if ((key === 'muxia_invest' || key === 'cati_invest') && (number ?? 0) < 0) return null;
    result[key] = number ?? (key === 'muxia_invest' || key === 'cati_invest' ? 0 : null);
  }
  const blue_chip_temp = nullableString(value.blue_chip_temp, 64);
  const summary = nullableString(value.summary, 8_000);
  const remark = nullableString(value.remark, 8_000);
  if (blue_chip_temp === undefined || summary === undefined || remark === undefined) return null;
  return { ...result, blue_chip_temp, summary, remark } as Record<string, string | number | null>;
}

function normalizePlan(value: Record<string, unknown>): Record<PlanField, number> | null {
  const result = {} as Record<PlanField, number>;
  for (const field of PLAN_FIELDS) {
    const number = Number(value[field]);
    if (typeof number !== 'number' || !Number.isFinite(number)) return null;
    result[field] = number;
  }
  if (result.initial_capital < 0 || result.monthly_invest < 0 || result.bonus1 < 0 || result.bonus2to4 < 0
    || !Number.isInteger(result.months_year1) || !Number.isInteger(result.months_year2plus)
    || result.months_year1 < 0 || result.months_year1 > 12 || result.months_year2plus < 0 || result.months_year2plus > 12
    || result.rate_low < 0 || result.rate_high > 1 || result.rate_low > result.rate_base || result.rate_base > result.rate_high
    || !Number.isInteger(result.start_year) || !Number.isInteger(result.end_year) || result.start_year < 2000 || result.end_year < result.start_year || result.end_year > 2200) return null;
  return result;
}

function normalizeContributions(value: Record<string, unknown>) {
  const fields = ['muxia_monthly_invest', 'cati_monthly_invest', 'muxia_bonus_year1', 'muxia_bonus_later', 'cati_bonus_year1', 'cati_bonus_later'] as const;
  const result = {} as Record<typeof fields[number], number>;
  for (const field of fields) {
    const fallback = field.endsWith('monthly_invest') ? Number(value.monthly_invest) / 2
      : field.endsWith('year1') ? Number(value.bonus1) / 2 : Number(value.bonus2to4) / 2;
    const numeric = value[field] === undefined ? fallback : Number(value[field]);
    if (!Number.isFinite(numeric) || numeric < 0 || numeric > 1e15) return null;
    result[field] = numeric;
  }
  return result;
}
function parseJson(value: string | undefined) { try { return value ? JSON.parse(value) as Record<string, unknown> : {}; } catch { return {}; } }

function string(value: unknown, max: number) {
  return typeof value === 'string' && value.trim().length <= max ? value.trim() : '';
}

function nullableString(value: unknown, max: number): string | null | undefined {
  if (value === null || value === undefined || value === '') return null;
  return typeof value === 'string' && value.trim().length <= max ? value.trim() : undefined;
}
function nullableNumber(value: unknown): number | null | undefined {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

type CashFlowInput = {
  occurred_on?: unknown; contributor?: unknown; flow_type?: unknown; bonus_source_year?: unknown;
  baseline_amount?: unknown; confirmed_amount?: unknown; manager_share_offset?: unknown; note?: unknown;
};

function normalizeCashFlow(value: CashFlowInput) {
  const occurred_on = string(value.occurred_on, 10); const contributor = string(value.contributor, 16); const flow_type = string(value.flow_type, 32);
  const confirmed_amount = Number(value.confirmed_amount); const baseline_amount = nullableNumber(value.baseline_amount); const manager_share_offset = value.manager_share_offset === undefined || value.manager_share_offset === '' ? 0 : Number(value.manager_share_offset);
  const bonus_source_year = value.bonus_source_year === undefined || value.bonus_source_year === '' ? null : Number(value.bonus_source_year);
  const note = nullableString(value.note, 2_000);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(occurred_on) || !['muxia', 'cati'].includes(contributor) || !['monthly_investment', 'bonus_investment', 'additional_investment', 'withdrawal', 'adjustment'].includes(flow_type)
    || !Number.isFinite(confirmed_amount) || confirmed_amount < 0 || baseline_amount === undefined || (baseline_amount !== null && (baseline_amount < 0 || !Number.isFinite(baseline_amount)))
    || !Number.isFinite(manager_share_offset) || manager_share_offset < 0 || note === undefined || (bonus_source_year !== null && (!Number.isInteger(bonus_source_year) || bonus_source_year < 2000 || bonus_source_year > 2200))) return null;
  if ((flow_type === 'bonus_investment') !== (bonus_source_year !== null) || (manager_share_offset > 0 && (flow_type !== 'bonus_investment' || contributor !== 'muxia'))) return null;
  const net_amount = flow_type === 'withdrawal' ? -confirmed_amount : flow_type === 'bonus_investment' && contributor === 'muxia' ? Math.max(0, confirmed_amount - manager_share_offset) : confirmed_amount;
  return { occurred_on, contributor, flow_type, bonus_source_year, baseline_amount, confirmed_amount, manager_share_offset, net_amount, note };
}

async function listCashFlows(request: Request, env: FinanceEnv) {
  const session = await requireFinanceRole(request, env); if (session instanceof Response) return session;
  const result = await env.DB.prepare('SELECT * FROM finance_cash_flows WHERE deleted_at IS NULL ORDER BY occurred_on DESC, id DESC LIMIT 200').all();
  return json({ cash_flows: result.results });
}
async function saveCashFlow(request: Request, env: FinanceEnv) {
  const session = await requireFinanceRole(request, env, ['admin']); if (session instanceof Response) return session;
  const body = await readJson<CashFlowInput>(request); if (body instanceof Response) return body;
  const input = normalizeCashFlow(body); if (!input) return apiError(400, 'invalid_cash_flow', 'Cash flow fields are invalid');
  const now = new Date().toISOString();
  const result = await env.DB.prepare(`INSERT INTO finance_cash_flows (occurred_on, contributor, flow_type, bonus_source_year, baseline_amount, confirmed_amount, manager_share_offset, net_amount, note, created_at, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(input.occurred_on, input.contributor, input.flow_type, input.bonus_source_year, input.baseline_amount, input.confirmed_amount, input.manager_share_offset, input.net_amount, input.note, now, session.username).run();
  const id = Number(result.meta.last_row_id); const row = await env.DB.prepare('SELECT * FROM finance_cash_flows WHERE id = ?').bind(id).first();
  await env.DB.prepare(`INSERT INTO finance_cash_flow_audit (cash_flow_id, action, actor, occurred_at, after_json) VALUES (?, 'created', ?, ?, ?)`).bind(id, session.username, now, JSON.stringify(row)).run();
  return json({ cash_flow: row }, 201);
}
async function updateCashFlow(request: Request, env: FinanceEnv, id: number) {
  const session = await requireFinanceRole(request, env, ['admin']); if (session instanceof Response) return session;
  const body = await readJson<CashFlowInput>(request); if (body instanceof Response) return body;
  const input = normalizeCashFlow(body); if (!input || !Number.isSafeInteger(id) || id < 1) return apiError(400, 'invalid_cash_flow', 'Cash flow fields are invalid');
  const before = await env.DB.prepare('SELECT * FROM finance_cash_flows WHERE id = ? AND deleted_at IS NULL').bind(id).first(); if (!before) return apiError(404, 'not_found', 'Cash flow not found');
  const now = new Date().toISOString(); const result = await env.DB.prepare(`UPDATE finance_cash_flows SET occurred_on=?, contributor=?, flow_type=?, bonus_source_year=?, baseline_amount=?, confirmed_amount=?, manager_share_offset=?, net_amount=?, note=?, updated_at=?, updated_by=? WHERE id=? AND deleted_at IS NULL`).bind(input.occurred_on, input.contributor, input.flow_type, input.bonus_source_year, input.baseline_amount, input.confirmed_amount, input.manager_share_offset, input.net_amount, input.note, now, session.username, id).run();
  const after = await env.DB.prepare('SELECT * FROM finance_cash_flows WHERE id = ?').bind(id).first(); await env.DB.prepare(`INSERT INTO finance_cash_flow_audit (cash_flow_id, action, actor, occurred_at, before_json, after_json) VALUES (?, 'updated', ?, ?, ?, ?)`).bind(id, session.username, now, JSON.stringify(before), JSON.stringify(after)).run();
  return json({ cash_flow: after, updated: (result.meta.changes ?? 0) > 0 });
}
async function deleteCashFlow(request: Request, env: FinanceEnv, id: number) {
  const session = await requireFinanceRole(request, env, ['admin']); if (session instanceof Response) return session;
  const before = await env.DB.prepare('SELECT * FROM finance_cash_flows WHERE id = ? AND deleted_at IS NULL').bind(id).first(); if (!before) return apiError(404, 'not_found', 'Cash flow not found');
  const now = new Date().toISOString(); await env.DB.prepare('UPDATE finance_cash_flows SET deleted_at = ?, deleted_by = ? WHERE id = ?').bind(now, session.username, id).run();
  await env.DB.prepare(`INSERT INTO finance_cash_flow_audit (cash_flow_id, action, actor, occurred_at, before_json) VALUES (?, 'deleted', ?, ?, ?)`).bind(id, session.username, now, JSON.stringify(before)).run(); return json({ deleted: true });
}

async function listAssetSnapshots(request: Request, env: FinanceEnv) { const session = await requireFinanceRole(request, env); if (session instanceof Response) return session; const result = await env.DB.prepare('SELECT * FROM finance_asset_snapshots WHERE deleted_at IS NULL ORDER BY snapshot_at DESC, id DESC LIMIT 300').all(); return json({ snapshots: result.results }); }
async function saveAssetSnapshot(request: Request, env: FinanceEnv) {
  const session = await requireFinanceRole(request, env, ['admin']); if (session instanceof Response) return session;
  const body = await readJson<Record<string, unknown>>(request); if (body instanceof Response) return body;
  const snapshot_at = typeof body.snapshot_at === 'string' ? body.snapshot_at.trim() : ''; const source = string(body.source, 64); const holdings_value = Number(body.holdings_value); const cash_value = Number(body.cash_value); const is_complete = body.is_complete === true || body.is_complete === 1 ? 1 : 0; const incomplete_reason = nullableString(body.incomplete_reason, 500);
  if (!snapshot_at || !source || !Number.isFinite(holdings_value) || holdings_value < 0 || !Number.isFinite(cash_value) || cash_value < 0 || incomplete_reason === undefined || (!is_complete && !incomplete_reason)) return apiError(400, 'invalid_asset_snapshot', 'Asset snapshot fields are invalid');
  const now = new Date().toISOString(); const total = holdings_value + cash_value;
  await env.DB.prepare(`INSERT INTO finance_asset_snapshots (snapshot_at, snapshot_date, holdings_value, cash_value, total_value, source, is_complete, incomplete_reason, created_at, created_by) VALUES (?, substr(?,1,10), ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(snapshot_at, snapshot_at, holdings_value, cash_value, total, source, is_complete, incomplete_reason, now, session.username).run(); return json({ created: true, total_value: total }, 201);
}
async function assetSeries(request: Request, env: FinanceEnv) {
  const session = await requireFinanceRole(request, env); if (session instanceof Response) return session; const view = new URL(request.url).searchParams.get('view') ?? 'month'; if (!['week', 'month'].includes(view)) return apiError(400, 'invalid_view', 'view must be week or month');
  const rows = await env.DB.prepare(`SELECT * FROM finance_asset_snapshots WHERE deleted_at IS NULL AND is_complete = 1 ORDER BY snapshot_at ASC, id ASC LIMIT 600`).all<Record<string, unknown>>();
  const selected = new Map<string, Record<string, unknown>>(); for (const row of rows.results) { const date = String(row.snapshot_date); const key = view === 'week' ? `${date.slice(0, 4)}-W${isoWeek(date)}` : date.slice(0, 7); selected.set(key, row); }
  return json({ view, records: [...selected.values()], legacy_monthly_records: view === 'month' ? (await env.DB.prepare('SELECT year_month, end_total FROM monthly_records WHERE deleted_at IS NULL AND end_total IS NOT NULL ORDER BY year_month').all()).results : [] });
}
function isoWeek(value: string) { const date = new Date(`${value}T00:00:00Z`); const day = date.getUTCDay() || 7; date.setUTCDate(date.getUTCDate() + 4 - day); const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 1)); return String(Math.ceil((((date.getTime() - start.getTime()) / 86_400_000) + 1) / 7)).padStart(2, '0'); }
