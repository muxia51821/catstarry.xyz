import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { promisify } from 'node:util';

const run = promisify(execFile);
const root = await mkdtemp(path.join(os.tmpdir(), 'catstarry-finance-snapshots-'));
try {
  const input = path.join(root, 'snapshots.csv');
  const output = path.join(root, 'snapshots.sql');
  await writeFile(input, [
    'snapshot_date,ticker,quantity,avg_cost,position_category',
    '2026-05-31,510300,100,4.25,A股宽基指数底仓',
    '2026-06-30,510500,#REF!,5.2,主动操作仓（A股）',
  ].join('\n'), 'utf8');
  const { stdout } = await run(process.execPath, ['scripts/finance-import-snapshots.mjs', input, output], { cwd: process.cwd(), windowsHide: true });
  const report = JSON.parse(stdout);
  assert.equal(report.sourceRows, 2);
  assert.equal(report.generatedRows, 2);
  assert.equal(report.needsReview, 1);
  assert.equal(report.totalQuantity, 100);
  assert.equal(report.totalCostValue, 425);
  assert.match(report.batchId, /^holdings-[0-9a-f]{24}$/);

  const database = new DatabaseSync(':memory:');
  database.exec(`CREATE TABLE holdings_snapshots (id INTEGER PRIMARY KEY AUTOINCREMENT, snapshot_date TEXT NOT NULL, ticker TEXT NOT NULL, quantity REAL NOT NULL, avg_cost REAL NOT NULL, position_category TEXT NOT NULL, UNIQUE(snapshot_date, ticker));
    CREATE TABLE finance_import_batches (batch_id TEXT PRIMARY KEY, import_kind TEXT NOT NULL, source_rows INTEGER NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE finance_import_review (id INTEGER PRIMARY KEY AUTOINCREMENT, batch_id TEXT NOT NULL, row_number INTEGER NOT NULL, record_kind TEXT NOT NULL, raw_json TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', UNIQUE(batch_id, row_number, record_kind));`);
  const sql = await readFile(output, 'utf8');
  database.exec(sql);
  database.exec(sql);
  assert.deepEqual({ ...database.prepare('SELECT COUNT(*) AS count, SUM(quantity) AS quantity, SUM(quantity * avg_cost) AS cost FROM holdings_snapshots').get() }, { count: 1, quantity: 100, cost: 425 });
  assert.equal(database.prepare('SELECT COUNT(*) AS count FROM finance_import_review').get().count, 1);
  assert.equal(database.prepare('SELECT COUNT(*) AS count FROM finance_import_batches').get().count, 1);
  database.close();
} finally {
  await rm(root, { recursive: true, force: true });
}

console.log('Finance holding snapshot import contract passed.');
