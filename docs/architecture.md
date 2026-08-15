# 架构总览 (Architecture)

> catstarry.xyz 全站架构总览 — 模块关系图 + 数据流向 + 技术栈映射
> 当前架构事实来源：主站与 Finance Worker 的 current-state 结构、数据流和边界。

## 使用边界

本文件只提供全站架构边界和主要数据流。按任务分支继续阅读：

- schema、存储、Content Collection 或 API 类型任务：读取 `docs/architecture/data-model.md`；逐表结构以 migrations、字段行为以当前查询和 route 实现为准。
- 模块边界、seam、目录定位或 scheduled handler 任务：读取 `docs/architecture/modules.md`；目录和实现以当前文件系统与代码为准。
- session、cookie、角色或认证任务：读取 `docs/architecture/auth.md`；认证行为以当前认证实现为准。

不需要上述分支时，不继续加载子文档。

---

## 技术栈映射

| 层            | 选型                                | 部署              | 用途                                      |
| ------------- | ----------------------------------- | ----------------- | ----------------------------------------- |
| **前端框架**  | Astro (hybrid: SSG + SSR)           | CF Site Worker    | 主站静态与运行时页面渲染                  |
| **交互组件**  | React 19 + shadcn/ui                | 嵌入 Astro island | Feed 发布、管理后台、Home 交互 |
| **API**       | CF Workers (feed-api + finance-api) | wrangler deploy   | 数据读写、认证、Cron 任务                 |
| **数据库**    | D1 (catstarry-db + finance-db)      | CF                | 原生 Feed、公开足迹、Learn publication、交易、阅读量、session |
| **缓存/配置** | KV                                  | CF                | 阅读量去重、认证、生命周期 manifest、Learn relation metadata、限流 |
| **文件存储**  | R2（catstarry-media + home-projections） | CF             | /feed 媒体文件 + Home 最小活动状态静态投影 |
| **CI/CD**     | GitHub Actions + wrangler           | GitHub            | Git push → build → deploy                 |
| **域名**      | catstarry.xyz + f.catstarry.xyz     | CF DNS            | 主站 + 财务子域名                         |

---

## 模块关系图

```
                  catstarry.xyz (Cloudflare Site Worker)
             ┌───────────────────────────────────────────┐
             │                   Astro                   │
             │                                           │
 / (SSG)     │  Home                                     │
 /projects/* │  Projects (SSG)                           │
             │                                           │
 /blog/*     │  Blog public / preview (SSR)              │
 /feed/*     │  Feed public / admin + Blog lifecycle (SSR)│
 /learn/*    │  Learn public / preview / admin (SSR)     │
 sitemap/RSS │  runtime public projections (SSR)         │
             └───────────────────┬───────────────────────┘
                                 │
                    FEED_API Service Binding
              (local preview only: localhost HTTP fallback)
                                 │
             ┌───────────────────▼───────────────────────┐
             │              feed-api Worker              │
             │ /api/feed /api/views /api/auth            │
             │ /api/blog /api/learn /activity-signals    │
             └───────┬──────────────┬──────────────┬─────┘
                     │              │              │
                    D1             KV              R2
              catstarry-db       AUTH/VIEW       media /
              + publications                    projections


                    f.catstarry.xyz (独立 CF Pages)
                    ┌──────────────────────────────────┐
                    │     finance-api Worker           │
                    │  ┌──────────────────────────┐    │
                    │  │ Finance auth / dashboard │    │
                    │  │ records / stewardship    │    │
                    │  │ trades / market refresh  │    │
                    │  │ Cron: refresh-market-data│    │
                    │  └──────┬───────┬───────────┘    │
                    │         │       │                │
                    │  ┌──────▼──┐ ┌──▼──────────┐    │
                    │  │ D1      │ │ KV           │    │
                    │  │finance  │ │FINANCE_AUTH  │    │
                    │  │-db      │ │_KV           │    │
                    │  └─────────┘ └──────────────┘    │
                    └──────────────────────────────────┘
```

---

## 数据流向

### Blog 发布与公开足迹流

