# 代码库架构 (Modules)

> catstarry.xyz 模块设计 — Seam 分析 + 深度评估 + 数据流
> Phase 3 / 3.2 & 3.3 产出 | 2026-07-05
> 遵循 codebase-design skill 的 deep module 框架

---

## 1. Seam 总览

全站 3 条主缝（tier-spanning seams），将系统切分为 4 层：

```
┌────────────────────────────────────────────┐
│  Layer 1: Astro Pages (src/pages/)          │  HTTP request → HTML
│  - 每个页面是一个 module，接口 = route path │
│  - SSG pages: 构建时闭包，无运行时依赖      │
│  - SSR pages: fetch Worker → 渲染           │
├────────────────────────────────────────────┤ ← Seam A: HTTP (fetch)
│  Layer 2: CF Workers (workers/*/)           │  Request → JSON
│  - feed-api: 主站 API（9 endpoints）        │
│  - finance-api: 财务 API（5 endpoints）     │
│  - 接口 = URL path + method + body schema   │
├────────────────────────────────────────────┤ ← Seam B: CF Bindings
│  Layer 3: Adapters (shared/)                │  函数调用 → 副作用
│  - shared/auth.ts: 认证 adapter             │
│  - shared/cors.ts: CORS adapter             │
│  - shared/types.ts: 类型（无实现）          │
├────────────────────────────────────────────┤ ← Seam C: Data (SQL/HTTP)
│  Layer 4: Infrastructure                    │  SQL → rows / bytes
│  - D1 (catstarry-db + finance-db)           │
│  - KV (VIEW_KV / AUTH_KV / FINANCE_AUTH_KV) │
│  - R2 (catstarry-media)                     │
│  - a-stock-data (external HTTP API)         │
└────────────────────────────────────────────┘
```

**Seam 规则**：

- Seam A 之上（Astro）不 import Seam A 之下（Workers 源码）。仅通过 HTTP fetch 通信。
- Seam B 之上（Workers）不直接操作 D1/KV/R2 底层 API。复杂的存储操作封装在 adapter 内。
- Seam C 之上无代码。D1/KV/R2 是 Cloudflare 托管基础设施。

---

## 2. 目录结构

