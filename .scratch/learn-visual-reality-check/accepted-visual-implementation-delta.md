> Evidence copy. Canonical private source: `D:\catstarry-learn-private\Learn-Accepted-Visual-Implementation-Delta-2026-08-12.md`

# Learn Accepted Visual / Implementation Delta — 2026-08-12

**Project:** `catstarry.xyz`
**Module:** Learn
**Stage:** Visual Reality Check complete → implementation authorized locally
**Task branch:** `task/learn-visual-reality-check`
**Stage 0 evidence HEAD:** `393c9cb1905bd46e485d9d0a277300859b15c9db`
**Private canonical Learn ref:** `muxia51821/catstarry-learn-private` → `main@e86993de9521b074f902e3cefe8be643b609d056`

---

# 0. Purpose

This is the **single downstream implementation delta** produced after the Web Visual Reality Check.

It does **not** replace, summarize away, or reopen:

- `Learn Product Synthesis.md`
- `catstarry.xyz — Learn Closure Package.md`
- `LEARN-PROGRAM.md`
- the complete `LHF-001–214` ledger
- Family Contract / Master Ledger / ADR authority

It records only:

1. accepted visual / interaction decisions made after inspecting Stage 0 rendered reality;
2. implementation targets needed to make those decisions concrete;
3. latest A0 amendments that supersede a small number of earlier implementation assumptions;
4. evidence required for final acceptance.

Do **not** create another large design brief, closure package, or parallel requirements document.

At the beginning of implementation, save this Delta into the existing task evidence area if it is not already there:

```text
.scratch/learn-visual-reality-check/accepted-visual-implementation-delta.md
```

Then continue the **same Learn Codex session / same task branch**. Do not restart discovery or Stage 0.

---

# 1. Authority and conflict order

Use this order:

## A0 — Latest explicit user decisions

This Delta contains the accepted Pass A–D decisions and is the latest authority where it explicitly amends an older item.

## A1 — Canonical Learn Closure

Read in full from private Learn:

```text
repo: muxia51821/catstarry-learn-private
ref:  main@e86993de9521b074f902e3cefe8be643b609d056

catstarry.xyz — Learn Closure Package.md
Learn Product Synthesis.md
```

The Closure remains canonical everywhere not explicitly amended here.

## A2 — Current Private Learn architecture/runtime truth

Read:

```text
LEARN-PROGRAM.md
```

Important retained boundary:

```text
Externalize teaching execution;
retain learning authority and durable knowledge.
```

Private Teach workspace / DeepTutor / Mission / Batch / Lesson / Learning Record are **not Public Learn IA**.

## A3 — Family governance / ADR / architecture

Use current repository governance and accepted ADRs as implementation constraints.

## A4 — Current code

Current code is **implementation reality only**, never authority over accepted Product / IA / Visual truth.

---

# 2. Stage 0 reality that must remain understood

Stage 0 proved current Learn is systemically drifted, not merely in need of polish.

Current implementation reality:

```text
LEARNING RECORDS
+ dark standalone Graph
+ sticky Search
+ Recent cards
+ separate Track cards
+ Note DirectoryTree
+ completion/retract Admin semantics
```

Accepted target:

```text
Identity
→ Knowledge Map = Track × Graph
→ Recent Knowledge
→ Track browse
→ durable Public Note reading
→ explicit relation navigation
```

Reusable current primitives include:

- Cream Canvas;
- ~760px reading measure;
- Markdown renderer;
- local dark code blocks;
- focus primitives;
- preview auth / no-store / noindex;
- useful Search keyboard primitives;
- current no-page-wide-overflow baseline.

Do not preserve invalid legacy surfaces merely because they already work technically.

Current source corpus is migration-before reality:

- 6 Markdown Notes total;
- 5 current `draft:false` Notes are not canonical retained public corpus;
- `domain-dns-http` is the canonical retained Draft after metadata migration;
- Typing is Revalidate;
- current rich Graph screenshots are **not** target corpus evidence.

Do not keep invalid Notes merely to make the Graph look full.

---

# 3. Execution posture

## 3.1 Do not be over-defensive

When context is missing from the active window:

1. reconstruct it from project files;
2. inspect repository state;
3. read Stage 0 evidence;
4. read current checkpoint / handoff / canonical private Learn;
5. only stop if a genuinely necessary fact cannot be discovered and a reasonable assumption would be risky.

Do not repeatedly say “I will not assume” when the answer can be recovered from durable project evidence.

For:

- reading;
- checking;
- analysis;
- extraction;
- locating;
- comparing;
- tracing dependencies;
- summarizing;
- generating reports;
- screenshots;
- proposing patches;

proceed directly.

This handoff **authorizes local working-tree implementation** on the existing task branch. Do not ask for confirmation for every local source edit.

