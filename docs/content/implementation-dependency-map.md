# Content Implementation Dependency Map

> 本文件把 [`master-ledger.md`](master-ledger.md) 的 accepted sequencing 独立为下游执行入口。它规定顺序与 gate，不授权本 Wave 修改生产代码或部署。

## Current operational sequence

```text
COMPLETED
─────────
Governance Freeze
Projects implementation → Projects Acceptance → FROZEN
Blog implementation → Blog Acceptance → FROZEN
Feed Product / Visual Closure
Feed Stage 4 Visual Lab
Feed F0 Evidence Inventory
Feed Architecture Preflight
Learn Product Synthesis
Learn Architecture Final
Learn Visual Reality Check
Feed Codex Production Implementation Task Package
Feed Production Implementation
Feed Acceptance
Learn Production Implementation
Learn Acceptance
Feed × Learn semantic integration → CLOSED
Content Integration Preview / regression
Final Content Integration & Acceptance → PASS

CURRENT
───────
Release Handoff

NEXT (SEPARATELY AUTHORIZED)
────────────────────────────
Release / Deployment
→ Production Acceptance
```

## Stage boundaries

### Governance Freeze

- Persist Family Contract、Master Ledger、Reconciliation Register 和本依赖图。
- 只校正已有文档中可由 Closure/Ledger 或 current implementation 明确证明的事实。
- 不修复生产实现 drift，不修改 runtime、schema、migration、test、asset 或 deployment configuration。

### Completed foundations

- Projects 与 Blog 已实施、验收并 FROZEN；不得把它们作为 current implementation 前置条件重开。
- Feed 的 Product / Visual Closure、Stage 4、F0 与 Architecture Preflight 已完成。Stage 4 是 Browser Visual Lab / stress validation，不是 F0、Preflight 或 production implementation；F0 是 current production architecture / runtime evidence，不是 Product Closure。
- Learn Product Synthesis、Architecture Final 与 Visual Reality Check 已完成；implementation 已 accepted / merged。

### Content Integration Preview

Content Integration Preview / regression 在 Feed 与 Learn 各自 Acceptance 后进行。

该 Preview 只用于提前发现 cross-module regression，不是 Final Content Family Acceptance，也不授权 release。

### Current integration work

- Feed implementation 与 Learn implementation 均已 accepted / merged。
- Feed × Learn semantic integration 已 CLOSED，不得作为本轮 Projects destination 修复重新打开。
- Final Content Integration & Acceptance 已 PASS。

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
| Projects | ACCEPTED / FROZEN；后续仅处理明确 integration regression 或新的用户裁决 |
| Blog | ACCEPTED / FROZEN；后续仅处理明确 integration regression 或新的用户裁决 |
| Feed | D not Card Feed、equal Activity rank、three grammars、chronology、labels/actions、media、Clip states、Blog projection、Owner states、authoring、Loading/Error/Empty/Pagination、Mobile、visual evidence parity |
| Learn | ACCEPTED / MERGED；Feed × Learn semantic integration CLOSED |

