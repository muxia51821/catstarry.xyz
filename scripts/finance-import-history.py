"""Generate deterministic local SQL from the accepted Finance history workbook.

This one-off operator tool only reads the workbook and writes SQL plus a JSON
reconciliation.  It has no Cloudflare client and never opens a database.
"""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import importlib.util
import json
import math
import re
import sys
from pathlib import Path

_legacy_spec = importlib.util.spec_from_file_location('finance_workbook_reader', Path(__file__).with_name('finance-import-workbook.py'))
if _legacy_spec is None or _legacy_spec.loader is None: raise RuntimeError('Workbook reader is unavailable')
_legacy = importlib.util.module_from_spec(_legacy_spec); _legacy_spec.loader.exec_module(_legacy)
workbook_sheets, date_value, number, sql = _legacy.workbook_sheets, _legacy.date_value, _legacy.number, _legacy.sql

EXPECTED = {'trades': 61, 'memos': 51, 'account_events': 16, 'cash_flows': 4, 'holdings_snapshots': 10, 'asset_snapshots': 1}
SHANGHAI_OFFSET = dt.timezone(dt.timedelta(hours=8))

def text(value):
    return value.strip() if isinstance(value, str) else ''

def rows_by_header(rows, header_row):
    headers = {text(value): column for column, value in rows.get(header_row, {}).items() if text(value)}
    return headers, [values for row, values in rows.items() if row > header_row and any(value is not None for value in values.values())]

def value(row, headers, *names):
    for name in names:
        if name in headers:
            return row.get(headers[name])
    return None

def ticker(value):
    if isinstance(value, (int, float)) and float(value).is_integer():
        return f'{int(value):06d}'
    result = text(value).upper()
    if result.isdigit():
        return result.zfill(6)
    return result

def clock(value):
    candidate = text(value)
    return candidate if re.fullmatch(r'([01]\d|2[0-3]):[0-5]\d', candidate) else None

def finite(value, allow_none=True):
    if value is None or value == '':
        return None if allow_none else None
    if not number(value) or not math.isfinite(float(value)):
        raise ValueError(f'not a finite number: {value!r}')
    return float(value)

def combine_note(note, retrospective):
    items = []
    if text(note): items.append(f'原始备注：\n{text(note)}')
    if text(retrospective): items.append(f'事后复盘：\n{text(retrospective)}')
    return '\n\n'.join(items) or None

