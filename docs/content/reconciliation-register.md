# Content Conflict / Reconciliation Register

> 本登记表只保存已经完成的冲突收敛及其 downstream guard。它不是重新讨论产品方向的入口。共享规则见 [`family-contract.md`](family-contract.md)，原子状态见 [`master-ledger.md`](master-ledger.md)。

## 1. S2 与 Full Card

- **历史冲突**：S2 Object Surface 曾可能被机械理解为必须出现完整背景、边框、圆角和阴影。
- **Reconciled rule**：S2 描述语义对象等级与分离强度，不规定固定视觉处理；**S2 ≠ Full Card**。
- **Scope**：Blog Archive Entry、Feed Activity、Project Object。
- **Downstream guard**：不得把 Blog Entry、Feed Activity、Project Card 归一成一个 universal Content Card；Blog Archive 与 Feed D 保持 frameless，Projects 可保留 Full Object Card。

## 2. Projects elevation exception

- **历史冲突**：旧 anti-SaaS / anti-shadow 表述可能被用来删除 Projects 的 shadow 和 lift。
- **Reconciled rule**：Elevation 是 opt-in、semantic、module-proven；Projects 的 static shadow、hover lift、stronger hover shadow 已 Confirmed。
- **Scope**：仅 Projects。
- **Downstream guard**：不得删除 Projects elevation，也不得把该例外传播给 Blog、Feed 或 Learn；可 Revalidate 的只是 shared token 实现方式，不是 Projects 行为。

## 3. Feed explicit destination 与 Projects whole-card destination

- **历史冲突**：曾试图让所有 Content object 统一 whole-card clickable，或统一增加显式 CTA。
- **Reconciled rule**：Destination affordance follows object role。Projects Card 是 destination object，可整卡外链；Feed Activity 是 record-with-destination，必须使用 explicit action。
- **Scope**：Feed、Projects。
- **Downstream guard**：不得让 Feed Activity 整卡可点；不得给 Projects 增加重复的 `查看项目` CTA。

## 4. Projects weak orange identity marker

- **历史冲突**：Category/module color 的弱化规则可能被解释为任何 orange 都必须移除，或反过来扩张为 Projects orange theme。
- **Reconciled rule**：`SELECTED WORKS` 可使用 single-use、low-area、noninteractive 的极弱 orange identity marker；Klein Blue 仍承担共享 interaction role。
- **Scope**：Projects Opening eyebrow。
- **Downstream guard**：Orange 不得扩张到 arrow、Card、border、Tags、links 或 background；Project arrow 默认 neutral，hover/focus 才转 Klein Blue。

## 5. Blog taxonomy Tag 与 Projects annotation Tag

- **历史冲突**：字段都叫 Tag，曾可能被统一成同一个 pill component。
- **Reconciled rule**：Tag 是 semantic data concept，不是 universal visual component。Blog Tag 是可点击 taxonomy link；Projects Tech Tag 是低对比、轻边界、不可交互 annotation。
- **Scope**：Blog、Projects。
- **Downstream guard**：不得把 Projects bounded tag treatment 套给 Blog taxonomy，也不得赋予 Projects Tech Tag hover/filter/active 行为。

## 6. Flexible Opening

- **历史冲突**：Family consistency 曾可能被固化为 `Eyebrow + Title + Description + Utility` 的统一 Header template。
- **Reconciled rule**：Family 共享 opening rhythm、hierarchy language、spacing 与 copy discipline，不共享固定槽位。
- **Scope**：全部 Content modules。
- **Downstream guard**：Blog 可 Title only；Feed 可 Title + Intro + module utility；Projects 可 Eyebrow + Title + Intro；Learn 等待 Closure 确认自身 hierarchy。

## 7. Radius optionality

