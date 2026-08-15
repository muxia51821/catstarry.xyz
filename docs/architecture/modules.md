# 代码库架构 (Modules)

> catstarry.xyz 模块设计 — Seam 分析 + 深度评估 + 数据流
> 当前模块、seam、route group 和 scheduled handler 的架构事实。
> 遵循 codebase-design skill 的 deep module 框架

本文件按需读取：在处理模块边界、seam、route group、scheduled handler 或代码定位任务时进入。目录结构仅作代表性导航，不是完整 inventory；当前文件系统与代码是事实来源。

---

## 1. Seam 总览

全站 3 条主缝（tier-spanning seams），将系统切分为 4 层：

```
┌────────────────────────────────────────────┐
│  Layer 1: Astro Site Worker (src/)          │  Request → HTML / response
│  - SSG: Home / Projects 等构建时闭包        │
│  - SSR: Blog / Feed / Learn / owner routes │
├────────────────────────────────────────────┤ ← Seam A: Request boundary
│  Layer 2: CF Workers (workers/*/)           │  Request → JSON / bytes
│  - feed-api: Feed / auth / views / Blog + Learn lifecycle / projection API │
│  - finance-api: Finance auth / records / trades / dashboard API            │
│  - Site SSR → Feed: FEED_API Service Binding；local preview → localhost HTTP │
├────────────────────────────────────────────┤ ← Seam B: CF Bindings / shared contracts
│  Layer 3: Adapters (shared/ + Worker-local) │  函数调用 → 副作用
│  - shared/auth.ts: session token / session lookup / role helper             │
│  - shared/cors.ts: CORS adapter             │
│  - feed-store / activity-signal-store       │
│  - shared/types.ts: 类型（无实现）          │
├────────────────────────────────────────────┤ ← Seam C: Data (SQL/KV/R2/HTTP)
│  Layer 4: Infrastructure                    │  rows / bytes / provider responses
│  - D1 (catstarry-db + finance-db)           │
│  - KV (VIEW_KV / AUTH_KV / FINANCE_AUTH_KV) │
│  - R2（catstarry-media + home-projections） │
│  - external market providers (optional configured provider + built-in fallbacks) │
└────────────────────────────────────────────┘
```

**Seam 规则**：

- Astro 与 Feed Worker 不直接互相 import source。Production-like Site SSR 通过 `FEED_API` Service Binding 发送 Request；本地 preview 才允许 localhost HTTP fallback；浏览器 API 调用继续使用同源 HTTP route。
- Feed 的复杂 D1/R2 操作封装在 `feed-store` 与 `activity-signal-store`；Finance 当前 route/module 直接通过 `env.DB` 访问 finance-db，`shared/` 只承载跨 Worker 的 auth、CORS、security utility 和类型。
- Seam C 之下是 Cloudflare 托管基础设施或外部 provider，不把 D1/KV/R2 的绑定细节泄漏到页面层。

---

## 2. 目录结构

