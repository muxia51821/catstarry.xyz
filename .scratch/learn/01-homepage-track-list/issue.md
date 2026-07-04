**Category**: enhancement
**Triage**: ready-for-agent
**Triage Date**: 2026-07-04

# L01: /learn Homepage with Track List

## Parent

docs/final-requirements-learn.json - Goal G002

## What to build

Create the /learn route (SSG) that serves as the entry point for learning notes. The page displays:
- A knowledge graph banner (placeholder in this slice - see L02)
- A list of all learning tracks (e.g. "TypeScript", "Cloudflare", "React")
- Each track shows its name + lesson count + last updated date
- Each track links to its internal anchor or sub-page

This is the foundation slice that all other /learn issues depend on.

## Acceptance criteria

- [ ] Visiting /learn renders the track list page
- [ ] Each track displays: name, lesson count, last modified date
- [ ] Tracks are ordered alphabetically or by manual priority
- [ ] Clicking a track navigates to the track section
- [ ] Page uses shared Base layout via Astro

## Blocked by

None - can start immediately
