# catstarry.xyz — Content Family

# Master Requirements / Capability Ledger

**Version:** v1 — Canonical
**Date:** 2026-08-10
**Scope:** Blog / Feed / Learn / Projects
**Upstream:** Reconciled Content Family Contract v1
**Purpose:** Atomic Product decision registry and traceability ledger

---

# 0. Ledger Verdict

```text
Family Shared Contract        RECONCILED / FROZEN
Blog                          CLOSED
Feed                          CLOSED
Projects                      CLOSED
Learn                         CLOSED
Feed × Learn Integration      CLOSED
Shared Footer                 PARKED
Global Content Admin          PARKED
```

本 Ledger 持久化 Product decisions、Superseded / Parked / Revalidate 边界和历史 traceability。它记录的 implementation / acceptance state 是相应 closure / acceptance 时点的证据，不是 live deployment status。

---

# 1. Authority Model

## A0 — Latest explicit user decision

最高 Product authority。

## A1 — Family-shared truth

真正跨模块的问题由 Family Contract / Master Ledger 约束。

## A2 — Module-local truth

已关闭的 module-local question 由对应 Closure truth 约束；Family rule 不无理由重开 module-local decision。

## A3 — Module Delta / historical rationale

只在未被 Closure 覆盖时继续提供 rationale / traceability。

## A4 — Architecture / ADR

控制技术边界，不自行改写 Product semantics。

## A5 — Current implementation

说明已经实现的行为，不自动成为 Product authority。

## A6 — Historical requirements / prototype

只在未被后期决策 Supersede 时继续有效。

---

# 2. Status Model

## Decision Status

- **Confirmed**
- **Revalidate**
- **Superseded**
- **Parked**

## Implementation State

- Implemented
- Implemented with drift
- Partial
- Pending
- Architecture Revalidate
- Asset Revalidate
- Verify Current
- N/A

> **Decision Status ≠ Implementation State.**

Confirmed 但尚未实现属于 implementation gap；Parked 不是 implementation gap。

---

# 3. Family Master Rule Register

| ID | Rule | Status |
| --- | --- | --- |
| FAMILY-001 | Content modules share Cream Gallery | Confirmed |
| FAMILY-002 | Family consistency does not require shared IA/layout | Confirmed |
| FAMILY-003 | Surface strength follows object semantics | Confirmed |
| FAMILY-004 | S2 semantic status does not imply visible Full Card | Confirmed |
| FAMILY-005 | Card requires object identity, unit behavior and boundary need | Confirmed |
| FAMILY-006 | Universal Content Card is invalid | Confirmed |
| FAMILY-007 | Elevation is opt-in rather than default | Confirmed |
| FAMILY-008 | Projects elevation is an authorized module exception | Confirmed |
| FAMILY-009 | Avoid stacking unnecessary interaction cues | Confirmed |
| FAMILY-010 | Hairline/border serves structural semantics | Confirmed |
| FAMILY-011 | Radius is an optional shared material parameter | Confirmed |
| FAMILY-012 | Share semantic tokens, not forced appearance | Confirmed |
| FAMILY-013 | Klein Blue = low-area shared Brand Voltage / interaction | Confirmed |
| FAMILY-014 | Category/module color remains tertiary-or-lower | Confirmed |
| FAMILY-015 | Extremely weak local noninteractive identity marker can be legal | Confirmed |
| FAMILY-016 | Primary meaning outranks metadata | Confirmed |
| FAMILY-017 | Mono is role-based, not module-based | Confirmed |
| FAMILY-018 | Data existence does not create public UI entitlement | Confirmed |
| FAMILY-019 | Metadata density follows semantic need | Confirmed |
| FAMILY-020 | Tag is not a universal Family visual component | Confirmed |
| FAMILY-021 | Eyebrow is optional and semantic | Confirmed |
| FAMILY-022 | Shared opening rhythm ≠ fixed opening template | Confirmed |
| FAMILY-023 | Top-level Content module returns to Star Map | Confirmed |
| FAMILY-024 | Nested child prefers structural parent return | Confirmed |
| FAMILY-025 | Destination affordance follows object role | Confirmed |
| FAMILY-026 | `→ / ↗` carry internal/external semantic preference | Confirmed convention |
| FAMILY-027 | Width follows surface function | Confirmed |
| FAMILY-028 | Time prominence follows module semantics | Confirmed |
| FAMILY-029 | Chronology remains module-specific | Confirmed |
| FAMILY-030 | Historical browsing mechanics remain module-specific | Confirmed |
| FAMILY-031 | Public Copy explains meaning/state/action, not mechanisms | Confirmed |
| FAMILY-032 | Internal schema/event vocabulary is not automatically public | Confirmed |
| FAMILY-033 | Family voice may remain natural/personal without forced module voices | Confirmed |
| FAMILY-034 | Motion serves semantic interaction/content | Confirmed |
| FAMILY-035 | Reduced motion cannot remove meaning/capability | Confirmed |
| FAMILY-036 | Desktop hover requires complete touch/mobile equivalent | Confirmed |
| FAMILY-037 | Mobile is responsive reflow of the same Product logic | Confirmed |
| FAMILY-038 | Breakpoints need not be universally identical | Confirmed |
| FAMILY-039 | Media behavior follows content role | Confirmed |
| FAMILY-040 | Local dark functional/content surfaces are legal | Confirmed |
| FAMILY-041 | Empty states remain simple/human/module-consistent | Confirmed |
| FAMILY-042 | Existing Loading/Error states remain inside module identity | Confirmed |
| FAMILY-043 | Visual completeness cannot be created by invented capabilities | Confirmed |
| FAMILY-044 | Design for plausible growth without premature scale machinery | Confirmed |
| FAMILY-045 | Every Content surface needs intentional ending | Confirmed |
| FAMILY-046 | Exact Shared Content Footer | Parked |
| FAMILY-047 | Owner tooling stays module-local until shared need is proven | Confirmed |
| FAMILY-048 | Global Content Admin | Parked |
| FAMILY-049 | Accessibility cannot be weakened for visual quietness | Confirmed |
| FAMILY-050 | Product truth and implementation state remain separate | Confirmed |
| FAMILY-051 | Current implementation does not override later Closure truth | Confirmed |
| FAMILY-052 | Family governs shared language; Closure governs closed module semantics | Confirmed |

---

# 4. Family Shared Token Ledger

## Confirmed semantic domains

### Color

- Cream Canvas
- Warm Ink
- Warm Neutral
- Warm Hairline
- Klein Blue

### Interaction

- visible focus
- focus color family
- reduced-motion behavior

### Structure

Potential shared scales:

- spacing
- radius
- border
- elevation

> Shared token ≠ mandatory token usage.

Examples:

- shadow token 存在 ≠ Blog / Feed 使用 shadow；
- radius token 存在 ≠ Feed Activity rounded；
- surface token 存在 ≠ every object gets a Card background。

---

# 5. Family Exception Registry

## BLOG-EX-01

Archive 有独立 content identity，但 no Full Card。

**Confirmed**

## BLOG-EX-02

Reading uses Tonal Paper：no border / no shadow / no radius。

**Confirmed**

## BLOG-EX-03

Desktop Summary hover/focus reveal；Mobile always visible。

**Confirmed**

## BLOG-EX-04

Archive 与 Reading 使用不同 content measure。

**Confirmed**

## FEED-EX-01

所有 Activities 都是 S2 rank；D — Quiet Deposition 无 Full Card frame。

**Confirmed**

## FEED-EX-02

Feed Activity 是 record-with-destination，使用 explicit action。

**Confirmed**

## FEED-EX-03

Chronology 是 Feed identity 的核心结构。

**Confirmed**

## FEED-EX-04

Feed 拥有 module-local Owner / Manage workflow。

**Confirmed**

## PROJ-EX-01

Project Full Object Card 合法。

**Confirmed**

## PROJ-EX-02

static shadow + hover lift + stronger hover shadow 保留。

**Confirmed**

## PROJ-EX-03