```
catstarry.xyz/
|= src/                           # Layer 1: Astro Site Worker source
|  |= pages/                      # 路由（文件系统路由 = interface）
|  |  |- index.astro              # Home (SSG) — 宇宙入口与星图导航
|  |  |- sitemap.xml.ts           # public sitemap (SSR, runtime publication projection)
|  |  |= blog/                    # 博客板块
|  |  |  |- index.astro           #   列表页 (SSR, runtime published projection)
|  |  |  |- [...slug].astro       #   详情 / pagination (SSR)
|  |  |  |- category/[...category].astro # 分类页 (SSR)
|  |  |  |- tag/[...tag].astro    #   标签页 (SSR)
|  |  |  |- rss.xml.ts            #   Blog + Learn RSS 2.0 (SSR)
|  |  |  |- preview/[slug].astro  #   Blog owner preview (SSR)
|  |  |  `- admin/lifecycle.ts    #   Site → Feed Blog lifecycle proxy (SSR route)
|  |  |= feed/                    # 碎碎念板块
|  |  |  |- index.astro           #   时间线 (SSR)
|  |  |  `- admin.astro           #   Feed / Blog 管理后台 (SSR, 需认证)
|  |  |= learn/                   # 学习笔记板块
|  |  |  |- index.astro           #   Knowledge Map / public notes (SSR)
|  |  |  |- notes/[slug].astro    #   笔记详情 (SSR, runtime gated)
|  |  |  |- preview/[slug].astro  #   owner 预览 (SSR)
|  |  |  |- track/[track].astro   #   Track 页 (SSR, runtime gated)
|  |  |  |- admin.astro           #   lifecycle 管理 (SSR, 需认证)
|  |  |  `- admin/lifecycle.ts    #   Site → Feed Learn lifecycle proxy (SSR route)
|  |  `- projects/
|  |     `- index.astro           # 项目展示 (SSG)
|  |= components/                 # React islands / Astro UI components
|  |  |= blog/、feed/、home/、learn/、projects/ # 按板块分组
|  |  `- 根目录共享组件与样式入口              # 具体文件以当前目录为准
|  |= content.config.ts           # Astro Content Collections schema
|  |= data/                       # Content Collection source
|  |  |= blog/                    #   Blog：Markdown + MDX
|  |  `- learn/                   #   Learn：canonical Markdown
|  |= lib/server/                 # Site SSR server helpers / Feed transport
|  |= layouts/、lib/、styles/      # 布局、工具与样式入口
|
|= shared/                        # Workers + Astro 共享 contracts / utility
|  |- types.ts                    #   全站 API 类型（接口契约）
|  |- auth.ts                     #   session token 解析、主站/Finance session lookup、role helper
|  |- security.ts                 #   timing-safe 等跨 runtime 安全工具
|  `- cors.ts                     #   CORS adapter：header 常量 + middleware
|
|= workers/                       # Layer 2: CF Workers
|  |= feed-api/                   #   主站 API Worker
|  |  |- wrangler.jsonc           #     D1, VIEW_KV, AUTH_KV, MEDIA_BUCKET, HOME_PROJECTIONS
|  |  |- migrations/              #     feed_posts, public_footprints, views, sessions, learn_publications 等
|  |  `- src/
|  |     |- index.ts              #     入口: fetch → route dispatch
|  |     |- routes/               #     feed、views、auth、blog、learn、upload、activity-signals
|  |     |- modules/              #     activity-signals、footprints、passwords
|  |     |- adapters/             #     feed-store、activity-signal-store
|  |     `- tasks/                #     scheduled cleanup
|  |
|  `- finance-api/                #   财务 API Worker（独立）
|     |- wrangler.jsonc           #     D1: finance-db, KV: FINANCE_AUTH_KV, Cron
|     |- migrations/              #     Finance current schema and audit tables
|     `- src/                     #     index、routes、modules、tasks；具体文件以当前目录为准
|
|= docs/                          # current docs；tracked historical evidence 在 docs/_archive/
|= .scratch/                      # 开发 issue + PRD
|= teach/                         # Teach skill workspace（不部署，仅生成内容）
|= _archive/                      # 本地 ignored scratch；不是 tracked governance archive
|
|- astro.config.mjs
|- wrangler.jsonc                 # Site Worker staging config + FEED_API binding
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
| **shared/auth.ts**               | `getMainSiteSession` / `getFinanceSession` | 主站 KV 优先、D1 session fallback；Finance 独立 KV；cookie token 与 role 校验 | 两个 Worker 共用 session token 解析和状态类型，但使用不同的存储边界。 |
| **Public Timeline 模块**         | `FeedStore.listPublic(...) → PaginatedResponse<TimelineEntry>` | `feed_posts` 与 `public_footprints` 读取、统一排序、游标分页，并接收当前 Blog published / Learn public source set 做来源 lifecycle 过滤 | 页面只学习统一的 `TimelineEntry` 读取结果；原生 Feed 与 Public Footprint 的写模型差异留在 store 内部。 |
| **Public Footprint Writer**      | `recordFootprint(candidate) → { created, footprint }` | 幂等键、快照固化、来源／版本校验、独立可见性；Learn Note 发布／修订事件与旧小节完成事件兼容读取 | 三个来源模块复用同一写入语义；删除它会让 Blog、Learn、Projects 各自实现去重和快照。 |
| **Learn publication lifecycle** | `/api/learn/publications` + owner admin + internal sync | D1 runtime publication state、首次发布原子足迹、Hide/Show、revision sync v3、relation validation / manifest | source Markdown、公开投影、owner lifecycle 与 deploy metadata 是不同边界，需要在一个 route group 中维持不变量。 |
| **Activity Signal Projection**  | `refreshActivitySignals(env)` | 四源公开资格筛选、7/60 天状态计算、完整对象发布和失败保留 | Home 只读取固定 Manifest；四源查询、阈值与恢复留在 feed-api 内部。 |
| **Feed media upload route**      | `POST /api/feed/upload` | 主站 session、multipart 校验、媒体签名校验、R2 临时对象写入 | Feed 发布组件只获得 R2 key；不直接接触 R2 binding。 |
| **shared/cors.ts**               | `rejectUntrustedStateChange` + `withCors` | 两个 Worker 统一处理 CORS 和 state-changing Origin 检查 | 路由不各自重复安全响应头与来源校验。 |

### 3.2 浅模块（Minimal / Pass-through）

| Module                     | 说明                                       | 是否保留                                  |
| -------------------------- | ------------------------------------------ | ----------------------------------------- |
| `routes/views.ts`          | Blog view 读取、访问者去重和 D1 查询 | ✅ 保留 — route group 仍为主站公开 API 的 seam |
| `lib/category.ts`          | 3 行映射 `{tech: "技术", ...}`             | ✅ 保留 — 一处定义，多处引用              |
| `layouts/FeedLayout.astro` | Feed 页面共享 `Base.astro` 与 Feed 级布局 | ✅ 当前使用 |

---

## 4. Seam 决策

| Seam                                   | 位置                                       | 为什么放这里                                                                         | 替代方案                                          |
| -------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------ | ------------------------------------------------- |
| **Seam A** (Site ↔ Feed Worker)        | Request boundary：Service Binding / localhost HTTP / browser same-origin HTTP | Site SSR 与 Feed API 保持独立 deployment/runtime ownership，同时 production-like server request 不绕公网调用自身域名 | ❌ source import：把 Worker implementation 耦合进 Astro source |
| **Seam B** (Workers ↔ shared / adapters) | `shared/` contracts + Worker-local adapters | Auth/security/types 可跨 runtime共享；存储细节留在拥有它的 Worker 内 | ❌ 各 route 重复实现：修复和 contract 易漂移 |
| **Seam C** (Adapters ↔ Infrastructure) | CF Bindings (`env.DB`, `env.*_KV`, `env.*_BUCKET`) | Cloudflare 提供的托管接口，无法也不应替换                         | — |

**Seam C 的特殊性**：D1/KV/R2 是 CF 托管服务，不是我们写的代码。`env.DB` / `env.KV` 已经是 CF 提供的 adapter。`shared/auth.ts` 在它们之上做了**第二层 adapter**——业务语义的 adapter（"验证 session"而非"读 KV key"）。

---

## 5. 数据流

### 5.1 Blog 发布与公开足迹流

```
木下 → Blog Markdown / MDX source → successful production deploy
    → protected deploy manifest sync
        → 第一次初始化只建立 lifecycle baseline，created=0
        → 后续保留已有 owner lifecycle
        → 新 source 首次处于 published 且 never-published 时可创建 first-production-v1

