"""Create a disposable, synthetic workbook for the historical-import contract."""
from __future__ import annotations

import sys
import zipfile
from pathlib import Path
from xml.sax.saxutils import escape

def column(index):
    result = ''
    while index:
        index, remainder = divmod(index - 1, 26); result = chr(65 + remainder) + result
    return result

def sheet(rows):
    output = []
    for row_number, values in enumerate(rows, 1):
        cells = []
        for index, value in enumerate(values, 1):
            ref = f'{column(index)}{row_number}'
            if isinstance(value, str): cells.append(f'<c r="{ref}" t="inlineStr"><is><t>{escape(value)}</t></is></c>')
            elif value is not None: cells.append(f'<c r="{ref}"><v>{value}</v></c>')
        output.append(f'<row r="{row_number}">{"".join(cells)}</row>')
    return f'<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>{"".join(output)}</sheetData></worksheet>'

def main(path: Path):
    sheets = {
        '操作记录': [['日期','时间','操作类型','标的','证券代码','成交价格','数量','实际资金变化（元）','税费（元）','操作理由','理由来源','Finance仓位分类','原始仓位分类','备注','复盘备注'], [46174,'09:30','买入','测试ETF',510300,4,100,-400.1,.1,'第一次','原始记录','A股宽基指数底仓','测试','备注',None], [46174,'10:30','买入','测试ETF',510300,5,100,-500.1,.1,'确认加仓','事后确认','A股宽基指数底仓','测试',None,'复盘']],
        'Account Events': [['source_row','date','trade_time','record_kind','security_label_resolved','canonical_ticker','canonical_name','quantity','source_amount','net_cash_amount','position_category','source_note','review_note'], [1,46175,'09:00','dividend','测试ETF',510300,'测试ETF',0,10,10,'A股宽基指数底仓','红利',None]],
        '资金流（Finance）': [['实际到账日','归属月份','贡献人','类型','计划基准金额','确认金额','管理人份额抵扣','净投入','来源事实','备注'], [46174,'2026-06','木下','月度投入',2500,2500,0,2500,'fixture','到账']],
        'Current Snapshot Mapping': [['snapshot_at','snapshot_date','holdings_value','cash_value','total_value','source','is_complete','date_basis'], [46174.5,46174,1000,100,1100,'fixture',1,'fixture'], [], [], ['snapshot_date','source_label','canonical_ticker','canonical_name','quantity','avg_cost','broker_reference_price','broker_market_value','broker_pnl','finance_position_category','import_target','说明'], [46174,'测试ETF',510300,'测试ETF',200,4.5,5,1000,100,'A股宽基指数底仓','holdings_snapshots','fixture']],
        '导入合同': [['scope'], ['fixture']],
    }
    workbook = '<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' + ''.join(f'<sheet name="{escape(name)}" sheetId="{index}" r:id="rId{index}"/>' for index, name in enumerate(sheets, 1)) + '</sheets></workbook>'
    rels = '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + ''.join(f'<Relationship Id="rId{index}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet{index}.xml"/>' for index in range(1, len(sheets) + 1)) + '</Relationships>'
    with zipfile.ZipFile(path, 'w') as archive:
        archive.writestr('xl/workbook.xml', workbook); archive.writestr('xl/_rels/workbook.xml.rels', rels)
        for index, rows in enumerate(sheets.values(), 1): archive.writestr(f'xl/worksheets/sheet{index}.xml', sheet(rows))

if __name__ == '__main__': main(Path(sys.argv[1]))