Project 使用 whole-card external destination。

**Confirmed**

## PROJ-EX-04

Tech Tags 可使用 light bounded noninteractive annotation。

**Confirmed**

## PROJ-EX-05

`SELECTED WORKS` 可保留 extremely weak orange identity marker。

**Confirmed**

## LEARN-EX-01

Knowledge Map 是 Cream Gallery 内的 S1 structural knowledge field。

**Confirmed**

## LEARN-EX-02

Track directory 与 Graph 是同一 Public Knowledge Corpus 的互补双目录：Track = categorical / domain directory；Graph = relational / exploratory directory。Track 不是 Public Note parent，shared Track 不自动产生 relation edge。

**Confirmed**

## LEARN-EX-03

Public Note / Track index entry 不默认使用 Full Card、shadow 或 lift。

**Confirmed**

## LEARN-EX-04

Learn Tags 主要承担 retrieval / search metadata，不默认 pill treatment。

**Confirmed**

---

# 6. Blog Master Ledger

## Module State

**Product / IA / UI:** CLOSED  
**State:** FROZEN  
**Primary Identity:** Archive + Reading

## BLOG-ID — Identity

| ID | Decision | Status |
| --- | --- | --- |
| BLOG-ID-001 | Blog = long-term personal editorial writing surface | Confirmed |
| BLOG-ID-002 | Blog = Archive + Reading | Confirmed |
| BLOG-ID-003 | Archive and Reading have distinct responsibilities | Confirmed |
| BLOG-ID-004 | Reading has highest experiential weight | Confirmed |
| BLOG-ID-005 | Blog is not CMS/platform/news/feed/project page/dashboard/social home | Confirmed |

## BLOG-ARCH — Archive

| ID | Decision | Status |
| --- | --- | --- |
| BLOG-ARCH-001 | Archive = Editorial Article Index with Lightweight Chronology | Confirmed |
| BLOG-ARCH-002 | No Card grid | Confirmed |
| BLOG-ARCH-003 | No timeline | Confirmed |
| BLOG-ARCH-004 | No CMS list identity | Confirmed |
| BLOG-ARCH-005 | Desktop target ≈1120px | Confirmed |
| BLOG-ARCH-006 | Title = first visual priority | Confirmed |
| BLOG-ARCH-007 | Summary = second meaningful information layer | Confirmed |
| BLOG-ARCH-008 | Date = low-weight support | Confirmed |
| BLOG-ARCH-009 | Category = lower-weight support | Confirmed |
| BLOG-ARCH-010 | Date format = `MM.DD` | Confirmed |
| BLOG-ARCH-011 | Desktop independent Date Column | Confirmed |
| BLOG-ARCH-012 | Date/title optical rather than mechanical alignment | Confirmed |
| BLOG-ARCH-013 | No Year grouping until scale justifies revalidation | Confirmed / future Revalidate |
| BLOG-ARCH-014 | No Month grouping | Confirmed |
| BLOG-ARCH-015 | Hairline spans archive content width including Date Column | Confirmed |
| BLOG-ARCH-016 | Hairline warm / light / structural | Confirmed |
| BLOG-ARCH-017 | Entry no Full Card | Confirmed |
| BLOG-ARCH-018 | Entry no shadow | Confirmed |
| BLOG-ARCH-019 | Entry no hover lift | Confirmed |

## BLOG-SUMMARY — Archive Summary

| ID | Decision | Status |
| --- | --- | --- |
| BLOG-SUM-001 | Summary remains meaningful discovery content | Confirmed |
| BLOG-SUM-002 | Desktop default hidden | Confirmed |
| BLOG-SUM-003 | Hover/focus reveals Summary | Confirmed |
| BLOG-SUM-004 | Entry naturally expands on reveal | Confirmed |
| BLOG-SUM-005 | Title becomes Klein Blue during interaction | Confirmed |
| BLOG-SUM-006 | Approx translation = 4–6px | Confirmed visual target |
| BLOG-SUM-007 | Approx duration = 180–240ms | Confirmed visual target |
| BLOG-SUM-008 | Soft ease-out | Confirmed |
| BLOG-SUM-009 | No background change | Confirmed |
| BLOG-SUM-010 | No lift/shadow/underline/horizontal slide | Confirmed |
| BLOG-SUM-011 | Date/blank space/Hairline do not trigger reveal | Confirmed |
| BLOG-SUM-012 | Reduced motion cannot hide Summary capability | Confirmed |

## BLOG-MOBILE

| ID | Decision | Status |
| --- | --- | --- |
| BLOG-MOB-001 | No Desktop hover simulation | Confirmed |
| BLOG-MOB-002 | Date Column disappears | Confirmed |
| BLOG-MOB-003 | Date + Category become light metadata row | Confirmed |
| BLOG-MOB-004 | Summary always visible | Confirmed |
| BLOG-MOB-005 | No tap-to-expand Summary | Confirmed |
| BLOG-MOB-006 | Titles naturally wrap | Confirmed |

## BLOG-TAXONOMY

| ID | Decision | Status |
| --- | --- | --- |
| BLOG-TAX-001 | Category capability remains | Confirmed |
| BLOG-TAX-002 | Category displayed as plain clickable text | Confirmed |
| BLOG-TAX-003 | No category-specific color system | Confirmed |
| BLOG-TAX-004 | Tags capability remains | Confirmed |
| BLOG-TAX-005 | Main Archive does not display Tags | Confirmed |
| BLOG-TAX-006 | Main Archive does not display Views | Confirmed |
| BLOG-TAX-007 | Archive taxonomy sidebar removed | Superseded |
| BLOG-TAX-008 | Archive taxonomy utility links removed | Superseded |
| BLOG-TAX-009 | Category/Tag routes remain | Confirmed |
| BLOG-TAX-010 | Strong taxonomy discovery UI | Revalidate |
| BLOG-TAX-011 | Tag explorer | Revalidate |

## BLOG-RSS

| ID | Decision | Status |
| --- | --- | --- |
| BLOG-RSS-001 | RSS capability remains | Confirmed |
| BLOG-RSS-002 | RSS placement | Revalidate |
| BLOG-RSS-003 | Do not force RSS into Archive only to prove capability exists | Confirmed |

## BLOG-PAGINATION

| ID | Decision | Status |
| --- | --- | --- |
| BLOG-PAG-001 | Top+bottom boxed pagination | Superseded |
| BLOG-PAG-002 | Default numbered pagination | Superseded |
| BLOG-PAG-003 | One bottom navigation only | Confirmed |
| BLOG-PAG-004 | `← 较新的文章` / `更早的文章 →` | Confirmed |
| BLOG-PAG-005 | Quiet text navigation | Confirmed |
| BLOG-PAG-006 | Existing URL architecture can remain | Confirmed |
| BLOG-PAG-007 | Numbered/jump navigation only if future scale proves need | Revalidate |

## BLOG-EMPTY / SCALE

| ID | Decision | Status |
| --- | --- | --- |
| BLOG-EMP-001 | Empty state stays simple/human | Confirmed |
| BLOG-EMP-002 | `还没有已发布文章。` is valid copy direction | Confirmed |
| BLOG-EMP-003 | No illustration/tutorial/onboarding/CTA | Confirmed |
| BLOG-SCALE-001 | Do not design down to current few articles | Confirmed |
| BLOG-SCALE-002 | Design supports plausible multi-year / dozens-of-articles growth | Confirmed |
| BLOG-SCALE-003 | Do not prebuild massive media-library machinery | Confirmed |

## BLOG-READING

