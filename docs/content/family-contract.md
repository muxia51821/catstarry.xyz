# catstarry.xyz — Content Family Contract v1

# Pass 6 — Reconciled Amendment Set

**Scope:** Blog / Feed / Learn / Projects
**Reconciliation Evidence:** Blog Closure + Feed Closure + Projects Closure
**Learn Status:** Existing Family / Learn upstream decisions retained; Learn module itself is not yet Closure-final
**Purpose:** Freeze Family-level shared rules before Master Requirements / Capability Ledger
**Pass:** 6 / 7
**Implementation:** Not authorized by this document alone

---

# 0. Verdict

Pass 6 完成后，原 Content Family Kernel **不需要推翻或重写世界观**。

此前最重要的基础判断全部继续成立：

* Content = Cream Gallery；
* Family consistency ≠ same template；
* Surface strength follows semantics；
* Card 需要准入理由；
* Klein Blue 是低面积 Brand Voltage；
* Category Color 必须弱；
* typography / metadata 服从内容层级；
* Public Copy 不暴露内部机制；
* Visual Completeness 不等于堆功能；
* Mobile 不是 Desktop 缩小版；
* Blog / Feed / Learn / Projects 必须保留模块差异。

本轮真正需要的是：

> **消除原 Kernel 中可能被 Agent 机械理解的绝对措辞，并补上三个模块专项关闭后才出现的成熟规则。**

因此本 Pass 的性质是：

> **Amend, clarify, and strengthen. Not redesign.**

---

# 1. Authority Model — AMENDED

原有“Family rule 与 Module truth”的关系需要明确成 scope-aware authority。

以后发生冲突时：

## 1.1 User Decision

最高：

> 木下之后最新明确裁决。

---

## 1.2 Family-shared Question

真正属于跨模块 shared contract 时：

> Final Family Contract / Final Requirements Ledger

拥有 shared authority。

例如：

* Cream Gallery；
* Klein Blue；
* shared token semantics；
* top-level shell；
* accessibility；
* Content Family public-copy boundary。

---

## 1.3 Module-local Question

真正属于模块内部已经关闭的产品问题时：

> Module Closure Sheet

保持 authority。

例如：

* Blog Archive 不 Card；
* Feed D — Quiet Deposition；
* Projects hover lift 保留。

Family 不得用泛化原则重新打开。

---

## 1.4 Architecture / Implementation

依次参考：

* accepted ADR / architecture；
* current implementation evidence；
* historical requirement。

但：

> Current implementation never automatically overrides later Product Closure.

---

## 1.5 Core Authority Principle

> **Family governs shared language; Closure governs closed module semantics.**

如果某个 Family clause 与 Module Closure 产生看似冲突：

先判断：

> 这是 shared rule，还是 module-specific exception？

不能机械按“哪个文档排名更高”覆盖。

---

# 2. Cream Gallery — RETAIN

保持原 Kernel，不需要实质修改。

## Confirmed

Content Family 的共同环境：

> **Cream Gallery**

共同形成于：

* Cream Canvas；
* Warm Ink；
* restrained Hairline；
* Klein Blue；
* shared typography roles；
* shared interaction/accessibility language。

---

## Clarification

Cream Gallery 是：

> **共同物理环境**

不是：

> 共同页面模板。

因此以下全部合法同时存在：

* Blog Paper；
* Feed Quiet Deposition；
* Learn Knowledge Structure；
* Projects Full Object Card。

---

# 3. Family Layout Rule — STRENGTHENED

新增明确句：

> **Shared family language does not imply shared information architecture, composition, or layout.**

禁止由 Family consistency 推导：

* same header；
* same hero；
* same card；
* same width；
* same metadata slots；
* same pagination；
* same footer；
* same hover behavior。

---

# 4. Surface Model — AMENDED

保留：

* S0 Canvas
* S1 Structural Plane
* S2 Object Surface
* S3 Overlay / Elevated

但增加一个非常重要的后期解释。

## New Canonical Rule

> **Surface level describes semantic role and separation strength; it does not prescribe a fixed visible component treatment.**

尤其：

> **S2 ≠ Full Card.**

三个确认案例：

### Blog Archive Entry

具有独立文章身份。

但：

> no Full Card。

### Feed Activity

明确是 S2 object rank。

但 D：

> no full background / border / shadow。

### Project

明确完整 Object。

因此：

> Full Object Card 合法。

---

# 5. Card Admission — RETAIN + CLARIFY

原 Card Admission Rule 保留。

Card 仍需要：

1. Object Identity
2. Unit Behavior
3. Boundary Necessity

---

## New Clarification

通过 Card Admission：

> **只意味着 visible object boundary 可以成立。**

不意味着必须拥有：

* fill；
  -border；
  -radius；
  -shadow；
  -lift。

这些属于后续：

> Surface Treatment。

---

# 6. Universal Content Card — EXPLICITLY REJECTED

新增硬规则：

> **There is no universal Content Card.**

不得建立一个视觉层面的：

> `.content-card`

然后让 Blog / Feed / Learn / Projects 全部继承：

-同 background；
-同 border；
-同 radius；
-同 shadow；
-同 hover。

代码可以共享 primitive。

但：

> Shared primitive ≠ shared final appearance.

---

# 7. Elevation / Shadow — AMENDED

原 Family 对 ordinary shadow / floating-card grammar 的否定继续成立。

但旧措辞不能再解释为：

> Content Family 中任何 shadow 都违法。

---

## New Canonical Rule

> **Elevation is opt-in, semantic, and module-proven; it is not a default Content Family surface grammar.**

