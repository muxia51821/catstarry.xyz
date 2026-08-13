# catstarry.xyz — Reconciled Content Family Contract

**Version:** v1 — Canonical
**Date:** 2026-08-10
**Scope:** Blog / Feed / Learn / Projects
**Family state:** RECONCILED / FROZEN for implementation
**Closed modules:** Blog / Feed / Learn / Projects
**Learn decision baseline:** Product / Architecture / Visual Reality Check COMPLETE; implementation ACCEPTED / MERGED
**Purpose:** Govern shared Content Family semantics, module exceptions, and cross-module product boundaries

> 本合同描述当前 canonical governance state。它不证明 production implementation 已完成，也不单独授权 deployment。

原子需求、状态、implementation drift、Architecture Revalidate 与 Acceptance Gate 见 [`master-ledger.md`](master-ledger.md)；历史冲突为何这样收敛见 [`reconciliation-register.md`](reconciliation-register.md)；实施顺序见 [`implementation-dependency-map.md`](implementation-dependency-map.md)。

---

## 0. Authority and state boundary

### 0.1 Authority order

1. 木下之后最新的明确裁决。
2. 真正的 Family-shared question：本合同与 Master Ledger。
3. 已关闭的 module-local question：对应 Module Closure truth，由 Master Ledger 的模块原子条目持久化。
4. Accepted ADR / architecture：负责技术边界，不得自行重开已关闭 Product Truth。
5. Current implementation：提供 implementation truth / evidence，不自动成为 design authority。
6. 历史 requirements、prototype 与旧实现：只在未被后期裁决 Supersede 时继续有效。

> **Family governs shared language; Closure governs closed module semantics.**

遇到看似冲突时，先判断问题属于 shared contract 还是 module-local semantics，不得机械用一份文档跨职责覆盖另一份。

### 0.2 Decision state is not implementation state

- Family shared rules：RECONCILED / FROZEN for implementation。
- Blog：CLOSED。
- Feed：CLOSED。
- Projects：CLOSED。
- Learn：Product / Architecture / Visual Reality Check COMPLETE；implementation ACCEPTED / MERGED。
- Implementation：Blog / Projects 已 ACCEPTED 并 FROZEN；Feed / Learn 已 ACCEPTED / MERGED；Feed × Learn semantic integration CLOSED。
- Production deployment：不由本合同授权。

> **Current implementation does not automatically override later Product Closure.**

Confirmed 但尚未实现属于 implementation gap；Revalidate 是明确待复核事项；Superseded 不得因旧代码仍存在而恢复；Parked 不是当前承诺，也不是 implementation gap。

---

## 1. Family identity and composition

### 1.1 Cream Gallery

Content Family 的共同环境是 **Cream Gallery**：

- Cream Canvas；
- Warm Ink；
- restrained Hairline；
- Klein Blue；
- shared typography roles；
- shared interaction / accessibility language。

Cream Gallery 是共同物理环境，不是共同页面模板。以下模块表达可以同时成立：

- Blog：Paper / editorial reading；
- Feed：Quiet Deposition / chronology；
- Learn：Knowledge Structure + Reading；
- Projects：Full Object Card。

### 1.2 Family is not a template

Shared family language does not imply shared information architecture, composition, or layout。不得从 Family consistency 推导相同的：

- header / hero；
- Card；
- width；
- metadata slots；
- pagination；
- footer；
- hover behavior。

### 1.3 Opening and navigation hierarchy

Content Family 共享 opening rhythm、hierarchy language、copy discipline 与 top navigation zone，不共享 mandatory opening slots。

- Blog：Title only 合法。
- Feed：Title + Intro + module utility 合法。
- Projects：Eyebrow + Title + Intro 合法。
- Eyebrow 是 optional semantic element，不是 Opening mandatory slot。

Top-level Content module 使用 `返回星图` 作为 global exit。Nested child 优先返回 parent；Blog Article → Blog 已确认。Learn 的具体 route hierarchy 以已完成的 Architecture Final 为准，本合同不重述其细节。

### 1.4 Width follows surface function

Content Family 没有 universal max-width。可以共享 spacing、page gutter 与 breakpoint philosophy，但 Reading、Archive、Timeline、Grid 的 measure 由 surface function 决定。

---

## 2. Surface, Card, and interaction

### 2.1 Surface semantics

Surface model 保留：

