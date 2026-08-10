# Content Implementation Dependency Map

> 本文件把 [`master-ledger.md`](master-ledger.md) 的 accepted sequencing 独立为下游执行入口。它规定顺序与 gate，不授权本 Wave 修改生产代码或部署。

## Canonical sequence

```text
Governance Freeze
→ Current Implementation Inventory
→ genuine Shared confirmed work
→ Shared Acceptance
→ Projects
→ Projects Acceptance
→ Blog
→ Blog Acceptance
→ Feed Architecture Preflight
→ Feed implementation
→ Feed Acceptance
→ Content Integration Preview

Parallel:
Learn Product Closure
→ Ledger Learn update
→ Learn implementation
→ Learn Acceptance

Then:
All four modules ready
→ Final Content Integration & Acceptance
→ Release / deployment
```

## Stage boundaries

### Governance Freeze

- Persist Family Contract、Master Ledger、Reconciliation Register 和本依赖图。
- 只校正已有文档中可由 Closure/Ledger 或 current implementation 明确证明的事实。
- 不修复生产实现 drift，不修改 runtime、schema、migration、test、asset 或 deployment configuration。

### Current Implementation Inventory

- 先读取 current source、tests、tokens 与 architecture，分别记录 Implemented、Implemented with drift、Partial、Pending、Architecture Revalidate、Asset Revalidate、Verify Current。
- Implementation evidence 不得重开已 Confirmed 的 Product truth。

### Genuine Shared confirmed work

- 只处理真正 shared 且 Confirmed 的低层能力，例如 Cream Gallery semantics、Klein Blue interaction、focus-visible、reduced-motion 或 top-level return primitive。
- 不预设所有 candidate 都需要代码改动。
- 不自动共享 Content Card、mandatory Opening slots、Tag visual、Date layout、pagination、Footer、media 或 hover motion。

### Projects → Blog → Feed

- Projects 先行：架构风险最小，并验证 Family work 不会抹平 Projects elevation exception。
- Blog 次之：产品已关闭，但 archive / reading composition 和 interaction drift 较大。
- Feed 必须先完成 Architecture Preflight，再实施 D — Quiet Deposition、source lifecycle、pagination grouping、owner/manage、media 和 authoring contracts。
- 每个模块必须先通过自己的 Acceptance Gate，才能进入后续 integration。

### Content Integration Preview

Projects、Blog、Feed 三个已关闭模块可在 Learn 完成前进入 Content Integration Preview，前提是 Shared Acceptance 和各自 module acceptance 已通过。

该 Preview 只用于提前发现 cross-module regression，不是 Final Content Family Acceptance，也不授权 release。

### Parallel Learn track

- Learn 保持独立 Product Closure 轨道。
- 在 Closure 解决 Track power、Graph semantics、Homepage hierarchy 前，不得 productionize final Learn IA。
- Learn Closure 后先更新 Master Ledger，再实施并生成 Learn Acceptance Gate。

### Final Content Integration & Acceptance

只有以下全部通过后才能进入最终集成：

- Shared Family implementation PASS
- Projects PASS
- Blog PASS
- Feed PASS
- Learn PASS

最终检查必须覆盖 Product、Visual、Surface differences、Navigation、Responsive、Interaction、State、cross-module lifecycle 和 historical regression。

Release / deployment 是 Final Content Integration & Acceptance 之后的独立高风险阶段，仍需木下另行明确授权。

## Module acceptance pointers

| Module | Gate focus |
| --- | --- |
| Projects | shadow/lift preserved、neutral/Klein Blue arrow、exact copy、Tags、Mobile、Empty、ending、real screenshot quality |
| Blog | Archive no Card、≈1120 measure、Desktop Summary reveal、Mobile Summary visible、Article ≈760、Tonal Paper、return hierarchy、Previous/Next、Paper boundary、Share/Giscus、responsive/a11y |
| Feed | D not Card Feed、equal Activity rank、three grammars、chronology、labels/actions、media、Clip states、Blog projection、Owner states、authoring、Loading/Error/Empty/Pagination、Mobile、visual evidence parity |
| Learn | Gate 只能在 Learn Closure 后生成 |