使用 shadow / lift 需要真实对象理由。

---

## Confirmed Module Exception

### Projects

当前：

* static shadow；
* hover lift；
* stronger hover shadow

全部保留。

这是：

> **Projects-specific confirmed elevation exception.**

Projects Closure 已明确禁止后续 Agent 根据旧“去 SaaS residue”建议再次删除它。

---

## Non-exceptions

### Blog

* Archive no shadow；
* Reading Paper no shadow。

### Feed

* Activity no shadow。

---

## Propagation Guard

Projects exception：

> **不得传播给其他模块。**

---

# 8. Interaction Ceiling — NEW

新增 Family rule：

> **One clear semantic interaction response is usually enough.**

如果一个 object 已经通过：

* content reveal；
* lift；
  -color shift；
  -explicit action；

明确表达 interaction，

不要继续叠加：

* stronger border；
  -extra underline；
  -image zoom；
  -badge motion；
  -CTA reveal；
  -glow；
  -multiple simultaneous shifts。

---

## Examples

### Blog

Summary reveal + Title Klein Blue 已足够。

### Projects

lift + shadow + arrow Klein Blue 已达到 ceiling。

### Feed

D 主要依赖静态 hierarchy，不需要 hover theater。

---

# 9. Hairline / Border — RETAIN + CLARIFY

保留：

> Hairline 是 Family 的主要 structural grammar。

新增：

> **Hairline strength follows structural role.**

例如：

* Blog Archive = entry boundary；
  -Feed Date = chronology boundary；
  -Feed Clip = semantic internal boundary；
  -Projects Card = object boundary。

不得因为都叫 Hairline/Border 就强制相同强度。

---

# 10. Radius — AMENDED

原 Kernel 中 Radius 为 material parameter 的方向保留。

正式改为：

> **Radius is a shared material parameter, not a required Family property.**

---

## Token Rule

当某 surface 确实需要 radius：

> 优先使用 shared token。

---

## Usage Rule

当 surface 不需要：

> no radius 完全合法。

---

## Explicit Guard

有：

> `--content-radius-*`

不意味着：

* Blog Paper 要圆角；
  -Feed Activity 要圆角；
  -Learn structural plane 要圆角。

Projects 是当前主要使用者。

---

# 11. Shared Tokens — NEW GOVERNANCE RULE

这是 Pass 5 最重要的 implementation amendment 之一。

## Canonical Rule

> **Share semantic tokens; do not force shared appearance.**

---

## Candidate Shared Token Domains

### Color

* Cream Canvas
* Warm Ink
* Warm Neutral
* Warm Hairline
* Klein Blue

### Interaction

* focus color
* focus width / offset bands
* disabled treatment
* reduced-motion handling

### Structure

* spacing scale
* line opacity bands
* radius scale
* elevation scale

---

## Critical Guard

有 shared token：

> 不等于所有模块都必须调用。

例如：

### Shadow Token exists

不意味着 Blog / Feed 使用 Shadow。

### Radius Token exists

不意味着所有 Content Object rounded。

### Surface Token exists

不意味着所有对象获得背景。

---

# 12. Klein Blue — RETAIN / STRENGTHEN

原规则保持：

> **Low-area, high-purity, continuously perceptible Brand Voltage.**

现在三模块专项进一步确认：

### Blog

* links；
  -hover；
  -focus；
  -category/tag interaction。

### Feed

* links；
  -focus；
  -`＋ 发布`；
  -selected interaction。

### Projects

* focus；
  -external arrow interaction。

---

## Hard Boundary

Klein Blue 不成为：

* large background；
  -module theme；
  -card fill；
  -category system；
  -all-heading color。

---

# 13. Category / Module Color — AMENDED

保留：

> Category Color = tertiary-or-lower auxiliary semantic signal。

加入 exception definition。

---

## Allowed

允许：

> **single-use, low-area, noninteractive weak identity marker**

前提：

* 局部；
  -极弱；
  -不承担 interaction；
  -不承担 state；
  -不形成 module palette。

---

## Canonical Example

Projects：

> `SELECTED WORKS`

可以保留极弱 orange。

这不是：

> orange Projects theme。

Projects orange 不能扩展到：

* arrow；
  -card；
  -border；
  -tags；
  -links；
  -background。

---

# 14. Typography Roles — RETAIN

原 T0–T5 role system 保留。

新增一个后期统一原则：

> **Primary meaning outranks structural metadata; structural metadata outranks auxiliary metadata; decoration comes last.**

三个模块已经分别证明：

### Blog

Title / Summary > taxonomy / views。

### Feed

Content > structural time/type metadata。

### Projects

Project > Description > Tech。

---

# 15. Mono — RETAIN + CLARIFY

Family rule正式明确：

> **Mono is role-based, not module-based.**

可以用于：

-真实 structural metadata；
-真实 machine/technical metadata。

不能因为：

* Feed 是 timeline；
  -Projects 是技术项目；

就将整页 Mono 化。

---

# 16. Metadata Admission — STRENGTHENED

保留：

> Metadata is earned, not filled.

增加两条后期证明。

## Rule A

> **Data existence does not create public UI entitlement.**

例如：

Projects 有 date / visibility / updateId：

> 不代表必须显示。

---

## Rule B

> **Metadata density follows semantic need, not schema completeness.**

Feed 三种 Footprint：

> 字段数量可以不同，但 object rank 相同。

---

# 17. “Tag” Is Not a Family Component — NEW

新增：

> **Tag is a semantic data concept, not a universal visual component.**

---

## Taxonomy Tag

