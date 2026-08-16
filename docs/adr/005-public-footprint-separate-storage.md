# ADR-005: Public Footprint Storage — Separate Records vs Extending Feed Posts

> Status: **Accepted**
> Date: 2026-07-15
> Deciders: 定向 Phase 3 architecture agent + 木下

> Terminology note: 本文历史语境中的“系统足迹”对应当前 canonical term `Public Footprint`；
> “统一读取”对应 `Public Timeline`。代码内部仍可能保留 `system_footprint` discriminator。

---

## Context

Feed 混排两种性质不同的公开记录：

- 木下直接发布的 Note / Clip；
- Blog publication、Learn Public Note publication / revision、Projects meaningful update 产生的 Public Footprint，以及历史 Learn completion compatibility records。

Public Footprint 创建时保存 event-time snapshot 和稳定 event identity。来源后续普通编辑不能改写 historical snapshot；Footprint 自身 visibility 可以独立变化。`feed_posts` 则只表达原生 Note / Clip，并允许原生内容按其自身 lifecycle 管理或物理删除。

## Options

### A: 扩展 `feed_posts`

- 将 `type` 扩展为原生帖子和来源事件；
- 为来源事件添加来源、版本、快照等可空字段；
- 用一张写表承载整个 Feed。

### B: 保留 `feed_posts`，新增 `public_footprints`

- `feed_posts` 继续只存原生 Note / Clip；
- `public_footprints` 存独立的 historical event records 与 snapshot；
- Public Timeline 在读取时统一排序、分页和过滤两类记录。

## Decision

**选择 B — 独立 `public_footprints` 存储，Feed 通过统一读取 projection 混排。**

## Public Projection Semantics

独立存储不意味着 Public Timeline projection 与 source 当前状态完全无关：

> **storage independence ≠ public projection independence**

当前 Product / Architecture contract：

- source 普通编辑不改写既有 Footprint snapshot；
- source Hide / Withdraw / delete 不 cascade-delete historical Footprint record；
- Footprint 自身 `visibility` 可以独立设为 public / private；
- Blog 正常 Footprint 只有其 `source_ref` 仍位于当前 published Blog projection 时才进入 Public Timeline；
- Learn 正常 `learn_note_published` / `learn_note_revised` Footprint 只有 Note 仍位于 runtime public publication set 时才进入 Public Timeline；
- historical `learn_section_completed` 保留 readable compatibility，不受新的 Public Note source gate 重新解释；
- source 恢复公开时复用既有 historical Footprint，不创建第二条 first-publication record；
- Projects Footprint 的 canonical destination 是稳定的 `/projects/`，Project Card 的 external destination 属于 Projects 自身对象语义。

因此，来源当前不可公开时，historical record 可以继续存在于 storage / admin evidence 中，但不必继续出现在 Public Timeline。Public projection filtering 是读取规则，不反向删除或改写 historical record。

## Rationale

1. **语义清晰**：原生内容与来源生命周期事件不是同一种写模型。前者是 owner-authored Feed content；后者是来源事件的 historical record。
2. **删除边界正确**：原生帖子按其自身 lifecycle 管理；Public Footprint 不因来源删除而级联删除。
3. **快照天然归属**：来源标题、摘要、链接和事件时间在事件发生时写入 Footprint，无需让 `feed_posts` 承担大量无关字段。
4. **幂等边界明确**：来源事件使用稳定 `source_version` / `idempotency_key`；普通编辑、重复 sync 或重复 ingest 不制造 duplicate historical event。
5. **读取层可表达当前公开状态**：Public Timeline 可以同时保持 historical storage independence 与 source-aware public projection。

## Consequences

- 主站 D1 分别保存 `feed_posts` 与 `public_footprints`。
- Public Timeline 将两类记录统一为一个读取 projection，并按稳定 chronology / cursor contract 返回。
- Public Footprint 沿用自身 `visibility = public | private`；该 visibility 不反向修改来源。
- Blog / Learn 当前 publication state 参与 Public Timeline source gate；Projects 继续使用自身稳定 index destination。
- `feed_posts` 保持 `note | clip`，ADR-004 对原生 Feed lifecycle 继续有效。
- Blog、Learn、Projects 以各自明确的来源版本 / 事件身份生成幂等 Footprint；普通维护编辑不因此产生新 historical event。
