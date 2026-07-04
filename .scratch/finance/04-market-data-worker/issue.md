**Category**: enhancement
**Triage**: ready-for-agent
**Triage Date**: 2026-07-04

# F04: Market Data CF Worker - Scheduled Price + PE-TTM Fetch

## Parent

docs/final-requirements-finance.json - Goal G003

## What to build

A CF Worker with Cron Triggers that periodically fetches market data:
- Fetch real-time prices for held tickers (A-shares, 15-min delay acceptable)
- Fetch SSE 300/500/1000 PE-TTM daily at market close
- Write to D1 table market_data(ticker, price, pe_ttm, fetched_at)
- Cron: every 15 min for prices; daily at 15:30 CST for PE-TTM
- Error handling: retry 3x on failure
- API source: TBD during tech selection

## Acceptance criteria

- [ ] Worker fetches real-time prices for all held tickers
- [ ] Worker fetches PE-TTM for SSE 300/500/1000 daily
- [ ] Data written to D1 market_data table
- [ ] Cron triggers configured in wrangler.toml
- [ ] Failed fetches retry 3 times with exponential backoff

## Blocked by

- F01: needs D1 database and Worker project