- S0 Canvas；
- S1 Structural Plane；
- S2 Object Surface；
- S3 Overlay / Elevated。

Surface level 描述 semantic role 与 separation strength，不规定固定视觉 treatment。

> **S2 ≠ Full Card.**

- Blog Archive Entry 有独立文章身份，但不是 Full Card。
- Feed Activity 是 S2 object rank，但 D — Quiet Deposition 不使用 full background、border 或 shadow。
- Project 是完整 destination object，因此 Full Object Card 合法。

### 2.2 Card Admission

Card 需要同时具备：

1. Object Identity；
2. Unit Behavior；
3. Boundary Necessity。

通过 Card Admission 只表示 visible object boundary 可以成立，不表示必须拥有 fill、border、radius、shadow 或 lift；这些属于 Surface Treatment。

> **There is no universal Content Card.**

代码可以共享 primitive，但 Shared primitive ≠ shared final appearance。不得用统一 final Card appearance 覆盖 Blog、Feed、Learn、Projects。

### 2.3 Elevation

Elevation 是 opt-in、semantic、module-proven 的能力，不是 Content Family 默认 surface grammar。

- Projects 的 static shadow、hover lift、stronger hover shadow 是 Confirmed module exception，必须保留。
- Blog Archive、Blog Reading Paper 与 Feed Activity 不使用 shadow。
- Projects exception 不传播给其他模块。

### 2.4 Hairline and Radius

Hairline 是主要 structural grammar，其强度服从结构职责：Blog entry boundary、Feed chronology/internal boundary、Projects object boundary 可以不同。

Radius 是 shared material parameter，不是 required Family property：

- surface 需要 radius 时优先使用 shared token；
- surface 不需要时，no radius 合法；
- radius token 的存在不要求 Blog Paper、Feed Activity 或 Learn structural plane 圆角化。

### 2.5 Interaction ceiling

一个 object 通常只需要一个清晰的 semantic interaction response。已有 content reveal、lift、color shift 或 explicit action 后，不再叠加无必要的 border、underline、zoom、badge motion、CTA reveal、glow 或多重 simultaneous shifts。

- Blog：Summary reveal + Title Klein Blue 已足够。
- Projects：lift + shadow + arrow Klein Blue 已达到 ceiling。
- Feed D 依赖静态 hierarchy，不需要 hover theater。

---

## 3. Shared materials and visual language

### 3.1 Semantic token governance

> **Share semantic tokens; do not force shared appearance.**

可共享的 semantic domains：

| Domain | Candidate semantics |
| --- | --- |
| Color | Cream Canvas、Warm Ink、Warm Neutral、Warm Hairline、Klein Blue |
| Interaction | focus color、focus width/offset bands、disabled treatment、reduced-motion handling |
| Structure | spacing scale、line opacity bands、radius scale、elevation scale |

Shared token 的存在不要求所有模块调用。Shadow、Radius、Surface token 均不得被解释为跨模块视觉义务。

### 3.2 Klein Blue

Klein Blue 是 low-area、high-purity、continuously perceptible Brand Voltage，主要用于 link、focus、selected interaction 或确有语义的局部 action。

它不成为 large background、module theme、Card fill、category system 或 all-heading color。

### 3.3 Category and module color

Category / module color 是 tertiary-or-lower auxiliary signal。允许 single-use、low-area、noninteractive weak identity marker，但它必须局部、极弱，不承担 interaction、state 或 module palette。

Projects 的 `SELECTED WORKS` 可保留极弱 orange；该 orange 不扩展到 arrow、Card、border、Tags、links 或 background。

### 3.4 Typography, Mono, and metadata

T0–T5 typography role system 保留。层级原则：

> **Primary meaning outranks structural metadata; structural metadata outranks auxiliary metadata; decoration comes last.**

- Blog：Title / Summary > taxonomy / views。
- Feed：Content > structural time / type metadata。
- Projects：Project > Description > Tech。

Mono 是 role-based，不是 module-based。它只用于真实 structural metadata 或 machine/technical metadata，不因 Feed 是 timeline、Projects 是技术项目而整页 Mono 化。

Metadata is earned, not filled：

- Data existence does not create public UI entitlement。
- Metadata density follows semantic need, not schema completeness。
- Projects 的 date / visibility / updateId 不因存在就必须公开显示。
- Feed 不同 Activity 字段可以不同，但 object rank 相同。

### 3.5 Tag semantics