Still require explicit user authorization before operations that change external or durable state beyond the authorized local task work, including:

- commit;
- push;
- merge;
- deploy;
- production D1 writes / applied migrations;
- production KV writes;
- remote history rewrite;
- destructive content removal that can break historical destinations.

Read-only production inspection may proceed when existing credentials/tooling make it available. Do not treat read-only inspection itself as a reason to stop and request redundant confirmation.

## 3.2 Subagents

Use subagents when they are genuinely useful, for example:

- dependency tracing;
- LHF cross-checking;
- visual evidence review;
- responsive regression review;
- migration-readiness analysis;
- independent diff review.

They are **optional**.

Do not refuse or pause the task merely because subagents are unavailable.

The primary agent retains integration responsibility and final judgement. Do not delegate Product authority to a subagent.

## 3.3 Avoid defensive overengineering

Do not:

- add new governance layers;
- create a CMS because it may someday be useful;
- invent new lifecycle semantics;
- build large-corpus Graph machinery without evidence;
- introduce multi-Track Notes;
- add typed relations;
- add progress / LMS semantics;
- add DeepTutor UI to Public Learn;
- add fake content to satisfy screenshots.

Prefer the smallest implementation that fully satisfies the accepted Product / Visual contract.

---

# 4. Pass A — Home / Knowledge Map accepted delta

Relevant canonical families:

```text
LHF-001–010   Opening
LHF-011–048   Knowledge Map / Graph
LHF-049–060   Track Directory
LHF-061–076   Search
LHF-077–094   Recent Knowledge
+ relevant responsive / empty items
```

## A1 — Opening

### Implement

Keep:

- `← 返回星图`;
- H1 `Learn`;
- Cream Gallery;
- restrained, non-hero entry;
- opening measure narrower than Knowledge Map.

Use the canonical opening motto:

```text
循此苦旅，可抵繁星。
Per aspera ad astra
```

### Remove

- `LEARNING RECORDS`;
- public Note count pill;
- process-log language;
- category eyebrow;
- hero illustration.

### Render target

At a `1440 × 900–1000` class desktop viewport:

- Opening should feel roughly `180–220px` class;
- it must have air but not behave like a large hero;
- Knowledge Map must become the main visual object quickly.

These numbers are implementation targets, not immutable product schema.

## A2 — Home hierarchy

Canonical order:

```text
Identity
↓
Knowledge Map = Track × Graph
↓
Recent Knowledge
↓
natural whitespace
```

Search is secondary utility.

At normal desktop height, the user should understand:

1. this is Learn;
2. Knowledge Map is the main task;
3. Recent Knowledge exists below.

Recent Knowledge should begin to enter or clearly approach the first viewport bottom.

Do not turn Graph into a full-screen visualization app.

## A3 — Knowledge Map is one orientation system

Track Directory and Graph are **not separate competing modules**.

Do not implement:

```text
Graph Card
+
Track Card Grid
```

Implement one continuous Knowledge Map region:

```text
Knowledge Map heading + Search
Track textual directory
Graph relation field
```

Track provides categorical/domain orientation.

Graph provides relational/exploratory orientation.

Neither is the parent of the other.

## A4 — Track Directory

Default desktop state:

```text
Programming    Finance    Anthropology    ...
```

### Count behavior

Latest accepted decision:

- Note count is **hidden by default**;
- desktop mouse hover and keyboard focus reveal a low-weight count;
- count reveal must not cause visible layout shift;
- mobile does not add a second tap merely to reveal count.

Example:

```text
Programming  12
```

Count is auxiliary information, not Track identity.

### Visual treatment

- plain text links;
- no pills;
- no Cards;
- no category-color taxonomy;
- natural wrapping;
- default Track text low/medium weight;
- hover/focus → Klein Blue.

Track hover/focus may emphasize the corresponding spatial cluster.

Track hover must **not** fabricate active relation edges.

Click → Track page.

## A5 — Graph surface

Graph belongs directly to Cream Gallery.

### Remove

- black cosmic panel;
- `home-void`;
- magenta node theme;
- saffron hover;
- rounded dashboard Card identity;
- shadow;
- glow;
- diagnostic counts;
- animated drift;
- pulse;
- gamified/scored appearance.

### Accepted surface

> Continuous Cream / warm-neutral Knowledge Field.

Thin structural hairlines or extremely subtle spatial tonal treatment are allowed when functionally useful.

Do not draw a visible “Graph Card”.

## A6 — Graph layout model

Accepted implementation direction:

> **deterministic Track-aware soft clustering**

Use the semantic model:

```text
primary Track
→ weak spatial attraction

explicit relations
→ relational attraction

label readability / collision
→ placement constraint
```

Formal guard:

> **Track influences spatial orientation; it does not constrain graph topology.**

### Required behavior