```
Blog Markdown / MDX source
    ↓ successful production deploy
受保护 deploy manifest sync
    ↓ 初始化时只建立 lifecycle baseline，不回填历史足迹
    ↓ 之后保留已有 owner lifecycle；新 source 可带入 source state
Blog runtime lifecycle manifest（AUTH_KV）
    ↓ 首次进入 published 且 ever_published=false
    ├─ owner lifecycle action
    └─ eligible deploy sync
Public Footprint Writer
    ↓ first-production-v1（幂等）
D1 public_footprints
```

Blog 的公开页面由 Site Worker SSR 读取 source，再通过 `/api/blog/publications` 的 runtime published projection 过滤。`draft` / `withdrawn` source 不因为存在于 repository 就自动公开。

### Learn runtime 发布与修订流

```
Learn Markdown source
    │
    ├─ Production Admin: first Publish
    │      → D1 learn_publications(public)
    │      + learn_note_published footprint（同一 D1 batch）
    │
    ├─ Production Admin: Hide / Show
    │      → 更新 runtime visibility
    │      → 保留首次 published_at，不创建重复首次发布足迹
    │
    └─ successful production deploy sync v3
           → 只处理已经存在的 publication record
           → public revision: learn_note_revised footprint + last_revised_at
           → hidden revision: 仅更新 revision metadata
           → AUTH_KV learn:relation-manifest（deployed source relation metadata）
```

Learn first Publish 与 deployment 是两个不同边界：deploy sync v3 不创建新的 publication record，也不回填首次发布。公开 `/learn`、Note、Track、RSS 与 sitemap 均从 source Markdown 与 runtime publication state 合成当前公开投影；source `withdrawn` / `superseded` 不进入正常公开 corpus。withdrawn Note 的直接历史 URL 是保留例外。

### Feed 与 Public Footprint 写入流

```
碎碎念 / 剪藏 → POST /api/feed → D1 feed_posts

Blog / Learn / Projects 足迹来源事件
    → 对应 lifecycle / publication / footprint route
    → D1 public_footprints（来源身份与展示快照）

旧 `learn_section_completed` 只保留 legacy readable compatibility；当前 Learn 写入语义是 Note 首次发布与修订事件。

feed_posts + public_footprints
    → GET /api/feed 的 Public Timeline 读取投影
    → /feed
```

### Feed 浏览流（访客）

```
访客 → /feed → Astro SSR 输出 Feed 页面壳
        → FeedApp client:load
        → 浏览器 useEffect 调用 loadPublicTimeline()
        → GET /api/feed
        → Public Timeline 模块 → D1 feed_posts + public_footprints
        → 统一排序、游标分页、当前可见性过滤 → React 渲染时间线
```

这是 current-state documentation，不是 SSR / client 的长期架构裁决。首次时间线数据是否改为 Astro SSR fetch，仍属于 [`docs/content/master-ledger.md`](content/master-ledger.md) 的 `ARCH-REV-007` / Feed Architecture Preflight。

### Home 星图导航流

```
访客 → / → Astro SSG 输出宇宙入口与星图导航壳
                 ↓
          客户端 island：滚动阶段、短推进、About 原地展开
                 ↓
          静态目的地配置：/blog、/feed、/learn、/projects
                 ↓
          仅读取固定静态资源 activity-signals.json
          → Blog / Feed / Learn / Projects 的最小状态

不请求 /api/home，不读取跨模块最新内容；静态资源不含标题、正文、摘要、链接、
时间线、数量、精确时间或访客未读状态。
```

### Home Activity Signal 投影流

```
合资格公开事件写入或可见性变化
    → Activity Signal Projection（feed-api 内部 module）
    → D1 仅查询最新合资格公开事件
    → 计算 blog / feed / learn / projects 的 active / stable / dormant
    → 原子替换 home-projections/activity-signals.json
    → Home StarMap island 读取固定静态资源

每小时校正任务 → 重新计算投影
    （使无新事件的状态也能在 7 天、60 天阈值后自然变化）
```

来源事件仍是事实来源；投影发布失败不得回滚来源事件。保留上一份完整投影并由后续校正任务修复；资源缺失、无效或超过内部新鲜度阈值时，Home 隐藏活动卫星，不得误报为 `dormant`。

### Finance current-state 数据流

