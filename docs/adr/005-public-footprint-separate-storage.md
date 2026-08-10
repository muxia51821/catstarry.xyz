# ADR-005: Public Footprint Storage — Separate Records vs Extending Feed Posts

> Status: **Accepted**
> Date: 2026-07-15
> Deciders: 定向 Phase 3 architecture agent + 木下

> Terminology note: 本文历史语境中的“系统足迹”对应当前 canonical term `Public Footprint`；
> “统一读取”对应 `Public Timeline`。代码内部仍可能保留 `system_footprint` discriminator。

---

## Context

Feed 现在是木下唯一的公开足迹／来时路。它要混排两种性质不同的内容：

- 木下直接发布的碎碎念和剪藏；
- Blog 发布、Learn 完成小节、Projects 实质更新产生的 Public Footprint。

Public Footprint 创建时必须保留快照，可独立隐藏，且不能被来源内容的普通编辑、隐藏或删除自动改写。现有 `feed_posts` 只表达原生帖子，类型为 `note` 或 `clip`，允许物理删除。

## Options

### A: 扩展 `feed_posts`

- 将 `type` 扩展为原生帖子和三类系统足迹；
- 为系统足迹添加来源、版本、快照等可空字段；
- 用一张表读取整个 Feed。

### B: 保留 `feed_posts`，新增 `public_footprints`

- `feed_posts` 继续只存原生碎碎念和剪藏；
- `public_footprints` 存不可变系统足迹及其快照；
- 一个 Public Timeline 模块在读取时统一排序、分页和过滤两类记录。

## Decision

**选择 B — 独立 `public_footprints` 存储，Feed 通过统一读取模块混排。**

## Product Projection Amendment

本 ADR 保持 **Accepted**；独立记录、immutable event-time snapshot 与 no cascade delete 的存储决策不变。

后期 Blog / Feed Product Closure 补充了读取投影语义：

> **storage independence ≠ public projection independence**

对于 Blog publication Footprint：

- Blog source hidden 不删除 Footprint record，也不改写 snapshot；
- Blog source visibility 会 gate 该 Footprint 是否进入 Public Timeline projection；
- Blog source 仍 public 时，Footprint 自身的 `visibility` 继续可以独立隐藏；
- Blog restore 可以恢复原 Footprint 的公开投影，不创建 duplicate；
- Blog hard delete 后的 historical record 可以保留，但 known-dead destination 不应继续保持可操作状态。

Exact query、source reference 与 tombstone behavior 仍属于 [`docs/content/master-ledger.md`](../content/master-ledger.md) 的 Architecture Revalidate / Feed Architecture Preflight。当前 `FeedStore.listPublic()` 尚未实现 Blog source visibility gate；不得把上述产品规则描述成已经实施。

## Rationale

1. **语义清晰**：原生内容与系统事件不是同一种写模型。前者是可编辑管理的个人发布；后者是来源生命周期的不可变公开记录。
2. **删除边界正确**：原生帖子可按 ADR-004 物理删除；Public Footprint 不因来源删除而级联删除，只能独立隐藏。
3. **快照天然归属**：来源标题、摘要、链接、事件时间在足迹表中一次写入，无需让 `feed_posts` 承担大量无关字段。
4. **无历史迁移**：不回填历史，新增表只从机制上线后开始写入，风险低。
5. **扩展集中**：未来新增来源模块只需接入 Public Footprint 的写入接口，不污染原生发布面板或 `feed_posts` 的类型约束。

## Consequences

- 主站 D1 新增 `public_footprints` 表和唯一 `idempotency_key`。
- 新增 Public Timeline 模块：页面只读取统一的时间线投影，不理解两张表。
- Public Footprint 沿用 `visibility = public | private` 的两态语义；隐藏不影响来源内容。
- 来源内容隐藏或删除不 cascade-delete Footprint；但来源 visibility 可以按上面的产品规则影响 Public Timeline projection。
- `feed_posts` 保持 `note | clip`，ADR-004 对它仍然有效。
- Blog、Learn、Projects 必须以明确的来源版本／事件标识生成幂等键；普通编辑和重复部署不产生新足迹。