- each Public Note has one primary Track;
- Track is weak spatial gravity, not a hard box;
- Track regions may visually interpenetrate;
- cross-Track relations may directly cross regions;
- bridge Notes may naturally sit near region boundaries;
- never duplicate a Note because it relates to multiple Tracks;
- same-Track and cross-Track relations use the same relation semantics;
- do not introduce a special “cross-domain relation type”.

Do not return to free/radial constellation layout.

## A7 — Graph nodes / labels / edges

Initial visual implementation targets:

### Node

```text
resting visual diameter     ≈ 5px
hover/focus visual diameter ≈ 6px
```

Latest accepted decision:

- node should enlarge on interaction;
- roughly `+1px` is the intended first target;
- do not bind permanently to the old 4.2px baseline.

All Published Notes are equal by default.

Do not size nodes by:

- importance;
- popularity;
- progress;
- relation count.

### Label

Target:

```text
desktop ≈ 14–15px
mobile  ≈ 13–14px
```

Requirements:

- title visible by default;
- no hover-only title;
- no forced uppercase;
- no Track category color;
- default dark text;
- hover/focus title → Klein Blue.

Long titles should prefer readable wrapping over aggressive ellipsis.

Layout should account for real label bounds.

### Edge

Default:

```text
~1px warm-neutral hairline
```

Direct active relation:

```text
Klein Blue
~1.5px target
```

Use gentle, functional curvature only where it helps:

- avoid label collision;
- avoid exact edge overlap;
- make long cross-Track connections readable.

Do not use:

- decorative S-curves;
- arrows;
- dash types;
- edge-type colors;
- edge bundling v1;
- glow.

### Focus

Keyboard focus must remain clearly visible, approximately 2px class.

Interaction state should combine:

- ~+1px node growth;
- title Klein Blue;
- direct relation Klein Blue;
- visible focus ring.

Unrelated nodes may softly de-emphasize.

## A8 — Graph collision / density priorities

Priority order:

```text
Readable labels
>
Node separation
>
Relation legibility
>
Graph visual symmetry
```

Do not sacrifice readable Note titles to make the graph geometrically pretty.

Allow genuine unevenness:

- dense knowledge areas;
- sparse knowledge areas;
- bridge nodes;
- whitespace.

Do not make the Graph look like decorative constellation wallpaper.

## A9 — Track region strength

Default region identity should come primarily from:

1. Track label;
2. spatial clustering;
3. whitespace.

Do not default to large colored region backgrounds or bordered Track rectangles.

Track label target:

```text
~12–13px class
muted
regular / medium
```

Track hover/focus may:

- turn Track text Klein Blue;
- reveal count;
- emphasize matching node/labels;
- lightly de-emphasize unrelated clusters.

An extremely light warm-neutral spatial wash is allowed only if screenshots prove geometry alone is insufficient.

Color reinforces geometry; it does not define Track identity.

## A10 — Graph size

Use bounded, content-aware density rather than a permanent viewport hero.

Rendered targets:

```text
Sparse corpus   ~320–380px
Normal corpus   ~400–480px
Dense corpus    ~500–560px maximum target
```

Knowledge Map overall desktop target:

```text
~500–620px class
```

Do not implement a Graph that grows indefinitely with node count.

Do not implement full-screen Graph.

Large-corpus Graph scaling remains **Parked** until real evidence exists.

## A11 — Cross-Track acceptance fixture

Implementation evidence must include at least one real/test fixture where:

```text
Programming
● A ───────────────── ● B
                       Finance
```

Verify:

- B is not duplicated;
- edge semantics do not change because it crosses Track;
- Track clusters remain understandable;
- bridge relation is visible;
- hover/focus A activates the cross-Track relation correctly;
- Track hover highlights region, not relation.

## A12 — Search

Desktop:

- non-sticky;
- compact;
- target width roughly `240–300px`;
- lives near Knowledge Map heading;
- visually secondary to heading / Graph.

Mobile:

- full available width.

Search indexes:

- title;
- Track;
- Section;
- tags.

No body full-text search in v1.

Keep useful existing keyboard behavior:

- Arrow Up / Down;
- Enter;
- Escape;
- outside click.

Critical fix:

> Active search must **not hide the Home**.

Graph / Tracks / Recent remain structurally present.

## A13 — Recent Knowledge

Maximum:

> **5 rows**

No complex adaptive rule.

Structure:

```text
修订 · 08.11      Title
                  excerpt
                  Programming · Web 基础
────────────────────────────────────────
```

or:

```text
发布 · 08.08      Title
                  excerpt
                  Track · Section
```

Hierarchy:

```text
Title            primary
Excerpt          secondary
Track / Section  tertiary
event/date       low weight
```

Remove:

- cards;
- tag pills;
- shadows;
- lift;
- explicit CTA;
- raw maintenance `lastModified`.

Whole row may be internally clickable.

