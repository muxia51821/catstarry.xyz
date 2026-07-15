# ADR-006: Retire Home Aggregation and Blog Metadata KV Bridge

> Status: **Accepted**
> Date: 2026-07-15
> Deciders: 定向 Phase 3 architecture agent + 木下
> Supersedes: ADR-002（其唯一的 Home 聚合用途）；ADR-003 中 `/api/home` 的端点清单（不改变双 Worker 决策）

---

## Context

Home 已从跨模块混合时间线改为宇宙入口与自由星图导航：宇宙入口 → 接近星域 → 星图总览 → 页脚。它不再读取 Blog、Feed、Learn 或 Projects 的最新内容。

ADR-002 选择 `blog-metadata` KV bridge 的唯一理由，是让 `/api/home` 把 Blog 元数据混入 Home 时间线。该需求已不存在。

## Options

### A: 保留 `/api/home` 和 KV bridge

- 继续在后台写入 Blog 元数据；
- Home 或其他调用方未来可以继续读取。

### B: 退役 Home 聚合和 KV bridge

- 删除 `/api/home`、`HomeTimelineItem`、五源内容聚合与 `blog-metadata` KV 写入；
- Home 变为静态宇宙入口，只有必要的客户端交互；
- Blog 发布信息改由 Public Footprint 在生产部署成功后写入 Feed。

## Decision

**选择 B — 退役 Home 聚合与 Blog Metadata KV Bridge。**

## Rationale

1. **职责已经改变**：Home 是导航叙事，不再是内容读取层。
2. **避免幽灵耦合**：继续维护无人读取的 KV bridge，会让未来 agent 误以为 Home 仍须聚合内容。
3. **静态更合适**：Home 没有实时内容依赖，应以 SSG 页面壳承载星图导航、SEO 与 About 原地展开。
4. **公开记录有唯一去处**：跨模块的重要更新由 Feed 的 Public Footprint 统一承接，而不是回到 Home。

## Consequences

- `/api/home` 没有替代 API。
- `HomeTimelineItem`、`TimelineFeed`、`FilterBar` 和旧五源聚合契约进入退役范围。
- `VIEW_KV:blog-metadata` 与 build/deploy 写入链路删除；阅读量去重 KV 保留。
- `/index.astro` 采用 SSG；交互只限星图导航、短推进与 About 原地展开。
- ADR-001 的双 D1 决策、ADR-003 的双 Worker 决策、ADR-004 的原生 Feed 两态可见性均不改变；仅 ADR-003 的历史端点列表示例不再适用于当前路由。
