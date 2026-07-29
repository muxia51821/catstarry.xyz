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