def timestamp(value):
    if isinstance(value, (int, float)) and 20_000 < value < 80_000:
        local = dt.datetime(1899, 12, 30) + dt.timedelta(days=float(value))
        return local.replace(tzinfo=SHANGHAI_OFFSET).astimezone(dt.timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z')
    day = date_value(value)
    return f'{day}T00:00:00.000Z' if day else None

def insert(table, fields, values):
    return f"INSERT INTO {table} ({', '.join(fields)}) VALUES ({', '.join(sql(item) for item in values)});"

def main():
    parser = argparse.ArgumentParser(description='Generate accepted Finance historical import SQL')
    parser.add_argument('workbook', type=Path)
    parser.add_argument('sql_output', type=Path)
    parser.add_argument('report_output', type=Path)
    parser.add_argument('--expected-counts', help='JSON count override used only by the synthetic contract fixture')
    parser.add_argument('--d1-ready', action='store_true', help='omit outer BEGIN/COMMIT for wrangler d1 execute --file')
    args = parser.parse_args()
    if not args.workbook.is_file(): raise SystemExit('Workbook does not exist')
    if args.sql_output.exists() or args.report_output.exists(): raise SystemExit('Output already exists; choose new paths')
    expected = json.loads(args.expected_counts) if args.expected_counts else EXPECTED
    if set(expected) != set(EXPECTED) or any(not isinstance(value, int) or value < 0 for value in expected.values()): raise SystemExit('Invalid expected counts')
    sheets = workbook_sheets(args.workbook)
    required = ['操作记录', 'Account Events', '资金流（Finance）', 'Current Snapshot Mapping', '导入合同']
    missing = [name for name in required if name not in sheets]
    if missing: raise SystemExit(f'Missing authority sheets: {missing}')
    batch = 'historical-' + hashlib.sha256(args.workbook.read_bytes()).hexdigest()[:20]
    actor = f'historical-import:{batch}'
    now = '2026-08-16T00:00:00.000Z'
    statements = [] if args.d1_ready else ['BEGIN;']
    statements.append(insert('finance_workbook_imports', ['batch_id', 'source_name', 'source_rows', 'imported_rows', 'review_rows', 'created_at'], [batch, args.workbook.name, sum(expected.values()), sum(expected.values()), 0, now]))
    trade_rows, memo_rows, event_rows, flow_rows, holding_rows, asset_rows = [], [], [], [], [], []

    headers, rows = rows_by_header(sheets['操作记录'], 1)
    for row in rows:
        direction_raw = text(value(row, headers, '操作类型'))
        if direction_raw not in ('买入', '卖出'): continue
        date = date_value(value(row, headers, '日期')); trade_ticker = ticker(value(row, headers, '证券代码'))
        name = text(value(row, headers, '标的')); direction = 'buy' if direction_raw == '买入' else 'sell'
        quantity = finite(value(row, headers, '数量'), False); price = finite(value(row, headers, '成交价格'), False)
        fee = finite(value(row, headers, '税费（元）')); net = finite(value(row, headers, '实际资金变化（元）'))
        category = text(value(row, headers, 'Finance仓位分类')); reason = text(value(row, headers, '操作理由')); source = text(value(row, headers, '理由来源'))
        if not date or not trade_ticker or not name or not category or quantity is None or quantity <= 0 or price is None or price <= 0 or fee is None or fee < 0 or net is None:
            raise SystemExit(f'Unmappable trade authority row: {row}')
        identity = (date, clock(value(row, headers, '时间')), trade_ticker, direction, quantity, price)
        if any(item['identity'] == identity for item in trade_rows): raise SystemExit(f'Duplicate trade identity: {identity}')
        trade_rows.append({'identity': identity, 'date': date, 'time': identity[1], 'ticker': trade_ticker, 'name': name, 'direction': direction, 'quantity': quantity, 'price': price, 'fee': fee, 'net': net, 'category': category})
        if reason:
            if source not in ('原始记录', '事后确认'): raise SystemExit(f'Unmappable memo reason source: {source!r}')
            memo_rows.append({'identity': identity, 'reason': reason, 'source': 'original' if source == '原始记录' else 'reconstructed_confirmed', 'note': combine_note(value(row, headers, '备注'), value(row, headers, '复盘备注'))})

    headers, rows = rows_by_header(sheets['Account Events'], 1)
    event_types = {'dividend', 'dividend_tax', 'corporate_action_split', 'repo_start', 'repo_maturity', 'refund', 'other'}
    for row in rows:
        event_type = text(value(row, headers, 'record_kind'))
        if not event_type: continue
        if event_type not in event_types: raise SystemExit(f'Unsupported account event type: {event_type}')
        date = date_value(value(row, headers, 'date')); event_ticker = ticker(value(row, headers, 'canonical_ticker')) or ticker(value(row, headers, 'security_label_resolved'))
        amount = finite(value(row, headers, 'net_cash_amount'))
        source_reference = finite(value(row, headers, 'source_amount'))
        reference = None if event_type in ('repo_start', 'repo_maturity') else source_reference
        quantity = finite(value(row, headers, 'quantity'))
        if not date: raise SystemExit(f'Unmappable account event row: {row}')
        event_rows.append({'date': date, 'time': clock(value(row, headers, 'trade_time')), 'type': 'split' if event_type == 'corporate_action_split' else event_type, 'ticker': event_ticker or None, 'name': text(value(row, headers, 'canonical_name')) or None, 'quantity': quantity, 'reference': reference, 'amount': amount, 'category': text(value(row, headers, 'position_category')) or None, 'note': text(value(row, headers, 'source_note')) or None})

    headers, rows = rows_by_header(sheets['资金流（Finance）'], 1)
    for row in rows:
        date = date_value(value(row, headers, '实际到账日')); contributor_raw = text(value(row, headers, '贡献人'))
        contributor = {'木下': 'muxia', 'cati': 'cati', 'CATI': 'cati'}.get(contributor_raw)
        baseline = finite(value(row, headers, '计划基准金额')); confirmed = finite(value(row, headers, '确认金额')); offset = finite(value(row, headers, '管理人份额抵扣', '管理者份额抵扣'))
        if not date or not contributor or baseline is None or confirmed is None or offset is None: raise SystemExit(f'Unmappable cash flow row: {row}')
        flow_rows.append({'date': date, 'contributor': contributor, 'baseline': baseline, 'confirmed': confirmed, 'offset': offset, 'note': text(value(row, headers, '备注')) or None})

    snapshot = sheets['Current Snapshot Mapping']
    asset_headers, asset_data = rows_by_header(snapshot, 1)
    if not asset_data: raise SystemExit('Current Snapshot Mapping has no asset snapshot')
    asset = asset_data[0]; snapshot_at = timestamp(value(asset, asset_headers, 'snapshot_at'))
    holdings_value = finite(value(asset, asset_headers, 'holdings_value'), False); cash_value = finite(value(asset, asset_headers, 'cash_value'), False); total_value = finite(value(asset, asset_headers, 'total_value'), False)
    if not snapshot_at or holdings_value is None or cash_value is None or total_value is None or abs(total_value - holdings_value - cash_value) > 0.000001: raise SystemExit('Invalid complete asset snapshot')
    asset_rows.append({'at': snapshot_at, 'date': date_value(value(asset, asset_headers, 'snapshot_date')), 'holdings': holdings_value, 'cash': cash_value, 'total': total_value, 'source': text(value(asset, asset_headers, 'source')), 'complete': int(value(asset, asset_headers, 'is_complete'))})
    holding_headers, holdings = rows_by_header(snapshot, 5)
    for row in holdings:
        if text(value(row, holding_headers, 'import_target')) != 'holdings_snapshots': continue
        date = date_value(value(row, holding_headers, 'snapshot_date')); holding_ticker = ticker(value(row, holding_headers, 'canonical_ticker')); quantity = finite(value(row, holding_headers, 'quantity'), False); cost = finite(value(row, holding_headers, 'avg_cost'), False); category = text(value(row, holding_headers, 'finance_position_category'))
        if not date or not holding_ticker or quantity is None or cost is None or not category: raise SystemExit(f'Unmappable holding snapshot row: {row}')
        holding_rows.append({'date': date, 'ticker': holding_ticker, 'quantity': quantity, 'cost': cost, 'category': category})

    actual = {'trades': len(trade_rows), 'memos': len(memo_rows), 'account_events': len(event_rows), 'cash_flows': len(flow_rows), 'holdings_snapshots': len(holding_rows), 'asset_snapshots': len(asset_rows)}
    if actual != expected: raise SystemExit(f'Reconciliation mismatch: {actual} != {expected}')
    for row in trade_rows:
        statements.append(insert('trades', ['trade_date','trade_time','ticker','ticker_name','direction','quantity','price','fee','net_cash_amount','position_category','reason','needs_review','created_at','created_by'], [row['date'],row['time'],row['ticker'],row['name'],row['direction'],row['quantity'],row['price'],row['fee'],row['net'],row['category'],None,0,now,actor]))
    for row in memo_rows:
        date, trade_time, trade_ticker, direction, quantity, price = row['identity']
        predicate = f"trade_date={sql(date)} AND trade_time IS {sql(trade_time)} AND ticker={sql(trade_ticker)} AND direction={sql(direction)} AND quantity={sql(quantity)} AND price={sql(price)} AND created_by={sql(actor)}"
        statements.append(f"INSERT INTO finance_memos (trade_id,memo_date,ticker,position_category,operation_type,reason,reason_source,stop_loss_triggered,note,created_at,created_by) SELECT id,trade_date,ticker,position_category,direction,{sql(row['reason'])},{sql(row['source'])},0,{sql(row['note'])},{sql(now)},{sql(actor)} FROM trades WHERE {predicate};")
    for row in event_rows: statements.append(insert('finance_account_events', ['event_date','event_time','event_type','ticker','ticker_name','quantity','reference_value','amount','position_category','note','created_at','created_by'], [row['date'],row['time'],row['type'],row['ticker'],row['name'],row['quantity'],row['reference'],row['amount'],row['category'],row['note'],now,actor]))
    for row in flow_rows: statements.append(insert('finance_cash_flows', ['occurred_on','contributor','flow_type','bonus_source_year','baseline_amount','confirmed_amount','manager_share_offset','net_amount','note','created_at','created_by'], [row['date'],row['contributor'],'monthly_investment',None,row['baseline'],row['confirmed'],row['offset'],row['confirmed'],row['note'],now,actor]))
    for row in holding_rows: statements.append(insert('holdings_snapshots', ['snapshot_date','ticker','quantity','avg_cost','position_category'], [row['date'],row['ticker'],row['quantity'],row['cost'],row['category']]))
    for row in asset_rows: statements.append(insert('finance_asset_snapshots', ['snapshot_at','snapshot_date','holdings_value','cash_value','total_value','source','is_complete','incomplete_reason','created_at','created_by'], [row['at'],row['date'],row['holdings'],row['cash'],row['total'],row['source'],row['complete'],None,now,actor]))
    if not args.d1_ready: statements.append('COMMIT;')
    report = {'batch_id': batch, 'source_name': args.workbook.name, 'expected': expected, 'actual': actual, 'unresolved_rows': 0, 'synthetic_records': 0, 'excluded_broker_only_trades': 5, 'asset_reconciliation': {'holdings_value': holdings_value, 'cash_value': cash_value, 'total_value': total_value, 'balanced': True}, 'holdings_snapshot_mapping': holding_rows}
    args.sql_output.write_text('\n'.join(statements) + '\n', encoding='utf-8')
    args.report_output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(report, ensure_ascii=False))

if __name__ == '__main__': main()
