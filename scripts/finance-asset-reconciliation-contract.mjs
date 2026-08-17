import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { handleAssetReconciliations } from '../workers/finance-api/src/routes/asset-reconciliations.ts';

const SESSION_TOKEN = '22222222-2222-4222-8222-222222222222';

class SqliteD1Statement {
  constructor(database, sql, values = []) { this.database = database; this.sql = sql; this.values = values; }
  bind(...values) { return new SqliteD1Statement(this.database, this.sql, values); }
  async first() { const row = this.database.prepare(this.sql).get(...this.values); return row ? { ...row } : null; }
  async all() { return { results: this.database.prepare(this.sql).all(...this.values).map((row) => ({ ...row })) }; }
  async run() { const result = this.database.prepare(this.sql).run(...this.values); return { success: true, meta: { changes: Number(result.changes), last_row_id: Number(result.lastInsertRowid ?? 0) } }; }
}
class SqliteD1 {
  constructor(database) { this.database = database; }
  prepare(sql) { return new SqliteD1Statement(this.database, sql); }
  async batch(statements) {
    this.database.exec('BEGIN');
    try {
      const rows = [];
      for (const statement of statements) rows.push(await statement.run());
      this.database.exec('COMMIT');
      return rows;
    } catch (error) {
      this.database.exec('ROLLBACK');
      throw error;
    }
  }
}
class SessionKv {
  async get(key, type) {
    if (key !== `session:${SESSION_TOKEN}`) return null;
    const session = { username: 'muxia', role: 'admin', expires_at: '2099-01-01T00:00:00.000Z' };
    return type === 'json' ? session : JSON.stringify(session);
  }
  async put() {}
  async delete() {}
}

const migrationDirectory = 'workers/finance-api/migrations';
const migrationFiles = (await readdir(migrationDirectory)).filter((name) => name.endsWith('.sql')).sort();

// The forward migration preserves all legacy observations and assigns other assets = 0.
{
  const database = new DatabaseSync(':memory:');
  for (const file of migrationFiles.filter((name) => name < '0011_')) {
    database.exec(await readFile(path.join(migrationDirectory, file), 'utf8'));
  }
  database.prepare(`INSERT INTO finance_asset_snapshots (
    snapshot_at, snapshot_date, holdings_value, cash_value, total_value, source, is_complete,
    incomplete_reason, created_at, created_by
  ) VALUES ('2026-08-16T10:29:00+08:00','2026-08-16',109698.70,20725.50,130424.20,'broker_reconciliation',1,NULL,'2026-08-16T10:30:00+08:00','muxia')`).run();
  database.exec(await readFile(path.join(migrationDirectory, '0011_asset_reconciliation_other_assets.sql'), 'utf8'));
  const migrated = { ...database.prepare('SELECT holdings_value, cash_value, other_assets_value, total_value FROM finance_asset_snapshots').get() };
  assert.deepEqual(migrated, { holdings_value: 109698.70, cash_value: 20725.50, other_assets_value: 0, total_value: 130424.20 });
  database.close();
}

// New reconciliations can observe an open repo without manufacturing an asset drop.
{
  const database = new DatabaseSync(':memory:');
  for (const file of migrationFiles) database.exec(await readFile(path.join(migrationDirectory, file), 'utf8'));
  const env = { DB: new SqliteD1(database), FINANCE_AUTH_KV: new SessionKv() };
  const payload = {
    snapshot_at: '2026-07-29T15:01',
    source: 'broker-reconciliation',
    holdings_value: 100000,
    cash_value: 10000,
    other_assets_value: 36000,
    is_complete: true,
  };
  const makePost = (body = payload) => new Request('https://finance.test/api/assets/snapshots', {
    method: 'POST',
    headers: { Cookie: `token=${SESSION_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const response = await handleAssetReconciliations(makePost(), env);
  assert.equal(response.status, 201);
  const created = await response.json();
  assert.equal(created.total_value, 146000);
  assert.equal(created.reconciliation.other_assets_value, 36000);
  assert.equal(created.reconciliation.snapshot_at, '2026-07-29T07:01:00.000Z', 'datetime-local is interpreted in Asia/Shanghai and persisted as UTC');
  assert.equal(created.reconciliation.snapshot_date, '2026-07-29', 'business date remains the Shanghai calendar date');

  const stored = { ...database.prepare(`SELECT snapshot_at, snapshot_date, holdings_value, cash_value, other_assets_value, total_value, source FROM finance_asset_snapshots`).get() };
  assert.deepEqual(stored, {
    snapshot_at: '2026-07-29T07:01:00.000Z', snapshot_date: '2026-07-29', holdings_value: 100000,
    cash_value: 10000, other_assets_value: 36000, total_value: 146000, source: 'broker-reconciliation',
  });

  const duplicate = await handleAssetReconciliations(makePost(), env);
  assert.equal(duplicate.status, 409, 'same canonical observation time/source must be a user-visible conflict instead of a Worker 500');
  assert.match(await duplicate.text(), /duplicate_asset_reconciliation/);
  assert.equal(database.prepare('SELECT COUNT(*) AS count FROM finance_asset_snapshots').get().count, 1);

  // Mixed legacy +08:00 and canonical UTC timestamps must sort by the actual instant, not lexical text.
  database.prepare(`INSERT INTO finance_asset_snapshots (
    snapshot_at, snapshot_date, holdings_value, cash_value, other_assets_value, total_value,
    source, is_complete, incomplete_reason, created_at, created_by
  ) VALUES (?, '2026-08-16', 100, 20, 0, 120, ?, 1, NULL, ?, 'contract')`).run(
    '2026-08-16T10:29:00+08:00', 'legacy-offset', '2026-08-16T10:30:00+08:00',
  );
  database.prepare(`INSERT INTO finance_asset_snapshots (
    snapshot_at, snapshot_date, holdings_value, cash_value, other_assets_value, total_value,
    source, is_complete, incomplete_reason, created_at, created_by
  ) VALUES (?, '2026-08-16', 101, 20, 0, 121, ?, 1, NULL, ?, 'contract')`).run(
    '2026-08-16T03:00:00.000Z', 'utc-newer', '2026-08-16T03:01:00.000Z',
  );

  const getResponse = await handleAssetReconciliations(new Request('https://finance.test/api/assets/snapshots', { headers: { Cookie: `token=${SESSION_TOKEN}` } }), env);
  assert.equal(getResponse.status, 200);
  const listed = await getResponse.json();
  assert.equal(listed.snapshots[0].source, 'utc-newer', '11:00 Shanghai UTC row is later than the legacy 10:29 +08:00 row');
  assert.equal(listed.snapshots[1].source, 'legacy-offset');
  assert.deepEqual(listed.reconciliations, listed.snapshots);

  const incomplete = await handleAssetReconciliations(makePost({
    snapshot_at: '2026-07-30T10:00', source: 'manual', holdings_value: 1, cash_value: 1, other_assets_value: 0, is_complete: false,
  }), env);
  assert.equal(incomplete.status, 400, 'incomplete reconciliation requires an explicit gap reason');

  const invalidDate = await handleAssetReconciliations(makePost({
    snapshot_at: '2026-02-30T10:00', source: 'manual', holdings_value: 1, cash_value: 1, is_complete: true,
  }), env);
  assert.equal(invalidDate.status, 400, 'invalid local calendar dates must not be normalized into a different business day');

  database.close();
}

console.log('Finance asset reconciliation other-assets, timezone, ordering and duplicate contract passed.');
