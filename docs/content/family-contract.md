# catstarry.xyz — Reconciled Content Family Contract

**Version:** v1 — Canonical
**Date:** 2026-08-10
**Scope:** Blog / Feed / Learn / Projects
**State:** RECONCILED / FROZEN
**Purpose:** Shared Content Family semantics, module exceptions, and cross-module Product contracts

Atomic decisions and module-local closure truth are recorded in [`master-ledger.md`](master-ledger.md).

---

## 0. Product authority and state

1. 木下最新的明确裁决拥有最高 Product authority。
2. Family-shared question 由本合同与 Master Ledger 约束。
3. 已关闭的 module-local question 由对应 Closure truth 约束。
4. Architecture / implementation 不得自行重写已确认的 Product semantics。

> **Family governs shared language; Closure governs closed module semantics.**

Current Product state:

| Scope | State |
| --- | --- |
| Content Family | RECONCILED / FROZEN |
| Blog | CLOSED |
| Feed | CLOSED |
| Projects | CLOSED |
| Learn | CLOSED |
| Feed × Learn semantic integration | CLOSED |

Confirmed、Revalidate、Superseded、Parked 是 Product decision states。Parked capability 不是 implementation gap。

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

Cream Gallery 是共同物理环境，不是共同页面模板：

- Blog：Paper / editorial reading；
- Feed：Quiet Deposition / chronology；
- Learn：Knowledge Structure + Reading；
- Projects：Full Object Card。

### 1.2 Family is not a template

Family consistency 不要求共享：

- header / hero；
- Card；
- width；
- metadata slots；
- pagination；
- footer；
- radius；
- hover behavior。

### 1.3 Opening and navigation hierarchy

Content Family 共享 opening rhythm、hierarchy language、copy discipline 与 top navigation zone，不共享 mandatory opening slots。

- Blog：Title only 合法。
- Feed：Title + Intro + module utility 合法。
- Projects：Eyebrow + Title + Intro 合法。
- Eyebrow 是 optional semantic element。

Top-level Content module 的 global exit 是 `返回星图`，目标语义是 Home **Star Map / Overview**，不是 Home Entry。

Nested child 优先返回真正的 structural parent：

- Blog Article → Blog；
- Learn Track → Learn corpus；
- Learn Public Note → Learn corpus。

Track 是 Public Note 的 domain context，不是 Note identity parent。

### 1.4 Width follows surface function

Content Family 没有 universal max-width。Reading、Archive、Timeline、Grid 的 measure 由 surface function 决定。

---

## 2. Surface, Card, and interaction

### 2.1 Surface semantics

Surface model：

- S0 Canvas；
- S1 Structural Plane；
- S2 Object Surface；
- S3 Overlay / Elevated。

Surface level 描述 semantic role 与 separation strength，不规定固定 visual treatment。

> **S2 ≠ Full Card.**

- Blog Archive Entry 有 object identity，但不是 Full Card。
- Feed Activity 是 S2 object rank，但 D — Quiet Deposition 不使用 full background、border 或 shadow。
- Project 是完整 destination object，因此 Full Object Card 合法。

### 2.2 Card Admission

Card 需要同时具备：

1. Object Identity；
2. Unit Behavior；
3. Boundary Necessity。

通过 Card Admission 不等于必须拥有 fill、border、radius、shadow 或 lift。

> **There is no universal Content Card.**

Shared primitive ≠ shared final appearance。

### 2.3 Elevation

Elevation 是 opt-in、semantic、module-proven 的能力。

- Projects 的 static shadow、hover lift、stronger hover shadow 是 Confirmed module exception。
- Blog Archive、Blog Reading Paper 与 Feed Activity 不使用 shadow。
- Projects exception 不传播给其他模块。

### 2.4 Hairline and Radius

Hairline 的强度服从结构职责。

Radius 是 optional shared material parameter：存在 shared radius token 不要求所有 Content surface 使用 radius。

### 2.5 Interaction ceiling

一个 object 通常只需要一个清晰的 semantic interaction response。已有 content reveal、lift、color shift 或 explicit action 后，不叠加无必要的 border、underline、zoom、badge motion、CTA reveal、glow 或多重 simultaneous shifts。

- Blog：Summary reveal + Title Klein Blue 已足够。
- Projects：lift + shadow + arrow Klein Blue 已达到 ceiling。
- Feed D 依赖静态 hierarchy，不需要 hover theater。

