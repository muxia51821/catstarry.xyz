import { apiError, json, readJson } from '../lib/http';
import { requireFinanceRole, type FinanceEnv } from './auth';

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

  const resolvedAt = new Date().toISOString();
  const results = await env.DB.batch([
    env.DB.prepare(`INSERT INTO finance_legacy_import_review_actor_context (review_id, actor, occurred_at)
      VALUES (?, ?, ?)
      ON CONFLICT(review_id) DO UPDATE SET actor = excluded.actor, occurred_at = excluded.occurred_at`)
      .bind(id, session.username, resolvedAt),
    env.DB.prepare(`UPDATE finance_import_review
      SET status = 'resolved', resolution_note = ?, resolved_at = ?
      WHERE id = ? AND status = 'pending'`).bind(resolutionNote, resolvedAt, id),
    env.DB.prepare(`DELETE FROM finance_legacy_import_review_actor_context
      WHERE review_id = ? AND occurred_at = ?`).bind(id, resolvedAt),
  ]);
  if ((results[1]?.meta.changes ?? 0) === 0) {
    return apiError(409, 'not_resolvable', 'Review item does not exist or was already resolved');
  }
  return json({ id, status: 'resolved', resolution_note: resolutionNote, resolved_at: resolvedAt });
}
