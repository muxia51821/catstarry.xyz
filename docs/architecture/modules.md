# 代码库架构与模块边界 (Modules)

> catstarry.xyz 目录结构、模块边界、依赖规则、Workers 路由架构
> Phase 3 / 3.2 & 3.3 产出 | 2026-07-05

---

## 目录结构

```
catstarry.xyz/
|-- src/                          # Astro 前端（CF Pages 部署）
|   |-- pages/                    # 路由页面（文件路由）
|   |   |-- index.astro           # Home 首页（SSR）
|   |   |-- blog/
|   |   |   |-- index.astro       # 博客列表（SSG）
|   |   |   |-- [slug].astro      # 文章详情（SSG）
|   |   |   |-- category/
|   |   |   |   |-- [category].astro
|   |   |   |-- tag/
|   |   |   |   |-- [tag].astro
|   |   |   |-- rss.xml.ts        # RSS 2.0（SSG）
|   |   |-- feed/
|   |   |   |-- index.astro       # 时间线（SSR）
|   |   |   |-- admin.astro       # 管理后台（SSR，需认证）
|   |   |-- learn/
|   |   |   |-- index.astro       # 学习轨迹列表（SSG）
|   |   |   |-- [slug].astro      # 笔记详情（SSG）
|   |   |   |-- admin.astro       # 草稿管理（SSR，需认证）
|   |   |-- projects/
|   |       |-- index.astro       # 项目展示（SSG）
|   |-- components/               # React island 组件
|   |   |-- feed/
|   |   |   |-- PublishPanel.tsx   # 发布面板
|   |   |   |-- Timeline.tsx      # 时间线
|   |   |   |-- ClipCard.tsx      # 剪藏卡片
|   |   |   |-- NoteCard.tsx      # 碎碎念卡片
|   |   |   |-- MediaUploader.tsx # 媒体上传
|   |   |   |-- LoginPanel.tsx    # 登录面板
|   |   |-- home/
|   |   |   |-- AboutCard.tsx     # about 卡片（3D 粒子）
|   |   |   |-- TimelineFeed.tsx  # 混合时间线
|   |   |   |-- FilterBar.tsx     # 类型筛选栏
|   |   |-- learn/
|   |   |   |-- KnowledgeGraph.tsx  # 知识图谱
|   |   |   |-- WikiLink.tsx      # wikilink 悬停预览
|   |   |   |-- SidebarTree.tsx   # 侧栏目录树
|   |   |-- shared/
|   |   |   |-- ArticleFooter.tsx # 文章底部栏（Giscus + 分享）
|   |   |   |-- ViewCounter.tsx   # 阅读量
|   |   |   |-- Pagination.astro  # 分页导航
|   |   |-- ui/                   # shadcn/ui 组件（自动生成）
|   |-- content/                  # Astro Content Collections
|   |   |-- config.ts             # blog + learn schema
|   |   |-- blog/                 # Markdown 博客文章
|   |   |   |-- from-zero.md
|   |   |-- learn/                # MDX 学习笔记
|   |       |-- angular-from-zero/
|   |       |-- astro/
|   |-- layouts/
|   |   |-- Base.astro            # 全站公共 layout（导航栏 + footer）
|   |   |-- BlogLayout.astro      # blog 板块 layout
|   |   |-- FeedLayout.astro      # feed 板块 layout
|   |-- lib/                      # 纯前端工具
|   |   |-- category.ts           # 分类映射
|   |   |-- useViewCount.ts       # 阅读量 hook
|   |   |-- api-client.ts         # Worker API 调用封装
|   |-- styles/
|       |-- global.css            # 暖色系 + 排版基线
|
|-- shared/                       # 前后端共享（Workers + Astro 各自 import）
|   |-- types.ts                  # 全站 API 类型定义
|   |-- auth.ts                   # 鉴权逻辑（bcrypt、session、限流）
|   |-- cors.ts                   # CORS 头常量 + middleware
|
|-- workers/
|   |-- feed-api/                 # 主站 API Worker
|   |   |-- src/
|   |   |   |-- index.ts          # 入口 + 路由注册
|   |   |   |-- routes/
|   |   |   |   |-- feed.ts       # /api/feed（帖子 CRUD）
|   |   |   |   |-- views.ts      # /api/views（阅读量）
|   |   |   |   |-- auth.ts       # /api/auth（登录/登出/session）
|   |   |   |   |-- home.ts       # /api/home（Home 聚合查询）
|   |   |   |   |-- learn.ts      # /api/learn（笔记管理）
|   |   |   |-- middleware/
|   |   |   |   |-- cors.ts       # CORS middleware
|   |   |   |   |-- auth.ts       # 认证 middleware（session 验证）
|   |   |-- wrangler.toml
|   |   |-- schema.sql            # D1 DDL
|   |-- finance-api/              # 财务 Worker（独立）
|       |-- src/
|       |   |-- index.ts          # 入口 + 路由注册
|       |   |-- routes/
|       |   |   |-- trades.ts     # /api/trades（交易 CRUD）
|       |   |   |-- holdings.ts   # /api/holdings（持仓查询）
|       |   |   |-- market.ts     # /api/market（行情查询）
|       |   |   |-- pe.ts         # /api/pe（PE 温度计）
|       |   |   |-- circuit.ts    # /api/circuit（熔断查询）
|       |   |-- middleware/
|       |   |   |-- cors.ts
|       |   |   |-- auth.ts       # 角色鉴权（木下 rw / cati ro）
|       |   |-- tasks/
|       |       |-- fetch-prices.ts   # Cron: 行情拉取
|       |       |-- fetch-pe.ts       # Cron: PE-TTM 拉取
|       |       |-- clean-r2.ts       # Cron: R2 临时文件清理
|       |-- wrangler.toml
|       |-- schema.sql
|
|-- public/                       # 静态资源
|   |-- robots.txt
|   |-- sitemap.xml
|
|-- docs/                         # 项目文档（不属于部署产物）
|   |-- architecture/
|   |   |-- data-model.md         # 数据模型（3.1）
|   |   |-- modules.md            # 本文件（3.2 + 3.3）
|   |   |-- auth.md               # 鉴权方案（3.4）
|   |-- adr/                      # 架构决策记录（3.5）
|   |-- agents/
|   |-- acceptance-*.md
|   |-- final-requirements-*.json
|   |-- SITEMAP.md
|   |-- DASHBOARD.md
|   |-- workflow-orchestration.md
|   |-- tech-decisions-20260703.md
|
|-- .scratch/                     # 开发 issue + PRD
|   |-- blog/
|   |-- feed/
|   |-- finance/
|   |-- home/
|   |-- learn/
|   |-- projects/
|
|-- teach/                        # Teach skill workspace（不部署）
|-- _archive/                     # 历史产物归档
|
|-- astro.config.mjs
|-- package.json
|-- tsconfig.json
|-- AGENTS.md
|-- CONTEXT.md
|-- GLOSSARY.md
|-- README.md
```