---

## 3. Shared materials and visual language

### 3.1 Semantic token governance

> **Share semantic tokens; do not force shared appearance.**

可共享 semantic domains：

| Domain | Semantics |
| --- | --- |
| Color | Cream Canvas、Warm Ink、Warm Neutral、Warm Hairline、Klein Blue |
| Interaction | focus、disabled、reduced-motion handling |
| Structure | spacing、line opacity、radius、elevation scales |

Shared token 的存在不要求所有模块调用。

### 3.2 Klein Blue

Klein Blue 是 low-area、high-purity、continuously perceptible Brand Voltage，主要用于 link、focus、selected interaction 或明确 action。

不作为 large background、module theme、Card fill、category system 或 all-heading color。

### 3.3 Category and module color

Category / module color 是 tertiary-or-lower auxiliary signal。允许 single-use、low-area、noninteractive weak identity marker，但不承担 interaction、state 或 module palette。

Projects 的 `SELECTED WORKS` 可保留极弱 orange；该 orange 不扩展到 arrow、Card、border、Tags、links 或 background。

### 3.4 Typography, Mono, and metadata

> **Primary meaning outranks structural metadata; structural metadata outranks auxiliary metadata; decoration comes last.**

Mono 是 role-based，不是 module-based。

Metadata is earned, not filled：

- Data existence does not create public UI entitlement。
- Metadata density follows semantic need。
- Projects 的内部实现字段不因存在就必须公开显示。
- Feed 不同 Activity 字段可以不同，但 object rank 相同。

### 3.5 Tag semantics

Tag 是 semantic data concept，不是 universal visual component。

- Blog taxonomy Tag：plain clickable text，承担 discovery/navigation。
- Projects annotation Tag：light bounded、noninteractive、low contrast。
- Learn Tag：retrieval / search metadata，不默认显示为 pill。

---

## 4. Destination, time, and public language

### 4.1 Destination semantics

| Object role | Affordance | Example |
| --- | --- | --- |
| Destination Object | whole-object link 合法，不重复 CTA | Project Card |
| Record with Destination | explicit destination action；record 不 whole-card clickable | Feed Activity |
| Editorial Navigation | module-specific archive / reading grammar | Blog |

`→` 表示站内 continuation / destination；`↗` 表示明确 external destination。不是所有 link 都必须显示 arrow。

### 4.2 Time and chronology

- Blog：`MM.DD`，低权重 archival context。
- Feed：Year → `MM.DD` → `HH:mm`，chronology 是核心 identity。
- Projects：不显示 Date。

Historical browsing 保持 module-specific：

- Blog：有时间感但不是 timeline；quiet newer / older navigation。
- Feed：timeline；`更早的内容` → `止步于此。`。
- Projects：无 timeline。

### 4.3 Public Copy

Public Copy 解释 content、meaning、state 和 available action，不解释 implementation mechanics。

Internal schema / event vocabulary 不自动成为 Public Copy。

Family voice 可以自然、有人格、有少量文学性，但避免明显 AI 腔；不要求四模块刻意建立不同 voice system。

---

## 5. Motion, responsive behavior, and media

### 5.1 Motion and reduced motion

Motion 服务 content 或 interaction semantics，不服务 decorative activity。Reduced motion 后，meaning 与 capability 必须完整保留。

### 5.2 Desktop hover → mobile complete equivalent

Desktop hover affordance 必须有完整 non-hover equivalent：

- Blog：Desktop Summary reveal → Mobile Summary visible。
- Feed：destination、Manage、media 不依赖 hover。
- Projects：Mobile 不模拟 lift，但 destination 与信息完整。

### 5.3 Responsive reflow

Mobile 是同一 Product logic 的 reflow，不是 Desktop 缩小版，也不是第二套产品。Breakpoints 由实际 layout failure point 决定，不要求模块数值一致。

### 5.4 Media role

- Blog media：Reading content；
- Feed native media：Activity content；
- Feed Clip image：external preview；
- Projects screenshot：Project identity evidence。

Family 不统一 aspect ratio、crop、click behavior、viewer 或 size。

---

## 6. States, growth, ending, and owner tooling

### 6.1 Empty / Loading / Error

Empty state 表示真实 content absence，保持 simple、human、module-consistent；不制造 fake Card、debug copy、onboarding 或 unearned CTA。

