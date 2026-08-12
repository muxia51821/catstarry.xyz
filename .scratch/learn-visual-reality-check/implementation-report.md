# Learn Accepted Delta — Local Implementation Handoff

**Verdict:** READY WITH BLOCKED MIGRATION ITEMS
**Branch:** `task/learn-visual-reality-check`
**Implementation baseline:** `b026fd6`
**Date:** 2026-08-13

## Accepted Delta implementation map

| Delta area | Status | Evidence |
|---|---|---|
| A1–A3 Opening / hierarchy / one Knowledge Map | IMPLEMENTED | Fixed two-line motto; 233px rendered opening, 525px warm Knowledge Field, Recent begins at 763px |
| A4 Track Directory | IMPLEMENTED | Plain links; count hover/focus without width change; mobile hides auxiliary count |
| A5–A8 Graph | IMPLEMENTED | Cream surface, Track-aware deterministic positions, normalized edges, labels, Klein interaction, mobile reflow |
| A9 Search | IMPLEMENTED | Non-sticky compact search; title/Track/Section/tags index; Home remains visible |
| A10 Recent Knowledge | IMPLEMENTED | Five frameless lifecycle rows; no public tags or maintenance date |
| B Track page | IMPLEMENTED | Stable single-column groups; no cards, dates, count, pills, or progress; bottom return |
| C Public Note / Relations / Wikilink | IMPLEMENTED | Shared 720–760px renderer, inbound/outbound related notes, direct click/Enter/touch navigation |
| D Admin v1 / Preview | IMPLEMENTED | Authenticated read-only inventory, lifecycle states, Preview only, shared renderer, no legacy writers |
| Lifecycle reader / manifest v2 | IMPLEMENTED LOCALLY | Four-state compatible schema, stable dates, zero-event baseline and publish/revise semantics |
| D1 compatibility migration | IMPLEMENTED LOCALLY, UNAPPLIED | `0003_learn_note_events.sql`; legacy rows retained and new event types accepted |
| MR-08 production history inventory | BLOCKED | No production access or write authority; no destination deletion performed |
| Invalid historical public content removal | BLOCKED | Five old public destinations retained until MR-08 evidence exists |
| Empty / sparse rendered screenshots | IMPLEMENTED | Controlled evidence removes current real nodes/regions only; no fake public corpus or extra product route was introduced |
| Shared Footer | REVALIDATE | Explicitly outside Learn implementation authority |

## LHF summary

`PASS 209 / SUPERSEDED 3 / BLOCKED 1 / REVALIDATE 1 = 214`

- LHF-004 / LHF-005: superseded by the A0 accepted two-line motto.
- LHF-176: superseded by Admin v1 Preview-only authority.
- LHF-182: blocked by MR-08 production historical destination evidence.
- LHF-214: revalidate at Family level.

## Validation

Passed:

- `npm run site:typecheck`
- `npm run worker:typecheck:feed`
- `npm run test:learn:authoring`
- `npm run test:learn:preview`
- `npm run test:blog:publications`
- `npm run test:migrations`
- `npm run build`
- `npm run test:site:browser` — 49 route/viewport checks; no console errors
- `node .scratch/learn-visual-reality-check/capture-implementation-evidence.mjs`

Blocked local harness:

- `npm run test:feed:worker` did not complete twice within 180s/240s. It stalled inside the existing Wrangler subprocess without assertion output. Orphaned local processes were terminated. No production resource was contacted or changed.

## Rendered evidence highlights

- Home: `implementation-evidence/home-desktop-1440x1000.png`
- Empty/sparse: `home-empty-controlled-1440x1000.png`, `home-sparse-controlled-1440x1000.png`
- Knowledge Map: resting, node hover/focus, Track hover, active Search, portrait mobile under `implementation-evidence/`
- Track: `track-programming-{1760,1440,1000,768,390}.png`
- Note: desktop related, zero relations, mobile related, Wikilink preview under `implementation-evidence/`
- Admin / Preview: desktop and mobile screenshots under `implementation-evidence/`
- Measurements and interaction results: `implementation-evidence/implementation-reality.json`

## 2026-08-13 visual correction

- Locked the Chinese and Latin motto to separate lines at every viewport.
- Added Learn-local warm material hierarchy without changing shared Cream Gallery tokens.
- Reduced excessive vertical gaps across Home, Track, and Note while preserving the accepted IA.
- Retained frameless composition, direct Cream continuity, local overflow containment, and mobile relation ordering.

The dark floating control strip visible in some screenshots belongs to the isolated browser capture environment, not the site DOM.

## Migration / production boundary

- Completed: read-only repo evidence; local schema, reader, UI, manifest, and migration implementation.
- Unapplied: D1 migration and all production deployment steps.
- Blocked: production historical `learn_section_completed` inventory and destructive destination migration.
- Not performed: commit, push, merge, deploy, production reads/writes, or content deletion.