Hover/focus should primarily change Title → Klein Blue.

## A14 — Mobile Knowledge Map

Mobile must preserve the **same Graph capability**.

Do not:

- hide the graph;
- replace it with a generic list;
- scale/clamp a desktop SVG;
- require horizontal page scroll;
- simulate hover.

Use portrait-specific layout:

- same nodes;
- same relations;
- same primary Tracks;
- Track clusters reflow vertically;
- visible labels remain;
- cross-Track relations remain expressible.

Normal target:

> roughly `0.8–1.2` mobile viewport heights.

Do not allow Graph to become an uncontrolled multi-screen tunnel.

Visible node size and touch target are separate concepts: keep subtle visual dots while providing comfortable hit areas.

Tap Node → Note.

Tap Track → Track page.

## A15 — Empty / sparse corpus

### 0 Public Notes

Legal and expected.

Render:

```text
Learn

循此苦旅，可抵繁星。
Per aspera ad astra

暂时还没有公开的学习笔记。
```

Do not render:

- fake Graph;
- empty Graph frame;
- fake Track;
- Search;
- empty Recent section;
- CTA;
- onboarding;
- “知识正在生长”.

### 1–2 Notes

Render real nodes.

Do not:

- inflate node size;
- force large Graph height;
- invent relations.

## A16 — Corpus evidence guard

Pilot 01 and Pilot 02 are legitimate **future Public Note source-evidence pools**.

They may later produce Public Notes only through:

```text
private evidence
→ editorial synthesis
→ Public Note
```

They do **not** authorize:

- publishing Pilot / Mission / Batch / Lesson / Learning Record as public objects;
- directly copying Reference HTML as Public Notes;
- manufacturing content to make Graph screenshots look rich.

Near/medium-term corpus growth is evidenced.

Large-corpus scaling is not.

---

# 5. Pass B — Track / Public Note / Reading / Relations accepted delta

Relevant canonical families:

```text
LHF-095–114   Track Page
LHF-115–130   Public Note Header
LHF-131–147   Reading
LHF-148–160   Relations / Related Notes
LHF-161–171   Wikilink
+ relevant responsive / ending items
```

## B1 — Track Page identity

Remove legacy:

- `TRACK / slug`;
- top count pill;
- `PUBLISHED NOTES`;
- “轨道笔记” duplication;
- “按最后更新时间倒序排列”;
- Section pills;
- Note Cards;
- recent-update chronology.

Use:

```text
← 返回 Learn

Programming
Track description

Web 基础 · Git · PowerShell

Web 基础
────────────────────────────
Note title
Excerpt
────────────────────────────
...
```

Section navigation:

- plain textual anchors;
- natural wrapping;
- no pills;
- no persistent filter.

Ordering:

- deterministic;
- stable locale/title ordering is acceptable v1;
- not recent chronology.

Latest accepted decision:

- no top Note count;
- no Note date in Track index.

Track page answers:

> “What durable knowledge exists in this domain?”

not:

> “What changed recently?”

## B2 — Track wide / foldable layout

Do **not** hard-code Track Page as a 960px permanent shell.

Use:

> **fluid shell + bounded row content**

Rendered target:

```text
normal desktop effective browse field  ~900–1000px
wide / unfolded foldable                may expand ~1120–1180px
```

Extra horizontal space should improve:

- whitespace;
- Section/row composition;
- excerpt readability.

Do not convert Track Page into:

- 2-column Note grid;
- 3-column Cards;
- full-width stretched prose.

Ultra-wide screens remain centered.

## B3 — Public Note header

Primary return:

```text
← 返回 Learn
```

Not Track.

Header order:

```text
Programming · Web 基础
first publication date
substantive revision date (only if present)

H1

Excerpt
```

No ontology breadcrumb.

Do not show publicly:

- Mission;
- Batch;
- completion;
- sourceUrl;
- tags by default;
- maintenance modified date.

First publication marker is stable.

Revision date changes only on substantive revision.

Header may be slightly wider than body.

Target:

```text
header ~800–880px class
body   ~720–760px
```

Again, these are visual targets, not schema.

## B4 — Note responsive shell

Use a **fluid outer layout + bounded reading measure**.

Principle:

> Wide screens expand structure, not reading line length.

### Wide

Target:

```text
Related rail   ~180–220px
Gap            ~56–80px
Reading        ~720–760px
```

Whole reading object remains visually centered.

### Medium / foldable

When space tightens:

```text
Related rail   ~150–180px if still healthy
Gap            ~32–48px
Reading        protected first
```

### Narrow

When the rail begins to damage reading quality:

```text
Header
Article
Related Notes
Return Learn
```

Do not preserve a desktop rail by squeezing the article into an unhealthy width.

Rule:

> **Reading measure priority …1891 tokens truncated… Git-backed content workflow / Codex under user authorization.