| ID | Decision | Status |
| --- | --- | --- |
| BLOG-READ-001 | Preserve Kami Reading foundation | Confirmed |
| BLOG-READ-002 | Top navigation = `← 返回博客` | Confirmed |
| BLOG-READ-003 | `返回博客` outside Paper | Confirmed |
| BLOG-READ-004 | Remove direct Article → Star Map | Superseded |
| BLOG-READ-005 | Remove centered wordmark | Superseded |
| BLOG-READ-006 | Remove `BLOG / READING` | Superseded |
| BLOG-READ-007 | Tonal Paper only | Confirmed |
| BLOG-READ-008 | No Paper border | Confirmed |
| BLOG-READ-009 | No Paper shadow | Confirmed |
| BLOG-READ-010 | No Paper radius | Confirmed |
| BLOG-READ-011 | Paper = current article content only | Confirmed |
| BLOG-READ-012 | Desktop body target ≈760px | Confirmed |
| BLOG-READ-013 | Header may be wider than body | Confirmed |
| BLOG-READ-014 | No full-width long reading | Confirmed |

## BLOG-ARTICLE-METADATA

| ID | Decision | Status |
| --- | --- | --- |
| BLOG-AMETA-001 | Category appears once | Confirmed |
| BLOG-AMETA-002 | Summary/Deck remains | Confirmed |
| BLOG-AMETA-003 | Date remains public Article metadata; anonymous users cannot read Views | Confirmed |
| BLOG-AMETA-004 | Public Views display | Superseded |
| BLOG-AMETA-009 | Owner-only Article Views reuse main-site auth | Confirmed / Implemented |
| BLOG-AMETA-005 | Tags move to Paper ending | Confirmed |
| BLOG-AMETA-006 | Article Tags = plain-text clickable links | Confirmed |
| BLOG-AMETA-007 | Duplicate Category removed | Superseded |
| BLOG-AMETA-008 | Full Tags in Header removed | Superseded |

## BLOG-READING-CAPABILITIES

| ID | Capability | Status |
| --- | --- | --- |
| BLOG-CAP-001 | Markdown canonical content | Confirmed |
| BLOG-CAP-002 | Astro Content Collection | Confirmed |
| BLOG-CAP-003 | Code blocks | Confirmed |
| BLOG-CAP-004 | Inline code | Confirmed |
| BLOG-CAP-005 | Blockquote | Confirmed |
| BLOG-CAP-006 | Image | Confirmed |
| BLOG-CAP-007 | Table | Confirmed |
| BLOG-CAP-008 | SEO / canonical URL / OG | Confirmed |
| BLOG-CAP-009 | Public View recording; owner-only Article display uses main-site auth | Confirmed / Implemented |
| BLOG-CAP-010 | Repository-authored content with controlled public publication lifecycle | Confirmed |
| BLOG-CAP-011 | draft/publication protection | Confirmed |

`Markdown canonical content` 不等价于永久禁止 Blog MDX；Blog format capability 以 current architecture 为准。

## BLOG-PREV/NEXT

| ID | Decision | Status |
| --- | --- | --- |
| BLOG-PREV-001 | Previous / Next is implementation requirement | Confirmed |
| BLOG-PREV-002 | Outside Paper | Confirmed |
| BLOG-PREV-003 | Desktop left/right | Confirmed |
| BLOG-PREV-004 | Mobile vertical | Confirmed |
| BLOG-PREV-005 | Direction label + Article title only | Confirmed |
| BLOG-PREV-006 | No Card/image/summary/category/recommendation block | Confirmed |
| BLOG-PREV-007 | Missing side simply does not render | Confirmed |
| BLOG-PREV-008 | Remaining side does not center/full-width itself | Confirmed |

## BLOG-ENDING

| ID | Decision | Status |
| --- | --- | --- |
| BLOG-END-001 | Paper ends → Previous/Next | Confirmed |
| BLOG-END-002 | → Return to Blog List | Confirmed |
| BLOG-END-003 | → Share | Confirmed |
| BLOG-END-004 | → Giscus | Confirmed |
| BLOG-END-005 | Bottom `返回博客列表` remains | Confirmed |
| BLOG-END-006 | Share outside Paper | Confirmed |
| BLOG-END-007 | Giscus outside Paper | Confirmed |

## BLOG-SHARE

Keep X / Copy Link / WeChat、keyboard、focus-visible、feedback、aria-live；visual prominence reduced。

**Confirmed**

## BLOG-GISCUS

Keep Giscus；do not replace comment system；reduce unnecessary empty spacing；do not clip with fixed short height / overflow hidden。

**Confirmed**

Custom Cream theme：**Parked**。

## BLOG-REVALIDATE

- Year context after true multi-year growth
- Category index/discovery/filtering
- Tag index/explorer
- RSS placement
- numbered/jump pagination at large page count

## BLOG-PARKED / NON-GAPS

Featured、Popular、Trending/ranking、Search、complex filter、taxonomy dashboard、tag cloud、author module、reading time、updated-at system、reading progress、TOC sidebar、related algorithm、recommendation engine、cover system、custom Giscus theme、complex archive metrics。

## BLOG-PRODUCTION DRIFT — Historical pre-acceptance inventory

以下记录保留为历史 traceability，不是 current drift tracker。

### Archive

- eyebrow still present
- intro still present
- taxonomy sidebar
- Card
- Tags
- Views
- boxed/numbered top+bottom pagination

### Article

- direct Star Map return
- centered wordmark
- `BLOG / READING`
- duplicate Category
- Header Tags
- ≈720px body
- no Previous/Next
- final Tonal Paper not productionized

Closure text outranks historical visual evidence where they conflict。

---

# 7. Feed Master Ledger

## Module State

**Product / Interaction / Responsive / Visual:** CLOSED  
**Accepted Direction:** D — Quiet Deposition

## FEED-ID

| ID | Decision | Status |
| --- | --- | --- |
| FEED-ID-001 | Feed = Continuous Activity Timeline | Confirmed |
| FEED-ID-002 | Public UI 不需要显示 canonical phrase | Confirmed |
| FEED-ID-003 | Design unit = Activity | Confirmed |
| FEED-ID-004 | Native = Note + Clip | Confirmed |
| FEED-ID-005 | Public Footprint = Blog/Learn/Projects source-event snapshot | Confirmed |
| FEED-ID-006 | Public Timeline = Native + Footprint unified read projection | Confirmed |
| FEED-ID-007 | Post vs system-message hierarchy | Superseded |

## FEED-EQUALITY

| ID | Decision | Status |
| --- | --- | --- |
| FEED-EQ-001 | All public Activities share same S2 object rank | Confirmed |
| FEED-EQ-002 | Same rank, different grammar | Confirmed |
| FEED-EQ-003 | Native is not inherently higher | Confirmed |
| FEED-EQ-004 | Footprint is not inherently lighter | Confirmed |
| FEED-EQ-005 | Media does not automatically increase rank | Confirmed |
| FEED-EQ-006 | Rare Project updates are not Featured | Confirmed |

## FEED-GRAMMAR

- Note：What I said
- Clip：What I saved + why I cared
- Footprint：What happened + what it was

**Confirmed**

## FEED-NOTE

| ID | Decision | Status |
| --- | --- | --- |
| FEED-NOTE-001 | No title required | Confirmed |
| FEED-NOTE-002 | First line is not auto-promoted to title | Confirmed |
| FEED-NOTE-003 | Body is content anchor | Confirmed |
| FEED-NOTE-004 | One-line pure text must look complete | Confirmed |
| FEED-NOTE-005 | No social “expand full text” system | Confirmed |
| FEED-NOTE-006 | Blog is escape hatch for genuinely long structured writing | Confirmed |

## FEED-NATIVE-MEDIA

| ID | Decision | Status |
| --- | --- | --- |
| FEED-MEDIA-001 | Max 6 images OR 1 video | Confirmed |
| FEED-MEDIA-002 | Image + video mixed Note not allowed | Confirmed |
| FEED-MEDIA-003 | Images are content, not attachments | Confirmed |
| FEED-MEDIA-004 | Single image uses readable ratio | Confirmed |
| FEED-MEDIA-005 | 2 images natural double column | Confirmed |
| FEED-MEDIA-006 | 4 images 2×2 reliable baseline | Confirmed |
| FEED-MEDIA-007 | 5/6 images not giant vertical stack | Confirmed |
| FEED-MEDIA-008 | Mobile multi-image max/target 2 columns | Confirmed |
| FEED-MEDIA-009 | Exact 3-image geometry | Revalidate at implementation |
| FEED-MEDIA-010 | Image viewer | Confirmed |
| FEED-MEDIA-011 | Viewer may use bounded dark functional surface | Confirmed |
| FEED-MEDIA-012 | Video inline with controls | Confirmed |
| FEED-MEDIA-013 | No autoplay | Confirmed |

