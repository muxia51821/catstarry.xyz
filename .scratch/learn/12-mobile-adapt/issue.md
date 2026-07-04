**Category**: enhancement
**Triage**: ready-for-agent
**Triage Date**: 2026-07-04

# L12: Mobile Adaptation for /learn

## Parent

docs/final-requirements-learn.json - open questions (OQ)

## What to build

Ensure all /learn pages are usable on mobile (375px-768px width):
- Sidebar directory tree (L04) becomes hamburger-triggered drawer
- Knowledge graph banner (L02) hidden or replaced with compact thumbnail
- Track tabs switch to horizontal scroll or dropdown
- Note detail: wikilink preview adapts to bottom-sheet or inline tooltip
- Search bar full-width, sticky below header
- Touch targets >= 44px (WCAG minimum)

## Acceptance criteria

- [ ] All /learn pages render correctly at 375px width
- [ ] Sidebar becomes drawer, triggered by hamburger icon
- [ ] Knowledge graph banner hidden (or compact thumbnail)
- [ ] Track navigation uses horizontal scroll or dropdown on mobile
- [ ] Wikilink previews work on touch (tap to show, tap outside to dismiss)
- [ ] Search bar full-width and sticky
- [ ] No horizontal overflow anywhere

## Blocked by

- L01: needs learn homepage
- L03: needs note detail page
- L04: needs sidebar tree component