Use compatible lifecycle reader during migration.

Do not collapse four-state semantics back to `draft:boolean` as the final model.

Do not restore:

```text
Published → Draft
```

semantics.

## C3 — LHF-176 explicit amendment

Earlier Closure:

```text
LHF-176 = Draft action = Preview / Publish
```

Latest A0 decision supersedes the Web action portion for v1:

```text
LHF-176 → SUPERSEDED BY ACCEPTED DELTA
Admin v1 Draft action = Preview only
Publication mutation remains Git/Codex-backed
```

This is not an implementation omission.

Update the final LHF reconciliation ledger accordingly.

## C4 — Remove completion / retract semantics

Remove from active Admin UI and writer path where safe within the dependency sequence:

- `完成小节`;
- completion ID;
- learning progress;
- old retract semantics.

Do not rename “完成小节” into another public completion concept.

The concept disappears from Public Learn.

The legacy event may remain readable historically until migration/Feed cutover is safely complete.

## C5 — Destructive lifecycle actions

Supersede / Withdraw remain valid lifecycle semantics, but Web Admin actions are **not implemented v1**.

Do not create disabled fake buttons that look nearly usable.

Do not invent final redirect / tombstone / archive UI.

Exact historical destination behavior remains gated by migration evidence.

## C6 — Preview is core

Preview remains a required capability because v1 publication flow is:

```text
Private Learn evidence
→ editorial synthesis
→ Codex materializes Public Note Markdown Draft
→ Preview
→ user review / acceptance
→ Codex/Git publication mutation under authorization
→ deploy
→ production publication truth
→ manifest / Feed projection
```

Preview is not evidence that the Web Admin is a CMS.

## C7 — Preview parity

Preview must use the same Public Note rendering grammar:

- same Note header;
- same reading typography;
- same local knowledge surfaces;
- same responsive behavior;
- same Wikilink rendering;
- same relation presentation where applicable.

Only owner/private chrome differs:

```text
PRIVATE PREVIEW · DRAFT
← 返回 Learn 管理
```

The private banner must be obvious enough to avoid confusion with production, but it must not distort the actual Public Note layout.

Preview vs Public must be compared using the **same fixture**.

## C8 — Preserve Preview safety

Keep:

- authentication;
- private/no-store;
- noindex/nofollow/noarchive;
- Draft visibility only in authenticated preview;
- return to Learn Admin.

Do not weaken these while sharing the renderer.

Simple failure states are sufficient.

No illustration / onboarding.

## C9 — External publication adapter is not a v1 Admin blocker

Stage 0 found that the repository only proves an HTTP webhook seam, not the external materializer implementation.

Because v1 Admin is now read-only:

- do not build around the old webhook;
- do not enable old Publish / Retract semantics;
- do not spend the entire implementation blocked on making that external adapter the new authority.

If the old seam must be touched to remove legacy active UI/writers, inspect it.

Otherwise treat the Web publication adapter as future/Revalidate capability.

This does **not** remove the need to correctly implement the Git/deploy publication manifest and Feed contract later in the accepted dependency sequence.

---

# 7. Pass D — Cross-surface accepted delta

Relevant canonical families:

```text
LHF-189–204   Responsive / Accessibility
LHF-205–214   Empty / Ending
```

## D1 — Responsive is space-driven

Use three conceptual modes:

```text
Wide
Medium
Narrow
```

Do not encode product meaning as:

```text
desktop > 820
mobile <= 820
```

Decisions should be based on whether the composition still has healthy usable inline space.

Test at least:

```text
390px phone class
~768px narrow tablet / split-screen class
~1000px medium / foldable class
1440px desktop
1600–1800px wide desktop
200% browser zoom
```

Avoid dead zones where desktop layout is already broken but narrow layout has not activated.

## D2 — Wide screens expand structure, not reading line length

Home:

- Graph may use a wider spatial field.

Track:

- browse field may widen;
- remains single-column index.

Note:

- reading measure remains bounded;
- extra space serves relation rail / gap / breathing room.

Admin:

- stays functional;
- does not become a large dashboard.

## D3 — One relation truth across surfaces

Use one normalized Public Note relation model for:

```text
Home Graph
Related Notes
Wikilink
```

Example:

```text
A [[B]]
B [[A]]
```

Graph projection = one normalized relation.

A Related Notes = B once.

B Related Notes = A once.

Authoring direction may remain in source links.

Do not create three independent relation systems.

Klein Blue is the shared interaction/active-relation vocabulary.

Graph, rail, and Wikilink may have different layouts because they serve different navigation contexts.

## D4 — Track meaning is consistent everywhere

Track appears in:

- Home Track directory;
- Graph spatial orientation;
- Track Page;
- Note context;
- Related cross-Track context;
- Search result.

Meaning is always:

