import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';

const [tradesSource, recordsSource, operationMigration] = await Promise.all([
  readFile('workers/finance-api/src/routes/trades.ts', 'utf8'),
  readFile('workers/finance-api/src/routes/records.ts', 'utf8'),
  readFile('workers/finance-api/migrations/0008_operation_history.sql', 'utf8'),
]);

const count = (source, pattern) => source.match(pattern)?.length ?? 0;

// Route contract: all core mutation audit writes participate in the same D1 batch as the domain mutation.
assert.equal(count(tradesSource, /last_insert_rowid\(\)/g), 1, 'Trade create must bind its audit to the row inserted earlier in the same batch');
assert.equal(count(recordsSource, /last_insert_rowid\(\)/g), 2, 'Cash Flow and Account Event create must bind audits to their inserted rows');
assert.equal(count(tradesSource, /WHERE changes\(\) = 1/g), 3, 'Trade create/update/delete audit statements must depend on the immediately preceding mutation');
assert.equal(count(recordsSource, /WHERE changes\(\) = 1/g), 6, 'Cash Flow and Account Event create/update/delete audits must depend on the immediately preceding mutation');
assert.equal(count(tradesSource, /updated_at IS \?/g), 2, 'Trade update/delete must reject a stale pre-read');
assert.equal(count(recordsSource, /updated_at IS \?/g), 4, 'Cash Flow and Account Event update/delete must reject stale pre-reads');
assert.match(tradesSource, /stale_trade/);
assert.match(recordsSource, /stale_cash_flow/);
assert.match(recordsSource, /stale_account_event/);
assert.doesNotMatch(tradesSource, /await env\.DB\.prepare\(`INSERT INTO finance_trade_audit[\s\S]*?\)\.bind\([^\n]+\)\.run\(\)/, 'Trade audit writes must not be standalone writes');
assert.doesNotMatch(recordsSource, /await env\.DB\.prepare\(`INSERT INTO finance_(?:cash_flow|account_event)_audit[\s\S]*?\)\.bind\([^\n]+\)\.run\(\)/, 'Cash Flow / Account Event audit writes must not be standalone writes');

// Migration-first rollout must not install parallel core audit triggers while an old Worker may still hand-write these audits.
assert.doesNotMatch(operationMigration, /CREATE TRIGGER[\s\S]*?\bON\s+trades\b/i, '0008 must not double-own Trade auditing');
assert.doesNotMatch(operationMigration, /CREATE TRIGGER[\s\S]*?\bON\s+finance_cash_flows\b/i, '0008 must not double-own Cash Flow auditing');
assert.doesNotMatch(operationMigration, /CREATE TRIGGER[\s\S]*?\bON\s+finance_account_events\b/i, '0008 must not double-own Account Event auditing');

// SQLite semantics used by D1 batch(): last_insert_rowid() follows the prior INSERT on the same connection,
// while changes() reports the immediately preceding completed DML statement.
const db = new DatabaseSync(':memory:');
db.exec(`
  CREATE TABLE domain_rows (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    value TEXT NOT NULL,
    updated_at TEXT
  );
  CREATE TABLE audit_rows (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    domain_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    actor TEXT NOT NULL
  );
`);

db.exec('BEGIN');
db.prepare('INSERT INTO domain_rows (value, updated_at) VALUES (?, ?)').run('created', 'v1');
db.prepare(`INSERT INTO audit_rows (domain_id, action, actor)
  SELECT last_insert_rowid(), 'created', 'muxia' WHERE changes() = 1`).run();
db.exec('COMMIT');
assert.deepEqual(
  db.prepare('SELECT domain_id, action, actor FROM audit_rows ORDER BY id').all().map((row) => ({ ...row })),
  [{ domain_id: 1, action: 'created', actor: 'muxia' }],
  'create audit must point at the domain row inserted immediately before it',
);

// Compare-and-swap: the fresh update produces exactly one audit; the stale retry produces neither a domain change nor an audit.
db.exec('BEGIN');
db.prepare('UPDATE domain_rows SET value = ?, updated_at = ? WHERE id = ? AND updated_at IS ?').run('fresh-update', 'v2', 1, 'v1');
db.prepare(`INSERT INTO audit_rows (domain_id, action, actor)
  SELECT 1, 'updated', 'muxia' WHERE changes() = 1`).run();
db.exec('COMMIT');
assert.equal(db.prepare("SELECT COUNT(*) AS count FROM audit_rows WHERE action = 'updated'").get().count, 1);

db.exec('BEGIN');
db.prepare('UPDATE domain_rows SET value = ?, updated_at = ? WHERE id = ? AND updated_at IS ?').run('stale-update', 'v3', 1, 'v1');
db.prepare(`INSERT INTO audit_rows (domain_id, action, actor)
  SELECT 1, 'updated', 'muxia' WHERE changes() = 1`).run();
db.exec('COMMIT');
assert.equal(db.prepare('SELECT value, updated_at FROM domain_rows WHERE id = 1').get().value, 'fresh-update');
assert.equal(db.prepare("SELECT COUNT(*) AS count FROM audit_rows WHERE action = 'updated'").get().count, 1, 'stale write must not manufacture an audit row');

// Transaction failure contract: if the audit insert fails, the domain insert is rolled back with it.
const beforeFailure = db.prepare('SELECT COUNT(*) AS count FROM domain_rows').get().count;
db.exec('BEGIN');
try {
  db.prepare('INSERT INTO domain_rows (value, updated_at) VALUES (?, ?)').run('must-rollback', 'rollback');
  db.prepare(`INSERT INTO audit_rows (domain_id, action, actor)
    SELECT last_insert_rowid(), 'created', NULL WHERE changes() = 1`).run();
  db.exec('COMMIT');
  assert.fail('audit constraint failure must abort the transaction');
} catch {
  db.exec('ROLLBACK');
}
assert.equal(db.prepare('SELECT COUNT(*) AS count FROM domain_rows').get().count, beforeFailure, 'domain write must roll back when audit write fails');

db.close();
console.log('Finance core audit atomicity contract passed.');
