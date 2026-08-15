# 代码库架构 (Modules)

> catstarry.xyz 的模块边界、主要 seam、代表性目录与跨层数据流。

目录结构只作定位，不是完整 inventory；具体文件、route 和函数以 current source 为准。

---

## 1. 主 Seam

```text
Layer 1 — Astro Site Worker
  Home / Projects SSG
  Blog / Feed / Learn / owner routes SSR
          │
          │ Request boundary
          ▼
Layer 2 — Cloudflare Workers
  feed-api
  finance-api
          │
          │ adapters / shared contracts
          ▼
Layer 3 — Storage / external services
  D1 / KV / R2 / market providers
```

### Site ↔ Feed Worker

- Astro source 与 Feed Worker source 不直接互相 import。
- Production-like Site SSR 通过 `FEED_API` Service Binding 调用 Feed Worker。
- Local Preview 可以使用 localhost HTTP transport。
- Browser API 请求继续使用同源 `/api/*`。

### Worker ↔ shared contracts

`shared/` 承载跨 runtime 的 contract / utility，例如 session helpers、security、CORS 和 shared types。Feed / Finance 各自的存储逻辑留在拥有它的 Worker 内。

### Worker ↔ infrastructure

D1、KV、R2 和 external provider 都在 Worker boundary 之后。页面组件不直接持有这些 binding。

---

## 2. 代表性目录

```text
catstarry.xyz/
├─ src/
│  ├─ pages/
│  │  ├─ index.astro                 # Home (SSG)
│  │  ├─ blog/                       # public / preview / lifecycle proxy
│  │  ├─ feed/                       # public Feed + owner admin
│  │  ├─ learn/                      # public / preview / admin / lifecycle proxy
│  │  ├─ projects/                   # Projects (SSG)
│  │  └─ sitemap.xml.ts              # runtime public sitemap
│  ├─ components/                    # Astro / React UI by module
│  ├─ content.config.ts              # Content Collection schema
│  ├─ data/
│  │  ├─ blog/                       # Markdown + MDX
│  │  └─ learn/                      # canonical Markdown
│  ├─ lib/server/                    # Site SSR helpers / Feed transport
│  ├─ layouts/
│  ├─ lib/
│  └─ styles/
├─ shared/
│  ├─ types.ts
│  ├─ auth.ts
│  ├─ security.ts
│  └─ cors.ts
├─ workers/
│  ├─ feed-api/
│  │  ├─ migrations/
│  │  └─ src/
│  │     ├─ routes/
│  │     ├─ modules/
│  │     ├─ adapters/
│  │     └─ tasks/
│  └─ finance-api/
│     ├─ migrations/
│     └─ src/
├─ docs/
├─ .scratch/
├─ teach/
├─ astro.config.mjs
├─ wrangler.jsonc
└─ package.json
```

---

## 3. 模块职责

### Astro Site Worker

负责：

- Home / Projects 静态页面；
- Blog / Learn runtime-gated public routes；
- Feed 页面壳与 owner UI；
- Blog / Learn preview、admin 与 lifecycle proxy routes；
- RSS / sitemap 等需要 runtime public projection 的输出。

Site 不直接访问 Feed Worker implementation；server-side API seam 统一走 Feed transport。

### `feed-api` Worker

负责：

- Feed native post / clip CRUD 与媒体；
- Public Timeline projection；
- Public Footprint 写入与读取；
- 主站认证；
- Blog view recording；
- Blog publication lifecycle；
- Learn publication lifecycle / relation validation；
- Home Activity Signal Projection；
- 主站 D1 / KV / R2 访问；
- hourly activity refresh、temporary media cleanup 与 Blog view visitor cleanup。

### `finance-api` Worker

负责 Finance 的认证、交易与资产数据、行情、风险、review / stewardship 和 scheduled market refresh。Finance 使用独立 D1 / KV，不共享主站 session 或 Content lifecycle。

### Public Timeline

`feed_posts` 与 `public_footprints` 是独立写模型。`FeedStore.listPublic(...)` 把二者统一为 `TimelineEntry`，按 `(occurred_at, id)` 排序 / cursor pagination，并应用当前 Blog / Learn source publication projection。

### Learn publication lifecycle

Learn source、runtime publication、Feed historical footprint 与 deployed relation metadata 是不同职责：

- Markdown source 保存 durable knowledge content；
- D1 publication record 保存正常 public / hidden lifecycle；
- first Publish 创建一次 publication identity 和 first footprint；
- revision sync 只处理已有 publication；
- relation metadata 用于公开关系安全检查，不替代内容关系本身。

### Activity Signal Projection

该模块由三层组成：

- `modules/activity-signals.ts`：7 天 / 60 天状态计算与 manifest 组装；
- `adapters/activity-signal-store.ts`：读取最新合资格活动，并向 `HOME_PROJECTIONS` 写完整 `activity-signals.json`；
- `routes/activity-signals.ts`：向 Home 提供只读 GET / HEAD 静态资源接口，并执行 freshness boundary。

`ActivitySignalStore` 的 source eligibility 不是简单“所有 public Footprint”：Blog 还受 published Blog set gate；正常 Learn Note 受 `learn_publications.visibility='public'` gate；legacy `learn_section_completed` 保留兼容资格。Feed state 使用 public native Feed 与合资格 public Footprint 的较新时间。

Home 只读取固定 manifest，不接触上述 D1 query、source eligibility 或时间阈值逻辑。

---

## 4. 主要数据流

### Blog lifecycle

