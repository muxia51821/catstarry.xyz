import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { DatabaseSync } from 'node:sqlite';

const run = promisify(execFile);
const root = await mkdtemp(path.join(os.tmpdir(), 'catstarry-finance-import-'));
try {
  const input = path.join(root, 'trades.csv');
  const output = path.join(root, 'migration.sql');
  await writeFile(input, [
    'trade_date,ticker,ticker_name,direction,quantity,price,position_category,reason',
    '2026-07-01,510300,沪深300ETF,buy,100,4.25,broad-index,"first, entry"',
    '2026-07-02,510500,中证500ETF,buy,#VALUE!,5.2,active,review',
  ].join('\n'), 'utf8');
  const { stdout } = await run(process.execPath, ['scripts/finance-import.mjs', input, output], { cwd: process.cwd(), windowsHide: true });
  const report = JSON.parse(stdout);
  const sql = await readFile(output, 'utf8');
  assert.equal(report.sourceRows, 2);
  assert.equal(report.generatedRows, 2);
  assert.equal(report.needsReview, 1);
  assert.equal(report.totalQuantity, 100);
  assert.equal(report.totalTradeValue, 425);
  assert.match(report.batchId, /^trades-[0-9a-f]{24}$/);
  assert.equal(report.outputPath, output);
  assert.match(sql, /first, entry/);
  assert.match(sql, /NEEDS-REVIEW-3/);
  assert.match(sql, /\[IMPORT_NEEDS_REVIEW\]/);
  assert.equal((sql.match(/INSERT INTO trades/g) ?? []).length, 2);
  assert.match(sql, /finance_import_batches/);

  const database = new DatabaseSync(':memory:');
  database.exec(`CREATE TABLE trades (
    id INTEGER PRIMARY KEY AUTOINCREMENT, trade_date TEXT NOT NULL, ticker TEXT NOT NULL, ticker_name TEXT,
    direction TEXT NOT NULL, quantity REAL NOT NULL, price REAL NOT NULL, position_category TEXT NOT NULL,
    reason TEXT, needs_review INTEGER DEFAULT 0
  ); CREATE TABLE finance_import_batches (batch_id TEXT PRIMARY KEY, import_kind TEXT NOT NULL, source_rows INTEGER NOT NULL, created_at TEXT NOT NULL);
  CREATE TABLE finance_import_review (id INTEGER PRIMARY KEY AUTOINCREMENT, batch_id TEXT NOT NULL, row_number INTEGER NOT NULL, record_kind TEXT NOT NULL, raw_json TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', UNIQUE(batch_id, row_number, record_kind));`);
  database.exec(sql);
  database.exec(sql);
  assert.deepEqual({ ...database.prepare('SELECT COUNT(*) AS count, SUM(quantity * price) AS total, SUM(needs_review) AS review FROM trades').get() }, { count: 2, total: 425, review: 1 });
  assert.equal(database.prepare('SELECT COUNT(*) AS count FROM finance_import_batches').get().count, 1);
  assert.equal(database.prepare('SELECT COUNT(*) AS count FROM finance_import_review').get().count, 1);
  database.close();

  await assert.rejects(
    run(process.execPath, ['scripts/finance-import.mjs', input, output], { cwd: process.cwd(), windowsHide: true }),
    /EEXIST/,
    'migration output must never be overwritten implicitly',
  );

  const invalidInput = path.join(root, 'invalid.csv');
  await writeFile(invalidInput, [
    'trade_date,ticker,ticker_name,direction,quantity,price,position_category,reason',
    '2026-02-31,510300,沪深300ETF,buy,1,4.25,broad-index,invalid-date',
  ].join('\n'), 'utf8');
  await assert.rejects(
    run(process.execPath, ['scripts/finance-import.mjs', invalidInput, path.join(root, 'invalid.sql')], { cwd: process.cwd(), windowsHide: true }),
    /invalid trade_date/,
  );
} finally {
  await rm(root, { recursive: true, force: true });
}

console.log('Finance import contract passed.');
