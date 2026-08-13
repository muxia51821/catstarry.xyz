import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { DatabaseSync } from 'node:sqlite';

const run = promisify(execFile);
const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'catstarry-finance-workbook-'));
const fixture = path.resolve('scripts/fixtures/finance-workbook-minimal.xlsx');
const output = path.join(temporaryRoot, 'workbook-import.sql');

try {
  const python = process.env.PYTHON ?? (process.platform === 'win32' ? 'python' : 'python3');
  const { stdout } = await run(python, ['scripts/finance-import-workbook.py', fixture, output], {
    cwd: process.cwd(),
    windowsHide: true,
  });
  const report = JSON.parse(stdout);
  const sql = await readFile(output, 'utf8');

  assert.deepEqual(
    { source: report.source, imported: report.imported, review: report.review },
    { source: 2, imported: 1, review: 1 },
  );
  assert.match(report.batch_id, /^workbook-[0-9a-f]{20}$/);
  assert.equal(report.output, output);
  assert.doesNotMatch(sql, /CATEGORY-/, 'Workbook import must never synthesize a ticker from a category');

  const database = new DatabaseSync(':memory:');
  try {
    const migrations = (await readdir('workers/finance-api/migrations'))
      .filter((file) => file.endsWith('.sql'))
      .sort();
    for (const migration of migrations) {
      database.exec(await readFile(path.join('workers/finance-api/migrations', migration), 'utf8'));
    }
    database.exec(sql);

    assert.deepEqual(
      { ...database.prepare(`SELECT year_month, muxia_invest, cati_invest, end_total,
        sse300_pe, sse500_pe, sse1000_pe, blue_chip_temp, summary, remark
        FROM monthly_records WHERE year_month = ?`).get('2026-05') },
      {
        year_month: '2026-05',
        muxia_invest: 2500,
        cati_invest: 2500,
        end_total: 125000,
        sse300_pe: 12.5,
        sse500_pe: 18.75,
        sse1000_pe: 25.5,
        blue_chip_temp: '正常',
        summary: '月度记录 fixture',
        remark: '正常导入',
      },
    );
    assert.deepEqual(
      { ...database.prepare(`SELECT sheet_name, row_number, record_kind, status
        FROM finance_workbook_review`).get() },
      { sheet_name: '📊 持仓快照', row_number: 39, record_kind: 'category_snapshot', status: 'pending' },
    );
    assert.equal(database.prepare('SELECT COUNT(*) AS count FROM holdings_snapshots').get().count, 0);
    assert.deepEqual(
      { ...database.prepare(`SELECT source_name, source_rows, imported_rows, review_rows
        FROM finance_workbook_imports`).get() },
      { source_name: path.basename(fixture), source_rows: 2, imported_rows: 1, review_rows: 1 },
    );
  } finally {
    database.close();
  }
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}

console.log('Finance workbook import safety contract passed.');