```
Finance Cron (*/15 * * * * 或 30 7 * * 1-5)
    → refresh-market-data.ts
    → 可选 MARKET_PROVIDER_URL，或内置 Tencent / TradingView；Sina 作为 A 股报价 fallback
    → market_data 与 finance_market_indexes

Finance 页面
    → finance-api routes
    → holdings / market / pe / risk / review 等读取接口
    → Finance workspace
```

### 认证流

```
未登录用户 → /feed → 页面内登录交互
    ↓ 点击
登录面板 → POST /api/auth/login → bcrypt 验证 → KV session → Set-Cookie
    ↓ 成功后
右下角 →「+」发布按钮出现
12h 后 → session 过期 → KV TTL 自动清除 → 回到未登录状态

Site Worker 的 owner SSR / lifecycle proxy 在 production-like runtime 通过 `FEED_API` Service Binding 调用 Feed Worker；本地 preview 才使用 localhost HTTP fallback。
Finance 使用独立 FINANCE_AUTH_KV 和独立 cookie，不与主站 session 共享。
```

---

## 产出物清单

| 文件                                        | 内容                                                                            | 步骤      |
| ------------------------------------------- | ------------------------------------------------------------------------------- | --------- |
| `docs/architecture/data-model.md`           | D1 schema + KV + R2 + Content Collections + API 类型定义                        | 3.1       |
| `docs/architecture/modules.md`              | 目录结构 + 模块边界 + Workers 路由                                              | 3.2 + 3.3 |
| `docs/architecture/auth.md`                 | /feed + finance 鉴权方案                                                        | 3.4       |
| `docs/adr/001-d1-split.md`                  | 1 个 D1 vs 2 个                                                                 | 3.5       |
| `docs/adr/002-blog-metadata-kv-bridge.md`   | 已被 ADR-006 对其 Home 聚合用途 supersede                                      | 历史      |
| `docs/adr/003-worker-count.md`              | 2 个 Worker vs 多 Worker                                                        | 3.5       |
| `docs/adr/004-feed-visibility-two-state.md` | visibility 两状态 vs 三状态                                                     | 3.5       |
| `docs/adr/005-public-footprint-separate-storage.md` | 原生帖子与 Public Footprint 分存、Public Timeline 统一读取              | accepted |
| `docs/adr/006-retire-home-aggregation-and-kv-bridge.md` | 退役 Home 聚合与 KV bridge                                           | accepted |
| `docs/adr/007-home-activity-signal-static-projection.md` | Home 最小活动状态的静态投影、刷新与降级                        | accepted |
| `docs/architecture.md`                      | 本文件（架构总览）                                                              | 汇总      |
| `DESIGN.md`                                 | 根目录视觉设计系统；目录以文件当前版本为准                                      | 4.1       |

---

## 架构边界

- 主站由 Cloudflare Site Worker 承载 Astro hybrid output；Finance 仍是独立 Pages + Finance Worker，不把两者混为同一 deployment unit。
- Site Worker 的 server-side owner/publication 读取通过 `FEED_API` Service Binding 调用 Feed Worker；本地 preview 允许 localhost HTTP fallback。Astro source 与 Worker source 仍不直接互相 import。
- Blog 与 Learn 的公开页面都是 runtime-gated SSR；source 文件存在不等于当前公开。
- Learn Markdown 是 canonical source；D1 `learn_publications` 是正常公开可见性与发布时间的 runtime authority；KV `learn:relation-manifest` 只是已部署 source relation metadata，不是 relation database。
- Learn first Publish 是 owner runtime lifecycle action；successful deploy sync v3 只负责已发布 Note 的 revision metadata / revision footprint 与 relation manifest，不承担首次发布。
- Home 只读取 `activity-signals.json`，不读取 Public Timeline，也不恢复 `/api/home` 或已退役的 `blog-metadata` KV bridge。
- `feed_posts` 与 `public_footprints` 是两个独立写模型；`Public Timeline` 只在读取时统一排序和分页。
- Finance 使用独立 Worker、D1、认证 KV 和页面，不进入公开主站内容链路。
- 双 D1、双 Worker、Feed 两态可见性、Home 静态活动投影和 Learn Markdown canonical source 分别由 ADR-001、003、004、007、008 约束。
