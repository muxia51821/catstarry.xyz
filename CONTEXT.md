# 项目上下文 (CONTEXT)

> catstarry.xyz 的快速定向入口。这里只保留高频、相对稳定的项目事实。
> Product、Architecture、Design、routes、deployment 或 implementation 细节应进入对应事实源；本文与对应事实源冲突时，以 `AGENTS.md` 的职责边界回到事实源核对。

## 项目是什么

catstarry.xyz 是木下的个人网站，由 AI agent 协助开发和维护。木下负责产品、架构与体验裁决，并决定 merge、deployment 和 production mutation。

当前项目处于 **Phase 8 长期维护**：围绕真实使用中的问题做小型修复、内容更新、专项审查和必要的产品／架构调整，不要求每个任务重新经历完整 Phase 1–7。

## 当前范围

公开主站 `catstarry.xyz` 包含：

- **Home**：星图式入口与空间导航；不是跨模块内容聚合页。
- **Blog**：长文与阅读体验。
- **Feed**：碎碎念、剪藏与 Public Footprint 组成的 Public Timeline。
- **Learn**：选择性公开的学习笔记。
- **Projects**：项目展示。

`f.catstarry.xyz` 是独立的内部 Finance workspace，不属于公开 Content Family，也不进入 Home 的公开内容链路。

共享术语见 `GLOSSARY.md`，具体路由见 `docs/SITEMAP.md`。

## 技术架构摘要

| 层 | 当前 repository baseline |
| --- | --- |
| 主站 | Astro hybrid + React；Cloudflare adapter 生成 Site Worker |
| 主站 API | `feed-api` Cloudflare Worker |
| Finance | 独立 Finance Pages + `finance-api` Worker |
| 数据 | 主站与 Finance 使用独立 D1；另有 KV 与 R2 |
| Site → Feed server seam | production-like runtime 使用 `FEED_API` Service Binding；Local Preview 才使用 localhost HTTP fallback |

版本、binding、schema、route、Cron 和 deployment runner 不在本文复制；需要时读取 `docs/architecture.md`、其子文档、`docs/DEPLOY.md` 和当前配置／代码。

## Content Family 当前产品边界

Blog、Feed、Learn、Projects 的共享产品语义已经完成 reconciliation；正常入口是：

```text
docs/content/README.md
  → family-contract.md / master-ledger.md（按任务需要）
```

历史 requirements、acceptance、旧 reconciliation / dependency map、prototype 和 QA 可以作为 rationale，但不因文件名包含 `final`、`acceptance` 或 `canonical` 就自动成为 current authority。

当前 implementation 是“已经实现了什么”的证据，不会自行覆盖较新的 Product Closure、Architecture decision 或木下的明确裁决。Parked capability 不是 implementation gap。

## 几个容易误判的当前边界

### Home

- Home 的核心职责是入口与导航，不展示跨模块最近内容列表。
- Blog / Feed / Learn / Projects 的跨页“返回星图”目标是 `/?stage=overview`。
- Home Cursor Meteor 是 Home 的独立指针签名。
- Home Activity Signal 只表达四个功能模块的 `active / stable / dormant` 最小状态，不是 Public Timeline。

### Content interaction

Content / Cream Gallery 当前使用：

- **Content Paw Trail**：细指针移动时的猫爪轨迹；
- **Content Click Feedback**：与 Paw Trail 分离的点击反馈。

它们不是 Home Cursor Meteor 的弱化版本；Finance 不继承这两种 Content / Home 指针签名。具体视觉参数由设计和前端实现事实源负责。

### Blog

Blog source 位于 `src/data/blog/`，可使用 Markdown / MDX。公开页面是 runtime-gated SSR：source 文件存在不等于当前公开，公开投影还受 Blog runtime lifecycle 控制。

### Feed

原生碎碎念／剪藏写入 `feed_posts`；Blog / Learn / Projects 的 Public Footprint 写入独立记录。`/feed` 在读取时把两类记录统一形成 Public Timeline；Home 不消费这条时间线。

### Learn

- Public Learn canonical source 是 Markdown，位于 `src/data/learn/`。
- source metadata 与正常公开 visibility 是不同边界。
- 正常公开 visibility / first published time 由 runtime `learn_publications` state 管理。
- owner Admin 负责首次 Publish、Hide、Show；Local Preview lifecycle mutation 是只读的。
- successful production deploy sync 负责已存在 publication 的 revision / relation metadata，不等同于首次 Publish。
- `learn:relation-manifest` 是 deployed source relation metadata，不是 relation database。

详细事实见当前 architecture / data-model / route 实现；不要从旧 Learn requirements 恢复 legacy publication 模型。

## 设计与前端

全站仍使用三种主要画布语义：

- Home — Deep Space
- Content — Cream Gallery
- Finance — Cyber Arena

具体颜色、排版、组件与动效以 `DESIGN.md`、`docs/agents/frontend-rules.md` 和当前实现为准。共享术语只从 `GLOSSARY.md` 读取，不在本文复制施工参数。

中文排版的 current implementation 使用原生 `text-autospace`；代码类文本按当前样式显式关闭 autospace。不要恢复旧的 JS 1/4em spacing 方案。

## Git、验证与 deployment

- Agent 权限、Git 规则和 production safety：`AGENTS.md`。
- 当前 Phase 8 工作流：`docs/workflow-orchestration.md`。
- deployment runbook：`docs/DEPLOY.md`。
- repository migration 存在、代码已经 merge、CI 通过、已经 deployed、production accepted 是不同状态。
- Git HEAD、当前 production source、远端 migration state 等易过期事实必须现场核验，不写进本文作为长期“当前值”。

## 正常读取路径

```text
AGENTS.md
  ↓
CONTEXT.md
  ↓
按任务进入对应事实源
```

常见分支：

- Product / Content：`docs/content/README.md`
- Architecture：`docs/architecture.md`
- Design / frontend：`DESIGN.md` + `docs/agents/frontend-rules.md`
- Routes：`docs/SITEMAP.md`
- Deployment：`docs/DEPLOY.md`
- Historical rationale：仅在需要时读取 `docs/_archive/` 或其他历史命名空间

不要为了冷启动一次性加载整个文档树。
