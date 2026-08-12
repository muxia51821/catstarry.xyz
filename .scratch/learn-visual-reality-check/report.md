# Learn Visual Reality — Current Evidence Report

**Stage:** 0 — Current Reality Reconstruction  
**Date:** 2026-08-12  
**Repository:** `D:\catstarry.xyz`  
**Task branch:** `task/learn-visual-reality-check`  
**Baseline HEAD:** `25447ec6f514746386701dda73f2ed661ce6c75e`  
**Baseline working tree:** clean；无 untracked files  
**Handoff working tree:** dirty only because this Stage 0 report, capture script, JSON evidence, and screenshots are new untracked task artifacts under `.scratch/learn-visual-reality-check/`  
**Remote:** `origin = git@github.com:muxia51821/catstarry.xyz.git`

## 0. Verdict

当前 Learn implementation 与 Closure Truth **存在系统性 drift**，不是少量视觉 polish。

高置信度 factual conclusion：

- 当前产品现实仍是 `LEARNING RECORDS + dark standalone Graph + sticky Search + Recent cards + separate Track cards`。
- Closure target 是 `Identity + Knowledge Map (Track × Graph) + Recent Knowledge`，Search secondary。
- 当前 reading body 的 760px measure、Cream Canvas、Markdown renderer、dark code blocks、focus primitives、preview auth/no-store/noindex 等基础可复用。
- Home composition、Graph visual/interaction、Track directory、Note header/relations、wikilink destination semantics、Admin lifecycle、Feed writer/manifest 都未收敛到 Closure。
- 本轮没有发现 browser console error、failed network request 或 desktop/mobile page-wide horizontal overflow。

Stage 0 atomic result：

| Status | Count |
|---|---:|
| PASS | 121 |
| DRIFT | 92 |
| BLOCKED | 1 |
| NOT OBSERVABLE YET | 0 |
| REVALIDATE | 0 |
| **Total** | **214** |

`PASS` 只表示当前实现满足单一原子项，不代表 surface 或 module 整体通过。完整逐条账本见 [`lhf-coverage.md`](lhf-coverage.md)。

## 1. Authority sources read

按 Charter 规定的 authority/read order 读取：

1. Current user charter / A0 amendment。
2. Current repository governance：
   - `docs/content/README.md`
   - `docs/content/family-contract.md`
   - `docs/content/master-ledger.md`
   - `docs/content/reconciliation-register.md`
   - `docs/content/implementation-dependency-map.md`
3. Private Learn canonical truth，直接读取 private `main @ e86993de9521b074f902e3cefe8be643b609d056`，未使用本地旧 `master` 工作树：
   - `LEARN-PROGRAM.md`
   - `Learn Product Synthesis.md`
   - `catstarry.xyz — Learn Closure Package.md`，完整 3304 行，包括 LHF-001–214。
4. Accepted architecture：
   - ADR-008，Public Learn canonical source = Markdown。
   - ADR-005 / Feed footprint separate durable storage boundary。
5. Current Learn source、content、scripts、tests、Worker/Feed paths与渲染现实。

Repository governance 仍把 Learn 写成 `PROVISIONAL / OPEN`，属于 Closure 前 legacy governance state。依照 A1，它没有重开后来的 CLOSED Product / Architecture / IA / Visual / Interaction Truth。

## 2. Current route / source matrix

