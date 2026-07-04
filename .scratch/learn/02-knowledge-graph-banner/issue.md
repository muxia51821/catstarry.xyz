**Category**: enhancement
**Triage**: ready-for-agent
**Triage Date**: 2026-07-04

# L02: Knowledge Graph Banner

## Parent

docs/final-requirements-learn.json - Goal G002

## What to build

Add a static knowledge graph banner at the top of /learn:
- Static thumbnail image (or SVG) showing interconnected nodes
- Each node represents a track, labeled with track name
- Hovering a node highlights it and shows a tooltip (name + description)
- Clicking a node navigates to that track section
- Mobile: hide the banner or replace with a compact thumbnail

## Acceptance criteria

- [ ] Banner renders at top of /learn (desktop)
- [ ] Each track node is visually distinct
- [ ] Hover shows tooltip with track name + description
- [ ] Click navigates to the corresponding track
- [ ] Mobile: banner hidden or replaced with compact version

## Blocked by

- L01: needs the /learn route and track list to exist