```
catstarry.xyz/
|= src/                           # Layer 1: Astro 页面
|  |= pages/                      # 路由（文件系统路由 = interface）
|  |  |- index.astro              # Home (SSR) — 聚合时间线
|  |  |= blog/                    # 博客板块
|  |  |  |- index.astro           #   列表页 (SSG)
|  |  |  |- [slug].astro          #   详情页 (SSG)
|  |  |  |- category/[cat].astro  #   分类页 (SSG)
|  |  |  |- tag/[tag].astro       #   标签页 (SSG)
|  |  |  |- rss.xml.ts            #   RSS 2.0 (SSG)
|  |  |= feed/                    # 碎碎念板块
|  |  |  |- index.astro           #   时间线 (SSR)
|  |  |  |- admin.astro           #   管理后台 (SSR, 需认证)
|  |  |= learn/                   # 学习笔记板块
|  |  |  |- index.astro           #   Track 列表 (SSG)
|  |  |  |- [slug].astro          #   笔记详情 (SSG)
|  |  |  |- admin.astro           #   草稿管理 (SSR, 需认证)
|  |  `- projects/
|  |     `- index.astro           # 项目展示 (SSG)
|  |= components/                 # React islands（前端交互 module）
|  |  |= feed/                    #   /feed 专用组件
|  |  |  |- PublishPanel.tsx      #     发布面板 (client:load)
|  |  |  |- Timeline.tsx          #     时间线 (client:load)
|  |  |  |- ClipCard.tsx          #     剪藏卡片
|  |  |  |- NoteCard.tsx          #     碎碎念卡片
|  |  |  |- MediaUploader.tsx     #     媒体上传 + R2 直传
|  |  |  `- LoginPanel.tsx        #     登录面板
|  |  |= home/                    #   Home 专用组件
|  |  |  |- AboutCard.tsx         #     about 卡片 (3D 粒子, client:load)
|  |  |  |- TimelineFeed.tsx      #     混合时间线 (client:load)
|  |  |  `- FilterBar.tsx         #     类型筛选栏 (client:load)
|  |  |= learn/                   #   /learn 专用组件
|  |  |  |- KnowledgeGraph.tsx    #     知识图谱 (client:load)
|  |  |  |- WikiLink.tsx          #     wikilink 悬停预览
|  |  |  `- SidebarTree.tsx       #     侧栏目录树
|  |  |= shared/                  #   跨模块共享组件
|  |  |  |- ArticleFooter.tsx     #     Giscus + 分享按钮
|  |  |  |- ViewCounter.tsx       #     阅读量显示
|  |  |  `- Pagination.astro     #     分页导航
|  |  `- ui/                      #   shadcn/ui 组件（自动生成）
|  |= content/                    # Astro Content Collections
|  |  |- config.ts                #   blog + learn schema 定义
|  |  |= blog/                    #   Markdown 博客文章（不部署到 D1）
|  |  `- learn/                   #   MDX 学习笔记（按 track 分子目录）
|  |= layouts/                    # 页面布局 module
|  |  |- Base.astro               #   全站 layout（导航栏 + footer + seo）
|  |  |- BlogLayout.astro         #   blog 板块 layout
|  |  `- FeedLayout.astro         #   feed 板块 layout
|  |= lib/                        # 纯前端工具（无副作用，纯函数优先）
|  |  |- category.ts              #   分类中文映射
|  |  |- useViewCount.ts          #   阅读量 fetch hook
|  |  `- api-client.ts            #   Worker API 调用封装（fetch 包装）
|  `- styles/
|     `- global.css               # 暖色系 + 排版基线（CSS 变量）
|
|= shared/                        # Seam B - Adapter layer（Workers + Astro 共享）
|  |- types.ts                    #   全站 API 类型（接口契约）
|  |- auth.ts                     #   认证 adapter：bcrypt verify + session + 限流
|  `- cors.ts                     #   CORS adapter：header 常量 + middleware
|
|= workers/                       # Layer 2: CF Workers
|  |= feed-api/                   #   主站 API Worker
|  |  |- wrangler.toml            #     D1: catstarry-db, KV: VIEW_KV + AUTH_KV, R2: media
|  |  |- schema.sql               #     DDL: feed_posts, blog_views, auth_sessions
|  |  `- src/
|  |     |- index.ts              #     入口: fetch → route dispatch
|  |     |= routes/               #     路由 handler（每个文件 = 一个 endpoint group）
|  |     |  |- feed.ts            #       /api/feed (GET/POST), /api/feed/:id (PATCH/DELETE)
|  |     |  |- views.ts           #       /api/views (GET/POST)
|  |     |  |- auth.ts            #       /api/auth/login, /api/auth/logout, /api/auth/session
|  |     |  |- home.ts            #       /api/home (GET) — 5 源聚合
|  |     |  `- learn.ts           #       /api/learn — 笔记草稿发布状态切换
|  |     `- middleware/
|  |        |- cors.ts            #       CORS 头注入
|  |        `- auth.ts            #       Session 验证 → 注入 username
|  |
|  `- finance-api/               #   财务 API Worker（独立）
|     |- wrangler.toml            #     D1: finance-db, KV: FINANCE_AUTH_KV
|     |- schema.sql               #     DDL: trades, holdings_snapshots, market_data, circuit_breaker_log
|     `- src/
|        |- index.ts              #     入口: fetch → route dispatch + Cron handler
|        |= routes/
|        |  |- trades.ts          #       /api/trades (GET/POST)
|        |  |- holdings.ts        #       /api/holdings (GET)
|        |  |- market.ts          #       /api/market (GET)
|        |  |- pe.ts              #       /api/pe (GET)
|        |  `- circuit.ts         #       /api/circuit (GET)
|        |= middleware/
|        |  |- cors.ts
|        |  `- auth.ts            #       角色鉴权 (admin/viewer)
|        `- tasks/
|           |- fetch-prices.ts    #       Cron: 每15分钟拉取行情
|           |- fetch-pe.ts        #       Cron: 每交易日收盘拉取 PE-TTM
|           `- clean-r2.ts        #       Cron: 每小时清理 R2 过期临时文件
|
|- public/                        # 静态资源（不构建）
|  |- robots.txt
|  `- sitemap.xml
|
|- docs/                           # 项目文档（不部署）
|  |= architecture/               #   Phase 3 产出（本组）
|  |= adr/                        #   架构决策记录
|  |= agents/                     #   Agent 协作规范
|  |- acceptance-*.md             #   验收清单（6 份）
|  |- final-requirements-*.json   #   需求 JSON（5 份）
|  |- SITEMAP.md
|  |- DASHBOARD.md
|  `- workflow-orchestration.md
|
|- .scratch/                      # 开发 issue + PRD
|- teach/                         # Teach skill workspace（不部署，仅生成内容）
|- _archive/                      # 历史产物归档
|
|- astro.config.mjs
|- package.json
|- tsconfig.json
|- AGENTS.md
|- CONTEXT.md
|- GLOSSARY.md
`- README.md
```