| Route / capability | Current source files | Current data / rendering path | Closure target | Migration dependency |
|---|---|---|---|---|
| `/learn/` | `src/pages/learn/index.astro`; `KnowledgeGraph.astro`; `LearnSearch.astro`; `NoteCard.astro`; `TrackCard.astro`; `learn.css` | `getCollection('learn') → getPublishedNotes()`；按 `lastModified` 倒序；Graph、Search、Recent Card、Track Card 独立渲染 | Identity → Knowledge Map = Track × Graph → Recent Knowledge；Search secondary | lifecycle dates；relation projection；active Track validation；empty corpus |
| `/learn/track/{track}/` | `src/pages/learn/track/[track].astro`; `NoteCard.astro`; `learn-data.ts`; `learn.css` | 已发布 Note 生成 static paths；unknown Track fallback；Section tabs + Note Cards | deterministic domain browse；plain Section anchors；frameless rows；quiet bottom return | declared Track validation；stable ordering；lifecycle reader |
| `/learn/notes/{slug}/` | `src/pages/learn/notes/[slug].astro`; `DirectoryTree.astro`; `remark-wikilinks.mjs`; `learn.css` | `!draft` static paths；Markdown renderer；Track tree；client wikilink preview | primary return Learn；Track/Section context；Related Notes；direct wikilink navigation；720–760px reading | remove parent tree；inbound/outbound relation model；lifecycle/frontmatter migration |
| `/learn/admin/` | `src/pages/learn/admin.astro`; Worker `routes/learn.ts` | Feed session auth；all notes；Draft/Published；publish/retract；completion writer | module-local four-state lifecycle owner tool；remove completion；destructive actions gated | D1 / shared type / Feed reader；external webhook adapter；historical destination inventory |
| `/learn/preview/{slug}/` | `src/pages/learn/preview/[slug].astro` | authenticated SSR；all content including Draft；private/no-store/noindex；same Markdown `Content` | preserve auth/noindex/no-store；clear Draft/Published Revision banner；same reading semantics | lifecycle reader；external publication workflow |
| Public visibility | `src/content.config.ts`; `learn-data.ts`; `sitemap.xml.ts`; `blog/rss.xml.ts` | `draft:boolean` controls public routes/sitemap/RSS | Draft / Published / Superseded / Withdrawn compatibility reader | schema cutover；RSS/sitemap callers |
| Authoring | `scripts/learn-import.mjs`; `scripts/lib/learn-authoring.mjs` | HTML → `.md` Draft；currently assigns fake `publishDate` / `lastModified` at Draft creation | Markdown remains canonical；Draft has no fake first-publication timestamp | frontmatter generator migration |
| Publication | Worker `routes/learn.ts`; `learn-publication-manifest.mjs`; production publication workflow | Admin webhook publish/retract；production manifest only stores `slug[]` | First Publication / Substantive Revision / Maintenance lifecycle manifest v2 | external adapter；successful-production baseline/delta semantics |
| Feed / activity | D1 `0001_initial.sql`; `shared/types.ts`; `modules/footprints.ts`; `FeedApp.tsx`; activity signals | `learn_section_completed` writer/storage/label；any public Learn footprint refreshes Home activity | `learn_note_published` / `learn_note_revised`；legacy read-only as `LEARN · 更新` | additive D1 migration before new writer；legacy row integrity |

## 3. Current content corpus

Current source contains：

- 6 Markdown Notes total；
- 5 `draft: false` and publicly rendered；
- 1 Draft：`domain-dns-http`；
- 3 active public Tracks：Programming / English / Typing；
- 2 Notes with `parentSlug`；
- 6 Notes with `sourceUrl`；
- real reciprocal/cross-Track wikilinks。

Closure disposition differs materially：

- `domain-dns-http` is the only Note retained as canonical Draft, with metadata migration。
- The current 5 Published Notes are designated Withdraw / Migrate out。
- Typing is Revalidate, not an active canonical Track。

Therefore current rich Graph/Card screenshots are migration-before reality only. They must not be treated as target corpus or used to justify keeping invalid Notes for layout fullness。

## 4. Validation / build status

| Check | Result | Meaning |
|---|---|---|
| `npm run site:typecheck` | PASS | Current TS/static model compiles |
| `npm run test:learn:authoring` | PASS | Current legacy authoring/data/tree contract is self-consistent；it does not prove Closure compliance |
| `npm run test:learn:preview` | PASS | Auth/no-store/noindex/draft leakage baseline holds |
| `ASTRO_TELEMETRY_DISABLED=1 npm run build` | PASS | Current site builds; generated 5 public Learn Note routes and 3 Track routes |
| `npm run test:site:browser` | PASS | Existing 7-route × 7-viewport regression passed；no console problems；it primarily proves existing behavior |
| Stage 0 Learn capture | PASS | Desktop/mobile/public/admin/preview/interactions captured；no console errors or failed requests |

No production sync, D1 query, migration, webhook call, publish/retract/complete action, deployment, commit, or push was performed。

## 5. Rendered evidence index

All evidence is under [`evidence/`](evidence/). The image viewer may display a small floating dark control strip; source/DOM inspection confirms it is not Learn page UI。

### Desktop — 1440 × 1000 class