> durable learning domain / categorical orientation.

Never:

- curriculum;
- Note parent;
- colored taxonomy badge;
- ontology breadcrumb.

Use plain text vocabulary across surfaces.

## D5 — Three visual surface levels

Use this coherent model:

### Knowledge Field

Home / Track browse:

- wider;
- relational;
- orienting.

### Reading Field

Public Note:

- narrow;
- stable;
- durable long-form reading.

### Functional Local Surface

Examples:

- code;
- diagram;
- scenario;
- table;
- Wikilink preview;
- Admin row.

Boundaries are allowed when functionally justified.

What is rejected is generic “everything becomes a Card” grammar.

## D6 — Interaction vocabulary

Primary interaction language:

- Klein Blue;
- visible focus ring;
- short restrained transitions;
- ~+1px node growth;
- lightweight preview appearance.

Do not add:

- floating;
- pulse;
- infinite Graph motion;
- glow;
- decorative parallax.

Reduced motion removes nonessential transition while preserving state clarity.

## D7 — Hover is enhancement only

Desktop-only hover enhancements include:

- Track count reveal;
- Track cluster emphasis;
- Graph relation highlight;
- Wikilink preview.

Essential information must still exist without hover.

Mobile:

- no hover simulation;
- Track tap → Track;
- Node label visible;
- Node tap → Note;
- Wikilink tap → Note.

## D8 — Empty / sparse state

0 corpus:

- keep Learn Identity;
- show canonical empty copy;
- hide corpus-dependent Search / Graph / Tracks / Recent;
- no fake content;
- no CTA;
- no onboarding.

Sparse corpus:

- use real Notes;
- no fake relation;
- no inflated visual drama.

Track with no Published Notes should not become an active public Track.

If a stale/transitional empty Track route is encountered, simple state + return Learn is enough.

## D9 — Ending

Home:

> Recent ends → natural whitespace.

Track:

> quiet `← 返回 Learn`.

Note:

> related navigation when applicable + `← 返回 Learn`.

Do not add a footer just to make the page feel “finished”.

## D10 — LHF-214 remains Revalidate

Do **not** mark:

```text
LHF-214 Shared Footer
```

as PASS.

Final status remains:

```text
REVALIDATE
```

It is a Family-level question, not a Learn implementation blocker.

## D11 — Accessibility

Final manual acceptance must prove behavior, not merely source presence.

Test:

- Track directory keyboard reachability;
- Search keyboard semantics;
- Graph node keyboard focus;
- Track page anchors;
- Note links;
- Wikilinks;
- Related Notes;
- Admin Preview link.

Graph:

- visible labels;
- touch hit area larger than visual dot where needed;
- identity not color-only.

Wikilink:

- focus may show preview;
- Enter still navigates directly.

200% zoom:

- no essential information loss;
- no page-wide horizontal overflow.

## D12 — Long-text robustness

Ordinary text must wrap:

- Scenario;
- Callout;
- Related Notes;
- Admin status;
- excerpt;
- Track description;
- Search result.

Only local width-preserving structures may scroll horizontally.

Parent surface and page must remain free of horizontal scroll.

This is a hard acceptance condition.

---

# 8. Publication / lifecycle implementation boundary

Do not confuse product lifecycle with publication UI.

Current v1 publication authority:

```text
Git-backed content workflow / Codex
under user authorization
```

Successful production deployment is the real public boundary.

Desired lifecycle semantics:

```text
Draft
Published
Superseded
Withdrawn
```

Desired temporal semantics:

```text
publishedAt
= first real publication marker
= set once

revisedAt?
= latest substantive revision marker
= maintenance edits do not touch it
```

Do not create fake publication dates on Draft creation.

Feed contract remains:

```text
First Publication      → Feed
Substantive Revision   → Feed
Maintenance Edit       → silent
```

No:

- Mission Feed event;
- Batch Feed event;
- Lesson Feed event;
- DeepTutor completion Feed event;
- mastery Feed event.

---

# 9. Migration and dependency guards

Stage 0 confirmed real external/migration gaps.

Do not turn visual implementation into permission for destructive migration.

## MR-08 — Historical Learn Footprints

Production D1 historical `learn_section_completed` inventory is unknown.

Before physically removing old Public Note destinations or applying destructive lifecycle migration:

- perform read-only inventory when access is available;
- preserve historical footprint IDs, snapshots, time, visibility, and destination semantics.

Do not guess production is empty.

## MR-09 — External Admin publication adapter

No longer a blocker for Admin v1 because Admin is read-only.

Do not reactivate it as hidden authority.

## D1 event compatibility

Before any new `learn_note_published` / `learn_note_revised` production writes:

- migration must accept new event types;
- legacy `learn_section_completed` remains readable;
- shared parser/types/Feed UI must accept both.

## Manifest v2

