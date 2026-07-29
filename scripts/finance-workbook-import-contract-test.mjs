import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile('scripts/finance-import-workbook.py', 'utf8');

assert.doesNotMatch(source, /CATEGORY-/, 'Workbook import must never synthesize a ticker from a category');
assert.match(source, /'📓 月度记录'/, 'Monthly workbook records must be read');
assert.match(source, /monthly_records/, 'Monthly records must be emitted into the real Finance table');
assert.match(source, /'📈 具体持仓明细'/, 'Detailed holdings must be scanned');
assert.match(source, /finance_workbook_review/, 'Unparseable rows must enter the visible review queue');
assert.match(source, /no per-security identifier/, 'Category-only snapshots must be reviewed rather than converted to holdings');

console.log('Finance workbook import safety contract passed.');
