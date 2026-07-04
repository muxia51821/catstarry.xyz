**Category**: enhancement
**Triage**: ready-for-agent
**Triage Date**: 2026-07-04

# F06: Position Deviation Warning

## Parent

docs/final-requirements-finance.json - Goal G004

## What to build

Real-time position deviation monitoring on the dashboard:
- Each position category: target %, current %, deviation, status indicator
- Red marker when current exceeds hard upper or lower limit
- When deviation detected -> show rebalancing suggestion
- Deviation thresholds configurable per position category

## Acceptance criteria

- [ ] Each position shows: target %, current %, deviation, status
- [ ] Red highlighting when exceeding hard limits
- [ ] Rebalancing suggestion auto-generated when deviation detected
- [ ] Limits configurable (not hardcoded)
- [ ] cati view: same data, read-only

## Blocked by

- F04: needs current prices to calculate position values
