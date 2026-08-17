"""Validate Finance security metadata and emit D1-ready SQL plus a report.

This keeps provider-specific collection outside the Finance Worker. The accepted
CSV is the canonical reference projection used by Holdings and Trades.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
from pathlib import Path

TICKER = re.compile(r'^[A-Z0-9._-]{1,24}$')
INSTRUMENT_TYPES = {'stock', 'etf', 'fund', 'other'}
REQUIRED_COLUMNS = {'ticker', 'instrument_type', 'security_attribute', 'attribute_source'}


def quote(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def normalize_ticker(value: str) -> str:
    candidate = value.strip().upper()
    if candidate.isdigit():
        candidate = candidate.zfill(6)
    if not TICKER.fullmatch(candidate):
        raise ValueError(f'invalid ticker: {value!r}')
    return candidate


def main():
    parser = argparse.ArgumentParser(description='Generate Finance security-reference SQL')
    parser.add_argument('csv_input', type=Path)
    parser.add_argument('sql_output', type=Path)
    parser.add_argument('report_output', type=Path)
    parser.add_argument('--actor', default='operator:security-metadata-import')
    args = parser.parse_args()

    if not args.csv_input.is_file():
        raise SystemExit('CSV input does not exist')
    if args.sql_output.exists() or args.report_output.exists():
        raise SystemExit('Output already exists; choose new paths')
    actor = args.actor.strip()
    if not actor or len(actor) > 128:
        raise SystemExit('actor must be 1-128 characters')

    rows = []
    seen = set()
    with args.csv_input.open('r', encoding='utf-8-sig', newline='') as handle:
        reader = csv.DictReader(handle)
        if not reader.fieldnames or not REQUIRED_COLUMNS.issubset(set(reader.fieldnames)):
            missing = sorted(REQUIRED_COLUMNS - set(reader.fieldnames or []))
            raise SystemExit(f'Missing required columns: {missing}')
        for line_number, raw in enumerate(reader, 2):
            try:
                ticker = normalize_ticker(raw.get('ticker') or '')
                if ticker in seen:
                    raise ValueError(f'duplicate ticker: {ticker}')
                seen.add(ticker)
                instrument_type = (raw.get('instrument_type') or '').strip().lower()
                if instrument_type not in INSTRUMENT_TYPES:
                    raise ValueError(f'unsupported instrument_type: {instrument_type!r}')
                attribute = (raw.get('security_attribute') or '').strip()
                if not attribute or len(attribute) > 100:
                    raise ValueError('security_attribute must be 1-100 characters')
                source = (raw.get('attribute_source') or '').strip()
                if not source or len(source) > 128:
                    raise ValueError('attribute_source must be 1-128 characters')
                rows.append({
                    'ticker': ticker,
                    'instrument_type': instrument_type,
                    'security_attribute': attribute,
                    'attribute_source': source,
                })
            except ValueError as error:
                raise SystemExit(f'Invalid row {line_number}: {error}') from error

    if not rows:
        raise SystemExit('CSV contains no security metadata rows')
    rows.sort(key=lambda row: row['ticker'])

    statements = ['BEGIN;']
    for row in rows:
        statements.append(
            'INSERT INTO finance_securities '
            '(ticker, instrument_type, security_attribute, attribute_source, updated_at, updated_by) VALUES '
            f"({quote(row['ticker'])}, {quote(row['instrument_type'])}, {quote(row['security_attribute'])}, {quote(row['attribute_source'])}, "
            "strftime('%Y-%m-%dT%H:%M:%fZ','now'), " + quote(actor) + ') '
            'ON CONFLICT(ticker) DO UPDATE SET '
            'instrument_type=excluded.instrument_type, security_attribute=excluded.security_attribute, '
            'attribute_source=excluded.attribute_source, updated_at=excluded.updated_at, updated_by=excluded.updated_by;'
        )
    statements.append('COMMIT;')

    counts = {kind: sum(1 for row in rows if row['instrument_type'] == kind) for kind in sorted(INSTRUMENT_TYPES)}
    report = {
        'input_sha256': hashlib.sha256(args.csv_input.read_bytes()).hexdigest(),
        'rows': len(rows),
        'tickers': [row['ticker'] for row in rows],
        'instrument_counts': counts,
        'attribute_sources': sorted({row['attribute_source'] for row in rows}),
        'model': 'portfolio_role_x_security_attribute',
    }
    args.sql_output.write_text('\n'.join(statements) + '\n', encoding='utf-8')
    args.report_output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(report, ensure_ascii=False))


if __name__ == '__main__':
    main()
