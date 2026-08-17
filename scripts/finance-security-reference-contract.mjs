import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { DatabaseSync } from 'node:sqlite';

import { buildSecurityQuery } from '../workers/finance-api/src/routes/securities.ts';

const run = promisify(execFile);
const python = process.platform === 'win32' ? 'python' : 'python3';
const root = await mkdtemp(path.join(os.tmpdir(), 'catstarry-finance-securities-'));

try {
  const input = path.join(root, 'securities.csv');
  const sqlPath = path.join(root, 'securities.sql');
  const reportPath = path.join(root, 'securities.json');
  await writeFile(input, [
    'ticker,instrument_type,security_attribute,attribute_source',
    '000021,stock,消费电子,eastmoney',
    '515880,etf,通信设备,fund-metadata',
    '518880,etf,黄金,fund-metadata',
    '510330,etf,沪深300,fund-metadata',
  ].join('\n') + '\n', 'utf8');

  const { stdout } = await run(python, ['scripts/finance-import-security-metadata.py', input, sqlPath, reportPath, '--actor', 'contract']);
  const report = JSON.parse(stdout);
  assert.equal(report.rows, 4);
  assert.equal(report.model, 'portfolio_role_x_security_attribute');
  assert.deepEqual(report.instrument_counts, { etf: 3, fund: 0, other: 0, stock: 1 });

  const database = new DatabaseSync(':memory:');
  for (const file of (await readdir('workers/finance-api/migrations')).filter((name) => name.endsWith('.sql')).sort()) {
    database.exec(await readFile(path.join('workers/finance-api/migrations', file), 'utf8'));
  }
  database.exec(await readFile(sqlPath, 'utf8'));
  assert.equal(database.prepare('SELECT COUNT(*) AS count FROM finance_securities').get().count, 4);

  const all = buildSecurityQuery({ ticker: null, security_attribute: null, instrument_type: null });
  assert.deepEqual(database.prepare(all.query).all(...all.values).map((row) => ({ ...row })).map((row) => row.ticker), ['000021', '510330', '515880', '518880']);
  const industry = buildSecurityQuery({ ticker: null, security_attribute: '消费电子', instrument_type: 'stock' });
  assert.deepEqual(database.prepare(industry.query).all(...industry.values).map((row) => ({ ...row })), [{
    ticker: '000021', instrument_type: 'stock', security_attribute: '消费电子', attribute_source: 'eastmoney',
    updated_at: database.prepare(`SELECT updated_at FROM finance_securities WHERE ticker='000021'`).get().updated_at,
    updated_by: 'contract',
  }]);

  // Reference updates replace the canonical attribute for a ticker instead of creating a taxonomy history engine.
  const corrected = path.join(root, 'corrected.csv');
  const correctedSql = path.join(root, 'corrected.sql');
  const correctedReport = path.join(root, 'corrected.json');
  await writeFile(corrected, 'ticker,instrument_type,security_attribute,attribute_source\n000021,stock,消费电子,verified-provider\n', 'utf8');
  await run(python, ['scripts/finance-import-security-metadata.py', corrected, correctedSql, correctedReport, '--actor', 'contract']);
  database.exec(await readFile(correctedSql, 'utf8'));
  assert.equal(database.prepare('SELECT COUNT(*) AS count FROM finance_securities').get().count, 4);
  assert.deepEqual({ ...database.prepare(`SELECT security_attribute, attribute_source FROM finance_securities WHERE ticker='000021'`).get() }, {
    security_attribute: '消费电子', attribute_source: 'verified-provider',
  });
  database.close();

  async function rejects(name, rows, pattern) {
    const csvPath = path.join(root, `${name}.csv`);
    const output = path.join(root, `${name}.sql`);
    const report = path.join(root, `${name}.json`);
    await writeFile(csvPath, rows, 'utf8');
    await assert.rejects(run(python, ['scripts/finance-import-security-metadata.py', csvPath, output, report]), pattern);
  }
  await rejects('duplicate', 'ticker,instrument_type,security_attribute,attribute_source\n000021,stock,消费电子,eastmoney\n000021,stock,半导体,other\n', /duplicate ticker/);
  await rejects('instrument', 'ticker,instrument_type,security_attribute,attribute_source\n000021,crypto,消费电子,eastmoney\n', /unsupported instrument_type/);
  await rejects('missing-attribute', 'ticker,instrument_type,security_attribute,attribute_source\n000021,stock,,eastmoney\n', /security_attribute must be 1-100 characters/);

  console.log('Finance security reference and metadata import contract passed.');
} finally {
  await rm(root, { recursive: true, force: true });
}