| Evidence | File | What it proves |
|---|---|---|
| Home full | [`desktop-home-full.png`](evidence/desktop-home-full.png) | Opening, dark Graph, Search, 5 Recent cards, separate 3 Track cards |
| Opening | [`desktop-home-opening.png`](evidence/desktop-home-opening.png) | `LEARNING RECORDS`, process-log intro, `5 NOTES` pill |
| Graph resting/focus | [`desktop-home-graph.png`](evidence/desktop-home-graph.png), [`desktop-home-graph-focus.png`](evidence/desktop-home-graph-focus.png) | black rounded panel, visible nodes/labels, focus ring, diagnostic count |
| Search resting/active | [`desktop-home-search-resting.png`](evidence/desktop-home-search-resting.png), [`desktop-home-search-active.png`](evidence/desktop-home-search-active.png) | sticky standalone Search；query popover；query hides Home content |
| Recent / Tracks | [`desktop-home-recent.png`](evidence/desktop-home-recent.png), [`desktop-home-tracks.png`](evidence/desktop-home-tracks.png) | legacy Recent heading/card grammar and separate Track grid |
| Track full/top/index | [`desktop-track-programming-full.png`](evidence/desktop-track-programming-full.png), [`desktop-track-top.png`](evidence/desktop-track-top.png), [`desktop-track-index.png`](evidence/desktop-track-index.png) | TRACK slug/count, Section pills, Note Cards, no bottom return |
| Note full/header/reading/tree | [`desktop-note-full.png`](evidence/desktop-note-full.png), [`desktop-note-header.png`](evidence/desktop-note-header.png), [`desktop-note-reading.png`](evidence/desktop-note-reading.png), [`desktop-note-tree.png`](evidence/desktop-note-tree.png) | return Track, `lastModified`, sourceUrl, tags, 760px reading, DirectoryTree |
| Wikilink active | [`desktop-note-wikilink-active.png`](evidence/desktop-note-wikilink-active.png) | hover/focus preview and second `打开笔记` link |
| Admin | [`desktop-admin-full.png`](evidence/desktop-admin-full.png) | 6 rows；5 Published rows expose retract + completion ID + 完成小节 |
| Draft Preview | [`desktop-preview-draft-full.png`](evidence/desktop-preview-draft-full.png) | authenticated Draft renderer, PRIVATE PREVIEW banner, long-form Markdown/code reality |

### Mobile — 390 × 844 class

| Evidence | File | What it proves |
|---|---|---|
| Home | [`mobile-home-full.png`](evidence/mobile-home-full.png) | no page overflow；Graph map itself disappears；Cards stack vertically |
| Graph/Search/Tracks | [`mobile-home-graph.png`](evidence/mobile-home-graph.png), [`mobile-home-search.png`](evidence/mobile-home-search.png), [`mobile-home-tracks.png`](evidence/mobile-home-tracks.png) | Graph does not reflow with visible node labels；Search full width；Track Cards not a wrapping directory |
| Track | [`mobile-track-programming-full.png`](evidence/mobile-track-programming-full.png) | no horizontal overflow；legacy Note Cards / Section navigation remain |
| Note full/header/reading | [`mobile-note-full.png`](evidence/mobile-note-full.png), [`mobile-note-header.png`](evidence/mobile-note-header.png), [`mobile-note-reading.png`](evidence/mobile-note-reading.png) | readable 351px body；legacy return/meta/tags remain |
| Note tree drawer | [`mobile-note-drawer-open.png`](evidence/mobile-note-drawer-open.png) | modal DirectoryTree drawer exists, directly conflicting with Closure |

Machine-readable observations are in [`current-reality.json`](evidence/current-reality.json)。

## 6. Interaction evidence

### Graph

- Resting node fill: magenta `rgb(237, 82, 203)`。
- Hover node fill: saffron `rgb(255, 184, 41)` and radius grows from 4.2 to about 7px。
- Node is a direct Note anchor and keyboard-focusable；focus outline is 2px solid。
- Hover/focus does not highlight direct relation lines and Track directory does not cooperate with Graph regions。
- Mobile hides the map instead of reflowing readable nodes/relations。

### Search

- Current CSS position is `sticky`。
- Query `vibe` produces one anchored result and sets `aria-expanded=true`。
- ArrowDown sets `aria-activedescendant=learn-suggestion-0` and selects the expected Note。
- Escape closes the result list。
- While query is active, `.learn-home-content` becomes `display:none`；Graph/Track/Recent authority is removed from the page。
- Current search index omits Section。

### Wikilink

- Hover and keyboard focus show target title/excerpt preview。
- First click is intercepted: pathname remains the same。
- Preview contains a second `打开笔记 →` link。
- This proves direct click/Enter/touch destination semantics are not implemented。

### Mobile DirectoryTree

- Toggle opens a modal dialog；focus moves to `← 关闭目录`。
- Drawer/focus behavior is internally coherent, but the entire capability is Superseded by Related Notes post-body reflow。

### Reduced motion / focus

- Drawer transition becomes `0s` under `prefers-reduced-motion: reduce`。
- Graph node and shared interactive focus rings remain visible。
- No infinite graph motion/pulse was observed。

