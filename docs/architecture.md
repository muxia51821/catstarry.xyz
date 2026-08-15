# 架构总览 (Architecture)

> catstarry.xyz 的系统拓扑、主要数据流和 durable technical boundaries。

按任务继续读取：

- schema、存储、Content Collection、API 类型：`docs/architecture/data-model.md`
- module seam、目录结构、Worker route group、scheduled handler：`docs/architecture/modules.md`
- session、cookie、角色和认证：`docs/architecture/auth.md`
- deployment wiring 与 release 操作：`docs/DEPLOY.md`

逐表字段、目录、route implementation 和环境状态以 migrations、current source、tests 与必要的 deployment evidence 为准。

---

## 技术栈映射

| 层 | 选型 | 运行位置 | 用途 |
| --- | --- | --- | --- |
| 前端框架 | Astro hybrid (SSG + SSR) | Cloudflare Site Worker | 主站页面渲染 |
| 交互组件 | React 19 + Astro / 自定义组件 | Astro islands / Site Worker | Home、Feed 与 owner UI |
| 主站 API | `feed-api` Cloudflare Worker | Cloudflare Workers | Feed、auth、views、Blog/Learn lifecycle、Home activity projection |
| Finance API | `finance-api` Cloudflare Worker | Cloudflare Workers | Finance 数据、认证、行情与 scheduled tasks |
| 数据库 | D1 (`catstarry-db`, `finance-db`) | Cloudflare | 主站与 Finance 持久数据 |
| KV | AUTH / VIEW / Finance auth 等 namespaces | Cloudflare | session、去重/限流、publication metadata 等 |
| 文件存储 | R2 | Cloudflare | Feed media、Home activity projection |
| Finance 前端 | Cloudflare Pages | `f.catstarry.xyz` | 内部 Finance workspace |
| Validation / Release | GitHub Actions + explicit PowerShell / wrangler runners | GitHub / operator environment | CI validation、production deploy、deploy-success publication sync |

---

## 系统拓扑

```text
                  catstarry.xyz
             Cloudflare Site Worker
       ┌──────────────────────────────┐
       │ Astro                       │
       │                              │
       │ Home / Projects        SSG   │
       │ Blog / Feed / Learn    SSR   │
       │ owner / preview routes SSR   │
       │ sitemap / RSS          SSR   │
       └──────────────┬───────────────┘
                      │
            FEED_API Service Binding
       (Local Preview 可使用 localhost HTTP)
                      │
       ┌──────────────▼───────────────┐
       │ feed-api Worker              │
       │ Feed / auth / views          │
       │ Blog / Learn lifecycle       │
       │ Public Footprint             │
       │ Home activity projection     │
       └───────┬────────┬────────┬────┘
               │        │        │
              D1       KV       R2


              f.catstarry.xyz
       ┌──────────────────────────────┐
       │ Cloudflare Pages            │
       └──────────────┬───────────────┘
                      │ same-origin API
       ┌──────────────▼───────────────┐
       │ finance-api Worker           │
       │ auth / records / market      │
       │ risk / scheduled refresh     │
       └────────────┬─────────┬───────┘
                    │         │
                   D1        KV
```

Astro Site source 与 Worker source 不直接互相 import。Site SSR 需要主站 API 时通过 `FEED_API` transport 调用 Feed Worker；浏览器继续使用同源 `/api/*`。

---

## 主要数据流

### Blog publication

```text
Blog Markdown / MDX source
        │
        ├─ owner lifecycle action
        │      → runtime lifecycle state
        │      → never-published → published 时创建 first-publication Footprint（幂等）
        │
        └─ successful production deploy sync
               → 首次 lifecycle baseline 只初始化，不回填历史 Footprint
               → 后续同步保留 owner state
               → eligible new published source 如从未发布，可创建同一 first-publication Footprint

runtime published set
        → Site SSR Blog routes / RSS / sitemap
```

Blog source、runtime lifecycle、公开 projection 与 historical Footprint 是不同边界。Owner Publish 与 eligible deploy sync 共享 `first-production-v1` publication identity；首次 baseline 不回填历史 Blog 足迹，Withdraw / Restore 不产生第二条 first-publication Footprint。

### Learn publication

```text
Learn Markdown source
        │
        ├─ owner first Publish
        │      → D1 learn_publications
        │      → first publication footprint
        │
        ├─ owner Hide / Show
        │      → runtime visibility
        │
        └─ successful production deploy sync
               → existing publication revision metadata
               → public revision footprint（如适用）
               → deployed relation metadata
```

Learn first Publish 与 deployment 是不同边界。部署同步不创建新的 publication identity。公开 Learn index、Note、Track、RSS 和 sitemap 由 Markdown source 与 runtime publication state 合成；`withdrawn` direct historical Note route 是兼容例外，不重新进入正常 public corpus。

### Feed / Public Timeline

```text
碎碎念 / 剪藏
    → D1 feed_posts

Blog / Learn / Projects 足迹来源事件
    → D1 public_footprints

feed_posts + public_footprints
    → Public Timeline projection
    → source lifecycle filtering
    → (occurred_at, id) cursor pagination
    → /feed
```