Loading / Error 只在模块真实存在 runtime state 时设计，不因为某一模块动态化就给整个 Family 复制同一状态系统。

### 6.2 Visual Completeness and plausible growth

Visual Completeness = hierarchy + state + rhythm + continuity + finish，不等于堆功能。

只有真实 browsing、organization 或 management problem 出现后才建设 scale machinery。

### 6.3 Intentional ending

每个 Content surface 都需要 intentional ending，但不要求统一 Footer。

- Blog：由 reading / related navigation / discussion 等既有结构自然收束。
- Feed：timeline ending 明确结束 chronology。
- Projects：natural bottom rhythm 合法，不以 filler section 填空间。
- Learn Home：Knowledge Map / Recent Knowledge 后自然结束即可。
- Learn Track：结束时提供回 Learn corpus 的结构性返回。
- Learn Public Note：以 related knowledge（如存在）与回 Learn corpus 的结构性返回完成阅读收束。

> **Shared Content Footer = Parked.**

### 6.4 Owner / Admin boundary

Owner tooling 保持 module-local，直到重复出现的跨模块 workflow 证明 shared administration 的必要性。

- Feed owner/manage：Confirmed module-local。
- Learn publication lifecycle management：Confirmed module-local。
- Global Content Admin：Parked。

### 6.5 Accessibility

Family 必须保留：visible focus、keyboard semantics、adequate touch target、no hover-only information、reduced-motion support、semantic links/buttons、no color-only meaning。

---

## 7. Canonical module exception registry

### 7.1 Blog

| ID | Confirmed exception |
| --- | --- |
| FAMILY-EX-BLOG-01 | Archive 有 content identity，但不使用 Full Card。 |
| FAMILY-EX-BLOG-02 | Reading 使用 Tonal Paper；no border、no shadow、no radius。 |
| FAMILY-EX-BLOG-03 | Desktop Summary 可 hover/focus reveal；Mobile Summary always visible。 |
| FAMILY-EX-BLOG-04 | Archive 与 Reading 使用不同 content measure。 |

### 7.2 Feed

| ID | Confirmed exception |
| --- | --- |
| FAMILY-EX-FEED-01 | Activity 均为 S2 rank；D — Quiet Deposition 无 Full Card frame。 |
| FAMILY-EX-FEED-02 | Activity 是 record-with-destination，使用 explicit destination，不 whole-card clickable。 |
| FAMILY-EX-FEED-03 | Chronology 在 Feed 中具有最高结构权重。 |
| FAMILY-EX-FEED-04 | Feed 拥有 module-local owner/manage workflow。 |

### 7.3 Projects

| ID | Confirmed exception |
| --- | --- |
| FAMILY-EX-PROJ-01 | Project Full Object Card 合法。 |
| FAMILY-EX-PROJ-02 | static shadow + hover lift + stronger hover shadow 合法。 |
| FAMILY-EX-PROJ-03 | Project Card 使用 whole-card external destination。 |
| FAMILY-EX-PROJ-04 | Tech Tags 可使用 light bounded annotation。 |
| FAMILY-EX-PROJ-05 | `SELECTED WORKS` 可使用极弱 orange identity marker。 |

### 7.4 Learn

| ID | Confirmed exception |
| --- | --- |
| FAMILY-EX-LEARN-01 | Knowledge Map 是 Cream Gallery 内的 S1 structural knowledge field。 |
| FAMILY-EX-LEARN-02 | Track directory 与 Graph 是 categorical / relational 双目录；Track 是 domain context，不是 Note parent。 |
| FAMILY-EX-LEARN-03 | Public Note / Track index entry 不默认 Full Card、shadow 或 lift。 |
| FAMILY-EX-LEARN-04 | Graph relation 来自 explicit Note relation；shared Track 本身不产生 edge 或 prerequisite。 |
| FAMILY-EX-LEARN-05 | Learn Tag 是 retrieval metadata，不默认 pill。 |

---

## 8. Cross-module Product contracts

### 8.1 Blog → Feed

| Event | Product behavior |
| --- | --- |
| First public publish | 可以创建一条 `BLOG · 发布` Footprint。 |
| Ordinary edit | 不创建第二条，不改写 immutable snapshot。 |
| Hide | Footprint record / snapshot 保留；Public Feed projection 隐藏。 |
| Effective visibility | source 与 Footprint 都处于 public 时才进入 Public Timeline。 |
| Restore | 原 Footprint 可恢复，不创建 duplicate。 |
| Hard delete | historical record 可保留；known-dead destination 不继续提供 action。 |