Canonical example：

> Blog Tag

可以：

* clickable；
  -plain text；
  -discovery/navigation。

---

## Annotation Tag

Canonical example：

> Projects Tech Tag

可以：

* light bounded unit；
  -noninteractive；
  -low contrast；
  -small radius。

---

## Guard

不得建立：

> “因为字段名叫 tag，所以全部使用同一个 pill component。”

---

# 18. Eyebrow — RETAIN + EVIDENCE

原 Eyebrow optional rule得到后期强验证。

### Blog

删除 eyebrow。

### Feed

删除 `PUBLIC FOOTPRINTS`。

### Projects

保留 `SELECTED WORKS`。

---

## Canonical Rule

> **Eyebrow is optional and must earn its presence semantically.**

不是 Opening mandatory slot。

---

# 19. Opening — AMENDED

原：

> shared opening rhythm ≠ fixed layout

继续成立，并加强。

## Canonical Rule

> **Content Family shares an opening rhythm and hierarchy language, not an opening template.**

可以共享：

* top navigation zone；
  -title role；
  -spacing；
  -copy discipline。

不能强制：

```text id="uznrs1"
Eyebrow
Title
Description
Utility
```

全部存在。

---

## Module Examples

### Blog

Title only。

### Feed

Title + Intro + module utility。

### Projects

Eyebrow + Title + Intro。

---

# 20. Top-level Navigation — RETAIN

继续：

> Top-level Content modules use `返回星图` as global exit.

现有已关闭模块没有反例。

---

# 21. Nested Navigation — RETAIN, NOT OVER-EXPAND

继续：

> Nested child should return parent first.

Blog 已经实际确认：

> Article → Blog。

Learn 最终 route hierarchy 尚未 Closure，因此：

> 本 Pass 不为 Learn 新增具体 parent navigation wording。

---

# 22. Destination Affordance — NEW

原 Kernel 对 Link/CTA 有原则，但现在需要加入更成熟抽象。

## Canonical Rule

> **Destination affordance follows the semantic role of the object.**

---

## A — Destination Object

当 object 本身就是 destination：

> whole-object link 合法。

Canonical example：

> Projects Project Card。

不再重复 CTA。

---

## B — Record with Destination

当 object 自身是独立记录，而 destination 指向另一个对象：

> explicit destination action。

Canonical example：

> Feed Activity。

Feed Activity 不 whole-card clickable。

---

## C — Editorial Navigation

Blog 保持 archive / reading 自己的 editorial navigation grammar。

---

# 23. Arrow Semantics — NEW LIGHT CONVENTION

新增 shared semantic preference：

> `→`：站内 continuation / destination
> `↗`：明确 external destination

但这只是：

> semantic convention。

不是：

> 所有 link 必须显示 arrow。

---

# 24. Width — NEW FAMILY RULE

Blog Closure 已明确：

* Archive ≈1120px；
* Reading ≈760px；

并要求 Family 不规定 module 内统一 max-width。

Feed 的 Stage 4 reference 又显示它拥有不同的 shell/timeline measure。

---

## Canonical Rule

> **Width follows surface function.**

因此：

> Content Family 没有 universal max-width。

可以共享：

* spacing；
  -page gutter；
  -breakpoint philosophy。

不能统一：

* Reading；
  -Archive；
  -Timeline；
  -Grid

的 content measure。

---

# 25. Time — NEW FAMILY RULE

三个模块形成非常清晰的差异：

### Blog

`MM.DD`

低权重 archival context。

### Feed

Year → `MM.DD` → `HH:mm`

核心 chronology。

### Projects

不显示 Date。

---

## Canonical Rule

> **Time prominence and presentation follow object semantics and user task.**

Family 不要求 universal Date component presentation。

可以复用：

* formatter；
  -token。

不要求复用：

* layout；
  -hierarchy。

---

# 26. Chronology — CLARIFIED

Family 不提供 universal chronology grammar。

### Blog

有时间感，但不是 timeline。

### Feed

timeline 是核心 identity。

### Projects

不使用 timeline。

因此：

> Chronology remains module-specific.

---

# 27. Pagination / Historical Navigation — CLARIFIED

不建立 shared pagination UI。

### Blog

quiet newer / older navigation。

### Feed

Load More → `更早的内容` → `止步于此。`

### Projects

当前无 pagination。

---

## Canonical Rule

> Historical browsing mechanics follow collection semantics.

---

# 28. Public Copy — STRENGTHENED

原 Public Copy Contract 保留，并正式增加：

> **Public Copy explains content, meaning, state and available action—not implementation mechanics.**

三个 Closure 已一致删除：

* deployment；
  -storage；
  -index；
  -eligibility；
  -system discriminator；
  -publishing mechanics；
  -card design rationale。

---

## Public Error Copy

可以解释：

> 什么暂时不可用。

可以提供：

> Retry / action。

不能公开：

* API；
* Worker；
  -D1；
  -internal query；
  -event discriminator。

---

# 29. Internal Vocabulary Boundary — NEW

新增硬规则：

> **Internal data/schema/event vocabulary does not automatically become Public Copy.**

Canonical examples：

* `system_footprint` 可以内部存在；
  -`visibility` 可以内部存在；
  -`updateId` 可以内部存在；
  -`materially updated` 可以作为 internal eligibility notion。

但不自动显示给访客。

---

# 30. Public Voice — RETAIN

保持此前裁决：

> 有人格、有语气、有一点文学性，但不要 AI 感太重。

同时继续：

> 不要求四模块建立明显不同的 voice systems。

