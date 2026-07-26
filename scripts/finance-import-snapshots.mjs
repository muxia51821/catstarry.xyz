import { readFile, writeFile } from 'node:fs/promises';
import { assertCsvSize, importBatchId, isExcelError, parseCsv, sqlValue, validIsoDate } from './lib/finance-csv-import.mjs';

const [inputPath, outputPath] = process.argv.slice(2);
if (!inputPath || !outputPath) throw new Error('Usage: npm run finance:import:snapshots -- <holdings-export.csv> <migration.sql>');
const source = await readFile(inputPath, 'utf8');
assertCsvSize(source);
const rows = parseCsv(source);
const required = ['snapshot_date', 'ticker', 'quantity', 'avg_cost', 'position_category'];
const headers = rows.shift() ?? [];
for (const name of required) if (!headers.includes(name)) throw new Error(`Missing CSV column: ${name}`);
const index = Object.fromEntries(headers.map((name, position) => [name, position]));
const batchId = importBatchId('holdings', source);
const statements = [];
let generatedRows = 0;
let needsReview = 0;
let totalQuantity = 0;
let totalCostValue = 0;

for (const [offset, row] of rows.entries()) {
  if (row.length === 1 && !row[0].trim()) continue;
  generatedRows += 1;
  const values = Object.fromEntries(required.map((name) => [name, row[index[name]] ?? '']));
  const dirty = Object.values(values).some(isExcelError);
  if (dirty) {
    needsReview += 1;
    statements.push(`INSERT INTO finance_import_review (batch_id, row_number, record_kind, raw_json) SELECT ${sqlValue(batchId)}, ${offset + 2}, 'holding_snapshot', ${sqlValue(JSON.stringify(values))} WHERE NOT EXISTS (SELECT 1 FROM finance_import_batches WHERE batch_id = ${sqlValue(batchId)});`);
    continue;
  }
  validateRow(values, offset + 2);
  totalQuantity += Number(values.quantity);
  totalCostValue += Number(values.quantity) * Number(values.avg_cost);
  statements.push(`INSERT OR IGNORE INTO holdings_snapshots (snapshot_date, ticker, quantity, avg_cost, position_category) SELECT ${[
    values.snapshot_date,
    values.ticker.toUpperCase(),
    Number(values.quantity),
    Number(values.avg_cost),
    values.position_category,
  ].map(sqlValue).join(', ')} WHERE NOT EXISTS (SELECT 1 FROM finance_import_batches WHERE batch_id = ${sqlValue(batchId)});`);
}
statements.push(`INSERT INTO finance_import_batches (batch_id, import_kind, source_rows, created_at) SELECT ${sqlValue(batchId)}, 'holdings_snapshots', ${generatedRows}, ${sqlValue(new Date().toISOString())} WHERE NOT EXISTS (SELECT 1 FROM finance_import_batches WHERE batch_id = ${sqlValue(batchId)});`);
await writeFile(outputPath, ['BEGIN;', ...statements, 'COMMIT;', ''].join('\n'), { encoding: 'utf8', flag: 'wx' });
console.log(JSON.stringify({ sourceRows: generatedRows, generatedRows, needsReview, totalQuantity, totalCostValue, batchId, outputPath }, null, 2));

function validateRow(row, line) {
  if (!validIsoDate(row.snapshot_date)) throw new Error(`Line ${line}: invalid snapshot_date`);
  if (!/^[A-Z0-9.-]{2,24}$/i.test(row.ticker)) throw new Error(`Line ${line}: invalid ticker`);
  if (!Number.isFinite(Number(row.quantity)) || Number(row.quantity) < 0) throw new Error(`Line ${line}: quantity must be non-negative`);
  if (!Number.isFinite(Number(row.avg_cost)) || Number(row.avg_cost) < 0) throw new Error(`Line ${line}: avg_cost must be non-negative`);
  if (!row.position_category.trim()) throw new Error(`Line ${line}: position_category is required`);
}