---

## 3. 模块深度评估

### 3.1 深度模块（Deep Modules）

| Module                           | Interface                                                | Implementation Depth                                             | 为什么深                                                                                                                |
| -------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **shared/auth.ts**               | `verifySession(request, env) → { authenticated, user? }` | bcrypt compare, KV session lookup, D1 fallback, rate-limit check | 4 个 endpoint (login/logout/session/password) 和 2 个 Worker 共用同样的 1 个函数。删除它 = 在每个路由手动重复认证逻辑。 |
| **routes/feed.ts**               | `handleFeed(request, env) → Response`                    | 游标分页 SQL, 帖子的 CRUD, visibility 过滤, media_json 解析      | `GET /api/feed` 的游标分页逻辑（复合游标 + LIMIT）封装在一处，5 个调用点（公开时间线、管理后台、Home 聚合）复用。       |
| **components/MediaUploader.tsx** | `<MediaUploader onComplete={fn} />`                      | 文件选择→类型检测→R2 直传→进度回调→失败重试→HEIC 转换            | 一个组件包裹了上传的全部复杂行为。调用者只需 `onComplete` 拿结果。                                                      |
| **shared/cors.ts**               | `CORS_HEADERS` + `wrapCors(response)`                    | 所有 Worker 路由共享同一份 CORS 配置                             | 10+ 个 endpoint 只需一个常量。新增 endpoint 不重写 CORS。                                                               |

### 3.2 浅模块（Minimal / Pass-through）

| Module                     | 说明                                       | 是否保留                                  |
| -------------------------- | ------------------------------------------ | ----------------------------------------- |
| `routes/views.ts`          | 2 个 endpoint (GET/POST)，直接委托 D1 查询 | ✅ 保留 — endpoint 匹配需要路由分发       |
| `routes/learn.ts`          | /api/learn 目前仅草稿发布状态切换          | ✅ 保留 — Phase 5 可能扩展                |
| `lib/category.ts`          | 3 行映射 `{tech: "技术", ...}`             | ✅ 保留 — 一处定义，多处引用              |
| `layouts/BlogLayout.astro` | 薄包装 `Base.astro` + blog 特定 SEO        | ✅ 保留 — 避免每个 blog 页面重复 `<Base>` |

**删除测试**：拿掉 `layouts/BlogLayout.astro` → 每个 blog 页面要手动写 `<Base>` + SEO head → 复杂度分散到 N 个页面。保留。

---

## 4. Seam 决策

