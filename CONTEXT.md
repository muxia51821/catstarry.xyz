# 项目上下文 (CONTEXT)

> catstarry.xyz 的快速定向入口。这里只保留高频、相对稳定、足以帮助新 Session 判断任务归属的项目事实。

## 项目是什么

catstarry.xyz 是木下的个人网站，由 AI agent 协助开发和维护。木下负责产品、架构与体验裁决，并决定 merge、deployment 和 production mutation。

项目当前处于 **Phase 8 长期维护**：围绕真实使用中的问题持续修复、更新内容，并在确有需要时重新进入 Product / Architecture / Design 裁决。

## 产品范围

公开主站 `catstarry.xyz` 包含：

- **Home**：星图式入口与空间导航；不是跨模块内容聚合页。
- **Blog**：长文与阅读体验。
- **Feed**：碎碎念、剪藏与 Public Footprint 组成的 Public Timeline。
- **Learn**：从私人学习中选择性公开的 durable knowledge surface。
- **Projects**：项目展示。

Finance 已迁移至独立私有仓库；本仓库不再维护其代码、部署、数据或认证。`f.catstarry.xyz` 仍是内部私有边界，不属于公开 Content Family。

共享术语见 `GLOSSARY.md`，具体路由见 `docs/SITEMAP.md`。

## 系统形状

| 层 | 稳定边界 |
| --- | --- |
| 主站 | Astro hybrid + React，运行于 Cloudflare Site Worker |
| 主站 API | 独立 `feed-api` Cloudflare Worker |
| 数据 | 主站使用独立 D1、KV 与 R2 |
| Site → Feed | server-side 调用使用 `FEED_API` Service Binding；本地预览可使用 localhost transport |

版本、schema、binding inventory、route implementation 和 deployment wiring 由当前配置、代码与 Architecture / DEPLOY 文档负责，不在本文复制。

## Durable boundaries

- Home 负责进入和导航，不读取 Public Timeline 作为“最近内容”聚合。
- Blog、Feed、Learn、Projects 属于同一 Content Family / Cream Gallery，但保持不同的信息架构和 surface grammar。
- Content Family 的 Product governance 已完成 reconciliation；正常入口是 `docs/content/README.md`。
- Blog 与 Learn 都是 repository-authored content，但公开可见性具有 runtime lifecycle；source 文件存在不等于当前公开。
- Feed 的 Public Timeline 统一呈现原生 Feed 内容与 Public Footprint；Home 不消费这条时间线。
- Public Learn 的 canonical durable object 是 Public Note。Track 是 domain context / directory，不是 Public Note identity parent，也不等同于私人学习 workflow。
- Home 与 Content 的视觉和交互边界由 `DESIGN.md` 负责；其中保留的 Finance 设计语义只用于跨属性视觉边界，不代表本仓库拥有 Finance 实现。

## 事实来源

按任务进入对应 current source：

- Agent 权限、Git、production safety：`AGENTS.md`
- Phase 8 工作流：`docs/workflow-orchestration.md`
- Content Product：`docs/content/README.md`
- Architecture：`docs/architecture.md`
- Design / frontend：`DESIGN.md`、`docs/agents/frontend-rules.md`
- Routes：`docs/SITEMAP.md`
- Deployment：`docs/DEPLOY.md`
- Implementation：当前代码与测试
- Release history：`CHANGELOG.md`

Git HEAD、当前 deployment source、远端 migration state 与 production 状态属于易过期事实，需要时现场核验。