## FEED-CLIP

| ID | Decision | Status |
| --- | --- | --- |
| FEED-CLIP-001 | Clip = external object + why it mattered | Confirmed |
| FEED-CLIP-002 | Personal comment outranks machine OG metadata | Confirmed |
| FEED-CLIP-003 | Comment requires no `我的点评` label | Confirmed |
| FEED-CLIP-004 | Comment visually close to Note body | Confirmed |
| FEED-CLIP-005 | Minimum valid = URL + title | Confirmed |
| FEED-CLIP-006 | Comment optional | Confirmed |
| FEED-CLIP-007 | Summary optional | Confirmed |
| FEED-CLIP-008 | Preview image optional | Confirmed |
| FEED-CLIP-009 | OG failure cannot invalidate legal Clip | Confirmed |
| FEED-CLIP-010 | Generated title/summary/image editable/removable | Confirmed |

No default favicon；no platform-specific embeds for YouTube / GitHub / X / Reddit / 小红书。

## FEED-CLIP-DESTINATION

| ID | Decision | Status |
| --- | --- | --- |
| FEED-CDST-001 | Activity itself is not link | Confirmed |
| FEED-CDST-002 | External title does not carry hidden whole-object navigation | Confirmed |
| FEED-CDST-003 | Explicit `访问来源 ↗` | Confirmed |
| FEED-CDST-004 | Preview image does not navigate | Confirmed |
| FEED-CDST-005 | Clip preview image does not open Note viewer | Confirmed |

## FEED-FOOTPRINT

| ID | Decision | Status |
| --- | --- | --- |
| FEED-FP-001 | Immutable event-time snapshot record | Confirmed |
| FEED-FP-002 | Footprint expresses event first | Confirmed |
| FEED-FP-003 | Not Blog teaser / Learn card / Project card / system log | Confirmed |
| FEED-FP-004 | TYPE · ACTION + TIME identity | Confirmed |
| FEED-FP-005 | Snapshot title = main content anchor | Confirmed |
| FEED-FP-006 | Supporting text only when meaningful | Confirmed |
| FEED-FP-007 | Explicit destination | Confirmed |
| FEED-FP-008 | Ordinary source edit does not rewrite snapshot | Confirmed |

## FEED-BLOG-FOOTPRINT

| ID | Decision | Status |
| --- | --- | --- |
| FEED-BLOG-001 | Public identity = `BLOG · 发布` | Confirmed |
| FEED-BLOG-002 | Event = first formal public publication | Confirmed |
| FEED-BLOG-003 | Ordinary edit does not create new Published Footprint | Confirmed |
| FEED-BLOG-004 | Title = anchor | Confirmed |
| FEED-BLOG-005 | Summary optional | Confirmed |
| FEED-BLOG-006 | No automatic body excerpt only to fill layout | Confirmed |
| FEED-BLOG-007 | Destination = `阅读文章 →` | Confirmed |

## FEED-LEARN-PRESENTATION

| ID | Decision | Status |
| --- | --- | --- |
| FEED-LEARN-001 | Public identity = `LEARN · 更新` | Confirmed Feed-side |
| FEED-LEARN-002 | `Learn Section Completed` public semantics | Superseded |
| FEED-LEARN-003 | Do not show progress/percentage/section hierarchy | Confirmed Feed-side |
| FEED-LEARN-004 | Destination = `查看内容 →` | Confirmed Feed-side |
| FEED-LEARN-005 | Supporting text should explain what changed | Confirmed Feed-side |
| FEED-LEARN-006 | Do not invent “major update” threshold merely to control Feed volume | Confirmed Feed-side constraint |
| FEED-LEARN-007 | Public Note publish/revise lifecycle | Confirmed |

Current Learn public events：first formal publication / substantive revision；maintenance edit silent；`learn_section_completed` legacy readable compatibility only。

## FEED-PROJECT-FOOTPRINT

| ID | Decision | Status |
| --- | --- | --- |
| FEED-PROJ-001 | Public identity = `PROJECT · 更新` | Confirmed |
| FEED-PROJ-002 | `Projects 实质更新` public copy | Superseded |
| FEED-PROJ-003 | Project update may remain low-frequency | Confirmed |
| FEED-PROJ-004 | Do not manufacture Activity to balance Feed | Confirmed |
| FEED-PROJ-005 | Project title = anchor | Confirmed |
| FEED-PROJ-006 | Supporting “what changed” description strongly preferred | Confirmed |
| FEED-PROJ-007 | No Project Card tech stack/gallery/stats/status duplication | Confirmed |
| FEED-PROJ-008 | Destination = `查看项目 →` | Confirmed |
| FEED-PROJ-009 | Feed destination = `/projects/`; Project Card uses external `project.url` | Confirmed |

## FEED-CHRONOLOGY

| ID | Decision | Status |
| --- | --- | --- |
| FEED-TIME-001 | Structure = Year → Date → Activity | Confirmed |
| FEED-TIME-002 | Date = `MM.DD` | Confirmed |
| FEED-TIME-003 | Example = `08.09` | Confirmed |
| FEED-TIME-004 | Activity clock = `HH:mm` | Confirmed |
| FEED-TIME-005 | 24-hour minute precision | Confirmed |
| FEED-TIME-006 | Identity left / time right | Confirmed |
| FEED-TIME-007 | Current Year displayed too | Confirmed |
| FEED-TIME-008 | No Month heading | Confirmed |
| FEED-TIME-009 | No relative-time-first | Confirmed |

## FEED-TIMELINE-VISUAL

| ID | Decision | Status |
| --- | --- | --- |
| FEED-D-001 | Final visual = D — Quiet Deposition | Confirmed |
| FEED-D-002 | No full Activity background | Confirmed |
| FEED-D-003 | No full Activity border | Confirmed |
| FEED-D-004 | No Activity shadow | Confirmed |
| FEED-D-005 | No repeated divider | Confirmed |
| FEED-D-006 | No deposition tick | Confirmed |
| FEED-D-007 | No timeline rail | Confirmed |
| FEED-D-008 | Vertical rhythm carries continuity | Confirmed |
| FEED-D-009 | Date group may retain extremely light warm Hairline | Confirmed |
| FEED-D-010 | Clip may use very light internal semantic Hairline | Confirmed |

## FEED-PAGINATION

| ID | Decision | Status |
| --- | --- | --- |
| FEED-PAG-001 | Load More retained | Confirmed |
| FEED-PAG-002 | No infinite scroll | Confirmed |
| FEED-PAG-003 | Public copy = `更早的内容` | Confirmed |
| FEED-PAG-004 | Same Date group must merge across cursor pages | Confirmed |
| FEED-PAG-005 | No duplicate Date headings at page boundary | Confirmed |
| FEED-PAG-006 | Cross-Year boundary inserted naturally | Confirmed |
| FEED-PAG-007 | Final ending = `止步于此。` | Confirmed |
| FEED-PAG-008 | Pagination errors stay incremental | Confirmed |
| FEED-PAG-009 | Existing loaded Activities remain on pagination error | Confirmed |
| FEED-PAG-010 | Retry at timeline bottom | Confirmed |

## FEED-FUTURE-TIME

Year Jump、Month Jump、Latest Jump、Back to top、permanent year rail、month chips、Feed Archive：**Parked**。

## FEED-OWNER

