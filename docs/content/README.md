# Content 治理索引

> Blog、Feed、Learn、Projects 的 Content Family 产品治理入口。

## Canonical sources

| 文件 | 职责 |
| --- | --- |
| [`family-contract.md`](family-contract.md) | Shared Family semantics、module exceptions、cross-module Product contracts。 |
| [`master-ledger.md`](master-ledger.md) | 原子 Product decisions、Decision Status、Superseded / Parked / Revalidate、module-local closure truth 与历史 traceability。 |

历史 reconciliation register、implementation dependency map、requirements 与 acceptance evidence 位于 `docs/_archive/`，仅在需要追溯 rationale 时读取。

## Authority

1. 木下最新的明确裁决。
2. Family-shared question：`family-contract.md` 与 `master-ledger.md`。
3. 已关闭 module-local question：对应 Closure truth；当前由 Master Ledger 的模块条目持久化核心结论。
4. ADR / architecture 负责技术边界，不覆盖 Product semantics。
5. Current implementation 负责说明已经实现什么，不自动成为 Product authority。

> **Family governs shared language; Closure governs closed module semantics.**

## Current Product state

| Scope | State |
| --- | --- |
| Content Family | RECONCILED / FROZEN |
| Blog | CLOSED |
| Feed | CLOSED |
| Projects | CLOSED |
| Learn | CLOSED |
| Feed × Learn semantic integration | CLOSED |
| Shared Content Footer | PARKED |
| Global Content Admin | PARKED |

`Confirmed`、`Revalidate`、`Superseded`、`Parked` 是 Product decision states；不要从它们推断当前 deployment 或 implementation status。

## Operational workflow

- [Learn Public Note 发布流程](learn-publication-workflow.md)：从 private validated learning 选择性重写、验证、release 与 Owner 首次 Publish 的稳定操作顺序。

## Reading routes

| 工作范围 | 先读 | 再读 |
| --- | --- | --- |
| Shared Content | 本索引、`family-contract.md`、`master-ledger.md` §3–5、§11、§13–15 | `DESIGN.md`、相关 shared implementation |
| Blog | Family sources + `master-ledger.md` §6 | Blog current source；跨 Feed lifecycle 时再读 §9、ADR-005 与 architecture |
| Feed | Family sources + `master-ledger.md` §7、§9 | Feed current architecture / source / tests |
| Projects | Family sources + `master-ledger.md` §8、§9 | Projects current source |
| Learn | Family sources + `master-ledger.md` §10、ADR-008 | Learn current architecture / source / tests |

Master Ledger §12 与 §16–20 是 historical preflight / delivery / acceptance traceability，不属于正常 Phase 8 reading path。

不要一次性加载全部历史材料。先确定问题属于 Family-shared 还是 module-local，再补充对应 Product、Architecture、Design 和 current source。
