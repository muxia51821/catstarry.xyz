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

CURRENT / PARALLEL
──────────────────
Learn Visual Reality Check
Feed Codex Production Implementation Task Package

NEXT
────
Feed Production Implementation
→ Feed Acceptance

Learn Visual Reality Check / Closure confirmation
→ Learn downstream implementation work
→ Learn Acceptance

THEN
────
Content Integration Preview / regression
→ Final Content Integration & Acceptance
→ Release / deployment
```

## Stage boundaries

### Governance Freeze

- Persist Family Contract、Master Ledger、Reconciliation Register 和本依赖图。
- 只校正已有文档中可由 Closure/Ledger 或 current implementation 明确证明的事实。
- 不修复生产实现 drift，不修改 runtime、schema、migration、test、asset 或 deployment configuration。

### Completed foundations

- Projects 与 Blog 已实施、验收并 FROZEN；不得把它们作为 current implementation 前置条件重开。
- Feed 的 Product / Visual Closure、Stage 4、F0 与 Architecture Preflight 已完成。Stage 4 是 Browser Visual Lab / stress validation，不是 F0、Preflight 或 production implementation；F0 是 current production architecture / runtime evidence，不是 Product Closure。
- Learn Product Synthesis 与 Architecture Final 已完成；其 Visual Reality Check 仍在进行。

### Content Integration Preview

Content Integration Preview / regression 在 Feed 与 Learn 各自 Acceptance 后进行。

该 Preview 只用于提前发现 cross-module regression，不是 Final Content Family Acceptance，也不授权 release。

### Current parallel work

- Feed 正在形成 Codex Production Implementation Task Package；它不等于 production implementation 已开始或已 PASS。
- Learn Visual Reality Check 不无条件阻塞 Feed Task Package：影响 Feed 的 Learn Architecture 已 Final。
- Learn Visual Reality Check / closure confirmation 后，才进入 Learn downstream implementation 与 Acceptance。

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
| Learn | Visual Reality Check / closure confirmation 后，进入 downstream implementation 与 Acceptance |

