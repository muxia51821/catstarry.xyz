# ADR-007: Home Activity Signal Static Projection

> Status: **Accepted**
> Date: 2026-07-16
> Deciders: Home Activity Signal 定向 Phase 3 architecture agent + 木下
> Complements: ADR-005、ADR-006

---

## Context

Home 是 SSG 宇宙入口与星图导航，不展示 Recently、内容卡片或公开足迹。木下仍需要四颗功能星球以低音量信号卫星真实反映公开活动，但 Home 不得重新读取跨模块内容。

状态只包括：

- `active`：最近 7 × 24 小时内有合资格公开活动；
- `stable`：超过 7 × 24 小时且不超过 60 × 24 小时；
- `dormant`：超过 60 × 24 小时，或从无合资格公开活动。

About 不参与该模型；豹猫卫星是个人彩蛋，不是活动信号。

## Options

### A: 每次 Pages 构建生成 `public/activity-signals.json`

- Home HTML 与状态文件都来自同一次静态部署；
- 原生 Feed 发布后必须触发整站构建；
- 构建需要额外取得 D1 事件事实，部署链路与内容发布发生耦合。

### B: 事件驱动的受控静态投影

- Worker 在合资格事件或可见性变化后，读取最小事件事实并发布固定静态资源；
- Home SSG 页面由客户端只读取该资源；
- 每小时校正投影，使时间阈值即使在无新事件时也能变化。

### C: Home 直接调用动态 JSON API

- Worker 在每次 Home 访问时计算四颗星球状态；
- 接口会成为新的 Home 运行时数据依赖，容易被误用为内容 API。

## Decision

**选择 B — 由 `Activity Signal Projection` 发布固定的最小静态资源。**

投影文件位于专用 `home-projections` R2 存储中的固定对象 `activity-signals.json`，通过静态资源交付 adapter 提供给 Home。该资源没有查询参数、访客状态或内容载荷；它不是 `/api/home` 的替代，也不是 Public Timeline 的另一种读取接口。

公开契约只允许：

```json
{
  "schema_version": 1,
  "signals": {
    "blog": { "state": "active" },
    "feed": { "state": "stable" },
    "learn": { "state": "dormant" },
    "projects": { "state": "active" }
  }
}
```

禁止标题、正文、摘要、链接、列表、时间线、事件数量、精确活动时间、事件标识、来源标识、`generated_at` 与 unread/read 语义。About 不得出现在投影中。

## Source Mapping

- Blog：最新公开 Blog Public Footprint；
- Learn：最新公开 Learn 小节完成 Public Footprint；
- Projects：最新公开 Projects 实质更新 Public Footprint；
- Feed：公开 `feed_posts` 中最新 note / clip 与公开 `public_footprints` 中最新系统足迹两者的较新者；
- About：无状态、无卫星活动投影。

某个 Blog、Learn 或 Projects 系统足迹可同时影响其来源星球和 Feed 星球。这是状态映射，不是 Home 内容聚合。

## Refresh and Failure Rules

1. 合资格事件创建成功、原生 Feed 帖子删除或可见性变化、Public Footprint 可见性变化后，刷新完整投影。
2. 每小时运行一次全量校正，确保状态跨越 7 天和 60 天阈值时自然更新，并修复先前发布失败。
3. 来源事件是权威事实；投影失败不得回滚已成功的发布、完成或实质更新。
4. 发布必须替换完整对象，不得向 Home 暴露半份投影；保留上一份完整对象直到下一份成功发布。
5. 若 Home 无法取得有效且处于内部新鲜度范围内的投影，只隐藏四颗功能星球的活动卫星，导航和 About 功能继续可用；不得将失败误报为 `dormant`。
6. `public_footprints` 保持 ADR-005 的来源生命周期：来源内容删除不级联删除足迹；只有足迹自身不再公开时，才失去活动资格。

## Consequences

- Home 保持 SSG，且不请求 `/api/home`、Public Timeline 或来源内容 API。
- `Activity Signal Projection` 成为 feed-api 内部的深模块；调用方只触发刷新或读取固定资源，不处理四源查询、阈值和失败恢复细节。
- 主站新增专用 R2 静态投影存储；不得复用 `catstarry-media` 的 Feed 媒体路径。
- Phase 5 实现时需要配置静态资源交付、短缓存重新验证、小时级 Cron、失败日志与投影新鲜度监控。
- Phase 4.1 只把三态映射为信号卫星视觉；Phase 4.2 使用模拟状态，不接入真实投影。

## ADR-006 Compatibility

ADR-006 保持原文与结论不变：`/api/home` 没有替代 API，HomeTimelineItem、五源内容聚合和 `blog-metadata` KV bridge 继续退役。本 ADR 只允许无内容的静态状态资源，不恢复任何已退役契约。
