**Category**: enhancement
**Triage**: ready-for-agent
**Triage Date**: 2026-07-04

# L03: Note Detail Page - MDX Rendering + Wikilink Preview

## Parent

docs/final-requirements-learn.json - Goals G003, G004

## What to build

Create /learn/[slug] route for individual note detail pages:
- Full MDX body rendering (code blocks, images, tables via Astro MDX)
- Wikilink support: [[note-slug]] syntax parsed and rendered as clickable links
- Hovering a wikilink shows a preview card (title + excerpt from linked note)
- Page includes: title, publish date, last modified date, tag badges, back link

## Acceptance criteria

- [ ] Visiting /learn/[slug] renders the full MDX body
- [ ] Wikilinks [[other-note]] render as clickable links
- [ ] Hovering a wikilink shows a preview card (title + excerpt)
- [ ] Title, date, tags displayed in header area
- [ ] Published notes only; draft notes return 404

## Blocked by

- L01: needs the learn section to be initialized
- L05: needs the learn content schema for frontmatter fields
