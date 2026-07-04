**Category**: enhancement
**Triage**: ready-for-agent
**Triage Date**: 2026-07-04

# L04: Note Detail Sidebar - Directory Tree

## Parent

docs/final-requirements-learn.json - Goal G003

## What to build

Add a sidebar directory tree on the note detail page (/learn/[slug]):
- Shows the full note hierarchy as an expandable tree (unlimited nesting)
- Current note is highlighted in the tree
- Clicking a node navigates to that note
- Desktop: fixed sidebar on the left or right
- Mobile: hamburger-triggered drawer, defaults to collapsed

## Acceptance criteria

- [ ] Sidebar shows all notes organized by track -> section hierarchy
- [ ] Current note is visibly highlighted (active state)
- [ ] Nodes support unlimited nesting depth
- [ ] Collapse/expand with click or arrow icon
- [ ] Clicking a node navigates to that note
- [ ] Mobile: drawer triggered by hamburger, shows top 2 levels expanded by default

## Blocked by

- L03: the note detail page must exist to attach the sidebar