```text
Blog source
   ├─ owner lifecycle action
   │      → published / withdrawn runtime state
   │      → first Publish 可创建 first-production-v1 Footprint
   │
   └─ successful production deploy sync
          → initial baseline: no historical backfill
          → preserve existing owner state
          → eligible never-published source 首次 published 时可创建同一 first Footprint

runtime published set
   → Site SSR Blog routes / RSS / sitemap
```

### Feed publish

```text
Owner Feed UI
   ├─ media → POST /api/feed/upload → MEDIA_BUCKET
   └─ Note / Clip → POST /api/feed → D1 feed_posts
                      ↓ success
                  page reload
                      ↓
                  GET /api/feed
```

发布或 visibility mutation 成功后，Feed Worker 通过 `ctx.waitUntil()` 异步刷新 Activity Signal；投影失败不把已经成功的 Feed mutation 回滚。

### Feed browse

```text
/feed
  → Astro page shell
  → FeedApp island
  → GET /api/feed
  → FeedStore.listPublic(...)
  → feed_posts + public_footprints
  → Blog / Learn source visibility filtering
  → React timeline
```

D1 / Public Timeline 的 canonical ordering 使用 `(occurred_at, id)`；浏览器的 chronology presentation 由 `src/lib/feed-chronology.ts` 固定按 `Asia/Shanghai` 分组并生成 `YYYY / MM.DD / HH:mm` 语义。这个 timezone 是当前实现合同，不是仍待打开的 Product / Architecture Revalidate。

### Feed media upload seam

```text
FeedApp
  → POST /api/feed/upload
  → main-site session check
  → multipart / media signature / size validation
  → MEDIA_BUCKET.put(feed/{YYYY-MM}/{uuid}.{ext})
  → return R2 key
  → POST /api/feed 将 key 写入 feed_posts.media_json
```

浏览器不持有 R2 binding；当前没有 presigned URL / direct browser-to-R2 upload contract。已被 Feed post 引用的媒体不能通过 media delete route 直接删除。

### Learn lifecycle

```text
Learn Markdown
   ├─ owner Publish / Hide / Show
   │      → Feed Worker lifecycle route
   │      → D1 learn_publications
   │      → first publication footprint（仅首次 Publish）
   │
   └─ production deploy sync
          → existing publication revision metadata
          → revision footprint（public revision）
          → relation metadata
```

Site public / preview / admin routes 通过 Feed transport 读取或修改该 lifecycle；Local Preview mutation 保持只读。

### Home Activity Signal

```text
public source event / visibility / publication lifecycle mutation
   → refreshActivitySignals()
   → ActivitySignalStore.readLatestActivity(...)
   → active / stable / dormant
   → HOME_PROJECTIONS.put(activity-signals.json)
   → GET /activity-signals.json
   → Home StarMap island
```

Feed Worker 的 hourly `0 * * * *` scheduled handler 再执行一次全量 refresh，使 7 天 / 60 天阈值在无新事件时也能迁移，并修复此前异步刷新失败。Route 只接受 GET / HEAD；对象缺失返回 404，超过 3 小时内部 freshness boundary 返回 503。Home 不把不可用 projection 映射成 `dormant`。

### Feed hourly maintenance

```text
Cron `0 * * * *`
  → feed-api scheduled handler
      ├─ refreshActivitySignals(env)
      ├─ cleanUnreferencedMedia(env)
      └─ cleanExpiredViewVisitors(env.DB)
```

三个任务通过 `ctx.waitUntil(Promise.all(...))` 进入 Worker lifecycle；每个任务单独记录错误。它们分别维护派生 Activity projection、未引用临时 Feed media 与 Blog view visitor 去重记录。

### Finance request flow

```text
Finance Pages
  → same-origin Finance API
  → finance-api Worker
      ├─ /api/auth/*                → auth
      ├─ /api/trades*               → trades
      ├─ monthly / plan / cash-flow / assets → records
      ├─ risk / memos / rebalance / workbook review → stewardship
      └─ remaining dashboard / market reads → dashboard
  → finance D1 / FINANCE_AUTH_KV
```

### Finance scheduled market flow

```text
Cron `*/15 * * * *` 或 `30 7 * * 1-5`
  → finance-api scheduled handler
  → refreshMarketData(env)
      ├─ configured MARKET_PROVIDER_URL（如存在）
      └─ built-in path
          ├─ Tencent：A 股/ETF、上证指数、支持的 PE-TTM
          ├─ TradingView：NASDAQ-100
          └─ Sina：stale A 股 / 上证报价 fallback
  → market_data + finance_market_indexes
```

Built-in path 从 `holdings_snapshots` 读取当前 active holdings，以决定持仓 ticker 刷新集合。部分 item 缺失时返回 missing list 并记录 warning；整体 refresh 失败时保留上一份有效市场快照，不做 destructive clear。

---

## 5. 边界约束

- Site、Feed Worker、Finance Worker 是独立 runtime / deployment units。
- Site SSR → Feed 使用 Request seam；不要通过 source import 绕过 Worker ownership。
- Browser API 保持同源；server-side transport 与 browser transport 可以不同。
- 主站与 Finance 的认证和数据必须保持隔离。
- Public Timeline 是读取 projection，不是新的持久表。
- Home Activity Signal 是最小静态 projection，不是 Public Timeline 缩略版；其 source query、阈值、freshness 与失败恢复留在 Feed Worker 内。
- Blog / Learn public visibility 由 source + runtime lifecycle 共同决定。
- Feed media 由 Worker 代理访问 R2；浏览器不直接拥有 storage binding。
- Feed hourly maintenance 与 Finance market refresh 都属于 Worker scheduled lifecycle，不应移入页面请求路径。
- 具体 schema 读 `data-model.md`；认证读 `auth.md`；部署 wiring 读 `DEPLOY.md`。
