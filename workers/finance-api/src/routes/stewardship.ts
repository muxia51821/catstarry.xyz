import { apiError, json, readJson } from '../lib/http';
import { requireFinanceRole, type FinanceEnv } from './auth';

const isoDay = /^\d{4}-\d{2}-\d{2}$/;

export async function handleStewardship(request: Request, env: FinanceEnv, pathname: string): Promise<Response> {
  if (pathname === '/api/risk-rules' && request.method === 'GET') return rules(request, env);
  if (pathname === '/api/risk-rules' && request.method === 'PUT') return saveRules(request, env);
  if (pathname === '/api/memos' && request.method === 'GET') return listMemos(request, env);
  if (pathname === '/api/memos' && request.method === 'POST') return saveMemo(request, env);
  if (/^\/api\/memos\/\d+$/.test(pathname) && request.method === 'PATCH') return updateMemo(request, env, Number(pathname.split('/')[3]));
  if (/^\/api\/memos\/\d+$/.test(pathname) && request.method === 'DELETE') return deleteMemo(request, env, Number(pathname.split('/')[3]));
  if (pathname === '/api/rebalances' && request.method === 'GET') return listRebalances(request, env);
  if (pathname === '/api/rebalances' && request.method === 'POST') return saveRebalance(request, env);
  if (/^\/api\/rebalances\/\d+\/confirm$/.test(pathname) && request.method === 'POST') return confirmRebalance(request, env, Number(pathname.split('/')[3]));
  if (pathname === '/api/workbook-review' && request.method === 'GET') return listWorkbookReview(request, env);
  if (/^\/api\/workbook-review\/\d+$/.test(pathname) && request.method === 'PATCH') return resolveWorkbookReview(request, env, Number(pathname.split('/')[3]));
  if (/^\/api\/circuit\/\d+\/confirm-resolve$/.test(pathname) && request.method === 'POST') return confirmCircuitResolve(request, env, Number(pathname.split('/')[3]));
  return apiError(404, 'not_found', 'Finance stewardship route not found');
}

async function rules(request: Request, env: FinanceEnv) {
  const session = await requireFinanceRole(request, env); if (session instanceof Response) return session;
  const result = await env.DB.prepare('SELECT rule_key, value_json, updated_at, updated_by FROM finance_investment_rules ORDER BY rule_key').all();
  return json({ rules: result.results.map((row) => ({ ...row, value: parseJson(row.value_json) })) });
}

