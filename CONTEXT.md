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
- **星图**：Home 中用于板块导航的自由分布空间；不承担内容聚合
- **公开足迹**：Feed 面向访客的统一事件流／来时路；原生内容与符合规则的系统事件共同构成

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

## 设计基调 [已锁定 | Phase 4.1 Design 2.0]

> `DESIGN.md` v2.0 是当前全站视觉与交互事实来源。它以 ADR-005、ADR-006 为边界，保留三画布、Klein Blue、CJK 与 Finance 基线，并已重锁 Home 星图、About 双路径、Feed 公开足迹视觉关系、新 token 家族和 Phase 4.2 原型边界。

### 三画布系统

- **Home (Deep Space)**：冷调深黑画布 `#0A0A0C`，Klein Blue 为 Brand Voltage。Home 是 SSG 宇宙入口 → 2–3 屏接近同一星域 → 五颗完整暖性地质星球的自由总览 → 页脚；远景可为星点，接近后必须成为具有真实体积、光照和各自地貌的星球。
- **Content (Cream Gallery)**：奶油暖白画布 `#FAF9F5`，暖墨色文字，回归中文阅读舒适区。Blog、Feed、Learn、Projects 保留各自功能布局，只低剂量借用对应星球的地质纹理、切面和光学残响。
- **Finance (Cyber Arena)**：深黑画布 `#0B0E11`，松石绿 CTA `#5EAF9E`，纯数字与色块构建，无图片

### Home 签名与交互

- 五颗星球平权；大小、远近和出现顺序只表达空间纵深，不表达栏目重要性。
- About 可直接点击星球原地展开；豹猫卫星的两次点击蓄能 / 爆开是通往同一展开态的可选彩蛋，不是访问 About 的前置条件。
- 鼠标流星尾在 Home 完整但克制，在 Content 弱化，在 Finance 关闭；首屏 DISCOVER MORE 流星是另一种一次性引导。
- Home 不读取最近内容或 Public Footprint；普通信号卫星只能表达静态视觉、焦点或导航状态。
- Feed 使用单列 Public Timeline；原生 note / clip 与系统足迹可辨认但不暴露物理分存差异。

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
- API 路由：`/api/views` → 扩展为 `/api/feed`、`/api/auth`、`/api/learn`（见 `docs/architecture/modules.md`）。`/api/home` 及其聚合职责已由 ADR-006 退役；blog-metadata KV bridge 同时退役。

---

## 部署 [快照 | Phase 7 更新]

> ⚠️ 以下是 blog 原型的部署状态。Phase 7（部署上线）时更新为生产环境配置。

- **CF Pages**：GitHub 仓库 muxia51821/catstarry.xyz，main 分支自动部署
- **Worker**：feed-api.catstarry.workers.dev，手动 `wrangler deploy`
- **DNS**：catstarry.xyz CNAME → catstarry-xyz.pages.dev，Proxied

---

## 开发状态 [快照 | Phase 4.1 已完成，Phase 4.2 待启动]

> 全局 Phase 3、Home / Feed 定向 Phase 2 与定向 Phase 3 均已完成。返回 Phase 4.1 已通过 `DESIGN.md` v2.0 与 canonical CSS 完成重锁；Phase 4.2 尚未启动，等待流程治理确认。

- /blog：🟡 原型已上线，Phase 5 重做
- /：✅ 星图入口需求、SSG 无聚合架构与 Design 2.0 视觉边界已锁定；🔴 未开发
- /feed：✅ 公开足迹需求、分存事件架构与 Design 2.0 视觉边界已锁定；🔴 未开发
- /learn、/projects、f.catstarry.xyz：✅ 需求已锁定 + 架构已锁定，🔴 未开发
- poker.catstarry.xyz：✅ 已上线（独立部署）
- 设计系统 CSS：✅ `variables.css` / `components.css` / `typography.css` 已对齐 Design 2.0；新星图页面组件仍须等待 Phase 4.2 原型与 Phase 4.3 落地。
