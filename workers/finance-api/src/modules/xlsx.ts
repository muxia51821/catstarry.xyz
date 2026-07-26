export type WorkbookCell = string | number | boolean | null | undefined;

export interface WorkbookSheet {
  name: string;
  rows: WorkbookCell[][];
}

export function buildXlsx(sheets: WorkbookSheet[]): Uint8Array<ArrayBuffer> {
  if (!sheets.length) throw new Error('Workbook requires at least one sheet');
  const files = [
    { name: '[Content_Types].xml', data: xmlBytes(contentTypes(sheets.length)) },
    { name: '_rels/.rels', data: xmlBytes(rootRelationships()) },
    { name: 'xl/workbook.xml', data: xmlBytes(workbook(sheets)) },
    { name: 'xl/_rels/workbook.xml.rels', data: xmlBytes(workbookRelationships(sheets.length)) },
    { name: 'xl/styles.xml', data: xmlBytes(styles()) },
    ...sheets.map((sheet, index) => ({
      name: `xl/worksheets/sheet${index + 1}.xml`,
      data: xmlBytes(worksheet(sheet.rows)),
    })),
  ];
  return zipStored(files);
}

function contentTypes(sheetCount: number) {
  const sheets = Array.from({ length: sheetCount }, (_, index) => (
    `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
  )).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets}</Types>`;
}

function rootRelationships() {
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>';
}

function workbook(sheets: WorkbookSheet[]) {
  const body = sheets.map((sheet, index) => (
    `<sheet name="${escapeXml(sheetName(sheet.name, index))}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`
  )).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${body}</sheets></workbook>`;
}

function workbookRelationships(sheetCount: number) {
  const sheets = Array.from({ length: sheetCount }, (_, index) => (
    `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`
  )).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets}<Relationship Id="rId${sheetCount + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
}

function styles() {
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts><fills count="1"><fill><patternFill patternType="none"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="1"><xf xfId="0"/></cellXfs></styleSheet>';
}

function worksheet(rows: WorkbookCell[][]) {
  const body = rows.map((row, rowIndex) => {
    const cells = row.map((value, columnIndex) => cellXml(value, rowIndex + 1, columnIndex + 1)).join('');
    return `<row r="${rowIndex + 1}">${cells}</row>`;
  }).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${body}</sheetData></worksheet>`;
}

function cellXml(value: WorkbookCell, row: number, column: number) {
  const reference = `${columnName(column)}${row}`;
  if (value === null || value === undefined) return `<c r="${reference}"/>`;
  if (typeof value === 'number' && Number.isFinite(value)) return `<c r="${reference}"><v>${value}</v></c>`;
  if (typeof value === 'boolean') return `<c r="${reference}" t="b"><v>${value ? 1 : 0}</v></c>`;
  return `<c r="${reference}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(String(value))}</t></is></c>`;
}

function columnName(column: number) {
  let value = column;
  let result = '';
  while (value > 0) {
    value -= 1;
    result = String.fromCharCode(65 + (value % 26)) + result;
    value = Math.floor(value / 26);
  }
  return result;
}

function sheetName(value: string, index: number) {
  const safe = value.replace(/[\\/?*\[\]:]/g, '_').slice(0, 31).trim();
  return safe || `Sheet${index + 1}`;
}

function escapeXml(value: string) {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function xmlBytes(value: string) {
  return new TextEncoder().encode(value);
}

function zipStored(files: { name: string; data: Uint8Array }[]) {
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;
  for (const file of files) {
    const name = new TextEncoder().encode(file.name);
    const checksum = crc32(file.data);
    const local = header(30 + name.length);
    write32(local, 0, 0x04034b50);
    write16(local, 4, 20);
    write16(local, 6, 0x0800);
    write32(local, 14, checksum);
    write32(local, 18, file.data.length);
    write32(local, 22, file.data.length);
    write16(local, 26, name.length);
    local.set(name, 30);
    localParts.push(local, file.data);

    const central = header(46 + name.length);
    write32(central, 0, 0x02014b50);
    write16(central, 4, 20);
    write16(central, 6, 20);
    write16(central, 8, 0x0800);
    write32(central, 16, checksum);
    write32(central, 20, file.data.length);
    write32(central, 24, file.data.length);
    write16(central, 28, name.length);
    write32(central, 42, offset);
    central.set(name, 46);
    centralParts.push(central);
    offset += local.length + file.data.length;
  }
  const central = concatenate(centralParts);
  const end = header(22);
  write32(end, 0, 0x06054b50);
  write16(end, 8, files.length);
  write16(end, 10, files.length);
  write32(end, 12, central.length);
  write32(end, 16, offset);
  return concatenate([...localParts, central, end]);
}

function crc32(bytes: Uint8Array) {
  let value = 0xffffffff;
  for (const byte of bytes) {
    value = CRC_TABLE[(value ^ byte) & 0xff] ^ (value >>> 8);
  }
  return (value ^ 0xffffffff) >>> 0;
}

const CRC_TABLE = Uint32Array.from({ length: 256 }, (_, entry) => {
  let value = entry;
  for (let bit = 0; bit < 8; bit += 1) value = (value & 1) ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});

function header(length: number) {
  return new Uint8Array(length);
}

function write16(bytes: Uint8Array, offset: number, value: number) {
  new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).setUint16(offset, value, true);
}

function write32(bytes: Uint8Array, offset: number, value: number) {
  new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).setUint32(offset, value >>> 0, true);
}

function concatenate(parts: Uint8Array[]): Uint8Array<ArrayBuffer> {
  const output = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}
