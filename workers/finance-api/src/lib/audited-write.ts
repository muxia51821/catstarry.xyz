import type { FinanceEnv } from '../routes/auth';

export interface AuditedWriteTarget {
  table: string;
  auditTable: string;
  keyColumn: string;
}

function auditValues(columns: string[], values: unknown[]): Record<string, unknown> {
  return Object.fromEntries(columns.map((column, index) => [column, values[index]]));
}

export async function auditedCreate(
  env: FinanceEnv,
  target: AuditedWriteTarget,
  columns: string[],
  values: unknown[],
  afterJson: unknown,
  actor: string,
  now: string,
): Promise<number | null> {
  const results = await env.DB.batch([
    env.DB.prepare(`INSERT INTO ${target.table} (${columns.join(', ')}, created_at, created_by)
      VALUES (${columns.map(() => '?').join(', ')}, ?, ?)`).bind(...values, now, actor),
    env.DB.prepare(`INSERT INTO ${target.auditTable} (${target.keyColumn}, action, actor, occurred_at, after_json)
      SELECT last_insert_rowid(), 'created', ?, ?, ? WHERE changes() = 1`).bind(actor, now, JSON.stringify(afterJson)),
  ]);
  return Number(results[0]?.meta.last_row_id) || null;
}

export async function auditedUpdate(
  env: FinanceEnv,
  target: AuditedWriteTarget,
  columns: string[],
  values: unknown[],
  id: number,
  before: Record<string, unknown>,
  actor: string,
  now: string,
): Promise<boolean> {
  const after = {
    ...before,
    ...auditValues(columns, values),
    updated_at: now,
    updated_by: actor,
  };
  const results = await env.DB.batch([
    env.DB.prepare(`UPDATE ${target.table} SET ${columns.map((column) => `${column} = ?`).join(', ')}, updated_at = ?, updated_by = ?
      WHERE id = ? AND deleted_at IS NULL AND updated_at IS ?`)
      .bind(...values, now, actor, id, before.updated_at ?? null),
    env.DB.prepare(`INSERT INTO ${target.auditTable} (${target.keyColumn}, action, actor, occurred_at, before_json, after_json)
      SELECT ?, 'updated', ?, ?, ?, ? WHERE changes() = 1`).bind(id, actor, now, JSON.stringify(before), JSON.stringify(after)),
  ]);
  return (results[0]?.meta.changes ?? 0) !== 0;
}

export async function auditedSoftDelete(
  env: FinanceEnv,
  target: AuditedWriteTarget,
  id: number,
  before: Record<string, unknown>,
  actor: string,
  now: string,
): Promise<boolean> {
  const results = await env.DB.batch([
    env.DB.prepare(`UPDATE ${target.table} SET deleted_at = ?, deleted_by = ? WHERE id = ? AND deleted_at IS NULL AND updated_at IS ?`)
      .bind(now, actor, id, before.updated_at ?? null),
    env.DB.prepare(`INSERT INTO ${target.auditTable} (${target.keyColumn}, action, actor, occurred_at, before_json)
      SELECT ?, 'deleted', ?, ?, ? WHERE changes() = 1`).bind(id, actor, now, JSON.stringify(before)),
  ]);
  return (results[0]?.meta.changes ?? 0) !== 0;
}
