import { createHash } from 'node:crypto';

export function assertCsvSize(source) {
  if (Buffer.byteLength(source, 'utf8') > 10 * 1024 * 1024) throw new Error('CSV input must not exceed 10 MiB');
}

export function importBatchId(kind, source) {
  return `${kind}-${createHash('sha256').update(source).digest('hex').slice(0, 24)}`;
}

export function isExcelError(value) {
  return /^#(?:VALUE!|N\/A|REF!|DIV\/0!|NAME\?|NUM!|NULL!)$/i.test(value.trim());
}

export function validIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function sqlValue(value) {
  if (value === null) return 'NULL';
  if (typeof value === 'number') return String(value);
  return `'${String(value).replace(/'/g, "''")}'`;
}

export function parseCsv(source) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (character === '"') {
      if (quoted && source[index + 1] === '"') { cell += '"'; index += 1; }
      else quoted = !quoted;
    } else if (character === ',' && !quoted) { row.push(cell); cell = ''; }
    else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && source[index + 1] === '\n') index += 1;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += character;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  if (quoted) throw new Error('CSV contains an unterminated quoted field');
  return rows;
}