Module 差异自然来自内容功能。

---

# 31. Motion — AMENDED

原 motion restraint继续成立。

新增：

> **Motion must serve content or interaction semantics rather than decorative activity.**

合法：

* Blog Summary reveal；
  -Projects object lift；
  -functional overlay transitions。

不合法默认：

* gratuitous floating；
  -glow motion；
  -endless animation；
  -same hover animation across family。

---

# 32. Reduced Motion — STRENGTHENED

新增 Family hard rule：

> **Meaning and capability must remain available when decorative motion is reduced or removed.**

Blog Summary 是正例：

> Reduced motion 不得让 Summary 不可获得。

---

# 33. Mobile Hover Degradation — NEW HARD RULE

三个 Closure 已形成非常强一致。

## Canonical Rule

> **Desktop hover affordances require a complete non-hover equivalent on touch/mobile.**

不要求 Mobile 模拟相同 animation。

只要求：

* information remains available；
  -actions remain available；
  -state remains understandable。

---

## Examples

### Blog

Desktop Summary reveal → Mobile Summary visible。

### Feed

Destination / Manage / media 不依赖 hover。

### Projects

Mobile 不模拟 lift。

---

# 34. Responsive — STRENGTHENED

原：

> Mobile is not desktop shrunk.

更新为：

> **Mobile is a reflow of the same product logic, not a second product and not a simulation of desktop hover behavior.**

---

# 35. Responsive Breakpoints — CLARIFIED

Family 共享：

* principles；
  -gutter language；
  -accessibility requirements。

但：

> 不要求每个模块完全相同的 breakpoint。

Breakpoint 应优先由：

> actual layout failure point

决定。

---

# 36. Media — CLARIFIED

新增：

> **Media behavior follows content role.**

### Blog

Media = Reading content。

### Feed

Native media = Activity content。

Clip image = external preview。

### Projects

Screenshot = Project identity evidence。

因此 Family 不统一：

* aspect ratio；
  -crop；
  -click behavior；
  -viewer；
  -size。

---

# 37. Dark Functional Surfaces — RETAIN + EVIDENCE

原规则保留：

> Local dark surfaces can exist when function/content justifies them.

Confirmed examples：

* Blog code block；
  -Feed media viewer；
  -Feed video area；
  -Projects screenshot 自身的 dark UI。

但：

> Cream Gallery must remain surrounding environment.

---

# 38. Empty State — STRENGTHENED

新增：

> **Empty state represents content absence, not a chance to explain internal systems or manufacture visual furniture.**

通常：

* simple；
  -human；
  -module-consistent。

不要：

* fake Card；
  -debug copy；
  -eligibility explanation；
  -onboarding；
  -unearned CTA。

---

# 39. Loading / Error — CLARIFIED

Loading/Error 只在模块真实具有动态运行状态时要求完整设计。

不能因为 Feed 有：

* Loading；
  -Error；
  -Pagination Error

就要求 static Blog / Projects 也制造对应系统。

---

## Shared Rule

如果状态存在：

> 它必须继续属于模块视觉世界，并保持页面基本 identity。

---

# 40. Visual Completeness — STRENGTHENED

原公式继续：

> hierarchy + state + rhythm + continuity + finish

新增硬规则：

> **Visual completeness must not be achieved by inventing product capabilities.**

Examples：

### Blog

没有 Featured / Popular / Search：

> 不等于不完整。

### Feed

没有 Search / social / infinite scroll：

> 不等于不完整。

### Projects

没有 Stats / More Projects / Contact CTA：

> 不等于不完整。

---

# 41. Growth — NEW HARD RULE

三个模块都证明：

> 不能按当前少量内容降级设计；

但也不能为未来虚构巨大系统。

## Canonical Rule

> **Design for plausible growth; build scale machinery only when a real browsing, organization, or management problem appears.**

---

## Examples

### Blog

Year context：

> Revalidate。

### Feed

Year/Month Jump：

> Parked。

### Projects

Archive / Featured：

> Parked。

---

# 42. Ending — AMENDED

原 Visual Completeness 对页面 ending 的要求正式升级：

> **Every Content surface requires an intentional ending.**

Ending 可以来自：

* natural whitespace；
  -pagination end；
  -navigation；
  -related navigation；
  -discussion；
  -shared footer；
  -other semantically justified conclusion。

---

# 43. Shared Content Footer — DO NOT PROMOTE

Projects 偏好 Shared Footer，但 Projects Closure 自己仍将 exact shared Footer 列为 Revalidate。

Blog 没有提出 mandatory Footer。

Feed 有自己的 Timeline ending。

---

## Final Disposition

> **Shared Content Footer = Revalidate**

不是：

> Confirmed Family capability。

---

## Implementation Guard

不能为了 Projects ending：

> 直接给所有 Content module 创建 mandatory Footer。

如果后续 shared implementation 发现一个非常自然、低成本、确实适合多个模块的 Ending primitive：

可以重新评估。

---

# 44. Owner / Admin — NEW FAMILY BOUNDARY

Feed 当前拥有真实 module-local owner workflow：

* `管理`
* Owner Browsing
* Owner Managing
* `＋ 发布`

Feed Closure 明确要求当前不要因此提前建设全站 `/admin`。

---

## Canonical Rule

> **Owner tooling is module-local unless repeated cross-module workflows prove the need for shared administration.**

---

## Current Disposition

### Feed Manage

Confirmed module-local。

### Family Global Admin

> **Parked**

---

# 45. Accessibility — RETAIN / STRENGTHEN

已有 Family accessibility rule 全部保留。