| Seam                                   | 位置                                       | 为什么放这里                                                                         | 替代方案                                          |
| -------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------ | ------------------------------------------------- |
| **Seam A** (Pages ↔ Workers)           | HTTP fetch (`api-client.ts`)               | Workers 和 Astro 运行在不同 runtime（CF Workers vs Node.js build），天然需要网络边界 | ❌ 共享 import：Workers runtime 不支持 Astro 依赖 |
| **Seam B** (Workers ↔ Adapters)        | `shared/` 目录 import                      | Auth 逻辑在两个 Worker 中完全相同，抽到 shared 避免重复                              | ❌ 各自实现：bug 修复要改两处                     |
| **Seam C** (Adapters ↔ Infrastructure) | CF Bindings (`env.DB`, `env.KV`, `env.R2`) | Cloudflare 提供的托管接口，无法也不应替换                                            | —                                                 |

**Seam C 的特殊性**：D1/KV/R2 是 CF 托管服务，不是我们写的代码。`env.DB` / `env.KV` 已经是 CF 提供的 adapter。`shared/auth.ts` 在它们之上做了**第二层 adapter**——业务语义的 adapter（"验证 session"而非"读 KV key"）。

---

## 5. 数据流

### 5.1 Blog 发布流

```
木下 → Markdown → Git push → GitHub Actions
    → astro build
        ├→ SSG: HTML pages → dist/
        └→ blog-metadata.json
    → deploy hook: KV.put("blog-metadata", json)
    → CF Pages deploy (dist/)
```

### 5.2 Feed 发布流

```
木下 → PublishPanel (React)
    ├→ 选文件 → MediaUploader → R2 直传 (presigned URL)
    │   ├→ 上传进度 → 进度条
    │   └→ 完成 → 返回 R2 key 列表
    └→ 输入文字 → 点发布
        → POST /api/feed { type, content, media_json }
        → Worker: feed.ts → D1 INSERT
        → Response 201
    → 前端: 关闭面板, 时间线顶部插入新帖
```

### 5.3 Feed 浏览流（访客）

```
访客 → /feed
    → Astro SSR: index.astro
        → fetch GET /api/feed?limit=20
        → Worker: feed.ts
            → D1: SELECT ... WHERE visibility='public' ... LIMIT 20
            → Response JSON
        → Astro 渲染 Timeline + NoteCard/ClipCard
    → HTML → 浏览器
```

### 5.4 Home 聚合流

```
访客 → /
    → Astro SSR: index.astro
        → fetch GET /api/home
        → Worker: home.ts
            ├→ KV.get("blog-metadata") → blog posts metadata
            ├→ D1: SELECT ... FROM feed_posts WHERE visibility='public' LIMIT 15
            ├→ D1/SQL 中不包括 learn 和 projects（它们走 Astro getCollection）
            └→ 合并 + 按日期排序 → Response JSON
        → 同时: Astro getCollection("learn") + getCollection("projects")
        → 三源合并 → 渲染 AboutCard + TimelineFeed
    → HTML → 浏览器
```

### 5.5 Finance 行情流

```
Cron (每15分钟) → finance-api Worker
    → tasks/fetch-prices.ts
        → fetch a-stock-data API (all held tickers)
        → D1: INSERT INTO market_data
    → 完成

Cron (每交易日 15:30 CST) → finance-api Worker
    → tasks/fetch-pe.ts
        → fetch PE-TTM for SSE 300/500/1000
        → D1: INSERT INTO market_data
    → 完成

木下/cati → f.catstarry.xyz/dashboard
    → Astro SSR
        → fetch /api/holdings + /api/market + /api/pe
        → Worker: 查询 D1 → 计算 P&L, 偏离预警
        → 渲染持仓面板 + PE 温度计
```

### 5.6 R2 上传链路

```
前端 (MediaUploader)
    ├→ Phase 5 选择方式:
    │   A: Worker 代理上传 (前端 → Worker → R2)  ← 推荐，统一鉴权
    │   B: Presigned URL 直传 (前端 → R2)          ← 更快但鉴权分散
    ├→ 文件路径: feed/{YYYY-MM}/{uuid}.{ext}
    └→ 上传完成后: 返回 R2 key 列表 → 存入 media_json
```

