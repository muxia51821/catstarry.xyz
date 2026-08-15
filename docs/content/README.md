# Content 治理索引

> 本目录是 Blog、Feed、Learn、Projects 的 Content Family 治理入口。它记录产品权威、决策状态和共享语义，不描述当前代码已经完成了什么，也不承担旧 implementation sequencing。

## Canonical sources

| 文件 | 职责 |
| --- | --- |
| [`family-contract.md`](family-contract.md) | Reconciled Content Family Contract；只治理真正共享的 Family 语义、例外边界和跨模块原则。 |
| [`master-ledger.md`](master-ledger.md) | Master Requirements / Capability Ledger；保留原子 ID、Decision Status、Implementation State、模块细则、Revalidate、Superseded、Parked、风险和验收门。 |

历史 Conflict / Reconciliation Register 与 Implementation Dependency Map 已归档到 `docs/_archive/content-governance/`，用于追溯 rationale，不属于正常 current-truth reading path。

## Authority order

1. 木下之后最新的明确裁决。
2. 对真正跨模块的 shared question：`family-contract.md` 与 `master-ledger.md`。
3. 对已经关闭的 module-local question：对应 Module Closure truth；仓库当前由 `master-ledger.md` 的模块原子条目持久化其结论。
4. Module Delta 和专项证据，只在未被 Closure 覆盖时继续提供 rationale 或 traceability。
5. Accepted ADR 与 architecture 文档，负责技术边界；若较新的 Product Closure 收窄产品语义，应做 reconciliation。
6. Current implementation 是 implementation truth / evidence，不是自动 design authority。
7. 历史 requirements、prototype 和 QA 只在未被后期裁决 Supersede 时继续有效。

> **Family governs shared language; Closure governs closed module semantics.**

> **Current implementation does not automatically override later Product Closure.**

Family consistency 不等于共享 IA、layout、Card、Opening、width、pagination、footer 或 hover behavior。遇到看似冲突时，先判断问题属于 Family shared contract，还是 module-local 已确认语义；不得机械用一个文档跨职责覆盖另一个文档。

## Governance state

| Scope | Decision state | Implementation reading |
| --- | --- | --- |
| Content Family | RECONCILED / FROZEN for implementation | 决策状态与实施状态分开；release / deployment 仍需独立授权 |
| Blog | Product / IA / UI CLOSED | Implementation ACCEPTED；Owner visual acceptance PASS；FROZEN |
| Feed | Product / Interaction / Responsive / Visual CLOSED | Implementation ACCEPTED / MERGED；与 Learn 的 semantic integration CLOSED |
| Projects | Product / Visual CLOSED | Implementation ACCEPTED；Owner visual acceptance PASS；FROZEN；accepted elevation 必须保留 |
| Learn | Product / Architecture / Visual Reality Check COMPLETE | Implementation ACCEPTED / MERGED；与 Feed 的 semantic integration CLOSED |

Decision Status 与 Implementation State 必须分开记录。Confirmed 但尚未实现，是 implementation gap；Revalidate 是待复核决策或技术实现；Superseded 不得因旧代码仍存在而恢复；Parked 不是当前承诺。

> **Parked capability is not an implementation gap.**

历史 implementation sequencing 已进入归档。Phase 8 的新 implementation task 应从当前任务证据、current source 和相关 Product / Architecture authority 出发，不复用旧 Wave 顺序作为默认执行计划。

## Downstream reading routes

| 工作范围 | 先读 | 再读 |
| --- | --- | --- |
| Shared Content | 本索引、`family-contract.md`、`master-ledger.md` §3–5、§11–16 | `DESIGN.md`、`src/styles/variables.css`、current implementation inventory |
| Blog | Family sources + `master-ledger.md` §6 | Blog Closure evidence（如单独提供）、Blog current source；跨 Feed 工作另读 ADR-005 与 architecture revalidate |
| Feed | Family sources + `master-ledger.md` §7、§9、§12 | Feed Closure / Stage 4 / F0 / Preflight evidence、ADR-005、accepted implementation 与 current source |
| Projects | Family sources + `master-ledger.md` §8、§9 | Projects Closure evidence（如单独提供）、Projects current source |
| Learn | Family sources + `master-ledger.md` §10、ADR-008 | Learn Product / Architecture / Visual Reality evidence、accepted implementation 与 current source |

不要一次性把全部历史文档交给下游 Agent。以本目录建立地图，再按模块逐步补充 Closure、ADR、architecture 和 current source。

## Historical evidence boundary

历史 requirements / acceptance、旧 reconciliation / dependency map、prototype、QA 和旧实现可以保留作为演化证据。已经统一归档的材料位于 `docs/_archive/`；其中可能存在被后期 Closure / Ledger Supersede 的决定，不得覆盖本目录的后期治理真相，也不得因为仍存在于仓库或生产代码中就被当作恢复依据。