三 Closure 进一步支持：

* visible focus；
  -keyboard semantics；
  -touch target；
  -no hover-only information；
  -reduced motion；
  -semantic links/buttons；
  -no color-only meaning。

---

## Canonical Principle

> **Visual quietness must never be purchased by reducing accessibility.**

---

# 46. Cross-module Contract — Blog → Feed

## DO NOT PUT INTO CORE VISUAL KERNEL

这是 Pass 5 已解决的重要合同，但它不是视觉 Family Kernel 的普通一条。

应进入：

> **Family Cross-module Contract Appendix + Master Ledger**

---

## Confirmed Product Contract

### First Public Publish

Blog 首次公开：

> 可创建 `BLOG · 发布` Footprint。

### Ordinary Edit

普通编辑：

* 不创建第二条；
* 不修改 snapshot。

### Hide

Blog hidden：

* Footprint record remains；
* snapshot remains；
* Public Feed projection hidden。

### Effective Visibility

```text id="o213pv"
source_public
AND
footprint_visibility_public
=
public_timeline_visible
```

### Restore

Blog restore：

* 原 Footprint 可以恢复；
* 不新建 duplicate。

### Hard Delete

historical record 可保留。

known-dead destination：

> 不继续提供 action。

---

## Architecture Status

具体 query / reference / tombstone：

> Revalidate。

---

# 47. ADR-005 Amendment Requirement

## APPENDIX / LEDGER, NOT VISUAL KERNEL

ADR-005 不整体 Supersede。

必须澄清：

> **storage independence ≠ public projection independence**

继续保留：

* independent footprint record；
  -immutable snapshot；
  -no cascade delete。

补充：

* Blog source visibility gates Public Timeline projection。

---

# 48. Cross-module Contract — Projects → Feed

## APPENDIX / LEDGER

产品层正式确认：

> **Projects/source side owns Project update event semantics.**

Feed 只消费和展示。

---

## Explicitly Not Automatic

以下字段变化本身：

* copy；
  -screenshot；
  -tags；
  -deploy

不自动等价于：

> material Project update。

---

## Explicit Event

当用户/source workflow明确确认：

> 这次 Project 更新具有公开记录价值

才产生：

> `PROJECT · 更新`

---

## Supporting Description

应尽量说明：

> 这次更新了什么。

---

## Architecture Revalidate

* event entry；
  -idempotency；
  -updateId；
  -description storage。

---

# 49. Learn → Feed Boundary

## PROVISIONAL — DO NOT CLOSE

Feed presentation 已确定：

> `LEARN · 更新`

但是 Learn 尚未 Closure。

因此 Family 现在不能确认：

* 哪一种 Learn edit 必须触发；
* Lesson / Note / Section 谁是 source event；
  -description 来源；
  -是否修改现有 event type。

---

## Current Ledger State

```text id="ap3usj"
Feed presentation:
Confirmed

Learn source lifecycle:
Revalidate / Await Learn Closure
```

---

# 50. Learn-specific Existing Family Rules — RETAIN, NOT REVALIDATED HERE

Pass 6 不因为 Learn 尚未 Closure 就删除此前已经确认的 Learn upstream constraints。

继续保留：

* Learn belongs to Cream Gallery；
  -Knowledge Structure + Reading direction；
  -Knowledge Graph capability retained；
  -current black/magenta Graph is not canonical；
  -category magenta must remain weak；
  -Public Learn cannot become LMS merely for completeness；
  -MDX is not automatically required for interaction；
  -Public/internal vocabulary boundary；
  -Visual Completeness cannot force future capabilities。

但：

> Pass 6 不把 Track-first IA、Graph node semantics、Homepage hierarchy升级为 Family-final truth。

这些仍属于 Learn 专项。

---

# 51. What Must Stay Out of Family Kernel

这是 Pass 6 一个关键产物。

以下内容虽然重要，但**不能因为很具体就被塞进 Kernel**。

---

## Blog-local

不要进入 Family Kernel：

* 1120px Archive；
* ≈760px Reading；
* `MM.DD` Archive具体排版；
* Summary reveal 4–6px；
* 180–240ms；
* Previous/Next exact composition；
* Paper 内外具体顺序；
* Giscus；
* Share choices；
* taxonomy route。

这些进：

> Blog Closure / Master Ledger。

---

## Feed-local

不要进入 Family Kernel：

* D — Quiet Deposition exact construction；
* Year → Date → Activity；
* `08.09`；
* `11:32`；
* three Activity grammar；
* `更早的内容`；
* `止步于此。`；
* Owner three-state；
* refresh-after-publish；
* media grid；
* Note max 6 images / one video。

这些进：

> Feed Closure / Master Ledger。

---

## Projects-local

不要进入 Family Kernel：

* exact shadow；
  -hover lift；
  -16:10；
  -2–4 Tags；
  -Underwood tags；
  -catstarry tags；
  -exact Intro；
  -`SELECTED WORKS` orange；
  -whole Card exact structure。

这些进：

> Projects Closure / Master Ledger。

---

# 52. What Belongs in Family Kernel

Family Kernel 应只保留：

