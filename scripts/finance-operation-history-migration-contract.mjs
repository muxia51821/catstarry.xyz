import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';

const [migration, operationsUi] = await Promise.all([
  readFile('workers/finance-api/migrations/0008_operation_history.sql', 'utf8'),
  readFile('finance-site/operations-ui.js', 'utf8'),
]);
assert.doesNotThrow(() => new Function(operationsUi), 'Operation History browser module must parse as plain JavaScript');
const plainRows = (rows) => rows.map((row) => ({ ...row }));

const db = new DatabaseSync(':memory:');
db.exec(`
  CREATE TABLE finance_memos (
    id INTEGER PRIMARY KEY AUTOINCREMENT, trade_id INTEGER, memo_date TEXT NOT NULL, ticker TEXT,
    position_category TEXT, operation_type TEXT, reason TEXT NOT NULL, reason_source TEXT,
    stop_loss_triggered INTEGER NOT NULL DEFAULT 0, note TEXT, created_at TEXT NOT NULL, created_by TEXT NOT NULL,
    updated_at TEXT, updated_by TEXT, deleted_at TEXT, deleted_by TEXT
  );
  CREATE TABLE monthly_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT, year_month TEXT NOT NULL UNIQUE, muxia_invest REAL NOT NULL DEFAULT 0,
    cati_invest REAL NOT NULL DEFAULT 0, end_total REAL, sse300_pe REAL, sse500_pe REAL, sse1000_pe REAL,
    blue_chip_temp TEXT, summary TEXT, remark TEXT, created_at TEXT NOT NULL, created_by TEXT NOT NULL,
    updated_at TEXT, updated_by TEXT, deleted_at TEXT, deleted_by TEXT
  );
  CREATE TABLE annual_reviews (
    year INTEGER PRIMARY KEY, calculation_json TEXT NOT NULL, summary TEXT, calculated_at TEXT NOT NULL,
    confirmed_by TEXT, confirmed_at TEXT
  );
  CREATE TABLE finance_import_review (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id TEXT NOT NULL,
    row_number INTEGER NOT NULL,
    record_kind TEXT NOT NULL,
    raw_json TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    resolution_note TEXT,
    resolved_at TEXT
  );
`);

db.prepare(`INSERT INTO finance_memos (memo_date, reason, created_at, created_by) VALUES (?, ?, ?, ?)`)
  .run('2026-07-01', 'pre-migration memo', '2026-07-01T00:00:00.000Z', 'legacy');
db.prepare(`INSERT INTO monthly_records (year_month, summary, created_at, created_by) VALUES (?, ?, ?, ?)`)
  .run('2026-07', 'pre-migration monthly', '2026-07-31T00:00:00.000Z', 'legacy');
db.prepare(`INSERT INTO annual_reviews (year, calculation_json, summary, calculated_at) VALUES (?, ?, ?, ?)`)
  .run(2025, '{}', 'pre-migration review', '2025-12-31T00:00:00.000Z');

db.exec(migration);
assert.equal(db.prepare('SELECT COUNT(*) AS count FROM finance_memo_audit').get().count, 0, 'existing memo versions must not be fabricated');
assert.equal(db.prepare('SELECT COUNT(*) AS count FROM finance_monthly_record_audit').get().count, 0, 'existing monthly versions must not be fabricated');
assert.equal(db.prepare('SELECT COUNT(*) AS count FROM finance_review_audit').get().count, 0, 'existing annual review versions must not be fabricated');
assert.equal(db.prepare('SELECT COUNT(*) AS count FROM finance_legacy_import_review_audit').get().count, 0, 'existing legacy review versions must not be fabricated');
assert.equal(db.prepare('SELECT COUNT(*) AS count FROM finance_legacy_import_review_actor_context').get().count, 0, 'actor context must start empty');

