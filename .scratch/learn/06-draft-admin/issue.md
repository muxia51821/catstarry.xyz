**Category**: enhancement
**Triage**: ready-for-agent
**Triage Date**: 2026-07-04

# L06: Draft/Publish Admin Panel

## Parent

docs/final-requirements-learn.json - Goal G007

## What to build

A standalone admin page at /learn/admin (behind same auth as /feed):
- Lists all learn notes in reverse chronological order (both draft and published)
- Each row shows: title, track, status (draft/published), last modified
- Click "Publish" to toggle draft -> published
- Published notes immediately appear on /learn, Home timeline, and RSS
- Draft notes show "Draft" badge, only visible in this admin panel
- Auth shared with /feed authentication mechanism

## Acceptance criteria

- [ ] /learn/admin requires login (same auth as /feed publish)
- [ ] List shows all notes: title, track, status badge, last modified, actions
- [ ] Publish button toggles draft: true -> draft: false
- [ ] Published notes immediately appear in /learn and Home timeline
- [ ] Draft notes are NOT visible on /learn, Home, RSS, or search
- [ ] Single-click publish; no edit functionality needed

## Blocked by

- L01: needs /learn to exist as a route
- L05: needs the learn content schema with draft field