async function saveRules(request: Request, env: FinanceEnv) {
  const session = await requireFinanceRole(request, env, ['admin']); if (session instanceof Response) return session;
  const body = await readJson<{ rule_key?: unknown; value?: unknown }>(request); if (body instanceof Response) return body;
  const key = typeof body.rule_key === 'string' ? body.rule_key.trim() : '';
  if (!['risk', 'temperature'].includes(key) || !validRule(key, body.value)) return apiError(400, 'invalid_rule', 'The rule value is invalid');
  const before = await env.DB.prepare('SELECT value_json FROM finance_investment_rules WHERE rule_key = ?').bind(key).first<{ value_json: string }>();
  const value = JSON.stringify(body.value); const now = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO finance_investment_rules (rule_key, value_json, updated_at, updated_by) VALUES (?, ?, ?, ?)
      ON CONFLICT(rule_key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at, updated_by = excluded.updated_by`).bind(key, value, now, session.username),
    env.DB.prepare('INSERT INTO finance_rule_audit (rule_key, actor, occurred_at, before_json, after_json) VALUES (?, ?, ?, ?, ?)').bind(key, session.username, now, before?.value_json ?? null, value),
  ]);
  return json({ rule_key: key, value: body.value, updated_at: now, updated_by: session.username });
}

async function listMemos(request: Request, env: FinanceEnv) {
  const session = await requireFinanceRole(request, env); if (session instanceof Response) return session;
  const result = await env.DB.prepare('SELECT * FROM finance_memos WHERE deleted_at IS NULL ORDER BY memo_date DESC, id DESC LIMIT 200').all();
  return json({ memos: result.results });
}

async function saveMemo(request: Request, env: FinanceEnv) {
  const session = await requireFinanceRole(request, env, ['admin']); if (session instanceof Response) return session;
  const body = await readJson<Record<string, unknown>>(request); if (body instanceof Response) return body;
  const input = memoInput(body); if (!input) return apiError(400, 'invalid_memo', 'Memo fields are invalid');
  const now = new Date().toISOString();
  const result = await env.DB.prepare(`INSERT INTO finance_memos (trade_id, memo_date, ticker, position_category, operation_type, reason, stop_loss_triggered, note, created_at, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(input.trade_id, input.memo_date, input.ticker, input.position_category, input.operation_type, input.reason, input.stop_loss_triggered, input.note, now, session.username).run();
  return json({ memo: await env.DB.prepare('SELECT * FROM finance_memos WHERE id = ?').bind(result.meta.last_row_id).first() }, 201);
}

async function updateMemo(request: Request, env: FinanceEnv, id: number) {
  const session = await requireFinanceRole(request, env, ['admin']); if (session instanceof Response) return session;
  if (!Number.isSafeInteger(id) || id < 1) return apiError(400, 'invalid_id', 'Memo id is invalid');
  const body = await readJson<Record<string, unknown>>(request); if (body instanceof Response) return body;
  const input = memoInput(body); if (!input) return apiError(400, 'invalid_memo', 'Memo fields are invalid');
  const now = new Date().toISOString();
  const result = await env.DB.prepare(`UPDATE finance_memos SET trade_id = ?, memo_date = ?, ticker = ?, position_category = ?, operation_type = ?, reason = ?, stop_loss_triggered = ?, note = ?, updated_at = ?, updated_by = ? WHERE id = ? AND deleted_at IS NULL`)
    .bind(input.trade_id, input.memo_date, input.ticker, input.position_category, input.operation_type, input.reason, input.stop_loss_triggered, input.note, now, session.username, id).run();
  return (result.meta.changes ?? 0) ? json({ memo: await env.DB.prepare('SELECT * FROM finance_memos WHERE id = ?').bind(id).first() }) : apiError(404, 'not_found', 'Memo not found');
}

async function deleteMemo(request: Request, env: FinanceEnv, id: number) {
  const session = await requireFinanceRole(request, env, ['admin']); if (session instanceof Response) return session;
  const result = await env.DB.prepare('UPDATE finance_memos SET deleted_at = ?, deleted_by = ? WHERE id = ? AND deleted_at IS NULL').bind(new Date().toISOString(), session.username, id).run();
  return (result.meta.changes ?? 0) ? json({ deleted: true }) : apiError(404, 'not_found', 'Memo not found');
}

async function listRebalances(request: Request, env: FinanceEnv) {
  const session = await requireFinanceRole(request, env); if (session instanceof Response) return session;
  const result = await env.DB.prepare('SELECT * FROM finance_rebalance_records ORDER BY year DESC, id DESC LIMIT 60').all();
  return json({ rebalances: result.results });
}

async function saveRebalance(request: Request, env: FinanceEnv) {
  const session = await requireFinanceRole(request, env, ['admin']); if (session instanceof Response) return session;
  const body = await readJson<Record<string, unknown>>(request); if (body instanceof Response) return body;
  const year = Number(body.year); const executed = text(body.executed_on, 10); const adjustments = text(body.adjustments, 8_000); const reason = text(body.reason, 4_000);
  if (!Number.isInteger(year) || year < 2000 || year > 2200 || !isoDay.test(executed) || !adjustments || !reason) return apiError(400, 'invalid_rebalance', 'Rebalance fields are invalid');
  const now = new Date().toISOString(); const result = await env.DB.prepare('INSERT INTO finance_rebalance_records (year, executed_on, adjustments, reason, created_at, created_by) VALUES (?, ?, ?, ?, ?, ?)').bind(year, executed, adjustments, reason, now, session.username).run();
  return json({ rebalance: await env.DB.prepare('SELECT * FROM finance_rebalance_records WHERE id = ?').bind(result.meta.last_row_id).first() }, 201);
}

async function confirmRebalance(request: Request, env: FinanceEnv, id: number) {
  const session = await requireFinanceRole(request, env, ['viewer']); if (session instanceof Response) return session;
  const now = new Date().toISOString(); const result = await env.DB.prepare('UPDATE finance_rebalance_records SET confirmed_by = ?, confirmed_at = ? WHERE id = ? AND confirmed_at IS NULL').bind(session.username, now, id).run();
  return (result.meta.changes ?? 0) ? json({ id, confirmed_by: session.username, confirmed_at: now }) : apiError(409, 'not_confirmable', 'Rebalance does not exist or is already confirmed');
}

async function confirmCircuitResolve(request: Request, env: FinanceEnv, id: number) {
  const session = await requireFinanceRole(request, env); if (session instanceof Response) return session;
  const active = await env.DB.prepare('SELECT id, level FROM circuit_breaker_log WHERE id = ? AND resolved_at IS NULL').bind(id).first<{ id: number; level: string }>();
  if (!active || active.level !== 'black') return apiError(409, 'not_confirmable', 'Only an active black circuit can be jointly restored');
  const body = await readJson<{ note?: unknown }>(request); if (body instanceof Response) return body;
  const note = body.note === undefined ? null : nullableText(body.note, 2_000); if (note === undefined) return apiError(400, 'invalid_note', 'Resolution note is invalid');
  const now = new Date().toISOString();
  await env.DB.prepare('INSERT OR IGNORE INTO finance_circuit_resolution_confirmations (circuit_id, username, role, note, confirmed_at) VALUES (?, ?, ?, ?, ?)').bind(id, session.username, session.role, note, now).run();
  const confirmations = await env.DB.prepare('SELECT DISTINCT role FROM finance_circuit_resolution_confirmations WHERE circuit_id = ?').bind(id).all<{ role: string }>();
  const roles = new Set(confirmations.results.map((row) => row.role));
  if (roles.has('admin') && roles.has('viewer')) {
    await env.DB.prepare('UPDATE circuit_breaker_log SET resolved_at = ? WHERE id = ? AND resolved_at IS NULL').bind(now, id).run();
    return json({ id, resolved: true, confirmed_by: [...roles] });
  }
  return json({ id, resolved: false, waiting_for: roles.has('admin') ? 'viewer' : 'admin' });
}

async function listWorkbookReview(request: Request, env: FinanceEnv) {
  const session = await requireFinanceRole(request, env, ['admin']); if (session instanceof Response) return session;
  const status = new URL(request.url).searchParams.get('status') ?? 'pending';
  if (!['pending', 'resolved', 'all'].includes(status)) return apiError(400, 'invalid_status', 'Workbook review status is invalid');
  const filter = status === 'all' ? '' : 'WHERE status = ?';
  const statement = env.DB.prepare(`SELECT id, batch_id, sheet_name, row_number, record_kind, raw_json, reason, status, resolution_note, resolved_at FROM finance_workbook_review ${filter} ORDER BY id DESC LIMIT 200`);
  const result = status === 'all' ? await statement.all<Record<string, unknown>>() : await statement.bind(status).all<Record<string, unknown>>();
  return json({ review: result.results.map((row) => ({ ...row, raw: parseJson(row.raw_json), raw_json: undefined })) });
}

async function resolveWorkbookReview(request: Request, env: FinanceEnv, id: number) {
  const session = await requireFinanceRole(request, env, ['admin']); if (session instanceof Response) return session;
  if (!Number.isSafeInteger(id) || id < 1) return apiError(400, 'invalid_id', 'Workbook review id is invalid');
  const body = await readJson<{ resolution_note?: unknown }>(request, 4_096); if (body instanceof Response) return body;
  const note = text(body.resolution_note, 2_000); if (!note) return apiError(400, 'invalid_resolution_note', 'A bounded resolution note is required');
  const before = await env.DB.prepare('SELECT * FROM finance_workbook_review WHERE id = ? AND status = \'pending\'').bind(id).first<Record<string, unknown>>();
  if (!before) return apiError(409, 'not_resolvable', 'Workbook review does not exist or was already resolved');
  const now = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare(`UPDATE finance_workbook_review SET status = 'resolved', resolution_note = ?, resolved_at = ? WHERE id = ? AND status = 'pending'`).bind(note, now, id),
    env.DB.prepare('INSERT INTO finance_workbook_review_audit (review_id, action, actor, occurred_at, before_json, after_json) VALUES (?, \'resolved\', ?, ?, ?, ?)').bind(id, session.username, now, JSON.stringify(before), JSON.stringify({ ...before, status: 'resolved', resolution_note: note, resolved_at: now })),
  ]);
  return json({ id, status: 'resolved', resolution_note: note, resolved_at: now });
}