// Fresh databases apply migrations before replaying the accepted historical import.
// Those imported Memos must not appear as user-created operations when production upgrades do not have them either.
db.prepare(`INSERT INTO finance_memos (memo_date, reason, created_at, created_by) VALUES (?, ?, ?, ?)`)
  .run('2026-06-01', 'accepted historical memo', '2026-08-16T00:00:00.000Z', 'historical-import:fixture');
assert.equal(db.prepare('SELECT COUNT(*) AS count FROM finance_memo_audit').get().count, 0, 'historical-import memo creation must remain represented by the batch operation only');

db.prepare(`INSERT INTO finance_memos (memo_date, reason, created_at, created_by) VALUES (?, ?, ?, ?)`)
  .run('2026-08-17', 'new memo', '2026-08-17T01:00:00.000Z', 'muxia');
const memoId = Number(db.prepare('SELECT max(id) AS id FROM finance_memos').get().id);
db.prepare('UPDATE finance_memos SET reason = ?, updated_at = ?, updated_by = ? WHERE id = ?')
  .run('revised memo', '2026-08-17T01:10:00.000Z', 'muxia', memoId);
db.prepare('UPDATE finance_memos SET deleted_at = ?, deleted_by = ? WHERE id = ?')
  .run('2026-08-17T01:20:00.000Z', 'muxia', memoId);
assert.deepEqual(plainRows(db.prepare('SELECT action, actor FROM finance_memo_audit WHERE memo_id = ? ORDER BY id').all(memoId)), [
  { action: 'created', actor: 'muxia' }, { action: 'updated', actor: 'muxia' }, { action: 'deleted', actor: 'muxia' },
]);

db.prepare(`INSERT INTO monthly_records (year_month, summary, created_at, created_by) VALUES (?, ?, ?, ?)`)
  .run('2026-08', 'new monthly', '2026-08-31T00:00:00.000Z', 'muxia');
const monthlyId = Number(db.prepare('SELECT max(id) AS id FROM monthly_records').get().id);
db.prepare('UPDATE monthly_records SET summary = ?, updated_at = ?, updated_by = ? WHERE id = ?')
  .run('revised monthly', '2026-08-31T01:00:00.000Z', 'muxia', monthlyId);
db.prepare('UPDATE monthly_records SET deleted_at = ?, deleted_by = ? WHERE id = ?')
  .run('2026-08-31T02:00:00.000Z', 'muxia', monthlyId);
assert.deepEqual(plainRows(db.prepare('SELECT action, actor FROM finance_monthly_record_audit WHERE monthly_record_id = ? ORDER BY id').all(monthlyId)), [
  { action: 'created', actor: 'muxia' }, { action: 'updated', actor: 'muxia' }, { action: 'deleted', actor: 'muxia' },
]);

db.prepare(`INSERT INTO annual_reviews (year, calculation_json, summary, calculated_at) VALUES (?, ?, ?, ?)`)
  .run(2026, '{"v":1}', 'first', '2026-12-31T01:00:00.000Z');
db.prepare('UPDATE annual_reviews SET confirmed_by = ?, confirmed_at = ? WHERE year = ?')
  .run('cati', '2026-12-31T02:00:00.000Z', 2026);
db.prepare('UPDATE annual_reviews SET calculation_json = ?, summary = ?, calculated_at = ?, confirmed_by = NULL, confirmed_at = NULL WHERE year = ?')
  .run('{"v":2}', 'second', '2026-12-31T03:00:00.000Z', 2026);
assert.deepEqual(plainRows(db.prepare('SELECT action, actor FROM finance_review_audit WHERE review_year = 2026 ORDER BY id').all()), [
  { action: 'created', actor: 'system:annual-review' },
  { action: 'confirmed', actor: 'cati' },
  { action: 'updated', actor: 'system:annual-review' },
]);
const reviewRevision = db.prepare(`SELECT before_json, after_json FROM finance_review_audit
  WHERE review_year = 2026 AND action = 'updated'`).get();
assert.equal(JSON.parse(reviewRevision.before_json).confirmed_by, 'cati');
assert.equal(JSON.parse(reviewRevision.after_json).confirmed_by, null, 'recalculation must preserve evidence that the previous confirmation was cleared');