| ID | Decision | Status |
| --- | --- | --- |
| FEED-OWN-001 | Model = Public / Owner Browsing / Owner Managing | Confirmed |
| FEED-OWN-002 | Anonymous Login FAB removed | Superseded |
| FEED-OWN-003 | Anonymous owner entry = top low-weight `管理` | Confirmed |
| FEED-OWN-004 | `管理` belongs same utility layer as Star Map return | Confirmed |
| FEED-OWN-005 | Public copy does not expose login/account model | Confirmed |
| FEED-OWN-006 | Login success returns to Feed Owner Browsing | Confirmed |
| FEED-OWN-007 | Login does not automatically open Publish | Confirmed |
| FEED-OWN-008 | `＋ 发布` only visible to owner | Confirmed |
| FEED-OWN-009 | `管理` enters explicit Manage Mode for owner | Confirmed |
| FEED-OWN-010 | Hide/Restore/Delete only in Manage Mode | Confirmed |
| FEED-OWN-011 | Global Content Admin | Parked |

## FEED-HIDE / DELETE

| ID | Decision | Status |
| --- | --- | --- |
| FEED-MAN-001 | Hide reversible | Confirmed |
| FEED-MAN-002 | Hide no confirmation modal required | Confirmed |
| FEED-MAN-003 | Delete destructive and requires confirmation | Confirmed |
| FEED-MAN-004 | Native Content may delete | Confirmed |
| FEED-MAN-005 | Footprint is not ordinary Native post deletion target | Confirmed |
| FEED-MAN-006 | No swipe hide/delete on Mobile | Confirmed |

## FEED-AUTHORING

| ID | Decision | Status |
| --- | --- | --- |
| FEED-AUTH-001 | Memo-like low-friction publishing | Confirmed |
| FEED-AUTH-002 | Manual Publish creates Note or Clip only | Confirmed |
| FEED-AUTH-003 | Footprints come from real source lifecycle | Confirmed |
| FEED-AUTH-004 | Desktop = compact centered dialog | Confirmed |
| FEED-AUTH-005 | Mobile = bottom-origin sheet / near-full-screen as needed | Confirmed |
| FEED-AUTH-006 | Empty composer may switch Note/Clip | Confirmed |
| FEED-AUTH-007 | Switching cannot silently destroy substantial input | Confirmed |
| FEED-AUTH-008 | Persistent Draft system is not part of current Feed authoring | Confirmed non-capability |
| FEED-AUTH-009 | Substantial unsaved content gets abandonment protection | Confirmed |
| FEED-AUTH-010 | Browser unload may use native warning | Confirmed |
| FEED-AUTH-011 | Item-level upload state | Confirmed |
| FEED-AUTH-012 | Failed one image does not clear successful others | Confirmed |
| FEED-AUTH-013 | Publish disabled while uploads unfinished | Confirmed |
| FEED-AUTH-014 | OG failure does not block valid Clip | Confirmed |
| FEED-AUTH-015 | Publish success refreshes `/feed` | Confirmed |
| FEED-AUTH-016 | Optimistic prepend | Superseded |
| FEED-AUTH-017 | Publish request failure preserves form/input/media | Confirmed |
| FEED-AUTH-018 | Auth expiry does not proactively clear content | Confirmed |

## FEED-STATES

| ID | Decision | Status |
| --- | --- | --- |
| FEED-STATE-001 | Initial Loading is Timeline state, not whole-page collapse | Confirmed |
| FEED-STATE-002 | Canvas/opening/utility remain during loading | Confirmed |
| FEED-STATE-003 | No fake complex Activity skeleton requirement | Confirmed |
| FEED-STATE-004 | Error stays inside Feed identity | Confirmed |
| FEED-STATE-005 | No API/Worker diagnostics in public UI | Confirmed |
| FEED-STATE-006 | Error provides Retry | Confirmed |
| FEED-STATE-007 | Timeline failure cannot leave only Login/Publish chrome | Confirmed |
| FEED-STATE-008 | Empty and Error are distinct states | Confirmed |
| FEED-STATE-009 | Empty exact final sentence | Revalidate copy only |

## FEED-RESPONSIVE

| ID | Decision | Status |
| --- | --- | --- |
| FEED-RESP-001 | Same grammar Desktop/Mobile | Confirmed |
| FEED-RESP-002 | Reflow, not two products | Confirmed |
| FEED-RESP-003 | Medium single-column Desktop | Confirmed |
| FEED-RESP-004 | D visual reference shell ≈760 / timeline ≈680 | Confirmed visual reference |
| FEED-RESP-005 | Avoid three-layer horizontal padding loss on Mobile | Confirmed |
| FEED-RESP-006 | Keep identity/time same row when feasible | Confirmed |
| FEED-RESP-007 | Important content never hover-dependent | Confirmed |

## FEED-PUBLIC-COPY

Opening：`Feed`  
Intro：`碎碎念、剪藏，以及一路积累下来的创作足迹。`

**Confirmed**

Superseded：`PUBLIC FOOTPRINTS`、`系统足迹`、`Projects 实质更新`、`Learn 完成小节`、`加载更多`。

## FEED-ARCHITECTURE-REVALIDATE — Historical preflight register

Historical technical questions retained for traceability; not Product decisions or current backlog：

- AR-FEED-01 Blog visibility / ADR-005 mapping
- AR-FEED-02 Learn source event contract
- AR-FEED-03 Internal `system_footprint` naming migration value
- AR-FEED-04 Canonical timezone
- AR-FEED-05 Stable cursor / tie-breaking / Date group merge
- AR-FEED-06 SSR vs client initial loading
- AR-FEED-07 Clip runtime
- AR-FEED-08 Media runtime/viewer/lazy/video/safe-area
- AR-FEED-09 Owner/Manage mapping
- AR-FEED-10 Composer runtime / focus / Escape / auth expiry

## FEED-PARKED / NON-GAPS

Year/Month jump、Feed Archive、Search/filter、infinite scroll、realtime、WebSocket/polling、external health monitoring、platform embeds、social reactions/comments/share counts/followers、permanent composer、persistent drafts、complex Admin、five-type icons/colors、mixed image+video Note、major-update threshold、update aggregation。

## FEED-VISUAL-EVIDENCE

Stage 4 Visual Lab = historical D — Quiet Deposition design evidence。

---

# 8. Projects Master Ledger

## Module State

**Product / Visual:** CLOSED  
**State:** FROZEN  
**Identity:** Project Objects

## PROJ-ID

| ID | Decision | Status |
| --- | --- | --- |
| PROJ-ID-001 | Projects = Project Objects | Confirmed |
| PROJ-ID-002 | Primary question = what was built | Confirmed |
| PROJ-ID-003 | Tech comes second | Confirmed |
| PROJ-ID-004 | Project Card valid stable Full Object Card | Confirmed |
| PROJ-ID-005 | Screenshot/visual evidence may be primary visual area | Confirmed |
| PROJ-ID-006 | Name among highest priority information | Confirmed |
| PROJ-ID-007 | Description explains Project | Confirmed |
| PROJ-ID-008 | Tech metadata supporting only | Confirmed |
| PROJ-ID-009 | Whole-card destination valid | Confirmed |
| PROJ-ID-010 | Projects may remain external-project index/gateway | Confirmed |

## PROJ-SCOPE

Do not add Timeline、Graph、Dashboard、Development Log、Status board、complex taxonomy、Archive tree、Case Study CMS、project management system、tech-stack database、multi-layer IA。

**Confirmed**

## PROJ-CARD

| ID | Decision | Status |
| --- | --- | --- |
| PROJ-CARD-001 | Preserve Full Project Card | Confirmed |
| PROJ-CARD-002 | Preserve Cream surface | Confirmed |
| PROJ-CARD-003 | Preserve full object border | Confirmed |
| PROJ-CARD-004 | Preserve accepted general radius direction | Confirmed |
| PROJ-CARD-005 | Prefer Family radius token if available | Confirmed implementation rule |
| PROJ-CARD-006 | Preserve screenshot/body segmentation | Confirmed |
| PROJ-CARD-007 | Do not convert to frameless list/Blog row/masonry/hero layout | Confirmed |

## PROJ-ELEVATION

