"""Generate an auditable local D1 import from the approved Finance workbook.

This is deliberately an operator tool, not Worker code: it never contacts
Cloudflare, does not modify a database, and writes only a reviewed SQL file.
Formula errors or rows without a usable security identifier enter the review
queue rather than becoming synthetic trades.
"""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import re
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

NS = '{http://schemas.openxmlformats.org/spreadsheetml/2006/main}'
REL = '{http://schemas.openxmlformats.org/officeDocument/2006/relationships}'
DOC_REL = '{http://schemas.openxmlformats.org/package/2006/relationships}'
ERRORS = {'#VALUE!', '#REF!', '#DIV/0!', '#N/A', '#NAME?', '#NUM!', '#NULL!'}

def sql(value):
    if value is None:
        return 'NULL'
    if isinstance(value, bool):
        return '1' if value else '0'
    if isinstance(value, (int, float)):
        return str(value)
    return "'" + str(value).replace("'", "''") + "'"

def cell_column(ref):
    letters = re.match(r'([A-Z]+)', ref).group(1)
    value = 0
    for char in letters:
        value = value * 26 + ord(char) - 64
    return value

def workbook_sheets(path: Path):
    with zipfile.ZipFile(path) as archive:
        shared = []
        if 'xl/sharedStrings.xml' in archive.namelist():
            root = ET.fromstring(archive.read('xl/sharedStrings.xml'))
            shared = [''.join(node.itertext()) for node in root.findall(NS + 'si')]
        rels = ET.fromstring(archive.read('xl/_rels/workbook.xml.rels'))
        targets = {node.attrib['Id']: node.attrib['Target'] for node in rels.findall(DOC_REL + 'Relationship')}
        root = ET.fromstring(archive.read('xl/workbook.xml'))
        result = {}
        for sheet in root.find(NS + 'sheets'):
            target = targets[sheet.attrib[REL + 'id']].lstrip('/')
            if not target.startswith('xl/'):
                target = 'xl/' + target
            xml = ET.fromstring(archive.read(target))
            rows = {}
            for row in xml.findall('.//' + NS + 'sheetData/' + NS + 'row'):
                values = {}
                for cell in row.findall(NS + 'c'):
                    raw = cell.findtext(NS + 'v')
                    if raw is None:
                        continue
                    if cell.attrib.get('t') == 's':
                        value = shared[int(raw)]
                    elif cell.attrib.get('t') == 'inlineStr':
                        value = ''.join(cell.itertext())
                    else:
                        try:
                            value = float(raw) if '.' in raw else int(raw)
                        except ValueError:
                            value = raw
                    values[cell_column(cell.attrib['r'])] = value
                if values:
                    rows[int(row.attrib['r'])] = values
            result[sheet.attrib['name']] = rows
        return result

def at(rows, row, column):
    return rows.get(row, {}).get(column)

def number(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool) and abs(value) < 1e15

def date_value(value):
    if isinstance(value, str) and re.fullmatch(r'\d{4}-\d{2}-\d{2}', value):
        return value
    if isinstance(value, (int, float)) and 20_000 < value < 80_000:
        return (dt.date(1899, 12, 30) + dt.timedelta(days=int(value))).isoformat()
    return None

def invalid(value):
    return isinstance(value, str) and value.upper() in ERRORS

def review(statements, batch, sheet, row, kind, raw, reason):
    statements.append('INSERT OR IGNORE INTO finance_workbook_review (batch_id, sheet_name, row_number, record_kind, raw_json, reason) VALUES (%s, %s, %s, %s, %s, %s);' % (
        sql(batch), sql(sheet), row, sql(kind), sql(json.dumps(raw, ensure_ascii=False, default=str)), sql(reason)))