Tag 是 semantic data concept，不是 universal visual component。

- Blog taxonomy Tag：可点击、plain text、承担 discovery/navigation。
- Projects annotation Tag：可使用 light bounded unit、noninteractive、low contrast、small radius。

字段同名不构成共享 pill component 的理由。

---

## 4. Destination, time, and public language

### 4.1 Destination semantics

Destination affordance 服从 object role：

| Object role | Affordance | Canonical example |
| --- | --- | --- |
| Destination Object | whole-object link 合法，不重复 CTA | Projects Project Card |
| Record with Destination | explicit destination action；record 本身不 whole-card clickable | Feed Activity |
| Editorial Navigation | 使用模块自己的 archive / reading grammar | Blog |

Arrow 是轻量 semantic convention：`→` 表示站内 continuation / destination，`↗` 表示明确 external destination；并非所有 link 都必须显示 arrow。

### 4.2 Semantic time and chronology

Time prominence 与 presentation 服从 object semantics 和 user task：

- Blog：`MM.DD`，低权重 archival context；
- Feed：Year → `MM.DD` → `HH:mm`，chronology 是核心 identity；
- Projects：不显示 Date。

Family 可以复用 formatter/token，不统一 layout/hierarchy。Chronology 与 historical browsing 保持 module-specific：

- Blog：有时间感但不是 timeline；quiet newer / older navigation。
- Feed：timeline；Load More → `更早的内容` → `止步于此。`。
- Projects：无 timeline，当前无 pagination。

### 4.3 Public Copy and internal vocabulary

Public Copy 解释 content、meaning、state 和 available action，不解释 implementation mechanics。

不得向访客暴露 deployment、storage、index、eligibility、publishing mechanics、API、Worker、D1、internal query 或 event discriminator。

Internal data/schema/event vocabulary 不自动成为 Public Copy。`system_footprint`、`visibility`、`updateId`、`materially updated` 可以内部存在，但不因此显示给访客。

Public error copy 可以说明什么暂时不可用并提供 Retry/action，但仍不得泄露内部机制。

Family voice 可以自然、有人格、有少量文学性，但避免明显 AI 腔；不强制四个模块建立刻意不同的 voice system。

---

## 5. Motion, responsive behavior, and media

### 5.1 Motion and reduced motion

Motion 服务 content 或 interaction semantics，不服务 decorative activity。Blog Summary reveal、Projects object lift、functional overlay transition 合法；gratuitous floating、glow motion、endless animation 与全 Family 同款 hover animation 不作为默认。

Reduced motion 后，meaning 与 capability 必须完整保留。装饰性 motion 可以减弱或移除，信息和操作不能消失。

### 5.2 Desktop hover → mobile complete equivalent

Desktop hover affordance 必须具有完整 non-hover touch/mobile equivalent；移动端不模拟相同 animation，但必须保留 information、action 与 understandable state。

- Blog：Desktop Summary reveal → Mobile Summary visible。
- Feed：destination、Manage、media 不依赖 hover。
- Projects：Mobile 不模拟 lift，但 destination 与信息完整。

### 5.3 Responsive reflow

Mobile 是同一 product logic 的 reflow，不是 Desktop 缩小版，也不是第二套产品。Family 共享 gutter language 与 accessibility principles；各模块 breakpoint 由 actual layout failure point 决定，不要求数值完全一致。

### 5.4 Media role

Media behavior 服从 content role：

- Blog media：Reading content；
- Feed native media：Activity content；
- Feed Clip image：external preview；
- Projects screenshot：Project identity evidence。

Family 不统一 aspect ratio、crop、click behavior、viewer 或 size。

Local dark surface 可在功能或内容确有需要时存在，例如 Blog code block、Feed media viewer/video area、Projects screenshot 内部 dark UI；Cream Gallery 仍是 surrounding environment。

---

## 6. States, growth, ending, and owner tooling

### 6.1 Empty / Loading / Error

Empty state 表示真实 content absence，保持 simple、human、module-consistent；不制造 fake Card、debug copy、eligibility explanation、onboarding、unearned CTA。

Loading / Error 只在模块真实存在动态运行状态时要求完整设计。静态 Blog / Projects 不因 Feed 具有动态状态而制造对应系统。已有状态必须保持模块视觉 identity。

### 6.2 Visual Completeness and plausible growth

Visual Completeness = hierarchy + state + rhythm + continuity + finish，不等于堆功能，也不得通过虚构 product capabilities 达成。