| ID | Decision | Status |
| --- | --- | --- |
| PROJ-ELEV-001 | Static shadow stays | Confirmed |
| PROJ-ELEV-002 | Hover lift stays | Confirmed |
| PROJ-ELEV-003 | Stronger hover shadow stays | Confirmed |
| PROJ-ELEV-004 | Projects-specific exception | Confirmed |
| PROJ-ELEV-005 | Do not propagate exception to Family | Confirmed |
| PROJ-ELEV-006 | Do not reopen old flatten recommendation | Confirmed |

## PROJ-INTERACTION-CEILING

Do not add screenshot zoom、blue card border、title underline、tag animation、CTA reveal、multiple additional effects。

Default：Card + normal shadow + neutral arrow。  
Hover：lift + stronger shadow + arrow → Klein Blue。

**Confirmed**

## PROJ-DESTINATION

| ID | Decision | Status |
| --- | --- | --- |
| PROJ-DST-001 | Whole-card external link remains | Confirmed |
| PROJ-DST-002 | Upper-right external arrow remains | Confirmed |
| PROJ-DST-003 | Arrow is cue, not second CTA | Confirmed |
| PROJ-DST-004 | Arrow default neutral/muted Ink | Confirmed |
| PROJ-DST-005 | Arrow hover/focus → Klein Blue | Confirmed |
| PROJ-DST-006 | Orange arrow | Superseded |
| PROJ-DST-007 | Do not add `查看项目` CTA | Confirmed |

## PROJ-MEDIA

| ID | Decision | Status |
| --- | --- | --- |
| PROJ-MEDIA-001 | Screenshot/visual = core project evidence | Confirmed |
| PROJ-MEDIA-002 | Do not shrink into ordinary thumbnail | Confirmed |
| PROJ-MEDIA-003 | ≈16:10 direction valid | Confirmed |
| PROJ-MEDIA-004 | Do not force 16:9 | Confirmed |
| PROJ-MEDIA-005 | Keep native project colors | Confirmed |
| PROJ-MEDIA-006 | No cream filter/recolor/normalization/overlay | Confirmed |
| PROJ-MEDIA-007 | Maintain flush/inlay relationship | Confirmed |
| PROJ-MEDIA-008 | No screenshot secondary border/shadow | Confirmed |
| PROJ-MEDIA-009 | No hover zoom | Confirmed |
| PROJ-MEDIA-010 | Prefer better source screenshot over complex crop controls | Confirmed |

## PROJ-MISSING-MEDIA

| ID | Decision | Status |
| --- | --- | --- |
| PROJ-NOMEDIA-001 | `PROJECT PREVIEW` | Superseded |
| PROJ-NOMEDIA-002 | `截图待补` | Superseded |
| PROJ-NOMEDIA-003 | Screenshot universally mandatory forever | Superseded |
| PROJ-NOMEDIA-004 | Real non-UI project evidence can be valid media | Confirmed |
| PROJ-NOMEDIA-005 | Decorative filler visual is invalid | Confirmed |
| PROJ-NOMEDIA-006 | Generic no-media variant | Parked |

## PROJ-ASSETS

Closure-era asset evidence：Underwood screenshot was accepted；catstarry.xyz GitHub screenshot was workable but weak，with real production UI preferred。If those assets are replaced, assess the new asset against the current Project media contract rather than carrying the old screenshot rating forward。

## PROJ-TYPOGRAPHY

| ID | Decision | Status |
| --- | --- | --- |
| PROJ-TYPE-001 | Name = Sans | Confirmed |
| PROJ-TYPE-002 | Name > Description > Tech | Confirmed |
| PROJ-TYPE-003 | Name not Mono | Confirmed |
| PROJ-TYPE-004 | No forced uppercase | Confirmed |
| PROJ-TYPE-005 | No status label by default | Confirmed |
| PROJ-DESC-001 | Strict one-line description | Superseded |
| PROJ-DESC-002 | 1–2 lines typical, natural growth allowed | Confirmed |
| PROJ-DESC-003 | Prefer editing copy over line-clamp:1 | Confirmed |
| PROJ-DESC-004 | Description = what project is / does | Confirmed |
| PROJ-DESC-005 | No deployment/stack/architecture/eligibility prose | Confirmed |

## PROJ-TAGS

| ID | Decision | Status |
| --- | --- | --- |
| PROJ-TAG-001 | Tech Tags remain separate light units | Confirmed |
| PROJ-TAG-002 | Annotation, not interactive chip | Confirmed |
| PROJ-TAG-003 | Light border / small radius / low contrast / small padding | Confirmed |
| PROJ-TAG-004 | No shadow | Confirmed |
| PROJ-TAG-005 | Noninteractive | Confirmed |
| PROJ-TAG-006 | No hover/filter/active/taxonomy behavior | Confirmed |
| PROJ-TAG-007 | Default 2–4 useful tags | Confirmed guidance |
| PROJ-TAG-008 | `独立部署` removed | Superseded |
| PROJ-TAG-009 | Underwood = Poker / PWA | Confirmed |
| PROJ-TAG-010 | catstarry.xyz = Astro / React / Cloudflare | Confirmed |

## PROJ-METADATA

| ID | Decision | Status |
| --- | --- | --- |
| PROJ-META-001 | Public Card does not display Date | Confirmed |
| PROJ-META-002 | No Updated date | Confirmed |
| PROJ-META-003 | Public Status system | Parked |
| PROJ-META-004 | visibility stays internal | Confirmed |
| PROJ-META-005 | updateId stays internal | Confirmed |

## PROJ-COLOR

| ID | Decision | Status |
| --- | --- | --- |
| PROJ-COLOR-001 | Orange module theme | Superseded |
| PROJ-COLOR-002 | Orange not Card/border/hover/arrow/tag/link/background | Confirmed |
| PROJ-COLOR-003 | `SELECTED WORKS` may retain extremely weak orange | Confirmed exception |
| PROJ-COLOR-004 | Klein Blue owns shared interaction role | Confirmed |

## PROJ-PUBLIC-COPY

Opening eyebrow：`SELECTED WORKS`  
Intro：`一些做过、还在继续做的东西。`  
Underwood：`一个面向 Poker 场景的 PWA 应用。`  
catstarry.xyz：`一个持续记录内容、项目与学习的个人网站。`

**Confirmed**

Reject Product Hunt language、agency case study、recruitment portfolio voice、AI branding copy、architecture/index/deployment mechanics。

## PROJ-MOBILE

| ID | Decision | Status |
| --- | --- | --- |
| PROJ-MOB-001 | Desktop 2 columns | Confirmed |
| PROJ-MOB-002 | Mobile 1 column | Confirmed |
| PROJ-MOB-003 | Same Project Object, adjusted density | Confirmed |
| PROJ-MOB-004 | Screenshot remains major visual area | Confirmed |
| PROJ-MOB-005 | Description naturally wraps | Confirmed |
| PROJ-MOB-006 | Tags naturally wrap | Confirmed |
| PROJ-MOB-007 | No horizontal tag scroll/nowrap/shrink-to-fit | Confirmed |
| PROJ-MOB-008 | Whole-card touch target remains | Confirmed |
| PROJ-MOB-009 | No tap lift/scale to imitate hover | Confirmed |

## PROJ-EMPTY

Final copy：`暂时还没有公开的项目。`  
Visual：quiet S1-level state。

No fake Project Card、dashed large border、icon、CTA、Coming Soon、Stay Tuned、mechanics copy。

**Confirmed**

## PROJ-ENDING

Few Projects can leave weak page ending：**Confirmed issue**。  
Shared Content Footer：**Parked**。  
Fallback natural bottom rhythm：**Confirmed**。

No filler：Recent Updates、Stats、Contact CTA、More Projects、Coming Soon、Technology Overview、Activity Stream、Fake Featured、Recommendations。

## PROJ-GROWTH