def main():
    parser = argparse.ArgumentParser(description='Generate a local Finance workbook import SQL file')
    parser.add_argument('workbook', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    if not args.workbook.is_file():
        raise SystemExit('Workbook does not exist')
    if args.output.exists():
        raise SystemExit('Output already exists; choose a new path')
    sheets = workbook_sheets(args.workbook)
    batch = 'workbook-' + hashlib.sha256(args.workbook.read_bytes()).hexdigest()[:20]
    statements, counts = [], {'imported': 0, 'review': 0, 'source': 0}
    now = dt.datetime.now(dt.timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z')

    config = sheets.get('💰 投入与配置', {})
    if config:
        monthly = at(config, 37, 3); year1months = at(config, 38, 3); latermonths = at(config, 39, 3)
        low = at(config, 40, 3); base = at(config, 41, 3); high = at(config, 42, 3); bonus1 = at(config, 43, 3); bonuslater = at(config, 44, 3); capital = at(config, 46, 3)
        cati_monthly, muxia_monthly = at(config, 6, 4), at(config, 7, 4)
        cati_bonus1, cati_bonus_later, muxia_bonus1, muxia_bonus_later = at(config, 12, 4), at(config, 12, 5), at(config, 13, 4), at(config, 13, 5)
        values = [monthly, year1months, latermonths, low, base, high, bonus1, bonuslater, capital, cati_monthly, muxia_monthly, cati_bonus1, cati_bonus_later, muxia_bonus1, muxia_bonus_later]
        if all(number(v) for v in values):
            statements.append('UPDATE plan_params SET initial_capital=%s, monthly_invest=%s, months_year1=%s, months_year2plus=%s, rate_low=%s, rate_base=%s, rate_high=%s, bonus1=%s, bonus2to4=%s, updated_at=%s, updated_by=%s WHERE id=1;' % tuple(map(sql, [capital, monthly, year1months, latermonths, low, base, high, bonus1, bonuslater, now, 'workbook-import'])))
            contribution = json.dumps({'muxia_monthly_invest': muxia_monthly, 'cati_monthly_invest': cati_monthly, 'muxia_bonus_year1': muxia_bonus1, 'muxia_bonus_later': muxia_bonus_later, 'cati_bonus_year1': cati_bonus1, 'cati_bonus_later': cati_bonus_later}, ensure_ascii=False)
            statements.append('INSERT INTO finance_investment_rules (rule_key,value_json,updated_at,updated_by) VALUES (%s,%s,%s,%s) ON CONFLICT(rule_key) DO UPDATE SET value_json=excluded.value_json,updated_at=excluded.updated_at,updated_by=excluded.updated_by;' % (sql('contributions'), sql(contribution), sql(now), sql('workbook-import')))
            counts['imported'] += 1
        else:
            review(statements, batch, '💰 投入与配置', 37, 'plan', {'values': values}, 'Plan inputs contain a formula error or non-numeric value'); counts['review'] += 1
        for row in range(19, 24):
            category, target, upper, lower = at(config, row, 2), at(config, row, 3), at(config, row, 4), at(config, row, 5)
            counts['source'] += 1
            if isinstance(category, str) and all(number(v) for v in [target, upper, lower]):
                statements.append('INSERT INTO position_limits (position_category,target_ratio,lower_ratio,upper_ratio) VALUES (%s,%s,%s,%s) ON CONFLICT(position_category) DO UPDATE SET target_ratio=excluded.target_ratio,lower_ratio=excluded.lower_ratio,upper_ratio=excluded.upper_ratio;' % (sql(category), sql(target), sql(lower), sql(upper))); counts['imported'] += 1
            else:
                review(statements, batch, '💰 投入与配置', row, 'position_limit', {'category': category, 'target': target, 'upper': upper, 'lower': lower}, 'Position boundary row is incomplete'); counts['review'] += 1

    snapshots = sheets.get('📊 持仓快照', {})
    for row in range(39, max(snapshots.keys(), default=38) + 1):
        date = date_value(at(snapshots, row, 2)); values = [at(snapshots, row, column) for column in range(3, 8)]
        if not date and not any(value is not None for value in values):
            continue
        counts['source'] += 1
        review(statements, batch, '📊 持仓快照', row, 'category_snapshot', {'date': at(snapshots, row, 2), 'values': values}, 'Category-only snapshot has no per-security identifier and is retained for review, not converted into a synthetic holding'); counts['review'] += 1

    monthly = sheets.get('📓 月度记录', {})
    for row in range(5, max(monthly.keys(), default=4) + 1):
        year_month = at(monthly, row, 2)
        values = [at(monthly, row, column) for column in range(3, 14)]
        if not isinstance(year_month, str) or not re.fullmatch(r'\d{4}-\d{2}', year_month):
            continue
        counts['source'] += 1
        muxia, cati, end_total, pe300, pe500, pe1000 = at(monthly, row, 3), at(monthly, row, 4), at(monthly, row, 6), at(monthly, row, 8), at(monthly, row, 9), at(monthly, row, 10)
        if not any(number(value) for value in [muxia, cati, end_total, pe300, pe500, pe1000]):
            continue
        if not all(value is None or number(value) for value in [muxia, cati, end_total, pe300, pe500, pe1000]):
            review(statements, batch, '📓 月度记录', row, 'monthly_record', {'month': year_month, 'values': values}, 'Monthly record contains a non-numeric persisted value'); counts['review'] += 1; continue
        statements.append('INSERT INTO monthly_records (year_month,muxia_invest,cati_invest,end_total,sse300_pe,sse500_pe,sse1000_pe,blue_chip_temp,summary,remark,created_at,created_by,updated_at,updated_by) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) ON CONFLICT(year_month) DO UPDATE SET muxia_invest=excluded.muxia_invest,cati_invest=excluded.cati_invest,end_total=excluded.end_total,sse300_pe=excluded.sse300_pe,sse500_pe=excluded.sse500_pe,sse1000_pe=excluded.sse1000_pe,blue_chip_temp=excluded.blue_chip_temp,summary=excluded.summary,remark=excluded.remark,deleted_at=NULL,deleted_by=NULL,updated_at=excluded.updated_at,updated_by=excluded.updated_by;' % tuple(map(sql, [year_month, muxia or 0, cati or 0, end_total, pe300, pe500, pe1000, at(monthly, row, 11) if isinstance(at(monthly, row, 11), str) and not invalid(at(monthly, row, 11)) else None, at(monthly, row, 12) if isinstance(at(monthly, row, 12), str) else None, at(monthly, row, 13) if isinstance(at(monthly, row, 13), str) else None, now, 'workbook-import', now, 'workbook-import'])))
        counts['imported'] += 1

    holdings = sheets.get('📈 具体持仓明细', {})
    for row in range(3, max(holdings.keys(), default=2) + 1):
        raw = [at(holdings, row, column) for column in range(1, 13)]
        if not any(value is not None for value in raw):
            continue
        ticker, quantity, cost = at(holdings, row, 3), at(holdings, row, 5), at(holdings, row, 6)
        if ticker is None and quantity is None and cost is None:
            continue
        counts['source'] += 1
        review(statements, batch, '📈 具体持仓明细', row, 'holding_detail', {'row': raw}, 'Detailed holding is not imported without a literal security identifier and source snapshot date'); counts['review'] += 1

    memos = sheets.get('📝投资备忘录', {})
    for row in range(3, max(memos.keys(), default=2) + 1):
        raw = [at(memos, row, column) for column in range(1, 11)]
        if not any(value is not None for value in raw):
            continue
        counts['source'] += 1
        date, ticker, direction, _, price, quantity, category, reason, stop, note = raw
        safe_date = date_value(date)
        if not safe_date or not isinstance(ticker, str) or invalid(ticker) or not re.fullmatch(r'[A-Za-z0-9._-]{2,24}', ticker):
            review(statements, batch, '📝投资备忘录', row, 'memo', {'row': raw}, 'Memo lacks a usable security identifier; no synthetic ticker created'); counts['review'] += 1; continue
        statements.append('INSERT INTO finance_memos (memo_date,ticker,position_category,operation_type,reason,stop_loss_triggered,note,created_at,created_by) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s);' % (sql(safe_date), sql(ticker.upper()), sql(category if isinstance(category, str) else None), sql(direction if isinstance(direction, str) else None), sql(reason if isinstance(reason, str) else 'Imported memo'), 1 if stop not in (None, '', '/') else 0, sql(note if isinstance(note, str) else None), sql(now), sql('workbook-import'))); counts['imported'] += 1

    statements.append('INSERT OR IGNORE INTO finance_workbook_imports (batch_id,source_name,source_rows,imported_rows,review_rows,created_at) VALUES (%s,%s,%s,%s,%s,%s);' % (sql(batch), sql(args.workbook.name), counts['source'], counts['imported'], counts['review'], sql(now)))
    args.output.write_text('BEGIN;\n' + '\n'.join(statements) + '\nCOMMIT;\n', encoding='utf-8')
    print(json.dumps({**counts, 'batch_id': batch, 'output': str(args.output)}, ensure_ascii=False))

if __name__ == '__main__':
    main()