> **storage independence ≠ public projection independence**

### 8.2 Projects → Feed

Projects/source side owns meaningful-update semantics；Feed 只消费 accepted event。

- field diff 不自动等于 meaningful Project update；
- 明确具有公开记录价值的更新才产生 `PROJECT · 更新`；
- supporting description 应尽量说明变化；
- Feed destination 是 `/projects/`；Project Card 继续使用 external `project.url`；
- 同一个 accepted update 不重复产生 Feed Activity。

### 8.3 Learn → Feed

Public Note 是 living current knowledge；Feed event 是 historical snapshot。

| Lifecycle action | Product behavior |
| --- | --- |
| Draft / Preview | 不进入 Public projection，不产生 Feed。 |
| First formal publication | Public Note 首次进入公开 corpus，并产生一次 `LEARN · 更新` publication Footprint。 |
| Maintenance edit | 保持 same Public Note；不产生 Recent / Feed signal。 |
| Substantive revision | 保持 same Public Note identity；进入 Recent Knowledge，并产生 revision Footprint。 |
| Hide | 移出当前 Public projection；保留 publication identity 与 history。 |
| Show | 恢复 Public projection；不产生第二次 first-publication Footprint。 |
| Superseded / Withdrawn | 与普通 Hide 不等价，保持独立语义。 |

Feed presentation 统一为 `LEARN · 更新`。Legacy section-completion records 只保留 readable compatibility，不是当前 Learn Product semantics。

Implementation mechanism 不属于本 Product Contract。

---

## 9. Learn accepted boundary

- Public Learn 是从 private validated learning 中选择性形成的 durable knowledge projection，不是 private learning workflow 的公开镜像。
- Public Note 是 canonical public durable knowledge object，也是 living / revisable knowledge。
- Learn direction = Knowledge Structure + Reading。
- Track = categorical / domain directory；Graph = relational / exploratory directory；二者互补，不建立 authoritative parent tree。
- Track 是重要 context，不是 Note identity parent，也不是 curriculum。
- Knowledge Graph capability retained；旧 black/magenta Graph visual 不构成 canonical design。
- Public Learn 不为视觉完整性变成 LMS，不引入虚假的 completion / progress / gamification。
- Search 是 utility，不成为 Learn 的核心 identity。
- MDX 不因交互需求自动成为 Public Learn canonical format。
- Visual Completeness 不得强迫未来 capability 或为了填满 Track / Graph 制造 Public Notes。

Track power、Graph semantics、Homepage hierarchy 已关闭，不作为 open Product decisions。

---

## 10. Revalidate / Parked boundary

| Item | Status |
| --- | --- |
| Shared Content Footer | Parked |
| Exact shared radius token values | Revalidate |
| Exact focus token implementation | Revalidate |
| Exact elevation/shadow token model | Revalidate；Projects behavior 本身不 Revalidate |
| Exact neutral border token | Revalidate |
| Exact responsive breakpoint constants | Revalidate；responsive principles 已 Confirmed |
| Global Content Admin | Parked |

Architecture implementation questions 不改变 Family Product closure；当前技术事实由 Architecture 负责。

### Shared implementation admission

Shared implementation 只处理 genuinely shared capability。以下不自动抽成 shared final component：

- Content Card；
- mandatory-slot Opening；
- Tag visual component；
- Pagination；
- Footer；
- Date layout；
- Media component；
- hover motion。

### Hard guards

1. Do not Card-normalize Content Family.
2. Do not flatten Projects elevation.
3. Do not restore Card treatment to Feed D.
4. Do not Card-ify Blog Archive.
5. Do not build mandatory shared opening slots.
6. Do not turn Projects Tech Tag into shared taxonomy UI.
7. Do not make Feed Activities whole-card clickable.
8. Do not add explicit CTA to Projects merely for consistency.
9. Do not create a global Footer only to fill whitespace.
10. Do not create Global Admin because module-local owner tooling exists.
11. Do not expose internal event/storage vocabulary as Public Copy.
12. Do not treat Parked capability as an implementation gap.
13. Do not restore Track as Public Note parent, completion-driven Learn, or mandatory curriculum tree.

---

## 11. Canonical verdict

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
