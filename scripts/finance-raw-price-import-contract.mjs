import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { DatabaseSync } from 'node:sqlite';

const run = promisify(execFile);
const python = process.platform === 'win32' ? 'python' : 'python3';
const root = await mkdtemp(path.join(os.tmpdir(), 'catstarry-finance-prices-'));

try {
  const input = path.join(root, 'raw.csv');
  const sqlPath = path.join(root, 'raw.sql');
  const reportPath = path.join(root, 'raw.json');
  await writeFile(input, [
    'ticker,price_date,close,source,adjustment,observed_at',
    '515880,2026-06-30,1.7948,mootdx,raw,',
    '000021,2026-06-30,64.27,mootdx,raw,',
    '515880,2026-07-03,0.7885,mootdx,raw,',
  ].join('\n') + '\n', 'utf8');

  const { stdout } = await run(python, ['scripts/finance-import-raw-prices.py', input, sqlPath, reportPath, '--actor', 'contract']);
  const report = JSON.parse(stdout);
  assert.equal(report.rows, 3);
  assert.deepEqual(report.tickers, ['000021', '515880']);
  assert.deepEqual(report.sources, ['mootdx']);
  assert.equal(report.start_date, '2026-06-30');
  assert.equal(report.end_date, '2026-07-03');
  assert.equal(report.adjustment, 'raw');
  assert.deepEqual(report.price_status_counts, { carried_forward: 0, observed: 3 }, 'missing price_status defaults only to an observed close');

  const database = new DatabaseSync(':memory:');
  for (const file of (await readdir('workers/finance-api/migrations')).filter((name) => name.endsWith('.sql')).sort()) {
    database.exec(await readFile(path.join('workers/finance-api/migrations', file), 'utf8'));
  }
  database.exec(await readFile(sqlPath, 'utf8'));
  assert.equal(database.prepare('SELECT COUNT(*) AS count FROM finance_security_prices').get().count, 3);
  assert.deepEqual({ ...database.prepare(`SELECT close, price_status FROM finance_security_prices WHERE ticker='515880' AND price_date='2026-06-30'`).get() }, { close: 1.7948, price_status: 'observed' });

  // Validated suspension/no-trade evidence may explicitly carry the last raw close.
  const carried = path.join(root, 'carried.csv');
  const carriedSql = path.join(root, 'carried.sql');
  const carriedReport = path.join(root, 'carried.json');
  await writeFile(carried, 'ticker,price_date,close,source,adjustment,price_status\n000021,2026-07-01,64.27,validated-suspension,raw,carried_forward\n', 'utf8');
  const carriedResult = await run(python, ['scripts/finance-import-raw-prices.py', carried, carriedSql, carriedReport, '--actor', 'contract']);
  assert.deepEqual(JSON.parse(carriedResult.stdout).price_status_counts, { carried_forward: 1, observed: 0 });
  database.exec(await readFile(carriedSql, 'utf8'));
  assert.deepEqual({ ...database.prepare(`SELECT close, source, price_status FROM finance_security_prices WHERE ticker='000021' AND price_date='2026-07-01'`).get() }, {
    close: 64.27, source: 'validated-suspension', price_status: 'carried_forward',
  });

  // Re-importing a corrected canonical matrix updates the same security/day instead of creating competing prices.
  const corrected = path.join(root, 'corrected.csv');
  const correctedSql = path.join(root, 'corrected.sql');
  const correctedReport = path.join(root, 'corrected.json');
  await writeFile(corrected, 'ticker,price_date,close,source,adjustment\n515880,2026-06-30,1.8,verified-raw-fallback,raw\n', 'utf8');
  await run(python, ['scripts/finance-import-raw-prices.py', corrected, correctedSql, correctedReport, '--actor', 'contract']);
  database.exec(await readFile(correctedSql, 'utf8'));
  assert.equal(database.prepare('SELECT COUNT(*) AS count FROM finance_security_prices').get().count, 4);
  assert.deepEqual({ ...database.prepare(`SELECT close, source, price_status FROM finance_security_prices WHERE ticker='515880' AND price_date='2026-06-30'`).get() }, { close: 1.8, source: 'verified-raw-fallback', price_status: 'observed' });
  database.close();

  async function rejects(name, rows, pattern) {
    const csvPath = path.join(root, `${name}.csv`);
    const output = path.join(root, `${name}.sql`);
    const report = path.join(root, `${name}.json`);
    await writeFile(csvPath, rows, 'utf8');
    await assert.rejects(run(python, ['scripts/finance-import-raw-prices.py', csvPath, output, report]), pattern);
  }

  await rejects('adjusted', 'ticker,price_date,close,source,adjustment\n515880,2026-06-30,0.8974,adjusted-source,split_adjusted\n', /adjustment must be raw/);
  await rejects('duplicate', 'ticker,price_date,close,source,adjustment\n515880,2026-06-30,1.7948,mootdx,raw\n515880,2026-06-30,1.8,other,raw\n', /duplicate canonical security\/day/);
  await rejects('impossible-date', 'ticker,price_date,close,source,adjustment\n515880,2026-06-31,1.8,mootdx,raw\n', /invalid price_date: '2026-06-31'/);
  await rejects('pre-boundary', 'ticker,price_date,close,source,adjustment\n515880,2026-06-02,1.9,mootdx,raw\n', /precedes accepted reconstruction boundary 2026-06-03/);
  await rejects('price-status', 'ticker,price_date,close,source,adjustment,price_status\n515880,2026-07-01,1.8,mootdx,raw,guessed\n', /price_status must be observed or carried_forward/);

  console.log('Finance canonical raw-price import, calendar-date, and carried-forward evidence contract passed.');
} finally {
  await rm(root, { recursive: true, force: true });
}