1. Cream Gallery
2. Family ≠ template
3. Shared shell logic
4. Surface semantics
5. Card Admission
6. S2 ≠ Card
7. Elevation opt-in
8. Semantic interaction ceiling
9. Hairline structural use
10. Optional Radius token
11. Shared semantic token governance
12. Klein Blue
13. Weak category color
14. Typography roles
15. Mono role rule
16. Metadata Admission
17. Tag semantics not component
18. Optional eyebrow
19. Flexible Opening
20. Top-level navigation
21. Parent-first nested navigation
22. Destination semantics
23. Arrow semantic preference
24. Surface-function width
25. Semantic time prominence
26. Module-specific chronology
27. Module-specific historical browsing
28. Public Copy boundary
29. Internal vocabulary boundary
30. Natural personal voice
31. Semantic motion
32. Reduced motion
33. Mobile hover degradation
34. Responsive reflow
35. Media-role rule
36. Local dark surfaces
37. Empty-state principle
38. Dynamic-state principle
39. Visual Completeness
40. Growth
41. Intentional Ending
42. Shared Footer = Revalidate
43. Owner/Admin emergence rule
44. Accessibility
45. Governance authority boundary

---

# 53. What Belongs Only in Master Ledger

以下不应进入常驻 Kernel，但必须被 Pass 7 完整登记：

* every module Confirmed detail；
  -every Superseded detail；
  -every Parked detail；
  -every Revalidate；
  -implementation drift；
  -architecture revalidate；
  -module exception；
  -cross-module lifecycle；
  -ADR amendment；
  -evidence branch；
  -acceptance checklist；
  -implementation state；
  -source pointer。

---

# 54. What Belongs in Conflict / Reconciliation Register

Pass 5 已关闭的冲突仍需在治理档案中保留原因。

不要从历史中抹掉。

尤其：

* shadow / Projects exception；
  -Feed explicit destination vs Projects whole-card；
  -Projects weak orange exception；
  -Blog taxonomy Tag vs Projects annotation Tag；
  -Shared Footer decision；
  -Blog→Feed visibility；
  -Project→Feed event；
  -Flexible Opening；
  -radius；
  -shared token ≠ shared appearance；
  -Feed-local Manage；
  -Ending principle。

原因：

> 以后如果 Agent 再问“为什么”，不能只看到结果，看不到 reconciliation reasoning。

---

# 55. Old Family Wording That Must Be Treated as Superseded

如果旧 Family Kernel 中存在或被解释成以下绝对命题，它们现在明确 Superseded：

### Superseded interpretation 1

> Content Family 不允许 shadow。

改为：

> Elevation opt-in；Projects confirmed exception。

---

### Superseded interpretation 2

> S2 必须是 visible Card。

改为：

> S2 是 semantic object rank。

---

### Superseded interpretation 3

> Family 统一使用某种 Card。

改为：

> No universal Content Card。

---

### Superseded interpretation 4

> Tag 应统一视觉。

改为：

> Tag semantics determine presentation。

---

### Superseded interpretation 5

> Content pages 应共享固定 opening slots。

改为：

> Shared rhythm, flexible composition。

---

### Superseded interpretation 6

> Content pages应统一 max-width。

改为：

> Width follows surface function。

---

### Superseded interpretation 7

> 所有 object 应 whole-card clickable。

改为：

> Destination follows object role。

---

### Superseded interpretation 8

> 所有 object 都应该显式 CTA。

同样被：

> Destination follows object role

取代。

---

### Superseded interpretation 9

> Shared Footer 已经 Confirmed。

不成立。

状态：

> Revalidate。

---

### Superseded interpretation 10

> Shared token 就应该产生 shared appearance。

明确不成立。

---

# 56. Family Module Exception Registry

必须在最终 Ledger 中显式存在。

---

## Blog Exceptions

### FAMILY-EX-BLOG-01

Archive 有 content identity，但不使用 full Card。

### FAMILY-EX-BLOG-02

Reading uses Tonal Paper：

* no border；
  -no shadow；
  -no radius。

### FAMILY-EX-BLOG-03

Desktop Summary hover/focus reveal；

Mobile Summary always visible。

### FAMILY-EX-BLOG-04

Archive / Reading 使用不同 content measure。

---

## Feed Exceptions

### FAMILY-EX-FEED-01

Activity 全部为 S2 rank，但 D 无 full Card frame。

### FAMILY-EX-FEED-02

Activity 是 record-with-destination，因此使用 explicit action。

### FAMILY-EX-FEED-03

Chronology 在 Feed 中具有远高于其他 Content module 的结构权重。

### FAMILY-EX-FEED-04

Feed 当前拥有 module-local owner/manage workflow。

---

## Projects Exceptions

### FAMILY-EX-PROJ-01

Project Full Object Card 合法。

### FAMILY-EX-PROJ-02

Current shadow + hover lift + stronger shadow合法且 Confirmed。

### FAMILY-EX-PROJ-03

Project Card 使用 whole-card external destination。

### FAMILY-EX-PROJ-04

Tech Tags 可使用轻 bounded annotation。

### FAMILY-EX-PROJ-05

`SELECTED WORKS` 可使用极弱 orange identity marker。

---

# 57. Family Revalidate Registry After Pass 6

当前真正 Family-level Revalidate 已显著减少。

保留：

## FAMILY-REV-01

Exact Shared Content Footer / Ending component。

---

## FAMILY-REV-02

Exact shared radius token values。

---

## FAMILY-REV-03

Exact focus token implementation。

---

## FAMILY-REV-04

Exact elevation/shadow token model。

注意：

> Projects behavior itself不 Revalidate。

只 Revalidate：

> token 实现方式。

---

## FAMILY-REV-05

Exact neutral border token。

---

## FAMILY-REV-06

Exact responsive breakpoint constants。

原则已经 Confirmed；

数值可 implementation 决定。

---

## FAMILY-REV-07

Global Content Admin。

当前：

> Parked。

只有真实 shared owner workflow 后重开。

---

