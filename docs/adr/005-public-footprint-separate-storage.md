# ADR-005: Public Footprint Storage — Separate Records vs Extending Feed Posts

> Status: **Accepted**
> Date: 2026-07-15
> Deciders: 定向 Phase 3 architecture agent + 木下

---

## Context

Feed 现在是木下唯一的公开足迹／来时路。它要混排两种性质不同的内容：

- 木下直接发布的碎碎念和剪藏；
- Blog 发布、Learn 完成小节、Projects 实质更新产生的系统足迹。

系统足迹创建时必须保留快照，可独立隐藏，且不能被来源内容的普通编辑、隐藏或删除自动改写。现有 `feed_posts` 只表达原生帖子，类型为 `note` 或 `clip`，允许物理删除。

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

## Rationale

1. **语义清晰**：原生内容与系统事件不是同一种写模型。前者是可编辑管理的个人发布；后者是来源生命周期的不可变公开记录。
2. **删除边界正确**：原生帖子可按 ADR-004 物理删除；系统足迹不因来源删除而级联删除，只能独立隐藏。
3. **快照天然归属**：来源标题、摘要、链接、事件时间在足迹表中一次写入，无需让 `feed_posts` 承担大量无关字段。
4. **无历史迁移**：不回填历史，新增表只从机制上线后开始写入，风险低。
5. **扩展集中**：未来新增来源模块只需接入 Public Footprint 的写入接口，不污染原生发布面板或 `feed_posts` 的类型约束。

## Consequences

- 主站 D1 新增 `public_footprints` 表和唯一 `idempotency_key`。
- 新增 Public Timeline 模块：页面只读取统一的时间线投影，不理解两张表。
- 系统足迹沿用 `visibility = public | private` 的两态语义；隐藏不影响来源内容。
- `feed_posts` 保持 `note | clip`，ADR-004 对它仍然有效。
- Blog、Learn、Projects 必须以明确的来源版本／事件标识生成幂等键；普通编辑和重复部署不产生新足迹。

