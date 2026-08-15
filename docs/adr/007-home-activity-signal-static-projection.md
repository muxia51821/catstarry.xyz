# ADR-007: Home Activity Signal Static Projection

> Status: **Accepted**
> Date: 2026-07-16
> Deciders: Home Activity Signal 定向 Phase 3 architecture agent + 木下
> Complements: ADR-005、ADR-006

> Terminology note: 本文中的“系统足迹”对应当前 canonical term `Public Footprint`；
> `Public Timeline` 仍是 Feed 的统一读取投影。代码内部 discriminator 不在本 ADR 重命名。

---

## Context

Home 是 SSG 宇宙入口与星图导航，不展示 Recently、内容卡片或公开足迹。木下仍需要四颗功能星球以低音量信号卫星真实反映公开活动，但 Home 不得重新读取跨模块内容。

状态只包括：

- `active`：最近 7 × 24 小时内有合资格公开活动；
- `stable`：超过 7 × 24 小时且不超过 60 × 24 小时；
- `dormant`：超过 60 × 24 小时，或从无合资格公开活动。

About 不参与该模型；豹猫是 About 附近的独立交互签名，不消费 HAS 的三态投影。

## Options

### A: 每次 Site 构建生成 `activity-signals.json`

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

投影文件位于专用 `home-projections` R2 存储中的固定对象 `activity-signals.json`，由 Feed Worker 的只读 `/activity-signals.json` route 提供给 Home。该资源没有查询参数、访客状态或内容载荷；它不是 `/api/home` 的替代，也不是 Public Timeline 的另一种读取接口。

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

Activity Signal 只读取已经存在的公开事件事实，不创建新的内容事件：

- Blog：最新 `visibility='public'` 且 `source_ref` 仍位于当前 published Blog set 的 Blog Public Footprint；
- Learn：正常 `learn_note_published` / `learn_note_revised` Footprint 需 `source_ref` 位于 `learn_publications.visibility='public'` set；历史 `learn_section_completed` 保留兼容资格；
- Projects：最新公开 `project_updated` Public Footprint；
- Feed：公开 `feed_posts` 中最新 Note / Clip 与上述**合资格**公开 Public Footprint 两者的较新者；
- About：无状态、无 Activity Signal projection。

同一个 Blog / Learn / Projects Footprint 可以同时影响其来源星球和 Feed 星球。这是状态映射，不是 Home 内容聚合。

Blog / Learn 的 Footprint record 可以继续保留在存储中，但 source 当前不在公开 projection 时，正常 Footprint 不再具有 Activity Signal 资格。`learn_section_completed` 是兼容例外，不代表当前 Learn Product 继续使用 completion 语义。

## Refresh and Failure Rules

1. 合资格 Feed / Footprint 创建、删除或自身 visibility 变化后刷新完整投影。
2. Blog / Learn publication lifecycle 变化会刷新完整投影，使 source visibility gate 立即反映到 HAS。
3. 每小时 `0 * * * *` 运行一次全量校正，确保状态跨越 7 天和 60 天阈值时自然更新，并修复先前异步刷新失败。
4. 来源 mutation 是权威事实；Activity projection 刷新失败不得回滚已经成功的 Feed / publication / visibility mutation。
5. 发布完整对象到 R2；刷新失败时已有完整对象保持不变，直到后续刷新成功。
6. `/activity-signals.json` 在对象缺失时返回 404；对象超过内部 3 小时 freshness boundary 时返回 503。Home 对缺失、过期、请求失败、schema/state 无效均不应用状态，只隐藏四颗功能星球的信号卫星；不得将失败误报为 `dormant`。
7. `public_footprints` 继续保持 ADR-005 的独立记录 / event-time snapshot 语义；Activity eligibility 是读取投影规则，不反向删除或改写 historical Footprint。

## Consequences

- Home 保持 SSG，且不请求 `/api/home`、Public Timeline 或来源内容 API。
- `Activity Signal Projection` 是 feed-api 内部模块；调用方只触发刷新或读取固定资源，不处理四源 query、source eligibility、7/60 天阈值和 failure recovery。
- 主站使用专用 `HOME_PROJECTIONS` R2 binding 保存固定对象，不复用 Feed media bucket。
- 当前实现由 feed-api 的 `activity-signals` module、`activity-signal-store` adapter、`activity-signals` route 和 hourly scheduled handler 提供 source eligibility、状态计算、完整对象发布、freshness check 与时间阈值校正。
- Home 只把三态映射为信号卫星视觉；projection 不承载内容或未读语义。

## ADR-006 Compatibility

ADR-006 的核心结论保持不变：`/api/home` 没有替代 API，HomeTimelineItem、五源内容聚合和 `blog-metadata` KV bridge 继续退役。本 ADR 只允许无内容的静态状态资源，不恢复任何已退役契约。
