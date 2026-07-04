**Category**: enhancement
**Triage**: ready-for-agent
**Triage Date**: 2026-07-04

# L08: Title + Tag Instant Search

## Parent

docs/final-requirements-learn.json - Goal G005

## What to build

Add a search bar to /learn that performs instant client-side filtering:
- Input field at top of page (below banner, above track list)
- As user types, results filter in real time (debounced 300ms)
- Search matches: title (fuzzy), tag names (exact), track name (exact)
- Results show as a filtered list replacing the main content area
- Empty state: "No notes found" message
- Autocomplete dropdown with top 5 matches as-you-type

## Acceptance criteria

- [ ] Search input renders on /learn (desktop + mobile)
- [ ] Typing filters notes in real time (debounced)
- [ ] Matches by title (fuzzy), tags (exact), track (exact)
- [ ] Results replace main content area with filtered note cards
- [ ] Empty state message when no matches
- [ ] Autocomplete suggestions dropdown (top 5 matches)

## Blocked by

- L01: search bar integrates into the /learn page
