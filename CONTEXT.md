# 项目上下文 (CONTEXT)

> catstarry.xyz 项目的领域上下文、术语和架构决策。
> 供 `improve-codebase-architecture`、`diagnosing-bugs`、`tdd` 等 skill 读取。

## 约定性质说明

本文档中的每节标注了性质标签：

| 标签       | 含义                                 |
| ---------- | ------------------------------------ | ------------------------------------------------------------------ |
| `[已锁定]` | Phase 0 确定的，尽量不改（如技术栈） |
| `[原型约定 | Phase X 重新裁决]`                   | blog 原型阶段的临时约定，进入标注的 Phase 时必须重新审查，有权推翻 |
| `[快照     | Phase X 更新]`                       | 随项目推进需同步更新                                               |

---

## 项目简介 [已锁定]

catstarry.xyz 是木下的个人网站，用 AI 驱动搭建。非程序员用户（Vibe Coding），AI agent 负责编码。

---

## 领域术语 [已锁定]

见 `GLOSSARY.md`。核心术语：

- **木下**：网站所有者，非程序员，AI 架构师
- **cati**：木下的伴侣，财务面板只读用户
- **碎碎念**：短内容发布（文字 + 图/视频），备忘录感
- **剪藏**：网页收藏（链接 + 自动摘要 + 用户点评）
- **备忘录感**：发布哲学——写完即发、不编辑、低摩擦
- **PE 温度计**：沪深300 PE-TTM 自动映射五档温度
- **三级熔断**：黄/红/黑三级回撤保护机制

---

## 技术架构 [已锁定]

| 层     | 选型                                  | 部署            |
| ------ | ------------------------------------- | --------------- |
| 前端   | Astro hybrid + React (shadcn/ui)      | CF Pages        |
| 后端   | CF Workers (feed-api + finance-api)   | wrangler deploy |
| 数据库 | D1 (结构化) + KV (缓存/配置)          | CF              |
| 存储   | R2 (媒体文件)                         | CF              |
| CI/CD  | Git push → CF Pages / wrangler deploy | GitHub          |

---

## 设计基调 [原型约定 | Phase 4 重新裁决]

> ⚠️ 以下是 blog 原型阶段采用的值，Phase 4（UI/原型）时可由设计对话根据 artistic warm 方向重建或保留。

在原型中采用的方案：

- **暖色系配色**：暖米白底 `#fdf6f0` → 暖棕文字 `#3e2f24` → 暖橘强调 `#c77a4a`
- **排版**：中文优先、大字号（18-20px）、宽松行高（1.85）、~680px 阅读宽度
- **设计哲学**：不极简，偏艺术、有温度
- **B 型首页**：数字生活流，像流动的河，不是功能列表或个人名片

---

## 目录结构 [已锁定]

> Phase 3 裁决锁定。完整版见 `docs/architecture/modules.md`。

catstarry.xyz/
├── src/pages/ # 路由页面（blog/feed/learn/projects/home）
├── src/components/ # React islands，按模块分子目录
├── src/content/ # Astro Content Collections（blog + learn）
├── src/layouts/ # 页面布局（Base/Blog/Feed）
├── src/lib/ # 纯前端工具函数
├── src/styles/ # 暖色系 CSS 变量
├── shared/ # 前后端共享（types.ts + auth.ts + cors.ts）
├── workers/feed-api/ # 主站 API Worker（/api/_）
├── workers/finance-api/# 财务 API Worker（/api/_ + Cron）
├── public/ # 静态资源
├── docs/ # 项目文档
├── .scratch/ # 开发 issue
└── teach/ # Teach skill workspace

---

## 前端约定 [原型约定 | Phase 5 重新裁决]

> ⚠️ 以下是 blog 原型阶段的前端实践。Phase 5（开发实现）时由各模块开发线程重新决定，可保留、调整或推翻。

- 所有页面使用 `Base` layout（`src/layouts/Base.astro`）
- 颜色使用 CSS 变量（`var(--color-xxx)`），不硬编码
- 分类中文映射：`tech→技术`、`life→生活`、`opinion→观点`
- React island 以 `client:load` 嵌入 Astro 页面
- draft 文章不输出（`getCollection` 过滤 `draft: true`）

---

## 后端约定 [原型约定 | Phase 5 重新裁决]

> ⚠️ 以下是 blog 原型阶段的后端实践。Phase 5（开发实现）时由开发线程重新决定，可保留、调整或推翻。

- Workers 响应必须包含 CORS 头
- 阅读量去重：IP + slug + 日期，KV key TTL 24h
- D1 表命名：snake_case
- API 路由：`/api/views` → 扩展为 `/api/feed`、`/api/auth`、`/api/home`、`/api/learn`（见 `docs/architecture/modules.md`）

---

## 部署 [快照 | Phase 7 更新]

> ⚠️ 以下是 blog 原型的部署状态。Phase 7（部署上线）时更新为生产环境配置。

- **CF Pages**：GitHub 仓库 muxia51821/catstarry.xyz，main 分支自动部署
- **Worker**：feed-api.catstarry.workers.dev，手动 `wrangler deploy`
- **DNS**：catstarry.xyz CNAME → catstarry-xyz.pages.dev，Proxied

---

## 开发状态 [快照 | Phase 4 启动前更新]

> Phase 3 已完成（2026-07-05）。架构设计产出 9 份文档。

- /blog：🟡 原型已上线，Phase 5 重做
- /、/feed、/learn、/projects、f.catstarry.xyz：✅ 需求已锁定 + 架构已锁定，🔴 未开发
- poker.catstarry.xyz：✅ 已上线（独立部署）