`feed_posts` 与 `public_footprints` 是独立写模型；Public Timeline 只在读取时统一。Blog Footprint 受当前 published Blog set gate；正常 Learn Note Footprint 受 `learn_publications` 的 public set gate；legacy `learn_section_completed` 保持兼容读取。Home 不消费 Public Timeline。

当前 `/feed` 页面由 Astro 输出页面壳，`FeedApp` island 在浏览器读取 `/api/feed` 并渲染时间线。

### Home 星图与 Activity Signal

```text
/ (SSG)
  → Entry / Star Map / Focus / About
  → static destinations
  → browser GET /activity-signals.json
       → blog / feed / learn / projects
       → active / stable / dormant only
```

Home 不请求 `/api/home`，不读取跨模块标题、摘要、列表、数量、精确时间或最近内容。

Activity Signal 的生成链路：

```text
合资格公开事件写入 / 删除 / visibility 或 publication lifecycle 变化
    → Feed Worker refreshActivitySignals()
    → ActivitySignalStore 读取最新合资格公开事件
         ├─ Feed: public feed_posts + 合资格 public_footprints 的较新值
         ├─ Blog: public Footprint + 当前 published Blog source gate
         ├─ Learn: 正常 Note Footprint + learn_publications public gate
         │         （legacy learn_section_completed 保留兼容资格）
         └─ Projects: public Project Footprint
    → 7 天 / 60 天阈值计算 active / stable / dormant
    → 完整替换 HOME_PROJECTIONS/activity-signals.json
    → Home browser 只在 schema/state 全部有效时应用四态

每小时 `0 * * * *`
    → Feed Worker scheduled handler
    → refreshActivitySignals()
    → 即使没有新事件，也让 7 天 / 60 天状态自然迁移
```

来源 mutation 是事实来源，Activity Signal 是派生 projection。异步投影刷新失败不回滚已经成功的来源 mutation；已有完整 R2 对象保持到下一次成功发布。`/activity-signals.json` 缺失时返回不可用；对象超过内部 3 小时 freshness boundary 时返回 503。Home 遇到缺失、过期、请求失败或无效 manifest 时不应用 Activity state，因此隐藏活动卫星而不是误报为 `dormant`。

ADR-007 记录这一静态投影决策；具体 query / storage seam 见 `docs/architecture/modules.md` 与 `docs/architecture/data-model.md`。

### Finance current-state 数据流

```text
f.catstarry.xyz (Cloudflare Pages)
    → same-origin Finance API
    → finance-api Worker
         ├─ auth
         ├─ trades
         ├─ monthly / plan / cash-flow / asset records
         ├─ risk / memo / rebalance / workbook review
         └─ dashboard / market reads
    → finance D1 + FINANCE_AUTH_KV
```

行情刷新是独立 scheduled flow：

```text
Cron: `*/15 * * * *` 或 `30 7 * * 1-5`
    → finance-api scheduled handler
    → refreshMarketData()
         ├─ 如配置 MARKET_PROVIDER_URL：使用受控 HTTPS provider
         └─ 否则使用内置 provider path
              ├─ Tencent：A 股/ETF、上证指数与支持的 PE-TTM
              ├─ TradingView：NASDAQ-100 指数快照
              └─ Sina：疑似 stale A 股 / 上证报价 fallback
    → 读取 active holdings 以确定需要刷新的持仓 ticker
    → 写入 market_data / finance_market_indexes
```

部分 provider 数据缺失时记录 missing items 并保留可用结果；刷新整体失败时不清空既有市场数据，继续保留上一份有效快照。Finance 的业务记录、行情、审计和认证均留在独立 Finance 边界，不进入 Content Family 数据链路。逐表结构见 `docs/architecture/data-model.md`。

### Authentication

主站 owner session 由 Feed Worker 管理，Site SSR owner routes 通过 `FEED_API` transport 验证；浏览器通过同源 auth routes 登录。Finance 使用独立 session storage 与 cookie，不与主站共享认证状态。完整 session / cookie / role 规则见 `docs/architecture/auth.md`。

---

## 架构边界

- 主站 deployment unit 是 Cloudflare Site Worker；Finance frontend 是独立 Cloudflare Pages deployment。
- Site SSR 与 Feed Worker 通过 Request boundary 解耦，不直接 import Worker implementation。
- Blog / Learn source presence 不等于 public visibility；两者的公开 route 都受 runtime publication lifecycle 约束。
- Public Footprint 与原生 Feed 记录分存；Public Timeline 是统一读取 projection。
- Learn Markdown 是 canonical source；runtime publication state 不存 Note 正文；deployed relation metadata 不构成 relation database。
- Home 只消费最小 Activity Signal static projection；projection failure 不改变来源事实，也不恢复跨模块内容聚合。
- 主站与 Finance 保持独立 runtime、数据和认证边界；Finance scheduled market refresh 不属于主站 Content pipeline。
- Durable architecture decisions 由 `docs/adr/` 记录；current implementation details 由对应 architecture child、source 和 tests 负责。