Old Learn manifest only stores slug list and cannot distinguish:

- first publication;
- revision;
- maintenance.

New manifest must support accepted temporal semantics.

First v2 sync:

> baseline only, zero new Feed events.

## Content migration

Do not physically remove the five invalid current Published Note routes until historical destination evidence is resolved.

Use fixtures / controlled test data for visual acceptance instead of retaining invalid public Notes for fullness.

## Track validation

Undeclared Track must fail validation.

Do not auto-create a public Track via fallback.

---

# 10. Implementation sequencing

Respect the intent of the canonical dependency map and do not activate writers or destructive migration out of order.

Canonical sequence remains conceptually:

```text
L1 Production Evidence Preflight
L2 Feed Storage Compatibility
L3 Feed Reader Compatibility
L4 Public Learn Data Model Compatibility
L5 Public IA Structural Implementation
L6 Visual / Interaction Implementation
L7 Admin / Preview
L8 Lifecycle Manifest v2
L9 Content Migration
L10 Learn Acceptance
L11 Content Family Integration
```

Latest A0 amendment to L7:

```text
Admin v1 = read-only inventory + Preview
no Web publication writer
```

### Practical execution rule

Do not use one unavailable external fact as an excuse to stop all independent work.

At the point a dependency actually matters:

- do not apply production writes without the gate;
- do not delete historical destinations without evidence;
- do not activate new Feed writers before compatibility;
- continue independent local compatibility / IA / visual / Preview work that does not violate those gates;
- record a blocker only for the dependent action, not for the entire task.

Do not polish around wrong semantic structure.

Structural model should pass before final visual tuning.

---

# 11. Implementation guards — explicit “do not restore” list

Do not restore or invent:

- Public Mission;
- Public Batch;
- Public Lesson identity;
- public Learning Record;
- learning progress;
- completion;
- gamification;
- prerequisite arrows;
- typed relation ontology;
- relation scoring;
- recommendation algorithm;
- multi-Track Note v1;
- parent/child Note tree;
- DirectoryTree;
- mobile Directory drawer;
- Graph black universe;
- magenta/saffron Learn theme;
- separate large Track Card grid;
- sticky authoritative Search;
- Search that hides the Home;
- Blog Paper clone;
- Public tags by default;
- raw `lastModified` public chronology;
- Public sourceUrl metadata;
- Web CMS / deploy dashboard;
- DeepTutor/private learning controls in Public Learn;
- fake corpus / fake Track / fake Graph nodes;
- Shared Footer decision.

---

# 12. Required implementation evidence

Do not return only code diffs or “tests pass”.

The final implementation handoff must include rendered evidence and interaction evidence.

## 12.1 Home / Knowledge Map

Capture at minimum:

1. `1440×1000` Home full viewport;
2. desktop Knowledge Map resting;
3. Node hover;
4. Node keyboard focus;
5. Track hover/focus + count reveal with no layout shift;
6. cross-Track relation fixture;
7. active Search with Home still present;
8. Recent Knowledge 5-row state;
9. `390×844` complete Home + portrait Graph;
10. 0-Published-Note Home;
11. sparse-corpus Home.

## 12.2 Track

Capture:

1. 1440 class;
2. 1600–1800 wide;
3. ~1000 foldable/medium;
4. ~768 narrow/split;
5. 390 mobile.

Verify:

- no top count;
- no Note date;
- no pills;
- no cards;
- stable single-column browse;
- bottom return Learn.

## 12.3 Public Note

Capture:

1. desktop with relations;
2. desktop with zero relations;
3. wide desktop;
4. medium/foldable;
5. 390 mobile;
6. long-form Pilot-derived fixture.

Long-form fixture must exercise:

- H2/H3;
- prose;
- table;
- code / diagram;
- Scenario;
- Callout;
- References;
- long URL / SHA.

Verify:

- 720–760 reading measure target;
- no Blog Paper object;
- ordinary text boxes never show horizontal scrollbar;
- only local code/table/diagram may scroll;
- page never scrolls horizontally;
- Related rail disappears correctly at zero relations;
- Related moves post-body when narrow.

## 12.4 Wikilink

Evidence:

1. hover preview;
2. keyboard-focus preview;
3. click direct navigation;
4. Enter direct navigation;
5. mobile tap direct navigation;
6. preview clamped near viewport edge.

## 12.5 Admin / Preview

Evidence:

1. desktop Admin read-only list;
2. 390 Admin;
3. Draft state row;
4. Published state row;
5. no Publish button;
6. no Retract;
7. no completion UI;
8. Draft Preview desktop;
9. Draft Preview mobile;
10. same fixture Preview vs Public renderer parity;
11. noindex/no-store/auth behavior.

## 12.6 Cross-surface / accessibility

Verify:

