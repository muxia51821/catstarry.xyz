# Learn Accepted Delta — Final Local Implementation Acceptance

**Verdict:** READY WITH BLOCKED MIGRATION ITEMS
**Branch:** `task/learn-visual-reality-check`
**Implementation baseline:** `fc92f06`
**Date:** 2026-08-13

Web Visual Acceptance is **PASS / CLOSED**. This acceptance does not reopen visual design; it audits the accepted implementation, ledger, evidence, and remaining migration gates at the baseline above.

## Accepted Delta implementation map

| Delta area | Status | Evidence |
|---|---|---|
| A1–A3 Opening / hierarchy / one Knowledge Map | IMPLEMENTED | Fixed two-line motto; 233px rendered opening, 525px warm Knowledge Field, Recent begins at 763px |
| A4 Track Directory | IMPLEMENTED | Plain links; count hover/focus without width change; mobile hides auxiliary count |
| A5–A8 Graph | IMPLEMENTED | Cream surface, Track-aware deterministic positions, normalized edges, labels, Klein interaction, mobile reflow; final optical correction keeps geological engraving at the field perimeter so relation edges remain semantically distinct |
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

Full implementation validation previously passed on the implementation series through `992e508`:

- `npm run site:typecheck`
- `npm run worker:typecheck:feed`
- `npm run test:learn:authoring`
- `npm run test:learn:preview`
- `npm run test:blog:publications`
- `npm run test:migrations`
- `npm run build`
- `npm run test:site:browser` — 49 route/viewport checks; no console errors
- `node .scratch/learn-visual-reality-check/capture-implementation-evidence.mjs`

Latest-HEAD incremental validation for `fc92f06`:

- `npm run site:typecheck` — PASS
- `git diff --check` — PASS
- `node .scratch/learn-visual-reality-check/capture-implementation-evidence.mjs --graph-optical-only` — PASS; 5 nodes, 4 relation edges, no horizontal overflow, no console problems, no failed requests
- Web review of the refreshed desktop Knowledge Map and mobile portrait Graph — PASS / CLOSED

The full suite was not rerun after `fc92f06`: its product change is limited to Graph engraving opacity/perimeter masking plus the two refreshed screenshots. The earlier full-suite result is retained as prior evidence, not represented as a fresh run at the latest HEAD.

Blocked local harness:

- `npm run test:feed:worker` did not complete twice within 180s/240s during the implementation run. It stalled inside the existing Wrangler subprocess without assertion output. Orphaned local processes were terminated. No production resource was contacted or changed. This remains a local harness validation gap, not an observed assertion failure.

## Rendered evidence highlights

- Home: `implementation-evidence/home-desktop-1440x1000.png`
- Empty/sparse: `home-empty-controlled-1440x1000.png`, `home-sparse-controlled-1440x1000.png`
- Knowledge Map: final `fc92f06` resting evidence is `implementation-evidence/knowledge-map-resting.png` and `implementation-evidence/knowledge-map-mobile-portrait.png`; node hover/focus, Track hover, and active Search evidence remains under `implementation-evidence/`
- Track: `track-programming-{1760,1440,1000,768,390}.png`
- Note: desktop related, zero relations, mobile related, Wikilink preview under `implementation-evidence/`
- Admin / Preview: desktop and mobile screenshots under `implementation-evidence/`
- Measurements and interaction results: `implementation-evidence/implementation-reality.json` is the earlier full-capture snapshot through `992e508`; use the two refreshed Graph images plus the latest-HEAD incremental validation above for the `fc92f06` optical correction

Evidence limitation: the earlier `implementation-reality.json` sparse fixture reports `2 nodes / 4 edges` because the fixture removed DOM edges while the Graph `ResizeObserver` could redraw from the original relation dataset. Do not use that stale edge count as sparse-relation evidence. Sparse/empty visual behavior is evidenced by the controlled screenshots; relation normalization and current real-corpus edge counts are evidenced by source/tests and the non-fixture Graph captures.

## 2026-08-13 visual correction

- Locked the Chinese and Latin motto to separate lines at every viewport.
- Added Learn-local warm material hierarchy without changing shared Cream Gallery tokens.
- Reduced excessive vertical gaps across Home, Track, and Note while preserving the accepted IA.
- Retained frameless composition, direct Cream continuity, local overflow containment, and mobile relation ordering.

The dark floating control strip visible in some screenshots belongs to the isolated browser capture environment, not the site DOM.

## 2026-08-13 Graph optical correction

- Web Visual Acceptance: **PASS / CLOSED**.
- Decorative geological engraving inside the node/relation field was lowered and moved toward the field perimeter.
- Relation edges remain unchanged and immediately distinguishable from material residue.
- Graph IA, node positions, Track regions, relation normalization, and interaction model were not changed.
- Only the desktop Knowledge Map resting and mobile portrait Graph evidence were recaptured; the capture path removes the Astro development toolbar before these final images.

## Final local implementation verdict

**READY WITH BLOCKED MIGRATION ITEMS.** The accepted local Learn implementation is complete at `fc92f06`, the 214-item ledger reconciles exactly, and Web Visual Acceptance is closed. No evidence-backed local product or visual drift remains.

Remaining blockers / gates:

1. **LHF-182 / MR-08:** production D1 historical `learn_section_completed` inventory and historical destination behavior remain unknown. Supersede / Withdraw destructive enablement and physical removal of the five retained historical public Note destinations stay gated.
2. **LHF-214:** Shared Footer remains Family-level `REVALIDATE`; Learn implementation cannot close it.
3. **Local harness gap:** `npm run test:feed:worker` has no completed result because the existing Wrangler subprocess stalled. This does not change the local implementation verdict, but it remains unverified before a release decision.
4. **Release boundary:** the local D1 compatibility migration remains unapplied; merge, deploy, production mutation, and content deletion require separate authorization and the migration gates above.

## Migration / production boundary

- Completed: read-only repo evidence; local schema, reader, UI, manifest, and migration implementation.
- Unapplied: D1 migration and all production deployment steps.
- Blocked: production historical `learn_section_completed` inventory and destructive destination migration.
- Git state at acceptance: branch `task/learn-visual-reality-check`; HEAD `fc92f06`; Graph optical correction committed and pushed; working tree was clean before this report-only bookkeeping update.
- Not performed: merge, deploy, production reads/writes, applied migration, or content deletion.