## 7. Thirteen-family visual / implementation drift matrix

| Surface family | Overall current reality | Highest-risk drift | Likely implementation locus | Migration dependency? | Web visual judgement needed? |
|---|---|---|---|---|---|
| Opening | Cream opening but legacy identity/process copy/count pill | Public Learn still presented as Learning Records | `index.astro`, `learn.css` | No | Yes — final optical hierarchy |
| Knowledge Map / Graph | Standalone black rounded dashboard panel with magenta/saffron radial graph | Wrong universe, no Track macro orientation, no relation highlighting, public diagnostics | `KnowledgeGraph.astro`, `learn-data.ts`, `learn.css` | Yes — lifecycle filtering, relation dedupe/validation | Yes — primary visual judgement |
| Track Directory | Separate 3-column Full Track Cards | Competes with Graph instead of sharing Knowledge Map | `TrackCard.astro`, `index.astro`, `learn.css` | Active Track validation | Yes |
| Search | Sticky centered section; active query hides Home | Utility has excessive homepage authority; Section missing | `LearnSearch.astro`, `learn.css` | Search data contract | Yes — placement/weight |
| Recent Knowledge | `RECENTLY REVISED / 最近更新`; five filled Note Cards sorted by raw modified time | Wrong temporal semantics and Card grammar | `index.astro`, `NoteCard.astro`, `learn-data.ts`, `learn.css` | High — publishedAt/revisedAt | Yes |
| Track Page | Count, internal copy, Section pills, Note Cards | Not neutral stable browse; no quiet bottom return | `[track].astro`, `NoteCard.astro`, `learn.css` | Ordering/catalog | Yes |
| Public Note Header | Returns Track; shows modified date/sourceUrl/tags; no Section context | Wrong parent/navigation and metadata entitlement | `[slug].astro`, `learn.css` | Lifecycle/frontmatter | Yes |
| Reading | Direct Cream reading, 760px body, clear typography and local dark code surfaces | Mostly reusable; long-note optical rhythm still needs judgement | `[slug].astro`, preview, `learn.css` | Low | Yes — reading polish only |
| Relations / Related Notes | Recursive DirectoryTree; mobile modal drawer | Entire semantic surface is Superseded | `DirectoryTree.astro`, `[slug].astro`, `learn-data.ts`, `learn.css` | Relation derivation + parent migration | Yes |
| Wikilink | Hover/focus preview exists but first click is intercepted | Preview replaces destination semantics; strong shadow and second CTA | `[slug].astro`, `remark-wikilinks.mjs`, `learn.css` | Relation integrity | Yes — preview optical treatment |
| Admin / Preview | Auth/noindex/no-store work; Admin is two-state with retract/completion | Active legacy Feed writer; no four-state lifecycle | `admin.astro`, preview, Worker Learn route | High / cross-module / external adapter | Limited — functional hierarchy after architecture |
| Responsive / Accessibility | No page overflow; reading reflows; focus/reduced motion work | Graph disappears, Track Cards stack, Directory drawer remains | `learn.css`, Graph, Note page | New relation/Graph structure | Yes — mobile Knowledge Map |
| Empty / Ending | Current non-empty corpus; source renders fake Graph in empty path; Track/Note endings incomplete | Migration may yield 0 corpus, but current empty treatment violates Closure | Home/Graph/Track/Note | Content migration/historical destination | Yes — confirm quiet final rhythm |

## 8. LHF-001–214 complete coverage

The complete atomic ledger is delivered separately to preserve auditability：

> [`lhf-coverage.md`](lhf-coverage.md)

It retains all 13 canonical groups and every ID from LHF-001 through LHF-214. No six-group or principle summary replaces it。

## 9. Drift classification and construction order

### Pure visual / composition drift

- dark Graph / magenta / saffron / rounded dashboard surface；
- Home hierarchy and legacy copy；
- Full Note / Track Cards and tag pills；
- Search weight；
- frameless row/hairline composition；
- Track/Note ending rhythm。

### Interaction drift

- Graph does not highlight direct relations or Track regions；
- mobile Graph disappears；
- Search hides Home；
- wikilink requires a second click；
- DirectoryTree mobile drawer exists instead of Related Notes reflow。

### Data / schema drift

- `draft`, `publishDate`, `lastModified`, `completionId`, `parentSlug`, `sourceUrl`；
- unknown Track fallback；
- raw `lastModified` ordering；
- no reciprocal relation normalization / broken-public-link validation；
- RSS/sitemap/public paths coupled to `!draft`。

### Cross-module / migration blocking