| ID | Decision | Status |
| --- | --- | --- |
| PROJ-GROW-001 | Max 2 Projects | Superseded |
| PROJ-GROW-002 | Natural collection growth allowed | Confirmed |
| PROJ-GROW-003 | Future Grid layout | Revalidate |
| PROJ-GROW-004 | Featured hierarchy | Parked |
| PROJ-GROW-005 | Archive | Parked |
| PROJ-GROW-006 | Project Detail / Case Study | Parked |

## PROJ→FEED

| ID | Contract | Status |
| --- | --- | --- |
| PROJ-FEED-001 | Real meaningful Project update may create Feed Activity | Confirmed |
| PROJ-FEED-002 | Routine copy edit does not automatically emit | Confirmed |
| PROJ-FEED-003 | Screenshot change alone does not automatically emit | Confirmed |
| PROJ-FEED-004 | Tag tweak alone does not automatically emit | Confirmed |
| PROJ-FEED-005 | Repeated deployment does not automatically emit | Confirmed |
| PROJ-FEED-006 | Source-side Project workflow owns event semantics | Confirmed |
| PROJ-FEED-007 | Meaningful update + `updateId` idempotency | Confirmed |
| PROJ-FEED-008 | Feed destination = `/projects/`; Card destination = external `project.url` | Confirmed |

Field diff 不自动推导 Product event semantics。

---

# 9. Cross-module Contract Ledger

## XMOD-BLOG-01 — First Publish

Blog first formal public publication may create one `BLOG · 发布`。

**Confirmed**

## XMOD-BLOG-02 — Ordinary Edit

Ordinary Blog edit：no second Published Footprint；no snapshot rewrite。

**Confirmed**

## XMOD-BLOG-03 — Hide

Blog source hidden：Footprint record / snapshot remain；Public Timeline projection disappears。

**Confirmed**

## XMOD-BLOG-04 — Own Footprint Visibility

If Blog source remains public, footprint may still be manually hidden independently。

**Confirmed**

## XMOD-BLOG-05 — Restore

Blog restored：original Footprint may reappear；no duplicate Published Footprint。

**Confirmed**

## XMOD-BLOG-06 — Hard Delete

Historical record / snapshot may remain；known-dead destination should not continue sending visitor to 404。

**Confirmed Product principle**

## XMOD-ADR-005

Separate record、immutable snapshot、no cascade delete remain valid；storage independence ≠ public projection independence。

**Confirmed clarification**

## XMOD-PROJ-01

Projects/source side owns Project update emission semantics。

**Confirmed**

## XMOD-PROJ-02

Feed displays accepted event as `PROJECT · 更新`。

**Confirmed**

## XMOD-PROJ-03

Supporting “what changed” description strongly preferred。

**Confirmed**

## XMOD-PROJ-04

Feed destination = `/projects/`; Projects index exposes Project Card external destination。

**Confirmed**

## XMOD-LEARN-01

Feed presentation = `LEARN · 更新`。

**Confirmed Feed-side**

## XMOD-LEARN-02

`Learn 完成小节` is not current public semantics。

**Confirmed**

## XMOD-LEARN-03

Public Note lifecycle：

- Draft / Preview → no Feed；
- first formal publication → one historical publication Footprint；
- maintenance edit → silent；
- substantive revision → revision Footprint while retaining same Public Note identity；
- Hide → remove current Public projection, retain publication identity/history；
- Show → restore projection, no second first-publication Footprint；
- `learn_section_completed` → legacy readable compatibility only。

**Confirmed**

---

# 10. Learn Master Ledger

## Module State

**Product / Architecture / Visual:** CLOSED  
**Feed × Learn semantic integration:** CLOSED

## LEARN-PROV-001

Canonical direction：Knowledge Structure + Reading。

**Confirmed**

## LEARN-PROV-002

Public Learn ≠ complete private learning system。

**Confirmed**

## LEARN-PROV-003

Private Lesson ≠ Learning Record ≠ Public Learn Note。

**Confirmed**

## LEARN-PROV-004

Public Learn canonical source = Markdown `.md`。

**Confirmed via ADR-008**

## LEARN-PROV-005

MDX is not default canonical Public Learn content format；future change requires real need + explicit Architecture decision。

**Confirmed**

## LEARN-PROV-006

Interactive future capability does not require changing canonical content to MDX by default。

**Confirmed**

## LEARN-PROV-007

Knowledge Graph capability remains。

**Confirmed**

## LEARN-PROV-008

Old black/magenta/Home-token Graph visual is not canonical。

**Confirmed**

## LEARN-PROV-009

Learn magenta/category color remains tertiary-or-lower auxiliary signal。

**Confirmed**

## LEARN-PROV-010

Canonical Public Note route is flat `/learn/notes/{slug}`；Track is domain context rather than Note identity parent, so moving Track does not redefine Note identity / canonical URL。

**Confirmed**

## LEARN-PROV-011

Public Note is durable continuous Reading Surface and living current knowledge。

**Confirmed**

## LEARN-PROV-012

Publish means public visibility, not learned / mastered / Mission closed / section complete。

**Confirmed**

## LEARN-PROV-013

Public Learn is not an LMS。

**Confirmed**

## LEARN-PROV-014

Fake difficulty、XP、arbitrary completion %、estimated lesson metadata must not be added merely for completeness。

**Confirmed**

## LEARN-PROV-015

Graph relation is explicit author-curated Note relation；shared Track does not imply an edge or prerequisite。

**Confirmed**

## LEARN-PROV-016

Directory Tree and Article Heading TOC are different concepts；the old authoritative Note tree is Superseded。

**Confirmed**

## LEARN-PROV-017

Search is a secondary retrieval utility inside the accepted Knowledge Map system，不是 Learn core identity。

**Confirmed**

## LEARN-PROV-018

Recent Knowledge is lifecycle-driven；maintenance edit silent，first publication / substantive revision define public freshness semantics。

**Confirmed**

## LEARN-PROV-019 — Historical Track Power question

Old open Track-power question is Superseded by the accepted model：Track = domain / categorical context, not Public Note parent or curriculum authority。

**Superseded**

## LEARN-PROV-020 — Historical Graph Semantics question

Old Track-node graph model is Superseded。Accepted model：nodes = Public Notes；edges = explicit author-curated Note relations；Track provides macro domain orientation。

**Superseded**

## LEARN-PROV-021 — Historical Homepage Main Entry question

Accepted homepage model：Knowledge Map = Track directory × Graph；Search = secondary retrieval utility；Recent Knowledge = lifecycle-driven secondary surface。

**Superseded**

## LEARN-PROV-022

Implementation visual residue must not determine permanent IA or Product hierarchy。

**Confirmed**

## LEARN-PROV-023

Sorting / empty-track implementation explanations should not appear as Public Copy。

**Confirmed**

## LEARN-PROV-024

Learn RSS：Revalidate。

## LEARN-PROV-025

Old Public Learn noindex assumption：Revalidate rather than automatically restore。

## LEARN-PROV-026

Retrieval Practice、Spaced Review、Quiz、Simulator、Curriculum、progress/gamification：Parked / Future, not current gaps。

## LEARN-PROV-027

Feed display grammar = `LEARN · 更新`；first publication and substantive revision produce public Feed semantics；maintenance edits silent；legacy completion compatibility only。

**Confirmed**

---

# 11. Family Revalidate Ledger

| ID | Item | Status |
| --- | --- | --- |
| FAMILY-REV-001 | Exact Shared Content Footer / Ending component | Parked |
| FAMILY-REV-002 | Exact shared radius token values | Revalidate |
| FAMILY-REV-003 | Exact focus token implementation | Revalidate |
| FAMILY-REV-004 | Exact elevation/shadow token model | Revalidate |
| FAMILY-REV-005 | Exact neutral border token | Revalidate |
| FAMILY-REV-006 | Exact responsive breakpoint constants | Revalidate |
| FAMILY-REV-007 | Global Content Admin | Parked |

---

# 12. Historical Architecture Preflight Register

Historical technical questions retained for traceability；not Product decisions or current backlog。

