**Category**: enhancement
**Triage**: ready-for-agent
**Triage Date**: 2026-07-04

# F07: Three-Level Circuit Breaker

## Parent

docs/final-requirements-finance.json - Goal G005

## What to build

Automatic circuit breaker system triggered by drawdown thresholds:
- Level 1 (Yellow): drawdown > 10% -> pause new active position additions
- Level 2 (Red): drawdown > 20% -> force broad-base index fund investing only
- Level 3 (Black): triggered by cati objection -> full pause
- Dashboard displays current breaker level prominently
- Yellow/Red -> notify cati on next login
- Breaker status persists across sessions

## Acceptance criteria

- [ ] Yellow trigger: drawdown > 10% -> banner + pause active additions
- [ ] Red trigger: drawdown > 20% -> banner + force index-only
- [ ] Black trigger: cati objection recorded -> full pause
- [ ] Current breaker level displayed prominently on dashboard
- [ ] cati notified when Yellow/Red triggers
- [ ] Breaker state persists and can be manually cleared

## Blocked by

- F05: needs holdings dashboard to calculate drawdown
- F06: needs position data for drawdown calculation