- 390;
- ~768;
- ~1000;
- 1440;
- ≥1600;
- 200% browser zoom;
- keyboard navigation;
- focus visible;
- reduced motion;
- no essential hover-only information;
- no page-wide horizontal overflow.

---

# 13. Validation commands / checks

Run current relevant validation and update tests for the new contract.

At minimum preserve or update:

```text
npm run site:typecheck
npm run test:learn:authoring
npm run test:learn:preview
npm run build
npm run test:site:browser
```

Also add/update focused tests where required for:

- lifecycle compatibility reader;
- Track validation;
- relation normalization/dedupe;
- Public wikilink target validity;
- Search Section indexing;
- Search active state not hiding Home;
- Preview/Public renderer parity where testable;
- no legacy completion writer on active Learn path;
- manifest v2 behavior when that stage is reached;
- first-sync baseline = zero Feed events;
- migration repeat-run/integrity when migration stage is reached.

A passing legacy test is not proof of Closure compliance.

---

# 14. LHF reconciliation requirements

The full `LHF-001–214` matrix remains the final atomic completeness ledger.

Do **not** compress it into a handful of design principles.

After implementation:

1. update every atomic item based on actual rendered / code / interaction evidence;
2. preserve explicit `BLOCKED`, `REVALIDATE`, and `SUPERSEDED` states;
3. do not call an entire family PASS because most items pass.

Important corrections:

## LHF-176

```text
SUPERSEDED BY A0 ACCEPTED DELTA
Admin v1 = Preview only
Git/Codex-backed publication mutation
```

## LHF-214

```text
REVALIDATE
```

Do not mark PASS.

## Stage 0 bookkeeping discrepancy

Stage 0 artifacts currently disagree:

```text
report.md:
PASS 121 / DRIFT 92 / BLOCKED 1

lhf-coverage.md:
PASS 122 / DRIFT 91 / BLOCKED 1
```

This totals 214 in both cases.

Do not rerun Stage 0 solely for this bookkeeping issue.

Fix the discrepancy when the LHF coverage is next updated after implementation.

Also correct any Stage 0 accidental treatment of LHF-214 as PASS.

---

# 15. Expected final Codex handoff

When implementation is complete locally, return:

## 1. Verdict

One of:

```text
READY FOR WEB ACCEPTANCE
READY WITH BLOCKED MIGRATION ITEMS
NOT READY
```

## 2. Files changed

Separate:

- module-local IA/visual;
- data/lifecycle compatibility;
- Admin/Preview;
- Feed/manifest/migration;
- tests;
- evidence artifacts.

## 3. Accepted Delta implementation map

For each Delta section:

```text
IMPLEMENTED
PARTIAL
BLOCKED
NOT APPLICABLE
```

with precise evidence.

## 4. Full LHF-001–214 updated ledger

Do not summarize it away.

## 5. Required screenshots / interaction evidence

Provide paths.

## 6. Validation results

List commands and exact pass/fail status.

## 7. Migration/preflight state

Clearly separate:

- completed read-only evidence;
- locally implemented but unapplied migration;
- external/production blocker;
- destructive action still gated.

## 8. Residual drift

Only genuine remaining drift.

Do not reopen closed Product decisions to explain implementation inconvenience.

## 9. Git state

Report:

```text
branch
HEAD
working tree
commits created?
push performed?
```

Do **not** commit/push/deploy unless the user separately authorizes it.

---

# 16. Final implementation goal

The final Learn should read as one coherent product:

```text
Home
= spatial / relational Knowledge Field

Track
= stable domain browse

Public Note
= durable reading field

Relations
= explicit knowledge navigation

Admin v1
= read-only owner inventory

Preview
= trustworthy pre-publication rendering
```

Shared vocabulary:

- Cream Gallery;
- restrained CJK typography;
- warm hairline;
- Klein Blue interaction;
- visible focus;
- space-driven responsive behavior.

Different surfaces retain different jobs.

Do not make all pages look identical.

Do not make Learn into:

- an LMS;
- a Blog clone;
- a black knowledge dashboard;
- a CMS project;
- a projection of Private Learn internals.

The accepted product remains:

> **真实问题驱动的 Private adaptive learning system + 选择性公开的 durable knowledge projection。**

Implementation should make that truth visible without expanding the product beyond the evidence.

---

# 17. Start instruction

Continue from the current task branch and Stage 0 evidence.

Before editing:

1. verify branch / HEAD / working tree;
2. read this Delta;
3. re-read the canonical Closure and `LEARN-PROGRAM.md` from the exact private ref;
4. inspect the Stage 0 report / LHF ledger;
5. build a short implementation dependency checklist against L1–L9.

Then implement.

Do not ask the user to re-supply context that already exists in the repo or checkpoint.

Do not stop because a subagent is unavailable.

Do not create new large governance documents.

Do not commit, push, deploy, or mutate production state without separate authorization.