- D1 CHECK only accepts `learn_section_completed`；
- shared types/runtime parser/Feed label lock the same legacy event；
- `/api/learn/complete` remains an active writer；
- generic public-footprint helper maps Learn to completion；
- Learn manifest stores only `slug[]`；
- external publication webhook implementation is outside reviewed repository evidence；
- historical Learn footprint/destination state is unknown；
- production deployment ordering requires D1/Worker compatibility before new writer。

Implementation must follow Closure order L1 → L9. Visual screenshot needs do not authorize destructive schema/event/content changes out of order。

## 10. Migration / blocker map

| Blocker | Current fact | Required precondition before implementation action |
|---|---|---|
| Historical Learn Footprints (MR-08) | Repository cannot prove whether production D1 contains `learn_section_completed` rows | Read-only production D1 inventory; preserve IDs, snapshots, time, visibility and destinations |
| External publication adapter (MR-09) | Repository only shows HTTPS webhook seam/payload `{slug, action, requested_by}` | Locate and verify real handler/config before enabling new lifecycle writer |
| D1 event CHECK (MR-01) | Initial table constraint excludes new Learn event types | Additive table-rebuild migration + repeat-run/integrity contract before writes |
| Shared reader/type coupling | Type union, validator and Feed UI know only legacy completion | Worker/Feed accepts legacy + new before site writer cutover |
| Manifest v1 | Only published slug list; cannot distinguish publication/revision/maintenance | New v2 key/payload; first sync baseline emits 0 |
| Destructive lifecycle actions | Exact Superseded/Withdrawn destination UI remains Parked | Do not enable destructive action until historical destination gate is resolved |
| Content migration | Five invalid Published Notes may have historical Feed links | Check destination evidence before physical route removal |

## 11. Unresolved evidence gaps

These are genuine external/production gaps, not missing product decisions：

1. Production D1 Learn footprint inventory was not queried; production access was not authorized。
2. Current production `AUTH_KV learn:published-manifest` value/shape was not read。
3. Actual external Learn publication webhook handler/config was not found in this repository。
4. Production deployed Learn pages were not compared against the current branch; this report targets the current repository implementation requested by the Charter。
5. Exact Superseded/Withdrawn destination UI remains upstream Parked; no new design was invented。
6. Optical judgement—whether the future light Knowledge Field and page rhythm feel canonical—belongs to Web Visual Reality Check after this evidence package。

## 12. Current files likely affected by later implementation

### Module-local IA / visual / interaction

- `src/pages/learn/index.astro`
- `src/pages/learn/track/[track].astro`
- `src/pages/learn/notes/[slug].astro`
- `src/pages/learn/admin.astro`
- `src/pages/learn/preview/[slug].astro`
- `src/components/learn/KnowledgeGraph.astro`
- `src/components/learn/DirectoryTree.astro` (remove after callers migrate)
- `src/components/learn/LearnSearch.astro`
- `src/components/learn/NoteCard.astro`
- `src/components/learn/TrackCard.astro`
- `src/components/learn/learn-data.ts`
- `src/components/learn/learn.css`
- `src/lib/remark-wikilinks.mjs`

### Schema / content / authoring

- `src/content.config.ts`
- `src/data/learn/**/*.md`
- `src/pages/sitemap.xml.ts`
- `src/pages/blog/rss.xml.ts`
- `scripts/learn-import.mjs`
- `scripts/lib/learn-authoring.mjs`
- Learn contract/browser tests

### Lifecycle / Feed / migration

- `workers/feed-api/src/routes/learn.ts`
- `workers/feed-api/src/modules/footprints.ts`
- `workers/feed-api/src/adapters/feed-store.ts`
- activity-signal paths
- `shared/types.ts`
- a new D1 migration (do not rewrite the applied initial migration)
- `src/components/feed/FeedApp.tsx`
- `scripts/learn-publication-manifest.mjs`
- production publication workflow/contracts
- external publication adapter outside current repository once located

This is an impact map, not authorization to modify all listed files in one batch。

## 13. Stage 0 boundary statement

- No Product / Architecture / IA / Visual / Interaction decision was reopened。
- No new Track, Graph, lifecycle, copy system, layout, component family, Mission UI, DeepTutor UI, private LMS, fake content, or fake empty-state object was invented。
- No substantial Learn implementation was performed。
- Runtime/source/content/Worker/Feed/production files were not changed。
- The only repository writes are this Stage 0 evidence package under `.scratch/learn-visual-reality-check/`。
- Work stops here pending Web Learn Product Session's **Accepted Visual / Implementation Delta**。