- Blog 没有 Featured / Popular / Search，不等于不完整。
- Feed 没有 Search / social / infinite scroll，不等于不完整。
- Projects 没有 Stats / More Projects / Contact CTA，不等于不完整。

设计应容纳 plausible growth；只有真实 browsing、organization 或 management problem 出现后才建设 scale machinery。Blog Year context = Revalidate；Feed Year/Month Jump = Parked；Projects Archive/Featured = Parked。

### 6.3 Intentional ending

每个 Content surface 都需要 intentional ending。Ending 可由 natural whitespace、pagination end、navigation、related navigation、discussion、shared footer 或其他有语义的 conclusion 形成。

> **Shared Content Footer = Parked.**

Family intentional ending 已 Confirmed；Shared Footer 不是 Confirmed Family capability，不得为修复 Projects whitespace 而给所有模块创建 mandatory Footer。

### 6.4 Owner / Admin boundary

Owner tooling 保持 module-local，直到重复出现的跨模块 workflow 证明 shared administration 的必要性。

- Feed Manage：Confirmed module-local。
- Global Content Admin：Parked。

Feed 的 `管理`、Owner Browsing、Owner Managing、`＋ 发布` 不构成提前建设全站 `/admin` 的理由。

### 6.5 Accessibility

Visual quietness 不得以牺牲 accessibility 为代价。Family 必须保留：

- visible focus；
- keyboard semantics；
- adequate touch target；
- no hover-only information；
- reduced-motion support；
- semantic links/buttons；
- no color-only meaning。

---

## 7. Canonical module exception registry

这些例外是 Family contract 的组成部分。它们防止 shared implementation 抹平已关闭的 module semantics；原子细节仍以 Master Ledger 为准。

### 7.1 Blog

| ID | Confirmed exception |
| --- | --- |
| FAMILY-EX-BLOG-01 | Archive 有 content identity，但不使用 Full Card。 |
| FAMILY-EX-BLOG-02 | Reading 使用 Tonal Paper；no border、no shadow、no radius。 |
| FAMILY-EX-BLOG-03 | Desktop Summary 可由 hover/focus reveal；Mobile Summary always visible。 |
| FAMILY-EX-BLOG-04 | Archive 与 Reading 使用不同 content measure。 |

### 7.2 Feed

| ID | Confirmed exception |
| --- | --- |
| FAMILY-EX-FEED-01 | Activity 均为 S2 rank，但 D — Quiet Deposition 无 Full Card frame。 |
| FAMILY-EX-FEED-02 | Activity 是 record-with-destination，使用 explicit destination action，不 whole-card clickable。 |
| FAMILY-EX-FEED-03 | Chronology 在 Feed 中具有远高于其他 Content module 的结构权重。 |
| FAMILY-EX-FEED-04 | Feed 拥有 module-local owner/manage workflow。 |

### 7.3 Projects

| ID | Confirmed exception |
| --- | --- |
| FAMILY-EX-PROJ-01 | Project Full Object Card 合法。 |
| FAMILY-EX-PROJ-02 | Current shadow + hover lift + stronger hover shadow 合法且 Confirmed。 |
| FAMILY-EX-PROJ-03 | Project Card 使用 whole-card external destination。 |
| FAMILY-EX-PROJ-04 | Tech Tags 可使用轻 bounded annotation。 |
| FAMILY-EX-PROJ-05 | `SELECTED WORKS` 可使用极弱 orange identity marker。 |

---

## 8. Cross-module product contracts

### 8.1 Blog → Feed

| Event | Canonical product behavior |
| --- | --- |
| First public publish | 可以创建一条 `BLOG · 发布` Footprint。 |
| Ordinary edit | 不创建第二条，不改写 immutable snapshot。 |
| Hide | Footprint record 与 snapshot 保留；Public Feed projection 隐藏。 |
| Effective visibility | `source_public AND footprint_visibility_public = public_timeline_visible`。 |
| Restore | 原 Footprint 可以恢复，不创建 duplicate。 |
| Hard delete | historical record 可以保留；known-dead destination 不继续提供 action。 |

ADR-005 的 canonical clarification：

> **storage independence ≠ public projection independence**

Independent record、immutable snapshot、no cascade delete 继续成立；Blog source visibility 必须 gate Public Timeline projection。具体 query、reference 与 tombstone 仍为 Architecture Revalidate。