owner Feed/Blog 管理
    → PATCH Blog lifecycle to published / withdrawn
    → never-published → published 时也可创建同一幂等 first-production-v1

runtime published manifest
    → Site Worker SSR 过滤 Blog public routes / RSS / sitemap
```

Blog first publication 可以来自合资格 deploy sync 或 owner lifecycle transition；两条路径共享同一 `blog:{slug}:first-production-v1` 幂等身份。

### 5.2 Feed 发布流

```
木下 → FeedApp (React island)
    ├→ 选文件 → FeedApp → POST /api/feed/upload → feed-api 写入 R2
    │   ├→ 上传进度 → 进度条
    │   └→ 完成 → 返回 R2 key 列表
    └→ 输入文字 → 点发布
        → POST /api/feed { type, content, media_keys }
        → Worker: feed.ts → D1 INSERT
        → Response 201
    → 前端: 关闭面板, 时间线顶部插入新帖
```

### 5.3 Feed 浏览流（访客）

```
访客 → /feed
    → Astro SSR: index.astro 输出 FeedLayout + FeedApp island 页面壳
    → HTML → 浏览器
    → FeedApp client:load
        → useEffect 调用 loadPublicTimeline()
        → GET /api/feed?limit=20
        → Worker: Public Timeline 模块
            → D1: feed_posts + public_footprints
            → 统一排序、复合游标与当前 public projection 过滤
            → Response JSON
        → React 渲染 Timeline + 原生 Feed / Public Footprint current UI
```

以上只描述 current implementation。首次数据继续 client load 还是迁到 Astro SSR，仍是 Feed Architecture Preflight 的 `ARCH-REV-007`，本文件不在此裁决。

### 5.4 Home 星图导航流

```
访客 → /
    → Astro SSG: index.astro 输出宇宙入口、星图目的地与 SEO
    → 浏览器：StarMap island 读取固定静态活动投影
        → 只取得 blog / feed / learn / projects 的三态
    → StarMap island 处理滚动阶段、短推进、About 原地展开
    → 点击 Blog / Feed / Learn / Projects → 对应功能页面

