"""Validate canonical raw historical closes and emit D1-ready SQL.

The collector is intentionally outside Finance. This operator tool accepts the final
canonical CSV, validates one raw close per security/day, and emits deterministic SQL
plus a reconciliation report. It never connects to Cloudflare or another database.
A validated suspension/no-trade day may explicitly use price_status=carried_forward;
missing price_status means an observed raw close.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import math
import re
from pathlib import Path

DAY = re.compile(r'^\d{4}-\d{2}-\d{2}$')
TICKER = re.compile(r'^[A-Z0-9._-]{1,24}$')
START_DATE = '2026-06-03'
REQUIRED_COLUMNS = {'ticker', 'price_date', 'close', 'source', 'adjustment'}
PRICE_STATUSES = {'observed', 'carried_forward'}


def sql(value):
    if value is None:
        return 'NULL'
    if isinstance(value, (int, float)):
        if not math.isfinite(float(value)):
            raise ValueError(f'non-finite number: {value!r}')
        return repr(float(value))
    return "'" + str(value).replace("'", "''") + "'"


def normalize_ticker(value: str) -> str:
    candidate = value.strip().upper()
    if candidate.isdigit():
        candidate = candidate.zfill(6)
    if not TICKER.fullmatch(candidate):
        raise ValueError(f'invalid ticker: {value!r}')
    return candidate


def main():
    parser = argparse.ArgumentParser(description='Generate canonical Finance raw-price import SQL')
    parser.add_argument('csv_input', type=Path)
    parser.add_argument('sql_output', type=Path)
    parser.add_argument('report_output', type=Path)
    parser.add_argument('--actor', default='operator:raw-price-import')
    args = parser.parse_args()

    if not args.csv_input.is_file():
        raise SystemExit('CSV input does not exist')
    if args.sql_output.exists() or args.report_output.exists():
        raise SystemExit('Output already exists; choose new paths')

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
                price_date = (raw.get('price_date') or '').strip()
                if not DAY.fullmatch(price_date):
                    raise ValueError(f'invalid price_date: {price_date!r}')
                if price_date < START_DATE:
                    raise ValueError(f'price_date precedes accepted reconstruction boundary {START_DATE}')
                close = float((raw.get('close') or '').strip())
                if not math.isfinite(close) or close <= 0:
                    raise ValueError('close must be a positive finite number')
                source = (raw.get('source') or '').strip()
                if not source or len(source) > 64:
                    raise ValueError('source must be 1-64 characters')
                adjustment = (raw.get('adjustment') or '').strip().lower()
                if adjustment != 'raw':
                    raise ValueError('adjustment must be raw')
                price_status = (raw.get('price_status') or 'observed').strip().lower()
                if price_status not in PRICE_STATUSES:
                    raise ValueError('price_status must be observed or carried_forward')
                observed_at = (raw.get('observed_at') or '').strip() or None
                key = (ticker, price_date)
                if key in seen:
                    raise ValueError(f'duplicate canonical security/day: {ticker} {price_date}')
                seen.add(key)
                rows.append({
                    'ticker': ticker,
                    'price_date': price_date,
                    'close': close,
                    'source': source,
                    'adjustment': 'raw',
                    'price_status': price_status,
                    'observed_at': observed_at,
                })
            except (TypeError, ValueError) as error:
                raise SystemExit(f'Invalid row {line_number}: {error}') from error

    if not rows:
        raise SystemExit('CSV contains no price rows')
    rows.sort(key=lambda row: (row['price_date'], row['ticker']))
    actor = args.actor.strip()
    if not actor or len(actor) > 128:
        raise SystemExit('actor must be 1-128 characters')

    statements = ['BEGIN;']
    for row in rows:
        statements.append(
            'INSERT INTO finance_security_prices '
            '(ticker, price_date, close, source, adjustment, price_status, observed_at, created_at, created_by) VALUES '
            f"({sql(row['ticker'])}, {sql(row['price_date'])}, {sql(row['close'])}, {sql(row['source'])}, 'raw', {sql(row['price_status'])}, {sql(row['observed_at'])}, "
            "strftime('%Y-%m-%dT%H:%M:%fZ','now'), " + sql(actor) + ') '
            'ON CONFLICT(ticker, price_date) DO UPDATE SET '
            'close=excluded.close, source=excluded.source, adjustment=excluded.adjustment, price_status=excluded.price_status, '
            'observed_at=excluded.observed_at, created_at=excluded.created_at, created_by=excluded.created_by;'
        )
    statements.append('COMMIT;')

    digest = hashlib.sha256(args.csv_input.read_bytes()).hexdigest()
    sources = sorted({row['source'] for row in rows})
    tickers = sorted({row['ticker'] for row in rows})
    dates = [row['price_date'] for row in rows]
    counts = {ticker: sum(1 for row in rows if row['ticker'] == ticker) for ticker in tickers}
    status_counts = {status: sum(1 for row in rows if row['price_status'] == status) for status in sorted(PRICE_STATUSES)}
    report = {
        'input_sha256': digest,
        'rows': len(rows),
        'tickers': tickers,
        'ticker_counts': counts,
        'start_date': min(dates),
        'end_date': max(dates),
        'sources': sources,
        'adjustment': 'raw',
        'price_status_counts': status_counts,
        'canonical_key': ['ticker', 'price_date'],
        'reconstruction_boundary': START_DATE,
    }
    args.sql_output.write_text('\n'.join(statements) + '\n', encoding='utf-8')
    args.report_output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(report, ensure_ascii=False))


if __name__ == '__main__':
    main()