- **历史冲突**：存在 shared radius token 曾被等同于所有 Content surface 必须 rounded。
- **Reconciled rule**：Radius 是可共享的 material parameter，不是 required Family property。
- **Scope**：全部 Content modules。
- **Downstream guard**：需要 radius 时优先 shared token；Blog Tonal Paper、Feed Activity 或 Learn structural plane 不需要时可保持 no radius。Projects 是当前主要使用者。

## 8. Shared token 与 shared appearance

- **历史冲突**：共享 token 曾可能被用来强制相同 surface fill、border、radius、shadow 和 hover。
- **Reconciled rule**：**Share semantic tokens; do not force shared appearance.** Shared primitive 也不等于 shared final appearance。
- **Scope**：Family implementation。
- **Downstream guard**：先做 current token inventory；只抽 genuinely shared semantics。不得因为 shadow、radius 或 surface token 存在，就要求所有模块消费。

## 9. Shared Footer

- **历史冲突**：Projects 页面 ending 较弱，曾可能直接推动 mandatory global Content Footer。
- **Reconciled rule**：每个 Content surface 都需要 intentional ending，但 exact Shared Content Footer 仍为 **Revalidate**。
- **Scope**：Family ending。
- **Downstream guard**：不得为了 Projects bottom space 给所有模块建立 Footer。Blog、Feed、Projects 可分别通过导航、timeline ending 或自然留白完成当前 ending。

## 10. Feed-local Manage 与 Global Admin

- **历史冲突**：Feed 已有 Owner/Manage workflow，曾可能被泛化为全站 `/admin`。
- **Reconciled rule**：Owner tooling 保持 module-local，直到重复的跨模块 workflow 证明 shared administration 的必要性；Global Content Admin 为 **Parked**。
- **Scope**：Feed owner tooling / Family administration。
- **Downstream guard**：Feed Architecture Preflight 可决定 route mapping，但不得借此提前建立 Global Content Admin；Parked 不得报告为 gap。

## 11. Blog → Feed visibility

- **历史冲突**：ADR-005 的 storage independence / no cascade delete 曾可能被误读为 source hidden 后 Footprint 仍必须公开投影。
- **Reconciled rule**：`storage independence ≠ public projection independence`。Blog source hidden 时，Footprint record 与 immutable snapshot 保留，但 Public Timeline projection 隐藏；source 仍 public 时，Footprint 自身 visibility 仍可独立控制。
- **Scope**：Blog publication Footprint、Public Timeline、ADR-005。
- **Downstream guard**：不得 cascade-delete 或重写 snapshot；也不得仅凭 Footprint 自身 public 就继续投影 hidden Blog。Exact query、reference 与 tombstone behavior 属于 Feed Architecture Preflight。

## 12. Projects → Feed event ownership

- **历史冲突**：曾可能从 copy、screenshot、tags 或 deploy 字段变化自动推断一次 `Project update`。
- **Reconciled rule**：Projects/source-side workflow owns event semantics；只有被明确确认具有公开记录价值的更新才产生 `PROJECT · 更新`，Feed 负责消费和展示。
- **Scope**：Projects source lifecycle、Feed Footprint。
- **Downstream guard**：不得从字段 diff 自动产生产品语义；event entry、idempotency、`updateId` 与 description storage 进入 Architecture Revalidate。

## 13. Intentional ending

- **历史冲突**：页面完整性曾被等同于添加 Footer、CTA、统计、推荐或 filler section。
- **Reconciled rule**：每个 Content surface 需要 intentional ending，但 ending 可以来自自然留白、pagination end、navigation、discussion 或其他语义上合理的结论。
- **Scope**：全部 Content modules。
- **Downstream guard**：不得用 invented capabilities 制造“完整感”；Blog、Feed、Projects 的 Parked feature 都不能作为 ending filler，Learn ending 等待 Closure。

## Closed boundary

以上冲突已经 reconciliation。只有木下新的明确裁决、显式 Revalidate 项或真正的新证据可以重新打开；current implementation 与历史文档本身都不能自动重开。