**决策**：推荐 A（Worker 代理上传），因为 feed-api Worker 已处理认证，R2 上传也应走同一 session 验证。presigned URL 需要额外的 auth endpoint。

### 5.7 Cron: R2 临时文件清理

```
Cron (每小时) → feed-api Worker
    → tasks/clean-r2.ts (或内联在 feed.ts)
        → 列出 R2 中 feed/ 目录下所有文件
        → 对每个文件:
            → 检查 created_at > 12h?
            → 检查是否在 feed_posts.media_json 中?
            → 未关联 + 过期 → R2.delete(key)
    → 完成
```

---

## 6. 依赖规则

```
shared/                 ← 无外部依赖，纯函数 + 类型
  ↓ import
workers/*/              ← import shared/*, 使用 env.DB/KV/R2
  ↓ HTTP fetch (Seam A)
src/pages/              ← fetch Worker URLs, import shared/types.ts
src/components/         ← import shared/types.ts, fetch Worker URLs
src/lib/                ← 纯前端工具, 可 import shared/types.ts
src/content/            ← 仅被 Astro build 读取
```

**硬规则**：

1. `workers/` 不 import `src/` 下任何文件
2. `src/` 不 import `workers/` 下任何文件（仅通过 HTTP fetch）
3. `shared/` 不 import `workers/` 或 `src/` 下任何文件
4. 各 `src/pages/<module>/` 之间不互相 import 组件（共享组件走 `src/components/shared/`）

---

## 7. 与 Phase 1 原型的差异

| 变更                   | 原 Phase 1        | Phase 3                                     |
| ---------------------- | ----------------- | ------------------------------------------- |
| `shared/`              | 不存在            | 新建 adapter 层 (types + auth + cors)       |
| `src/components/`      | 平铺 2 个文件     | 按模块分子目录 (feed/home/learn/shared/ui)  |
| `src/layouts/`         | 仅 `Base.astro`   | 新增 `BlogLayout.astro`, `FeedLayout.astro` |
| `workers/feed-api/`    | 单文件 `index.ts` | `src/routes/` + `src/middleware/`           |
| `workers/finance-api/` | 不存在            | 完整新建（routes + middleware + tasks）     |
| `src/pages/`           | 仅 blog 有        | 新增 feed/、learn/、projects/、index.astro  |
| `src/content/learn/`   | 不存在            | 新建 MDX 笔记目录                           |

**保留不变**：

- `src/content/blog/`（Markdown 博客）
- `src/content/config.ts`（扩展 learn collection）
- `src/styles/global.css`（暖色系 CSS 变量）
- `src/lib/`（前端工具函数位置不变）

---

## 8. Workers Best Practices 审查

> 对照 `workers-best-practices` skill 规则审查 Phase 3 数据流设计。
> Phase 5 开发实现时再次对照最新 docs 验证。

### 8.1 已遵循的规则

| 规则                        | 设计中的体现                                                                            |
| --------------------------- | --------------------------------------------------------------------------------------- |
| **Bindings over REST**      | Worker 通过 `env.DB`（D1 binding）和 `env.VIEW_KV`（KV binding）访问存储，不走 REST API |
| **Secrets management**      | 密码 hash 存 KV（`wrangler secret put` 初始设置），不在代码/配置中硬编码                |
| **Web Crypto**              | `crypto.randomUUID()` 生成 session token，非 `Math.random()`                            |
| **No global request state** | 路由 handler 函数不依赖模块级变量，session 从 request cookie 读取                       |
| **Cron trigger 独立**       | 行情拉取和 R2 清理通过 `[triggers] crons` 配置，不混入 fetch handler                    |
| **shared/ adapter**         | `shared/auth.ts` + `shared/cors.ts` 提取到独立 module，两个 Worker 共享                 |

### 8.2 需要 Phase 5 执行的规则

