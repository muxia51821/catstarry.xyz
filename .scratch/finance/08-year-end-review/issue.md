**Category**: enhancement
**Triage**: ready-for-agent
**Triage Date**: 2026-07-04

# F08: Year-End Review - Excess Return Split + Annual Summary + Excel Export

## Parent

docs/final-requirements-finance.json - Goals G007, G008

## What to build

Year-end functionality combining three features:

1. Excess Return Split Calculation:
- Modified Dietz method for return rate calculation
- High-water mark: historical max net value x 1.03
- Only calculate when portfolio exceeds high-water mark
- Annualized 3% baseline deduction
- cati can view the full calculation process

2. Annual Review Summary:
- Admin writes annual summary text
- cati reviews and clicks "confirm" (timestamp record)
- System generates confirmation certificate (in-app)
- Summary + signature permanently preserved

3. Excel Export:
- One-click export of full-year data: trades, snapshots, summary, confirmation
- Exported Excel mirrors original structure for archival consistency

## Acceptance criteria

- [ ] Modified Dietz calculation displayed with full breakdown
- [ ] High-water mark correctly computed and displayed
- [ ] Excess split amount clearly shown
- [ ] cati can view calculation before confirming
- [ ] Admin writes summary -> cati confirms -> timestamp recorded
- [ ] Confirmation certificate visible in dashboard history
- [ ] Excel export includes: trades, snapshots, summary, signature record

## Blocked by

- F05: needs holdings data and trade history for calculations