不调用 `/api/home` 或 Public Timeline，不读取或聚合内容数据。
```

### 5.5 Home Activity Signal 投影流

```
合资格公开事件写入、删除或可见性变化
    → Activity Signal Projection
        → D1 adapter：只读取最新合资格公开事件
        → 状态计算：active / stable / dormant
        → Static Projection Publisher：原子替换 home-projections/activity-signals.json

每小时 Cron
    → feed-api scheduled handler → refreshActivitySignals()
    → 重算全部四颗功能星球
```

**模块接口与边界**：调用方只知道“刷新投影”或“读取固定静态资源”；不得让 Home、Astro 页面或 StarMap 了解 `feed_posts`、`public_footprints`、Public Timeline、事件时间或查询逻辑。资源缺失或无效时，StarMap 隐藏活动卫星而非推断 `dormant`。

### 5.6 Finance 行情流

```
Cron (每15分钟) → finance-api Worker
    → tasks/refresh-market-data.ts
        → configured provider, or built-in Tencent / TradingView with Sina A-share fallback
        → D1: market_data + finance_market_indexes
    → 完成

同一 scheduled handler 也处理交易日 30 7 * * 1-5 的刷新
    → Tencent PE-TTM records for supported indexes
    → D1: market_data
    → 完成

木下/cati → f.catstarry.xyz
    → Finance workspace static shell
        → fetch finance-api dashboard / records / stewardship routes
        → Worker: 查询 finance-db → 返回持仓、行情、复盘与风险数据
```

### 5.7 R2 上传链路

```
FeedApp
    → POST /api/feed/upload（主站 session + multipart）
    → feed-api 校验媒体类型、签名和大小
    → MEDIA_BUCKET.put(feed/{YYYY-MM}/{uuid}.{ext})
    → 返回 R2 key
    → POST /api/feed 时写入 feed_posts.media_json
```

媒体上传由 Worker 代理完成；当前不存在 presigned URL 直传 seam。

### 5.8 Cron: Feed 临时媒体与阅读者去重清理

```
Cron (每小时) → feed-api Worker
    ├→ tasks/clean-media.ts → 清理未被 feed_posts 引用的临时媒体
    └→ tasks/clean-view-visitors.ts → 清理阅读量去重记录
```

### 5.9 Learn runtime publication / revision

```
Public request → Site Worker SSR
    → getCollection('learn') 读取 Markdown source
    → FEED_API Service Binding → GET /api/learn/publications
    → D1 learn_publications(public)
    → source + runtime state 合成当前 public corpus

Owner Admin → PATCH /learn/admin/lifecycle
    → Site proxy → PATCH /api/learn/admin/publications
    → first Publish: D1 publication + first footprint
    → Hide / Show: visibility only, no duplicate first footprint

successful production deploy
    → learn sync schema v3
    → existing publications only: revision metadata / public revision footprint
    → AUTH_KV learn:relation-manifest
```

Production runtime 的 Owner Admin 是正式 publication authority；Local Preview 可以读取 owner state 和预览内容，但 lifecycle mutation 明确只读。`learn:relation-manifest` 表达已部署 source 的 Note relation metadata，用于 owner lifecycle mutation 前验证当前 public relation set；它不是 relation database。

---

## 6. 依赖规则

```
shared/                 ← 无业务 runtime ownership；跨层 contracts / utility
  ↓ import
