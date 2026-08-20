import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';

const run = promisify(execFile);
const python = process.env.PYTHON ?? (process.platform === 'win32' ? 'python' : 'python3');
const directory = await mkdtemp(join(tmpdir(), 'finance-csi-history-'));
const input = join(directory, 'csi.csv'); const sql = join(directory, 'history.sql'); const report = join(directory, 'history.json');
try {
  await writeFile(input, [
    'symbol,index_code,date,pe_ttm',
    'CSI300_PE,000300,2026-08-14,12.5',
    'CSI500_PE,000905,2026-08-14,23.5',
    'CSI1000_PE,000852,2026-08-14,0',
    'STAR50_PE,000688,2026-08-14,48.2',
  ].join('\n'), 'utf8');
  await run(python, ['scripts/finance-import-csi-valuation-history.py', sql, report, '--input-csv', input, '--actor', 'contract'], { windowsHide: true });
  const statements = await readFile(sql, 'utf8'); const payload = JSON.parse(await readFile(report, 'utf8'));
  assert.match(statements, /INSERT INTO finance_index_valuation_history/);
  assert.match(statements, /CSI300_PE/);
  assert.doesNotMatch(statements, /CSI1000_PE/, 'non-positive PE must be excluded before SQL generation');
  assert.equal(payload.source_authority, 'CSI');
  assert.equal(payload.transport_adapter, 'AKShare');
  assert.equal(payload.akshare_version, '1.18.40');
  assert.equal(payload.rows, 3);
} finally {
  await rm(directory, { recursive: true, force: true });
}

console.log('Finance CSI valuation importer contract passed.');