// New Worker compatibility path: authenticated actor provenance is server-owned context,
// while the domain row and immutable audit both retain the plain user resolution note.
db.prepare(`INSERT INTO finance_import_review (batch_id, row_number, record_kind, raw_json)
  VALUES ('legacy-batch', 7, 'trade', '{}')`).run();
const legacyId = Number(db.prepare('SELECT max(id) AS id FROM finance_import_review').get().id);
const legacyResolvedAt = '2026-08-17T04:00:00.000Z';
db.prepare(`INSERT INTO finance_legacy_import_review_actor_context (review_id, actor, occurred_at)
  VALUES (?, ?, ?) ON CONFLICT(review_id) DO UPDATE SET actor = excluded.actor, occurred_at = excluded.occurred_at`)
  .run(legacyId, 'muxia', legacyResolvedAt);
db.prepare(`UPDATE finance_import_review
  SET status = 'resolved', resolution_note = ?, resolved_at = ?
  WHERE id = ? AND status = 'pending'`).run('legacy fixed', legacyResolvedAt, legacyId);
db.prepare(`DELETE FROM finance_legacy_import_review_actor_context
  WHERE review_id = ? AND occurred_at = ?`).run(legacyId, legacyResolvedAt);
const legacyAudit = db.prepare(`SELECT actor, before_json, after_json FROM finance_legacy_import_review_audit
  WHERE review_id = ?`).get(legacyId);
assert.equal(legacyAudit.actor, 'muxia');
assert.equal(JSON.parse(legacyAudit.before_json).status, 'pending');
assert.deepEqual(JSON.parse(legacyAudit.after_json), {
  batch_id: 'legacy-batch', row_number: 7, record_kind: 'trade', status: 'resolved', resolution_note: 'legacy fixed',
});
assert.equal(db.prepare('SELECT resolution_note FROM finance_import_review WHERE id = ?').get(legacyId).resolution_note, 'legacy fixed');
assert.equal(db.prepare('SELECT COUNT(*) AS count FROM finance_legacy_import_review_actor_context').get().count, 0, 'new Worker actor context must be transient');
assert.equal(db.prepare('SELECT COUNT(*) AS count FROM finance_legacy_import_review_audit WHERE review_id = ?').get(legacyId).count, 1);

// Old Worker compatibility: any user-controlled JSON, including the retired marker shape,
// remains plain note content and can never supply actor provenance without server context.
db.prepare(`INSERT INTO finance_import_review (batch_id, row_number, record_kind, raw_json)
  VALUES ('old-worker-batch', 8, 'trade', '{}')`).run();
const oldWorkerId = Number(db.prepare('SELECT max(id) AS id FROM finance_import_review').get().id);
const spoofableJsonNote = JSON.stringify({ __finance_operation_history_v1: true, actor: 'spoofed-user', note: 'old worker fixed' });
db.prepare(`UPDATE finance_import_review
  SET status = 'resolved', resolution_note = ?, resolved_at = ?
  WHERE id = ? AND status = 'pending'`).run(spoofableJsonNote, '2026-08-17T04:10:00.000Z', oldWorkerId);
const oldWorkerAudit = db.prepare('SELECT actor, after_json FROM finance_legacy_import_review_audit WHERE review_id = ?').get(oldWorkerId);
assert.equal(oldWorkerAudit.actor, 'unknown:legacy-import-review');
assert.equal(JSON.parse(oldWorkerAudit.after_json).resolution_note, spoofableJsonNote, 'user-controlled note text must never be interpreted as trusted actor provenance');

db.exec(migration);
assert.equal(db.prepare("SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'trigger' AND name LIKE 'trg_finance_%_audit_%'").get().count >= 10, true);
assert.equal(db.prepare('SELECT COUNT(*) AS count FROM finance_legacy_import_review_actor_context').get().count, 0);
db.close();

console.log('Finance operation history migration contract passed.');