### 8.2 Projects → Feed

Projects/source side owns Project update event semantics；Feed 只消费与展示。

- copy、screenshot、tags、deploy 等字段变化不自动等于 material Project update；
- 只有用户/source workflow 明确确认该更新具有公开记录价值时，才产生 `PROJECT · 更新`；
- supporting description 应尽量说明这次更新了什么；
- Footprint 的 canonical Feed destination 是 `/projects/`；Project Card 继续使用 external `project.url`；
- `updateId` 提供幂等身份，source-side workflow 负责 meaningful-update semantics。

### 8.3 Learn → Feed

Feed presentation `LEARN · 更新` 已 Confirmed；Learn publication lifecycle 与 manifest v2 integration 已 accepted / merged。Public Note 首次发布产生 `learn_note_published`，后续明确修订产生 `learn_note_revised`；`learn_section_completed` 仅保留 legacy readable compatibility。

---

## 9. Learn accepted boundary

Learn 已完成 Product / Architecture / Visual Reality Check 与 accepted implementation；以下 Family/upstream constraints 继续有效：

- Learn belongs to Cream Gallery；
- Knowledge Structure + Reading direction；
- Knowledge Graph capability retained；
- current black/magenta Graph is not canonical；
- category magenta remains weak；
- Public Learn 不为视觉完整性变成 LMS；
- MDX 不因交互需求自动成为必选；
- Public/internal vocabulary boundary 继续适用；
- Visual Completeness 不得强迫未来 capability。

以下曾是 Learn module-local open decisions；现不得绕过 accepted implementation 重新裁决：

- Track power；
- Graph semantics；
- Homepage hierarchy。

---

## 10. Revalidate and implementation boundary

### 10.1 Family-level unresolved status

| Item | Status / boundary |
| --- | --- |
| Exact Shared Content Footer / Ending component | Parked |
| Exact shared radius token values | Revalidate |
| Exact focus token implementation | Revalidate |
| Exact elevation/shadow token model | Revalidate；Projects behavior 本身不 Revalidate |
| Exact neutral border token | Revalidate |
| Exact responsive breakpoint constants | Revalidate；responsive principles 已 Confirmed |
| Global Content Admin | Parked；只有真实 shared owner workflow 后重开 |

Architecture Revalidate 不等于 Family Product Truth 未关闭。完整项目见 Master Ledger §12，包含 Blog→Feed projection/dead destination、Project event/idempotency、Feed timezone/SSR/cursor/owner/media、shared token mapping 与 Learn source event contract。

### 10.2 Shared implementation admission

Shared implementation 只处理 genuinely confirmed shared capability。可能的候选包括 semantic token reconciliation、focus primitives、Cream Gallery core、top-level return shell、accessible link primitives；是否需要代码修改仍由 current implementation inventory 决定。

以下不自动抽成 shared final component：

- Content Card；
- mandatory-slot Opening；
- Tag visual component；
- Pagination；
- Footer；
- Date layout；
- Media component；
- hover motion。

### 10.3 Downstream hard guards

1. Do not Card-normalize Content Family.
2. Do not flatten Projects elevation.
3. Do not restore Card treatment to Feed D.
4. Do not Card-ify Blog Archive.
5. Do not build mandatory shared opening slots.
6. Do not turn Projects Tech Tag into shared taxonomy UI.
7. Do not make Feed Activities whole-card clickable.
8. Do not add explicit CTA to Projects merely for consistency.
9. Do not create a global Footer only to fill Projects whitespace.
10. Do not create Global Admin because Feed needs owner controls.
11. Do not expose internal event/storage vocabulary as Public Copy.
12. Do not treat Parked capability as an implementation gap.

---

## 11. Canonical verdict

```text
Family Shared Contract        RECONCILED / FROZEN FOR IMPLEMENTATION
Blog                          CLOSED
Feed                          CLOSED
Projects                      CLOSED
Learn                         CLOSED / IMPLEMENTATION ACCEPTED
Shared Footer                 PARKED
Global Content Admin          PARKED
Feed × Learn Integration      CLOSED
Production Deployment         NOT AUTHORIZED BY THIS CONTRACT
```

Final Content Integration & Acceptance = **PASS**。Current downstream stage 是 **Release Handoff**；**Release / Deployment → Production Acceptance** 仍是 separately authorized 后续阶段。本合同仍不单独授权 release 或 deployment。
