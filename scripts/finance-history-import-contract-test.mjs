import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { DatabaseSync } from 'node:sqlite';

const run = promisify(execFile); const root = await mkdtemp(path.join(os.tmpdir(), 'catstarry-finance-history-'));
const python = process.platform === 'win32' ? 'python' : 'python3'; const expected = { trades: 2, memos: 2, account_events: 1, cash_flows: 1, holdings_snapshots: 1, asset_snapshots: 1 };
try {
  const workbook = path.join(root, 'fixture.xlsx'); const output = path.join(root, 'history.sql'); const reportPath = path.join(root, 'report.json');
  await run(python, ['scripts/finance-history-import-fixture.py', workbook], { windowsHide: true });
  const { stdout } = await run(python, ['scripts/finance-import-history.py', workbook, output, reportPath, '--expected-counts', JSON.stringify(expected)], { windowsHide: true });
  assert.deepEqual(JSON.parse(stdout).actual, expected);
  const database = new DatabaseSync(':memory:');
  for (const file of (await readdir('workers/finance-api/migrations')).filter((file) => file.endsWith('.sql')).sort()) database.exec(await readFile(path.join('workers/finance-api/migrations', file), 'utf8'));
  const sql = await readFile(output, 'utf8'); database.exec(sql);
  assert.equal(database.prepare('SELECT COUNT(*) AS count FROM trades').get().count, 2, 'same-day trades must both import');
  assert.equal(database.prepare("SELECT COUNT(*) AS count FROM finance_memos WHERE reason_source = 'reconstructed_confirmed'").get().count, 1);
  assert.equal(database.prepare('SELECT COUNT(*) AS count FROM finance_account_events').get().count, 1);
  assert.equal(database.prepare('SELECT COUNT(*) AS count FROM finance_cash_flows').get().count, 1);
  assert.throws(() => database.exec(sql), /UNIQUE/, 'the accepted-workbook batch must not run twice'); database.close();
} finally { await rm(root, { recursive: true, force: true }); }
console.log('Finance historical import contract passed.');
