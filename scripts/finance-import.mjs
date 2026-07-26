import { readFile, writeFile } from 'node:fs/promises';
import { assertCsvSize, importBatchId, isExcelError, parseCsv, sqlValue, validIsoDate } from './lib/finance-csv-import.mjs';

const [inputPath, outputPath] = process.argv.slice(2);
if (!inputPath || !outputPath) throw new Error('Usage: npm run finance:import -- <excel-export.csv> <migration.sql>');
const source = await readFile(inputPath, 'utf8');
assertCsvSize(source);
const rows = parseCsv(source);
const required = ['trade_date', 'ticker', 'ticker_name', 'direction', 'quantity', 'price', 'position_category', 'reason'];
const headers = rows.shift() ?? [];
for (const name of required) if (!headers.includes(name)) throw new Error(`Missing CSV column: ${name}`);
const index = Object.fromEntries(headers.map((name, position) => [name, position]));
const statements = [];
let needsReview = 0;
let totalQuantity = 0;
let totalTradeValue = 0;
const batchId = importBatchId('trades', source);
for (const [offset, row] of rows.entries()) {
  if (row.length === 1 && !row[0].trim()) continue;
  const values = Object.fromEntries(required.map((name) => [name, row[index[name]] ?? '']));
  const dirty = Object.values(values).some(isExcelError);
  if (!dirty) validateRow(values, offset + 2);
  if (dirty) needsReview += 1;
  else {
    totalQuantity += Number(values.quantity);
    totalTradeValue += Number(values.quantity) * Number(values.price);
  }
  statements.push(`INSERT INTO trades (trade_date, ticker, ticker_name, direction, quantity, price, position_category, reason, needs_review) SELECT ${[
    dirty ? '1970-01-01' : values.trade_date,
    dirty ? `NEEDS-REVIEW-${offset + 2}` : values.ticker,
    values.ticker_name || null,
    dirty ? 'buy' : values.direction,
    dirty ? 0 : numberOrNull(values.quantity),
    dirty ? 0 : numberOrNull(values.price),
    dirty ? 'needs_review' : values.position_category,
    dirty ? `[IMPORT_NEEDS_REVIEW] ${JSON.stringify(values)}` : values.reason || null,
    dirty ? 1 : 0,
  ].map(sqlValue).join(', ')} WHERE NOT EXISTS (SELECT 1 FROM finance_import_batches WHERE batch_id = ${sqlValue(batchId)});`);
  if (dirty) {
    statements.push(`INSERT INTO finance_import_review (batch_id, row_number, record_kind, raw_json) SELECT ${sqlValue(batchId)}, ${offset + 2}, 'trade', ${sqlValue(JSON.stringify(values))} WHERE NOT EXISTS (SELECT 1 FROM finance_import_batches WHERE batch_id = ${sqlValue(batchId)});`);
  }
}
statements.push(`INSERT INTO finance_import_batches (batch_id, import_kind, source_rows, created_at) SELECT ${sqlValue(batchId)}, 'trades', ${rows.length}, ${sqlValue(new Date().toISOString())} WHERE NOT EXISTS (SELECT 1 FROM finance_import_batches WHERE batch_id = ${sqlValue(batchId)});`);
const sql = ['BEGIN;', ...statements, 'COMMIT;', ''].join('\n');
await writeFile(outputPath, sql, { encoding: 'utf8', flag: 'wx' });
console.log(JSON.stringify({ sourceRows: rows.length, generatedRows: rows.filter((row) => !(row.length === 1 && !row[0].trim())).length, needsReview, totalQuantity, totalTradeValue, batchId, outputPath }, null, 2));

function validateRow(row, line) {
  if (!validIsoDate(row.trade_date)) throw new Error(`Line ${line}: invalid trade_date`);
  if (!/^[A-Z0-9.-]{2,24}$/i.test(row.ticker)) throw new Error(`Line ${line}: invalid ticker`);
  if (!['buy', 'sell'].includes(row.direction)) throw new Error(`Line ${line}: invalid direction`);
  if (!(Number(row.quantity) > 0) || !(Number(row.price) > 0)) throw new Error(`Line ${line}: quantity and price must be positive`);
  if (!row.position_category.trim()) throw new Error(`Line ${line}: position_category is required`);
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
