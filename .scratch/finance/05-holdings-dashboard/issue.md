**Category**: enhancement
**Triage**: ready-for-agent
**Triage Date**: 2026-07-04

# F05: Holdings Dashboard - Prices + PE Temperature Gauge

## Parent

docs/final-requirements-finance.json - Goal G003

## What to build

The main holdings dashboard view:
- Display current holdings: ticker, name, quantity, avg cost, current price, P&L, P&L%
- Real-time prices from D1 market_data table (F04)
- PE Temperature Gauge: 5-zone color band with operation suggestions
- Each zone maps to an operation suggestion
- cati (read-only) sees same dashboard without trade entry button

## Acceptance criteria

- [ ] Holdings table: ticker, name, quantity, avg cost, current price, P&L, P&L%
- [ ] Prices auto-refreshed from D1 (via F04)
- [ ] PE temperature gauge: 5 zones with distinct colors
- [ ] Each zone shows operation suggestion text
- [ ] cati view: identical data, no "+" button
- [ ] Mobile: responsive table

## Blocked by

- F04: market data must be populated in D1 before dashboard can display live data