workers/*/              ← import shared/*, 使用 env.DB/KV/R2

src/lib/server/         ← import shared/types.ts；通过 FEED_API binding 发 Request
src/pages/ SSR          ← 调用 server helpers / render source
browser components      ← same-origin HTTP APIs
src/content.config.ts   ← collection schema
src/data/blog/          ← Blog source (Markdown + MDX)
src/data/learn/         ← Learn canonical Markdown source
```

**硬规则**：

1. `workers/` 不 import `src/` 下任何文件。
2. `src/` 不 import `workers/` 下任何 implementation；Site ↔ Feed 通过 Request contract 通信。
3. Production-like Site SSR 优先使用 `FEED_API` Service Binding；localhost HTTP fallback 只服务本地 preview。
4. `shared/` 不 import `workers/` 或 `src/` 下任何文件。
5. 页面组件按当前 `src/components/<module>/` seam 组织；根目录组件只承载跨页面共享能力。

---

## 7. Current-state module boundaries

| Boundary | Current-state seam |
| --- | --- |
| Site / pages | Cloudflare Site Worker owns Astro hybrid output；`src/pages/` owns routes，server helpers own Feed transport。 |
| Pages / components | `src/components/feed`, `home`, `learn`, `projects` own module UI；Blog uses Astro components plus shared article components. |
| Content | `src/content.config.ts` owns schema; `src/data/blog` accepts Markdown/MDX and `src/data/learn` accepts Markdown. |
| Main Worker | `workers/feed-api/src/routes`, `modules`, `adapters`, `tasks` own HTTP contracts, lifecycle seams, storage adapters and scheduled cleanup. |
| Finance Worker | `workers/finance-api/src/routes`, `modules`, `tasks` own the private workspace API and market refresh. |
| Infrastructure | `wrangler.jsonc`, migrations and generated Site Worker config define bindings/schema contracts; no route-count inventory is maintained here. |

---

## 8. Runtime constraints

本节只记录已在 current implementation 中得到支持的 seam 约束，不维护未来 Phase 施工清单。

### 8.1 已遵循的规则

| 规则                        | 设计中的体现                                                                            |
| --------------------------- | --------------------------------------------------------------------------------------- |
| **Bindings over public REST** | Site SSR → Feed 使用 `FEED_API` Service Binding；Workers 通过 `env.DB` / KV / R2 bindings 访问存储 |
| **Credential storage**      | 用户记录（含 bcrypt hash）写入 `AUTH_KV` / `FINANCE_AUTH_KV`；`wrangler secret put` 仅用于 Worker Secret，不等同于 KV 用户记录配置 |
| **Web Crypto**              | `crypto.randomUUID()` 生成 session token，非 `Math.random()`                            |
| **No global request state** | 路由 handler 函数不依赖模块级 request state，session 从 request cookie 读取              |
| **Cron trigger 独立**       | 行情拉取和 R2 清理通过 `[triggers] crons` 配置，不混入 fetch handler                    |
| **shared utility**          | `shared/auth.ts` + `shared/cors.ts` + security/types 供明确跨 runtime contract 复用      |

### 8.2 Current runtime facts

| 事实 | 当前实现 |
| --- | --- |
| Site Worker | Astro Cloudflare adapter 生成 Site Worker；versioned `wrangler.jsonc` 提供 staging `FEED_API` Service Binding，production deploy runner 将 generated binding target 指向 production Feed Worker。 |
| Worker config | Feed / Finance Worker 使用各自 `wrangler.jsonc`；Feed hourly Cron，Finance 使用 `*/15 * * * *` 与 `30 7 * * 1-5`。 |
| Learn publication | repository migration `0004_learn_publications.sql` 定义 runtime publication table；是否已应用到某个 production D1 必须按部署证据现场核验。 |
| Activity projection | `activity-signals` module、`activity-signal-store` adapter 和 scheduled handler 已存在。 |
| Promise lifecycle | 两个 API Worker 的 scheduled handler 使用 `ctx.waitUntil()` 包裹刷新和清理任务。 |
| Pagination | Feed public/admin list 使用 bounded limit 与 cursor；文档不硬编码 endpoint 数量。 |
| Home boundary | Home 只读取固定 activity projection，不调用 `/api/home` 或 Public Timeline。 |

### 8.3 R2 upload boundary

Feed media uses the current `POST /api/feed/upload` route. The Worker validates the
main-site session and media signature before writing `MEDIA_BUCKET`; no presigned
URL or direct browser-to-R2 contract is part of the current architecture.

### 8.4 D1 查询注意事项

| 注意事项       | 现有设计                                                                                                         |
| -------------- | ---------------------------------------------------------------------------------------------------------------- |
| **游标分页**   | ✅ `GET /api/feed` 以统一时间线的 `(occurred_at, id)` 复合游标分页，不依赖 OFFSET                                  |
| **索引覆盖**   | ✅ `feed_posts` 使用公开列表索引；`public_footprints` 使用 visibility / occurred_at 索引；`learn_publications` 使用 visibility / published_at 索引。 |
| **LIMIT 限制** | ✅ Public and admin Feed list routes parse bounded limits and cursor pagination. |
| **视图去重**   | ✅ `/api/views` uses `blog_view_visitors` plus a daily KV dedup key. |

### 8.5 KV 使用注意事项

| 注意事项               | 现有设计                                                                                                                            |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **TTL 设置**           | ✅ main session 12h；login rate-limit 5min；view dedup 24h；view-record rate-limit key 120s |
| **Blog lifecycle**     | `blog:lifecycle-manifest:v1` / `blog:published-manifest` 由 Feed Worker 管理当前 Blog runtime projection。 |
| **Learn relations**    | `learn:relation-manifest` 保存 deployed source relation metadata，无 TTL；它不是 publication state 或 relation database。 |
| **blog-metadata**      | 已退役。ADR-006 删除其 Home KV bridge，不再评估大小或最终一致性。                                                                        |
| **认证 session**       | ✅ 主站 KV + D1 fallback；Finance uses independent `FINANCE_AUTH_KV`. |