function memoInput(value: Record<string, unknown>) {
  const memo_date = text(value.memo_date, 10); const reason = text(value.reason, 8_000);
  const trade_id = value.trade_id === null || value.trade_id === undefined || value.trade_id === '' ? null : Number(value.trade_id);
  const ticker = nullableText(value.ticker, 24); const position_category = nullableText(value.position_category, 64); const operation_type = nullableText(value.operation_type, 64); const note = nullableText(value.note, 8_000);
  const stop_loss_triggered = value.stop_loss_triggered ? 1 : 0;
  if (!isoDay.test(memo_date) || !reason || !Number.isInteger(trade_id ?? 0) && trade_id !== null || ticker === undefined || position_category === undefined || operation_type === undefined || note === undefined) return null;
  return { trade_id, memo_date, ticker, position_category, operation_type, reason, stop_loss_triggered, note };
}
function text(value: unknown, max: number) { return typeof value === 'string' && value.trim().length <= max ? value.trim() : ''; }
function nullableText(value: unknown, max: number): string | null | undefined { return value === undefined || value === null || value === '' ? null : typeof value === 'string' && value.trim().length <= max ? value.trim() : undefined; }
function parseJson(value: unknown) { try { return typeof value === 'string' ? JSON.parse(value) : null; } catch { return null; } }
function validRule(key: string, value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  const keys = key === 'risk' ? ['single_position_active_cap', 'loss_pause_ratio', 'stop_loss_ratio', 'take_profit_ratio', 'rebalance_deviation'] : ['freeze', 'low', 'normal', 'high'];
  const values = keys.map((name) => Number(record[name]));
  return values.every((number) => Number.isFinite(number) && number >= 0 && number <= 1_000) && (key === 'risk' || values[0] < values[1] && values[1] < values[2] && values[2] < values[3]);
}
