import assert from 'node:assert/strict';
import { buildXlsx } from '../workers/finance-api/src/modules/xlsx.ts';

const bytes = buildXlsx([
  {
    name: 'Annual Review',
    rows: [
      ['year', 'summary', 'manager_share'],
      [2026, '=not-a-formula', 60.25],
    ],
  },
  { name: 'Confirmations', rows: [['period', 'username'], ['2026-06', 'cati']] },
]);

assert.deepEqual([...bytes.subarray(0, 4)], [0x50, 0x4b, 0x03, 0x04]);
const files = readStoredZip(bytes);
for (const name of [
  '[Content_Types].xml',
  '_rels/.rels',
  'xl/workbook.xml',
  'xl/styles.xml',
  'xl/worksheets/sheet1.xml',
  'xl/worksheets/sheet2.xml',
]) assert.ok(files.has(name), `XLSX omitted ${name}`);

const workbook = decode(files.get('xl/workbook.xml'));
assert.match(workbook, /name="Annual Review"/);
assert.match(workbook, /name="Confirmations"/);
const review = decode(files.get('xl/worksheets/sheet1.xml'));
assert.match(review, /<v>2026<\/v>/);
assert.match(review, /<t xml:space="preserve">=not-a-formula<\/t>/, 'untrusted text must remain an inline string');
assert.match(review, /<v>60.25<\/v>/);

console.log('Finance XLSX archive contract passed.');

function readStoredZip(source) {
  const view = new DataView(source.buffer, source.byteOffset, source.byteLength);
  const endOffset = findSignature(view, 0x06054b50);
  assert.ok(endOffset >= 0, 'ZIP end record is missing');
  const count = view.getUint16(endOffset + 10, true);
  let cursor = view.getUint32(endOffset + 16, true);
  const files = new Map();
  for (let index = 0; index < count; index += 1) {
    assert.equal(view.getUint32(cursor, true), 0x02014b50);
    assert.equal(view.getUint16(cursor + 10, true), 0, 'contract ZIP entries must use store mode');
    const size = view.getUint32(cursor + 24, true);
    const nameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    const localOffset = view.getUint32(cursor + 42, true);
    const name = decode(source.subarray(cursor + 46, cursor + 46 + nameLength));
    assert.equal(view.getUint32(localOffset, true), 0x04034b50);
    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
    files.set(name, source.subarray(dataOffset, dataOffset + size));
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  return files;
}

function findSignature(view, signature) {
  for (let offset = view.byteLength - 22; offset >= 0; offset -= 1) {
    if (view.getUint32(offset, true) === signature) return offset;
  }
  return -1;
}

function decode(value) {
  assert.ok(value instanceof Uint8Array);
  return new TextDecoder().decode(value);
}
