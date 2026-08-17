import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';

const [migration, operationsUi] = await Promise.all([
  readFile('workers/finance-api/migrations/0008_operation_history.sql', 'utf8'),
  readFile('finance-site/operations-ui.js', 'utf8'),
]);
assert.doesNotThrow(() => new Function(operationsUi), 'Operation History browser module must parse as plain JavaScript');

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

db.prepare(`INSERT INTO finance_memos (memo_date, reason, created_at, created_by) VALUES (?, ?, ?, ?)`)
  .run('2026-08-17', 'new memo', '2026-08-17T01:00:00.000Z', 'muxia');
const memoId = Number(db.prepare('SELECT max(id) AS id FROM finance_memos').get().id);
db.prepare('UPDATE finance_memos SET reason = ?, updated_at = ?, updated_by = ? WHERE id = ?')
  .run('revised memo', '2026-08-17T01:10:00.000Z', 'muxia', memoId);
db.prepare('UPDATE finance_memos SET deleted_at = ?, deleted_by = ? WHERE id = ?')
  .run('2026-08-17T01:20:00.000Z', 'muxia', memoId);
assert.deepEqual(db.prepare('SELECT action, actor FROM finance_memo_audit WHERE memo_id = ? ORDER BY id').all(memoId), [
  { action: 'created', actor: 'muxia' }, { action: 'updated', actor: 'muxia' }, { action: 'deleted', actor: 'muxia' },
]);

db.prepare(`INSERT INTO monthly_records (year_month, summary, created_at, created_by) VALUES (?, ?, ?, ?)`)
  .run('2026-08', 'new monthly', '2026-08-31T00:00:00.000Z', 'muxia');
const monthlyId = Number(db.prepare('SELECT max(id) AS id FROM monthly_records').get().id);
db.prepare('UPDATE monthly_records SET summary = ?, updated_at = ?, updated_by = ? WHERE id = ?')
  .run('revised monthly', '2026-08-31T01:00:00.000Z', 'muxia', monthlyId);
db.prepare('UPDATE monthly_records SET deleted_at = ?, deleted_by = ? WHERE id = ?')
  .run('2026-08-31T02:00:00.000Z', 'muxia', monthlyId);
assert.deepEqual(db.prepare('SELECT action, actor FROM finance_monthly_record_audit WHERE monthly_record_id = ? ORDER BY id').all(monthlyId), [
  { action: 'created', actor: 'muxia' }, { action: 'updated', actor: 'muxia' }, { action: 'deleted', actor: 'muxia' },
]);

db.prepare(`INSERT INTO annual_reviews (year, calculation_json, summary, calculated_at) VALUES (?, ?, ?, ?)`)
  .run(2026, '{"v":1}', 'first', '2026-12-31T01:00:00.000Z');
db.prepare('UPDATE annual_reviews SET calculation_json = ?, summary = ?, calculated_at = ? WHERE year = ?')
  .run('{"v":2}', 'second', '2026-12-31T02:00:00.000Z', 2026);
db.prepare('UPDATE annual_reviews SET confirmed_by = ?, confirmed_at = ? WHERE year = ?')
  .run('cati', '2026-12-31T03:00:00.000Z', 2026);
assert.deepEqual(db.prepare('SELECT action, actor FROM finance_review_audit WHERE review_year = 2026 ORDER BY id').all(), [
  { action: 'created', actor: 'system:annual-review' }, { action: 'updated', actor: 'system:annual-review' },
], 'confirmation-only updates must not create a fake calculation revision');

db.exec(migration);
assert.equal(db.prepare("SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'trigger' AND name LIKE 'trg_finance_%_audit_%'").get().count >= 8, true);
db.close();

console.log('Finance operation history migration contract passed.');