---

## 模块边界与依赖规则

### 模块定义

| 模块 | 边界 | 部署单元 |
|------|------|---------|
| **src/pages/blog/** | Astro SSG 页面 + Markdown content | CF Pages（dist/） |
| **src/pages/feed/** | Astro SSR 页面 + React islands | CF Pages（dist/） |
| **src/pages/learn/** | Astro SSG 页面 + MDX content | CF Pages（dist/） |
| **src/pages/projects/** | Astro SSG 页面 | CF Pages（dist/） |
| **src/pages/index.astro** | Home SSR 页面 | CF Pages（dist/） |
| **workers/feed-api/** | 主站 API Worker | wrangler deploy → feed-api.xxx.workers.dev |
| **workers/finance-api/** | 财务 API Worker | wrangler deploy → cf 绑定 f.catstarry.xyz |
| **shared/** | 前后端共享类型/逻辑 | 不独立部署，被 Workers 和 Astro import |

### 依赖规则

```
                     ┌──────────┐
                     │  shared/ │  （无外部依赖，纯函数 + 类型）
                     └────┬─────┘
              ┌───────────┼───────────┐
              ▼           ▼           ▼
    ┌─────────────┐ ┌──────────┐ ┌──────────────┐
    │ feed-api    │ │finance-api│ │ Astro (src/) │
    │ Worker      │ │ Worker    │ │              │
    │ imports:    │ │ imports:  │ │ imports:     │
    │  shared/*   │ │  shared/* │ │  shared/*    │
    │  + D1/KV/R2 │ │  + D1/KV  │ │  + components│
    └─────────────┘ └──────────┘ │  + layouts    │
                                 └──────┬───────┘
                                        │
                                ┌───────▼───────┐
                                │ CF Pages      │
                                │ (dist/)       │
                                └───────────────┘
```

**硬性规则**：

1. **Workers 不 import Astro 代码**。Workers 只依赖 `shared/` + CF bindings（D1、KV、R2）。
2. **Astro 不 direct import Worker 代码**。Astro 通过 HTTP fetch 调用 Worker API。
3. **`shared/` 是单向依赖的根**。它不 import `src/` 或 `workers/` 下的任何文件。
4. **各页面模块独立**。`src/pages/blog/` 不 import `src/pages/feed/` 下的组件，反之亦然。共享组件放在 `src/components/shared/` 或 `src/components/ui/`。

---

## Workers 路由架构

### feed-api（主站 Worker）

| 方法 | 路径 | 功能 | 归属 | 认证 |
|------|------|------|------|------|
| `GET` | `/api/feed` | 分页查询公开帖子 | `routes/feed.ts` | 无 |
| `POST` | `/api/feed` | 创建帖子 | `routes/feed.ts` | Session |
| `PATCH` | `/api/feed/:id` | 更新帖子（隐藏/公开/删除） | `routes/feed.ts` | Session |
| `GET` | `/api/views` | 阅读量查询（单个/批量） | `routes/views.ts` | 无 |
| `POST` | `/api/views` | 阅读量 +1 | `routes/views.ts` | 无（KV 去重） |
| `POST` | `/api/auth/login` | 登录 | `routes/auth.ts` | 无（限流） |
| `POST` | `/api/auth/logout` | 登出 | `routes/auth.ts` | Session |
| `GET` | `/api/auth/session` | 验证当前 session | `routes/auth.ts` | Session |
| `GET` | `/api/me/feed` | 管理后台查询（含隐藏帖子） | `routes/feed.ts` | Session |
| `GET` | `/api/home` | Home 聚合数据 | `routes/home.ts` | 无 |

**Worker 入口结构**（`workers/feed-api/src/index.ts`）：

```typescript
import { handleFeed } from "./routes/feed";
import { handleViews } from "./routes/views";
import { handleAuth } from "./routes/auth";
import { handleHome } from "./routes/home";

export default {
  async fetch(request, env, ctx): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Route matching
    if (path.startsWith("/api/feed")) return handleFeed(request, env);
    if (path.startsWith("/api/views")) return handleViews(request, env);
    if (path.startsWith("/api/auth")) return handleAuth(request, env);
    if (path.startsWith("/api/home")) return handleHome(request, env);

    return new Response("Not Found", { status: 404 });
  },
};
```

### finance-api（财务 Worker）

| 方法 | 路径 | 功能 | 归属 | 认证 |
|------|------|------|------|------|
| `GET` | `/api/trades` | 查询交易记录 | `routes/trades.ts` | 木下 r/w, cati r/o |
| `POST` | `/api/trades` | 录入交易 | `routes/trades.ts` | 木下 only |
| `GET` | `/api/holdings` | 当前持仓 | `routes/holdings.ts` | 木下 r/w, cati r/o |
| `GET` | `/api/market` | 行情查询 | `routes/market.ts` | 木下 r/w, cati r/o |
| `GET` | `/api/pe` | PE 温度计 | `routes/pe.ts` | 木下 r/w, cati r/o |
| `GET` | `/api/circuit` | 熔断日志 | `routes/circuit.ts` | 木下 only |

**Cron Triggers**（`wranger.toml`）：

```toml
[triggers]
crons = [
  "*/15 * * * *",   # 行情价格拉取（每 15 分钟）
  "0 15 * * 1-5",   # PE-TTM 拉取（交易日收盘后）
  "0 * * * *"        # R2 临时文件清理（每小时）
]
```

---

## 目录结构 vs Phase 1 原型

以下变更覆盖 blog 原型（Phase 1）的目录结构（CONTEXT.md 中 [原型约定 | Phase 3 重新裁决]）：

| 变更 | 原 Phase 1 | Phase 3 新设计 |
|------|-----------|---------------|
| `shared/` | 不存在 | 新建顶层的 `shared/`（types.ts + auth.ts + cors.ts） |
| `src/components/` | 平铺 2 个文件 | 按模块分子目录：`feed/`、`home/`、`learn/`、`shared/`、`ui/` |
| `src/layouts/` | 仅 `Base.astro` | 新增 `BlogLayout.astro`、`FeedLayout.astro` |
| `workers/feed-api/` | 单文件 `index.ts` | 拆分为 `src/routes/` + `src/middleware/` |
| `workers/finance-api/` | 不存在 | 新建 `src/routes/` + `src/tasks/` + `src/middleware/` |
| `src/content/learn/` | 不存在 | 新建 MDX 笔记目录 |
| `src/pages/` 其余路由 | 仅 blog 有 | 新增 feed/、learn/、projects/、admin/、index.astro |

**保留不变**：
- `src/content/blog/`（Markdown 博客文章）
- `src/content/config.ts`（扩展 learn collection）
- `src/styles/global.css`（暖色系）
- `src/lib/`（前端工具函数，保持原位）
