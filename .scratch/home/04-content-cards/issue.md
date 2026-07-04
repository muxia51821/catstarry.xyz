**Category**: enhancement
**Triage**: ready-for-agent
**Triage Date**: 2026-07-04

# H04: Five Content Type Cards - Differentiated Design + Color Badges

## Parent

docs/final-requirements-homepage.json - Goal G003

## What to build

Five distinct card designs for the Home timeline, one per content type:
- Blog: title + date + excerpt + "Blog" corner badge
- Feed note: text preview + image thumbnail (if any) + "Note" badge
- Feed clip: link title + auto-fetched excerpt + source domain + "Clip" badge
- Project: project thumbnail + name + one-line description + "Project" badge
- Learn note: title + last modified date + excerpt + "Learn" badge

Each badge has a distinct color. Card designs differ enough that types are
distinguishable without reading the badge. Exact colors TBD in Phase 4.

## Acceptance criteria

- [ ] Five distinct card designs, one per content type
- [ ] Each card has a colored corner/text badge indicating type
- [ ] Types visually distinguishable without reading badges
- [ ] Cards link to their source page
- [ ] Thumbnail images displayed where applicable

## Blocked by

- H03: timeline must exist to render cards into
