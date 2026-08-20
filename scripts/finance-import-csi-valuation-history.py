"""Fetch CSI index PE history through AKShare and emit reviewable D1 SQL.

The script is deliberately outside the Finance Worker. It never opens D1 or
Cloudflare credentials. Run it for an initial backfill, or pass --start-date
after the last accepted observation date for an incremental file.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import math
import re
from datetime import date
from pathlib import Path

AKSHARE_VERSION = '1.18.40'
INDEXES = {
    'CSI300_PE': '000300',
    'CSI500_PE': '000905',
    'CSI1000_PE': '000852',
    'STAR50_PE': '000688',
}
DAY = re.compile(r'^\d{4}-\d{2}-\d{2}$')


def sql(value):
    if isinstance(value, (int, float)):
        if not math.isfinite(float(value)):
            raise ValueError('non-finite SQL value')
        return repr(float(value))
    return "'" + str(value).replace("'", "''") + "'"


def normalize_day(value):
    candidate = str(value).strip().replace('/', '-')
    if not DAY.fullmatch(candidate):
        raise ValueError(f'invalid observation date: {value!r}')
    date.fromisoformat(candidate)
    return candidate


def csv_value(row, *names):
    for name in names:
        value = row.get(name)
        if value is not None:
            return value
    return None


def rows_from_csv(path):
    with path.open('r', encoding='utf-8-sig', newline='') as handle:
        reader = csv.DictReader(handle)
        if not reader.fieldnames:
            raise SystemExit('CSI CSV has no header')
        return list(reader)


def rows_from_akshare(start_date, end_date):
    try:
        import akshare as ak
    except ImportError as error:
        raise SystemExit('Install scripts/requirements-finance-csi-history.txt before running the AKShare collector') from error
    installed = getattr(ak, '__version__', None)
    if installed != AKSHARE_VERSION:
        raise SystemExit(f'AKShare version must be {AKSHARE_VERSION}; found {installed or "unknown"}')
    rows = []
    for symbol, index_code in INDEXES.items():
        frame = ak.stock_zh_index_hist_csindex(symbol=index_code, start_date=start_date, end_date=end_date)
        for record in frame.to_dict(orient='records'):
            rows.append({'symbol': symbol, 'index_code': index_code, 'date': record.get('日期'), 'pe': record.get('滚动市盈率')})
    return rows


def normalize_rows(raw_rows):
    rows = []
    seen = set()
    code_to_symbol = {code: symbol for symbol, code in INDEXES.items()}
    for line_number, raw in enumerate(raw_rows, 2):
        try:
            symbol = (raw.get('symbol') or '').strip().upper()
            index_code = str(raw.get('index_code') or csv_value(raw, '指数代码', 'index_code') or '').strip().zfill(6)
            if not symbol:
                symbol = code_to_symbol.get(index_code, '')
            if symbol not in INDEXES or INDEXES[symbol] != index_code:
                raise ValueError(f'unsupported CSI index: {symbol or index_code!r}')
            observation_date = normalize_day(raw.get('date') or csv_value(raw, '日期', 'observation_date'))
            pe_ttm = float(raw.get('pe') if raw.get('pe') is not None else csv_value(raw, '滚动市盈率', 'pe_ttm'))
            if not math.isfinite(pe_ttm) or pe_ttm <= 0:
                continue
            key = (symbol, observation_date)
            if key in seen:
                raise ValueError(f'duplicate CSI observation: {symbol} {observation_date}')
            seen.add(key)
            rows.append({'symbol': symbol, 'observation_date': observation_date, 'pe_ttm': pe_ttm})
        except (TypeError, ValueError) as error:
            raise SystemExit(f'Invalid CSI row {line_number}: {error}') from error
    if not rows:
        raise SystemExit('No valid positive CSI PE observations were collected')
    return sorted(rows, key=lambda row: (row['symbol'], row['observation_date']))


def main():
    parser = argparse.ArgumentParser(description='Generate CSI historical-valuation D1 SQL')
    parser.add_argument('sql_output', type=Path)
    parser.add_argument('report_output', type=Path)
    parser.add_argument('--start-date', default='20100101')
    parser.add_argument('--end-date', default=date.today().strftime('%Y%m%d'))
    parser.add_argument('--input-csv', type=Path, help='Validated AKShare-shaped CSV for offline review/testing')
    parser.add_argument('--actor', default='operator:csi-valuation-import')
    args = parser.parse_args()
    if args.sql_output.exists() or args.report_output.exists():
        raise SystemExit('Output already exists; choose new paths')
    if args.input_csv and not args.input_csv.is_file():
        raise SystemExit('input-csv does not exist')
    if not re.fullmatch(r'\d{8}', args.start_date) or not re.fullmatch(r'\d{8}', args.end_date) or args.start_date > args.end_date:
        raise SystemExit('start-date and end-date must be YYYYMMDD with start-date <= end-date')
    actor = args.actor.strip()
    if not actor or len(actor) > 128:
        raise SystemExit('actor must be 1-128 characters')
    raw_rows = rows_from_csv(args.input_csv) if args.input_csv else rows_from_akshare(args.start_date, args.end_date)
    rows = normalize_rows(raw_rows)
    statements = ['BEGIN;']
    for row in rows:
        statements.append(
            'INSERT INTO finance_index_valuation_history '
            '(symbol, observation_date, pe_ttm, source, imported_at, imported_by) VALUES '
            f"({sql(row['symbol'])}, {sql(row['observation_date'])}, {sql(row['pe_ttm'])}, 'CSI', "
            "strftime('%Y-%m-%dT%H:%M:%fZ','now'), " + sql(actor) + ') '
            'ON CONFLICT(symbol, observation_date) DO UPDATE SET '
            'pe_ttm=excluded.pe_ttm, source=excluded.source, imported_at=excluded.imported_at, imported_by=excluded.imported_by;'
        )
    statements.append('COMMIT;')
    by_symbol = {symbol: [row for row in rows if row['symbol'] == symbol] for symbol in INDEXES}
    report = {
        'source_authority': 'CSI',
        'transport_adapter': 'AKShare',
        'akshare_version': AKSHARE_VERSION,
        'input_mode': 'csv' if args.input_csv else 'akshare',
        'requested_range': {'start_date': args.start_date, 'end_date': args.end_date},
        'rows': len(rows),
        'symbols': {symbol: {'index_code': INDEXES[symbol], 'rows': len(values), 'start_date': values[0]['observation_date'] if values else None, 'end_date': values[-1]['observation_date'] if values else None} for symbol, values in by_symbol.items()},
        'canonical_key': ['symbol', 'observation_date'],
        'input_sha256': hashlib.sha256(args.input_csv.read_bytes()).hexdigest() if args.input_csv else None,
    }
    args.sql_output.write_text('\n'.join(statements) + '\n', encoding='utf-8')
    args.report_output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(report, ensure_ascii=False))


if __name__ == '__main__':
    main()
