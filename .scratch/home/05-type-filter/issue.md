**Category**: enhancement
**Triage**: ready-for-agent
**Triage Date**: 2026-07-04

# H05: Login-Only Type Filter

## Parent

docs/final-requirements-homepage.json - Goal G004

## What to build

A content type filter bar on the Home timeline, visible only when logged in:
- Filter buttons: All / Feed Notes / Feed Clips / Blog / Projects / Learn Notes
- Clicking a filter shows only that content type in the timeline
- Clicking "All" or deselecting restores mixed view
- Visitors (not logged in) see NO filter UI
- Auth: share same mechanism as /feed publish and /learn admin

## Acceptance criteria

- [ ] Filter bar appears when logged in
- [ ] Filter buttons for all 5 content types + "All"
- [ ] Active filter highlighted
- [ ] Selecting a filter shows only matching content type
- [ ] Deselecting restores mixed view
- [ ] No filter UI when logged out
- [ ] Auth shared with /feed and /learn admin

## Blocked by

- H01: needs Home route to exist