| ID | Historical item | Module |
| --- | --- | --- |
| ARCH-REV-001 | Blog source visibility → Feed projection query | Feed/Blog |
| ARCH-REV-002 | ADR-005 clarification | Feed/Blog |
| ARCH-REV-003 | Blog hard-delete dead-destination mapping | Feed/Blog |
| ARCH-REV-004 | Project update event entry/idempotency | Projects/Feed |
| ARCH-REV-005 | Project update description storage/source | Projects/Feed |
| ARCH-REV-006 | Feed canonical timezone | Feed |
| ARCH-REV-007 | Feed SSR/client initial loading | Feed |
| ARCH-REV-008 | Feed cursor tie-break/group merge | Feed |
| ARCH-REV-009 | Feed Owner/Manage route mapping | Feed |
| ARCH-REV-010 | Feed media runtime | Feed |
| ARCH-REV-011 | Feed composer runtime/a11y | Feed |
| ARCH-REV-012 | Shared token inventory/mapping | Family |
| ARCH-REV-013 | Learn source-event contract | Learn/Feed |

---

# 13. Supersession Safety Register

Downstream implementation must not restore the following merely because they remain in historical code / evidence。

## Family

universal Content Card、mandatory shared opening slots、universal max-width、universal Tag component、universal date presentation、universal destination interaction、mandatory Shared Footer、default shadow/elevation、shared token = shared appearance。

## Blog

Archive Card、taxonomy sidebar、Archive Tags / Views、top/bottom taxonomy utility、Year/Month grouping now、timeline、Archive intro、`catstarry.xyz` eyebrow、boxed/numbered pagination、Article direct Star Map return、centered wordmark、`BLOG / READING`、duplicate Category、Header Tags、fixed 720px reading width、Share/Giscus inside Paper、Paper Card treatment。

## Feed

blue/black Feed、strong Activity Card stack、native high-card / Footprint low-row hierarchy、system-log Footprints、five-color Activity system、timeline rail/node/tick、relative-time-first、Month heading、full-card destination、title-as-default destination、Anonymous Login FAB、login→auto-publish、optimistic prepend、`系统足迹`、`Projects 实质更新`、`Learn 完成小节`、`PUBLIC FOOTPRINTS`、`加载更多`。

## Projects

max 2、strict one-line Description、Screenshot mandatory forever、orange module theme / arrow、`独立部署`、architecture-heavy Intro、INDEX READY、Public materially updated、public mechanics copy、PROJECT PREVIEW / 截图待补、all-tech tag wall、interactive tech chips、screenshot hover zoom、fake Empty Card / filler sections、automatic removal of accepted hover/shadow。

---

# 14. Parked ≠ Missing Register

> **A Parked capability must not be reported as an implementation gap.**

### Blog

Featured、Popular、Search、TOC、recommendation、reading progress。

### Feed

Search/filter、Archive、realtime、social、infinite scroll、platform embeds、persistent drafts。

### Projects

Detail、Case Study、Featured hierarchy、Archive、Status、taxonomy/filter、richer CMS。

### Learn

review system、quiz、simulator、gamification、curriculum machinery。

---

# 15. Implementation Risk Register

## IR-01 — Card normalization

Do not implement Blog Entry / Feed Activity / Project Card as one visual Card grammar。

**Critical**

## IR-02 — Shared token normalization

Do not make same radius / border / shadow / surface fill mandatory merely because tokens are shared。

**Critical**

## IR-03 — Opening component overreach

Do not require Eyebrow + Title + Description + Utility on every module。

**High**

## IR-04 — Interaction normalization

Do not apply hover lift + shadow to every Content object。

**Critical**

## IR-05 — Destination normalization

Do not make Feed whole-card clickable；do not add redundant CTA to Projects。

**Critical**

## IR-06 — Tag normalization

Do not apply Projects bounded Tech Tag treatment to Blog taxonomy links。

**High**

## IR-07 — Footer overreach

Do not create mandatory global Footer merely to solve Projects bottom space。

**Medium**

## IR-08 — Admin overreach

Do not create global Content Admin merely because Feed / Learn have module-local owner tooling。

**High**

## IR-09 — Event shortcut

Do not implement Blog / Project source-event lifecycle only from Feed UI assumptions。

**Critical**

## IR-10 — Learn accepted boundary

Do not restore Track as parent/curriculum、replace Track × Graph complementary navigation、or replace living Public Note lifecycle。

**Critical**

---

# 16. Historical Implementation Dependency Map

Sections 16–20 preserve the completed delivery / acceptance sequence as historical traceability. They are not current implementation order。

```text
MASTER LEDGER / GOVERNANCE FREEZE
                │
                ▼
CURRENT IMPLEMENTATION INVENTORY
                │
                ▼
CONTENT FAMILY SHARED IMPLEMENTATION
                │
                ▼
SHARED ACCEPTANCE
                │
       ┌────────┼──────────────┐
       ▼        ▼              ▼
   PROJECTS    BLOG           FEED
       │        │              │
       ▼        ▼              ▼
Implementation Implementation Implementation
       │        │              │
       ▼        ▼              ▼
Acceptance   Acceptance      Acceptance
       └────────┬──────────────┘
                ▼
CONTENT INTEGRATION PREVIEW
                │
LEARN PRODUCT / ARCHITECTURE / IMPLEMENTATION
                │
                ▼
ALL FOUR MODULES READY
                │
                ▼
CONTENT INTEGRATION & ACCEPTANCE
                │
                ▼
RELEASE / DEPLOYMENT
```

---

# 17. Historical Wave Order

## Wave 0 — Governance Documentation Freeze

Canonical governance package was persisted before implementation sequencing。

## Wave 1 — Shared Implementation

Shared Cream Gallery / token / focus / return primitives only where genuinely shared。

## Wave 2 — Projects

Used as the lowest architecture-risk module / canary for Family rules。

## Wave 3 — Blog

Closed Product, larger visual / composition scope than Projects。

## Wave 4 — Feed

Architecture Preflight preceded production implementation of D — Quiet Deposition。

## Parallel Learn Track

Learn Product / Architecture closure proceeded separately before final four-module integration。

---

# 18. Historical Module Acceptance Gates

## Projects

Verify shadow/lift、arrow、copy、Tags、mobile、Empty、ending、real screenshot quality。

## Blog

Verify Archive no Card、1120 measure、Summary reveal / mobile visibility、≈760 Reading、Tonal Paper、return hierarchy、Previous/Next、Share/Giscus、responsive/a11y。

## Feed

Verify D、equal Activity rank、three grammars、chronology、media、Clip states、source projection、owner/authorship states、Loading/Error/Empty/Pagination、Mobile。

## Learn

Verify accepted Product / Architecture / Visual boundary before final module acceptance。

---

# 19. Historical Content Integration Preview Gate

Early cross-module preview was used after shared work and closed-module implementations passed their module gates to detect integration regression before final acceptance。

---

# 20. Historical Final Content Integration & Acceptance Gate

Final integration required Blog / Feed / Learn / Projects and shared Family work to pass their gates, then verified Product preservation、Cream Gallery continuity、module surface differences、navigation、responsive behavior、state handling、cross-module lifecycle and regression safety。

---

# 21. Canonical Governance State

```text
Family Shared Product Rules   FROZEN
Blog Product Truth            FROZEN
Feed Product Truth            FROZEN
Projects Product Truth        FROZEN
Learn Product Truth           CLOSED
```

`FROZEN` means downstream implementation cannot silently drift from these decisions；a later explicit Product decision can amend or supersede them。

---

# 22. Final Verdict

> **MASTER PRODUCT / CAPABILITY LEDGER — CANONICAL**

```text
Family Shared Contract        RECONCILED / FROZEN
Blog                          CLOSED / FROZEN
Feed                          CLOSED
Projects                      CLOSED / FROZEN
Learn                         CLOSED
Cross-module Blog→Feed        RESOLVED
Cross-module Project→Feed     RESOLVED
Cross-module Learn→Feed       CLOSED
Shared Footer                 PARKED
Global Content Admin          PARKED
```