# 58. Architecture Revalidate Registry After Pass 6

这些不属于 Family 产品未决。

## ARCH-REV-01

Blog hidden → Feed projection query。

## ARCH-REV-02

ADR-005 clarification。

## ARCH-REV-03

Blog hard-delete / dead destination behavior。

## ARCH-REV-04

Project update event entry / idempotency。

## ARCH-REV-05

Feed canonical timezone。

## ARCH-REV-06

Feed SSR / Client initial loading。

## ARCH-REV-07

Feed cursor grouping / stable ordering。

## ARCH-REV-08

Feed owner/manage route mapping。

## ARCH-REV-09

Feed media runtime。

## ARCH-REV-10

Shared token inventory / mapping。

## ARCH-REV-11

Learn source event contract — awaiting Learn Closure。

---

# 59. Implementation Governance Amendment

Family reconciliation 后，Codex implementation 必须遵守：

> **Shared implementation before or alongside module implementation only when the shared capability is genuinely confirmed.**

不能建立 shared component 只是因为：

> “四个页面差不多”。

---

## Shared implementation candidate

可以处理：

* semantic token cleanup；
  -focus primitives；
  -Cream Gallery core；
  -top-level return shell；
  -possibly shared accessible link primitives。

---

## Not automatically shared

不能自动抽：

* Content Card；
  -Opening component with mandatory slots；
  -Tag visual component；
  -Pagination；
  -Footer；
  -Date layout；
  -Media component；
  -hover motion。

---

# 60. Implementation Risk Guards

最终 handoff 必须携带：

## Guard 1

Do not Card-normalize Content Family.

## Guard 2

Do not flatten Projects elevation.

## Guard 3

Do not restore Card treatment to Feed.

## Guard 4

Do not Card-ify Blog Archive.

## Guard 5

Do not build mandatory shared opening slots.

## Guard 6

Do not turn Projects Tech Tag into shared taxonomy UI.

## Guard 7

Do not make Feed Activities whole-card clickable.

## Guard 8

Do not add explicit CTA to Projects just for consistency.

## Guard 9

Do not create global Footer only to fix Projects whitespace.

## Guard 10

Do not create global Admin because Feed needs owner controls.

## Guard 11

Do not expose internal event/storage terminology.

## Guard 12

Do not treat Parked capability as implementation gap.

---

# 61. Reconciled Family Rule Register

以下作为 Pass 7 的 canonical Family input。

| ID         | Family Rule                                                            | Status               |
| ---------- | ---------------------------------------------------------------------- | -------------------- |
| FAMILY-001 | Content modules share Cream Gallery                                    | Confirmed            |
| FAMILY-002 | Family consistency does not require shared IA/layout                   | Confirmed            |
| FAMILY-003 | Surface strength follows object semantics                              | Confirmed            |
| FAMILY-004 | S2 does not imply visible Full Card                                    | Confirmed            |
| FAMILY-005 | Card requires object identity, unit behavior, boundary need            | Confirmed            |
| FAMILY-006 | Universal Content Card is invalid                                      | Confirmed            |
| FAMILY-007 | Elevation is opt-in, not default                                       | Confirmed            |
| FAMILY-008 | Projects elevation exception is authorized                             | Confirmed            |
| FAMILY-009 | Avoid stacking unnecessary interaction cues                            | Confirmed            |
| FAMILY-010 | Hairline/border serves structural semantics                            | Confirmed            |
| FAMILY-011 | Radius is optional shared material parameter                           | Confirmed            |
| FAMILY-012 | Share semantic tokens, not forced appearance                           | Confirmed            |
| FAMILY-013 | Klein Blue = low-area shared Brand Voltage / interaction               | Confirmed            |
| FAMILY-014 | Category/module colors remain tertiary                                 | Confirmed            |
| FAMILY-015 | Extremely weak local identity marker can be legal                      | Confirmed            |
| FAMILY-016 | Primary meaning outranks metadata                                      | Confirmed            |
| FAMILY-017 | Mono is role-based                                                     | Confirmed            |
| FAMILY-018 | Data existence does not create UI entitlement                          | Confirmed            |
| FAMILY-019 | Metadata density follows semantic need                                 | Confirmed            |
| FAMILY-020 | Tag is not a universal Family UI component                             | Confirmed            |
| FAMILY-021 | Eyebrow is optional and semantic                                       | Confirmed            |
| FAMILY-022 | Shared opening rhythm ≠ fixed opening template                         | Confirmed            |
| FAMILY-023 | Top-level Content module returns to Star Map                           | Confirmed            |
| FAMILY-024 | Nested child prefers parent return first                               | Confirmed            |
| FAMILY-025 | Destination affordance follows object role                             | Confirmed            |
| FAMILY-026 | `→ / ↗` carry internal/external semantic preference                    | Confirmed convention |
| FAMILY-027 | Width follows surface function                                         | Confirmed            |
| FAMILY-028 | Time prominence follows module semantics                               | Confirmed            |
| FAMILY-029 | Chronology remains module-specific                                     | Confirmed            |
| FAMILY-030 | Historical browsing mechanics remain module-specific                   | Confirmed            |
| FAMILY-031 | Public Copy explains meaning/state/action, not mechanisms              | Confirmed            |
| FAMILY-032 | Internal schema/event vocabulary is not automatically public           | Confirmed            |
| FAMILY-033 | Family voice can remain natural/personal without forced module voices  | Confirmed            |
| FAMILY-034 | Motion serves semantic interaction/content                             | Confirmed            |
| FAMILY-035 | Reduced motion cannot remove meaning/capability                        | Confirmed            |
| FAMILY-036 | Desktop hover requires complete touch/mobile equivalent                | Confirmed            |
| FAMILY-037 | Mobile is responsive reflow of same product logic                      | Confirmed            |
| FAMILY-038 | Breakpoints need not be universally identical                          | Confirmed            |
| FAMILY-039 | Media behavior follows content role                                    | Confirmed            |
| FAMILY-040 | Local dark functional/content surfaces are legal                       | Confirmed            |
| FAMILY-041 | Empty states remain simple/human/module-consistent                     | Confirmed            |
| FAMILY-042 | Existing loading/error states remain inside module identity            | Confirmed            |
| FAMILY-043 | Visual completeness cannot be created by invented features             | Confirmed            |
| FAMILY-044 | Design for plausible growth without premature scale machinery          | Confirmed            |
| FAMILY-045 | Every Content surface needs intentional ending                         | Confirmed            |
| FAMILY-046 | Shared Content Footer                                                  | Revalidate           |
| FAMILY-047 | Owner tooling stays module-local until shared need is proven           | Confirmed            |
| FAMILY-048 | Global Content Admin                                                   | Parked               |
| FAMILY-049 | Accessibility cannot be weakened for visual quietness                  | Confirmed            |
| FAMILY-050 | Product/Closure truth and implementation state remain separate         | Confirmed            |
| FAMILY-051 | Current implementation does not override later Closure truth           | Confirmed            |
| FAMILY-052 | Family governs shared language; Closure governs module-local semantics | Confirmed            |

