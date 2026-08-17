import { apiError, json, readJson } from '../lib/http';
import { requireFinanceRole, type FinanceEnv } from './auth';

interface LegacyImportReviewRow {
  id: number;
  batch_id: string;
  row_number: number;
  record_kind: string;
  raw_json: string;
  status: 'pending' | 'resolved';
  resolution_note: string | null;
  resolved_at: string | null;
}

export async function handleLegacyImportReviewWrite(
  request: Request,
  env: FinanceEnv,
  pathname: string,
): Promise<Response> {
  const match = pathname.match(/^\/api\/import-review\/(\d+)$/);
  if (!match || request.method !== 'PATCH') return apiError(405, 'method_not_allowed', 'Method is not allowed');
  const id = Number(match[1]);
  if (!Number.isSafeInteger(id) || id < 1) return apiError(400, 'invalid_id', 'Import review id is invalid');

  const session = await requireFinanceRole(request, env, ['admin']);
  if (session instanceof Response) return session;
  const body = await readJson<{ resolution_note?: unknown }>(request, 4_096);
  if (body instanceof Response) return body;
  const resolutionNote = typeof body.resolution_note === 'string' ? body.resolution_note.trim() : '';
  if (!resolutionNote || resolutionNote.length > 2_000) {
    return apiError(400, 'invalid_resolution_note', 'A bounded resolution note is required');
  }

  const existing = await env.DB.prepare(`SELECT id, batch_id, row_number, record_kind, raw_json,
      status, resolution_note, resolved_at
    FROM finance_import_review WHERE id = ?`).bind(id).first<LegacyImportReviewRow>();
  if (!existing || existing.status !== 'pending') {
    return apiError(409, 'not_resolvable', 'Review item does not exist or was already resolved');
  }

  const resolvedAt = new Date().toISOString();
  const before = JSON.stringify({
    batch_id: existing.batch_id,
    row_number: existing.row_number,
    record_kind: existing.record_kind,
    status: existing.status,
    resolution_note: existing.resolution_note,
  });
  const after = JSON.stringify({
    batch_id: existing.batch_id,
    row_number: existing.row_number,
    record_kind: existing.record_kind,
    status: 'resolved',
    resolution_note: resolutionNote,
  });
  const results = await env.DB.batch([
    env.DB.prepare(`UPDATE finance_import_review
      SET status = 'resolved', resolution_note = ?, resolved_at = ?
      WHERE id = ? AND status = 'pending'`).bind(resolutionNote, resolvedAt, id),
    env.DB.prepare(`INSERT INTO finance_legacy_import_review_audit
      (review_id, action, actor, occurred_at, before_json, after_json)
      SELECT ?, 'resolved', ?, ?, ?, ?
      WHERE EXISTS (
        SELECT 1 FROM finance_import_review
        WHERE id = ? AND status = 'resolved' AND resolved_at = ? AND resolution_note = ?
      )`).bind(id, session.username, resolvedAt, before, after, id, resolvedAt, resolutionNote),
  ]);
  if ((results[0]?.meta.changes ?? 0) === 0 || (results[1]?.meta.changes ?? 0) === 0) {
    return apiError(409, 'not_resolvable', 'Review item changed before it could be resolved');
  }
  return json({ id, status: 'resolved', resolution_note: resolutionNote, resolved_at: resolvedAt });
}
