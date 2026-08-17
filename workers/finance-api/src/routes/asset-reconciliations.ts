import { apiError, json, readJson } from '../lib/http';
import { requireFinanceRole, type FinanceEnv } from './auth';

type ReconciliationInput = {
  snapshot_at?: unknown;
  source?: unknown;
  holdings_value?: unknown;
  cash_value?: unknown;
  other_assets_value?: unknown;
  is_complete?: unknown;
  incomplete_reason?: unknown;
};

const DAY = /^\d{4}-\d{2}-\d{2}$/;

export async function handleAssetReconciliations(request: Request, env: FinanceEnv): Promise<Response> {
  if (request.method === 'GET') return listReconciliations(request, env);
  if (request.method === 'POST') return saveReconciliation(request, env);
  return apiError(405, 'method_not_allowed', 'Method is not allowed');
}

async function listReconciliations(request: Request, env: FinanceEnv) {
  const session = await requireFinanceRole(request, env);
  if (session instanceof Response) return session;
  const rows = await env.DB.prepare(`SELECT * FROM finance_asset_snapshots
    WHERE deleted_at IS NULL ORDER BY snapshot_at DESC, id DESC LIMIT 300`).all();
  return json({ snapshots: rows.results, reconciliations: rows.results });
}

async function saveReconciliation(request: Request, env: FinanceEnv) {
  const session = await requireFinanceRole(request, env, ['admin']);
  if (session instanceof Response) return session;
  const body = await readJson<ReconciliationInput>(request);
  if (body instanceof Response) return body;
  const input = normalizeReconciliation(body);
  if (!input) return apiError(400, 'invalid_asset_reconciliation', 'Asset reconciliation fields are invalid');

  const totalValue = money(input.holdings_value + input.cash_value + input.other_assets_value);
  const now = new Date().toISOString();
  const result = await env.DB.prepare(`INSERT INTO finance_asset_snapshots (
      snapshot_at, snapshot_date, holdings_value, cash_value, other_assets_value,
      total_value, source, is_complete, incomplete_reason, created_at, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(
      input.snapshot_at,
      input.snapshot_date,
      input.holdings_value,
      input.cash_value,
      input.other_assets_value,
      totalValue,
      input.source,
      input.is_complete,
      input.incomplete_reason,
      now,
      session.username,
    ).run();

  return json({
    created: true,
    reconciliation: {
      id: Number(result.meta.last_row_id ?? 0),
      ...input,
      total_value: totalValue,
      created_at: now,
      created_by: session.username,
    },
    total_value: totalValue,
  }, 201);
}

function normalizeReconciliation(body: ReconciliationInput) {
  const snapshot_at = typeof body.snapshot_at === 'string' ? body.snapshot_at.trim() : '';
  const snapshot_date = snapshot_at.slice(0, 10);
  const source = typeof body.source === 'string' ? body.source.trim() : '';
  const holdings_value = finiteNonNegative(body.holdings_value);
  const cash_value = finiteNonNegative(body.cash_value);
  const other_assets_value = body.other_assets_value === undefined || body.other_assets_value === ''
    ? 0
    : finiteNonNegative(body.other_assets_value);
  const is_complete = body.is_complete === true || body.is_complete === 1 || body.is_complete === '1' ? 1 : 0;
  const incomplete_reason = nullableText(body.incomplete_reason, 500);

  if (!snapshot_at || snapshot_at.length > 40 || !DAY.test(snapshot_date) || !source || source.length > 64
    || holdings_value === null || cash_value === null || other_assets_value === null
    || incomplete_reason === undefined || (!is_complete && !incomplete_reason)) return null;

  return {
    snapshot_at,
    snapshot_date,
    source,
    holdings_value,
    cash_value,
    other_assets_value,
    is_complete,
    incomplete_reason,
  };
}

function finiteNonNegative(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 && number <= 1e15 ? number : null;
}

function nullableText(value: unknown, maximum: number): string | null | undefined {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string') return undefined;
  const text = value.trim();
  return text.length <= maximum ? text || null : undefined;
}

function money(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