---

# 62. Cross-module Contract Register for Pass 7

| ID       | Contract                                                              | Status                           |
| -------- | --------------------------------------------------------------------- | -------------------------------- |
| XMOD-001 | Blog first public publish may create `BLOG · 发布`                      | Confirmed                        |
| XMOD-002 | Ordinary Blog edit does not rewrite snapshot / create duplicate       | Confirmed                        |
| XMOD-003 | Blog hide removes Published Footprint from Public Timeline projection | Confirmed                        |
| XMOD-004 | Blog hide preserves Footprint record and snapshot                     | Confirmed                        |
| XMOD-005 | Blog restore can restore original Footprint without duplicate         | Confirmed                        |
| XMOD-006 | Blog hard delete may preserve historical Footprint                    | Confirmed product principle      |
| XMOD-007 | Known-dead Blog destination should not remain actionable              | Confirmed product principle      |
| XMOD-008 | Projects owns Project update event semantics                          | Confirmed                        |
| XMOD-009 | Routine Project field edits do not automatically emit Activity        | Confirmed                        |
| XMOD-010 | Feed presents accepted Project event as `PROJECT · 更新`                | Confirmed                        |
| XMOD-011 | Project update description is strongly preferred                      | Confirmed                        |
| XMOD-012 | Feed presents accepted Learn event as `LEARN · 更新`                    | Confirmed Feed presentation      |
| XMOD-013 | Learn source-event lifecycle                                          | Revalidate / Await Learn Closure |

---

# 63. Pass 6 Final Boundary

本 Pass 完成之后：

## 不再需要讨论

Blog / Feed / Projects Family compatibility 的产品方向。

它们已经 reconciliation 完成。

---

## 仍然需要 Pass 7 登记

* 所有原子 Module decisions；
  -所有 Family rules；
  -Module exceptions；
  -cross-module contracts；
  -Revalidate；
  -Superseded；
  -Parked；
  -implementation drift；
  -architecture revalidate；
  -acceptance；
  -source authority。

---

## 仍然不允许 Codex production implementation

直到：

> **Pass 7 Master Requirements / Capability Ledger 完成，并完成 Governance Freeze。**

---

# 64. Pass 6 Verdict

> **CONTENT FAMILY RECONCILED AMENDMENT SET: COMPLETE**

原 Family Kernel 的核心方向没有被推翻。

本轮主要完成：

1. 明确 S2 ≠ Card；
2. 将 elevation 从“近似禁止”改为 semantic opt-in，并记录 Projects exception；
3. 建立 semantic destination rule；
4. 容纳 Projects weak orange marker，而不放宽 category color；
5. 区分 taxonomy Tag 与 annotation Tag；
6. 确认 Flexible Opening；
7. 将 Radius 明确为 optional shared parameter；
8. 确认 shared token ≠ shared appearance；
9. 新增 width follows surface function；
10. 新增 semantic time rule；
11. 强化 Public Copy / internal vocabulary boundary；
12. 新增 desktop-hover → mobile-complete degradation；
13. 强化 Visual Completeness 不靠 fake features；
14. 新增 plausible-growth rule；
15. 确认 intentional ending，但 Shared Footer 继续 Revalidate；
16. 明确 Feed owner tooling 当前 module-local，Global Admin Parked；
17. 正式确认 Blog → Feed visibility contract；
18. 正式确认 Projects → Feed source-event ownership；
19. 保留 Learn → Feed lifecycle 为 Await Learn Closure；
20. 建立 scope-aware Family / Closure authority model；
21. 明确哪些内容必须留在 Module Closure / Master Ledger，不能污染 Kernel。

因此下一步可以直接进入：

> **Pass 7 — Master Requirements / Capability Ledger Assembly**

Pass 7 不再进行产品设计或冲突裁决。

它的工作是：

> **把 Pass 1–3 的原子化模块条目 + Pass 6 的 Family rules + cross-module contracts + exceptions + Revalidate/Superseded/Parked + architecture/implementation state，组装成最终可查询、可追踪、可交接的治理总账。**
