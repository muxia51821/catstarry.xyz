**Category**: enhancement
**Triage**: ready-for-agent
**Triage Date**: 2026-07-04

# P01: /projects Page - Card Grid Layout

## Parent

docs/final-requirements-projects.json - Goal G001

## What to build

Create /projects route (SSG) displaying completed projects in a card grid:
- Card grid layout (reference: LayorX #portfolio section)
- Each card shows: screenshot, project name, one-line description, tech tags, external link
- Max 2 projects displayed
- Each project stored as standalone data entry in a shared index file
- Projects independently stored and deployed; catstarry.xyz only stores index

## Acceptance criteria

- [ ] /projects renders a card grid with 1-2 project cards
- [ ] Each card: screenshot/thumbnail, project name, short description, tech tags, link
- [ ] Clicking a card opens the project external link
- [ ] Page uses shared Base layout
- [ ] Projects defined in a data file

## Blocked by

None - can start immediately
