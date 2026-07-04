**Category**: enhancement
**Triage**: ready-for-agent
**Triage Date**: 2026-07-04

# F02: Excel -> D1 Data Migration Script

## Parent

docs/final-requirements-finance.json - Goal G001

## What to build

One-time migration script parsing the existing Excel finance spreadsheet:
- Parse Excel file (from May 2026 onwards)
- Create D1 tables: trades, holdings, snapshots, market_data
- Handle dirty data: cells with #VALUE! errors -> mark as needs_review
- Field mapping: Excel column names -> D1 column names (snake_case)
- After import, verify row counts match
- Excel retires to yearly archive; dashboard becomes daily driver

## Acceptance criteria

- [ ] Script reads Excel file and imports into D1
- [ ] All historical trade records imported correctly
- [ ] Dirty data flagged with needs_review column
- [ ] Row count verification: Excel vs D1
- [ ] Schema: trades(date, ticker, direction, quantity, price, position_category, reason)

## Blocked by

- F01: needs D1 database created and bound to the finance project
