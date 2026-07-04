**Category**: enhancement
**Triage**: ready-for-agent
**Triage Date**: 2026-07-04

# F03: Trade Entry Floating Window

## Parent

docs/final-requirements-finance.json - Goal G002

## What to build

A floating window (modal) for recording trades quickly:
- Trigger: "+" button on dashboard -> floating window opens
- Fields: date (default today), ticker, direction (buy/sell), quantity, price,
  position category, reason (optional)
- Continuous entry mode: after submit, form resets for next trade
- Desktop + mobile: responsive floating window, touch-friendly inputs
- Auto-calculate: total amount = quantity x price (displayed, not stored)

## Acceptance criteria

- [ ] "+" button triggers floating window overlay
- [ ] All required trade fields present
- [ ] Submit -> trade saved -> form resets for next entry
- [ ] Total amount displayed as computed field
- [ ] Mobile: inputs large enough for touch
- [ ] Server-side validation: required fields, quantity > 0, price > 0

## Blocked by

- F01: needs the finance project + auth
- F02: trades D1 table must exist
