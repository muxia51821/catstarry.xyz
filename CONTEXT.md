# 项目上下文 (CONTEXT)

> catstarry.xyz 项目的领域上下文、术语和架构决策。
> 供 `improve-codebase-architecture`、`diagnosing-bugs`、`tdd` 等 skill 读取。

## 约定性质说明

本文档中的每节标注了性质标签：

| 标签       | 含义                     |
| ---------- | ------------------------ | ------------------------------------------------------------------ |
| `[已锁定]` | Phase 0 确定的，尽量不改 |
| `[原型约定 | Phase X 重新裁决]`       | blog 原型阶段的临时约定，进入标注的 Phase 时必须重新审查，有权推翻 |
| `[定向回流中 | Phase X]` | 已确认的上游变更正在复核受影响契约；在标注 Phase 闭合前，不得作为最终实现依据 |
| `[快照     | Phase X 更新]`           | 随项目推进需同步更新                                               |

---

## 项目简介 [已锁定]

catstarry.xyz 是木下的个人网站，用 AI 驱动搭建。非程序员用户（Vibe Coding），AI agent 负责编码。

---

## 领域术语 [已锁定]

核心术语：

- **木下**：网站所有者，非程序员，AI 架构师
- **cati**：木下的伴侣，财务面板只读用户
- **碎碎念**：短内容发布（文字 + 图/视频），备忘录感
- **剪藏**：网页收藏（链接 + 自动摘要 + 用户点评）

  完整术语见 `GLOSSARY.md`

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

## 设计基调 [定向回流中 | Phase 4.1 设计方向已确认，待定向 Phase 3 后重锁]

> `DESIGN.md` v1.4（当前 11 节）仍是已有设计系统的事实来源；Home / Feed 的产品关系已触发定向回流。三画布、Klein Blue 与 CJK 原则可继续作为已确认设计原子，Home 星图与 Feed 关系须在定向 Phase 3 后返回 Phase 4.1 重锁。

### 三画布系统

- **Home (Sci-Fi Editorial)**：冷调深黑画布 `#0A0A0C`，Klein Blue `#002FA7` 为唯一品牌色。Home 已重定义为宇宙入口 → 接近星域 → 自由星图总览 → 页脚；About 在 Home 原地展开，不再承担跨模块内容聚合。星图的具体视觉与接口待定向 Phase 3 后返回 Phase 4.1 重锁。
- **Content (Cream Gallery)**：奶油暖白画布 `#FAF9F5`，暖墨色文字，回归中文阅读舒适区。卡片 8px 锐利圆角 + Webflow 7 层阴影
- **Finance (Cyber Arena)**：深黑画布 `#0B0E11`，松石绿 CTA `#5EAF9E`，纯数字与色块构建，无图片

### CJK 优先

- 中文正文字号 ≥16px，行高 ≥1.85
- 标点挤压 `text-spacing-trim` + `hanging-punctuation`
- 中英混排 1/4em 间距（Phase 5 JS 实现）

### 动效

- 三条缓动曲线（ease-monopo / ease-scroll-in / ease-hover）
- CSS-only 动画工具类：.anim-fade-up / .anim-stagger / .parallax-container
- prefers-reduced-motion 降级

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
- 鉴权方案见 `docs/architecture/auth.md`：统一 `/login` 入口 + bcrypt + KV session + TTL 24h
- 阅读量去重：IP + slug + 日期，KV key TTL 24h
- D1 表命名：snake_case
- API 路由：`/api/views` → 扩展为 `/api/feed`、`/api/auth`、`/api/home`、`/api/learn`（见 `docs/architecture/modules.md`）。其中 `/api/home` 的聚合职责已进入定向回流，待定向 Phase 3 裁决退役或替代方案。

---

## 部署 [快照 | Phase 7 更新]

> ⚠️ 以下是 blog 原型的部署状态。Phase 7（部署上线）时更新为生产环境配置。

- **CF Pages**：GitHub 仓库 muxia51821/catstarry.xyz，main 分支自动部署
- **Worker**：feed-api.catstarry.workers.dev，手动 `wrangler deploy`
- **DNS**：catstarry.xyz CNAME → catstarry-xyz.pages.dev，Proxied

---

## 开发状态 [快照 | 定向回流闭合后更新]

> 全局 Phase 3 已完成（2026-07-05）。Home / Feed 因 Phase 4.1 设计确认触发定向回流：定向 Phase 2 已完成，定向 Phase 3 待启动；其完成后返回 Phase 4.1，Phase 4.2 尚未启动。

- /blog：🟡 原型已上线，Phase 5 重做
- /：✅ 星图入口需求已锁定；🔶 架构待定向 Phase 3 复核；🔴 未开发
- /feed：✅ 公开足迹需求已锁定；🔶 架构待定向 Phase 3 复核；🔴 未开发
- /learn、/projects、f.catstarry.xyz：✅ 需求已锁定 + 架构已锁定，🔴 未开发
- poker.catstarry.xyz：✅ 已上线（独立部署）