| 规则                        | 现状                                                               | Phase 5 行动                                                                                                                 |
| --------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| **compatibility_date 更新** | `workers/feed-api/wrangler.toml` 使用 `2025-07-04`（已过期 >1 年） | Phase 5 更新为当天日期                                                                                                       |
| **nodejs_compat flag**      | `compatibility_flags` 未设置                                       | Phase 5 在 `wrangler.toml` 添加 `compatibility_flags = ["nodejs_compat"]`，bcryptjs 和 bcrypt compare 依赖 Node.js built-ins |
| **wrangler types**          | 当前无 `Env` 类型生成                                              | Phase 5 运行 `wrangler types` 生成 `Env` 接口，替换手写类型                                                                  |
| **wrangler.jsonc**          | 使用 `wrangler.toml`                                               | Phase 5 评估是否迁移到 `.jsonc`。当前 `.toml` 可保留（非新项目），但绑定格式需验证                                           |
| **streaming**               | 当前 API 返回的分页响应（JSON 数组）数据量可控（≤20 条）           | Phase 5 确认不需要 stream。如果 Home 聚合返回大量数据，考虑 streaming                                                        |
| **ctx.waitUntil()**         | 未在设计中使用                                                     | Phase 5 Cron handler 中日志写入应使用 `ctx.waitUntil()`                                                                      |
| **floating promises**       | 设计文档未涉及运行时 Promise 管理                                  | Phase 5 开发时 lint 规则检查                                                                                                 |
| **observability**           | 未配置                                                             | Phase 5 在 `wrangler.toml` 中添加 `observability` 配置段                                                                     |

### 8.3 R2 上传链路裁决

当前设计标注了 A/B 两个选项。基于 workers-best-practices 的 **bindings over REST** 原则：

**推荐 A（Worker 代理上传）**。理由：

- Worker 通过 R2 binding（`env.MEDIA_R2`）直接写对象，不走 REST API
- 认证逻辑统一在 Worker middleware 中，不分散
- Presigned URL（B）需要额外的 auth endpoint 生成签名，增加接口表面积

**Phase 5 实现时**：

```typescript
// workers/feed-api/src/routes/upload.ts
import { verifySession } from "../middleware/auth";

async function handleUpload(request: Request, env: Env): Promise<Response> {
  const session = await verifySession(request, env);
  if (!session.authenticated)
    return new Response("Unauthorized", { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file");
  const key = `feed/${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}.${ext}`;

  await env.MEDIA_R2.put(key, file.stream());
  return Response.json({ key }, { status: 201 });
}
```

### 8.4 D1 查询注意事项

| 注意事项       | 现有设计                                                                                                         |
| -------------- | ---------------------------------------------------------------------------------------------------------------- |
| **游标分页**   | ✅ `GET /api/feed` 使用 `(created_at, id)` 复合游标，不依赖 OFFSET                                               |
| **索引覆盖**   | ✅ `idx_feed_posts_created` 支持游标排序，`idx_feed_posts_visibility` 支持过滤                                   |
| **LIMIT 限制** | ⚠️ 当前设 LIMIT 20 合理，但 `GET /api/me/feed`（管理后台）可能查询全部帖子。Phase 5 添加默认 LIMIT，防止全表扫描 |
| **批量查询**   | ✅ `GET /api/views?slugs=slug1,slug2,...` 支持批量，减少 N+1 问题                                                |

### 8.5 KV 使用注意事项

| 注意事项               | 现有设计                                                                                                                            |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **TTL 设置**           | ✅ session TTL 12h，rate-limit TTL 5min，view dedup TTL 24h                                                                         |
| **blog-metadata 大小** | ⚠️ KV value 上限 25MB。个人博客元数据远小于此，但 Phase 5 确认 JSON 大小                                                            |
| **最终一致性**         | ⚠️ KV 写入 blog-metadata 后在 deploy hook 中执行，读取时 KV 可能还未全局同步（通常 <60s）。可接受——博客更新频率低，延迟一分钟不影响 |
