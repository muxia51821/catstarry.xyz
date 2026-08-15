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
- 主站 D1 / KV / R2 访问。

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

Feed Worker 从合资格公开事件计算 Blog / Feed / Learn / Projects 的 `active / stable / dormant` 最小状态，并发布固定 R2 对象给 Home。Home 不读取 Public Timeline 或 D1。

---

## 4. 主要数据流

### Blog lifecycle

```text
Blog source
   ├─ owner lifecycle action
   └─ successful production deploy sync
            ↓
    runtime published state
            ↓
    Site SSR public routes
            ↓
    first publication footprint（幂等）
```

### Feed publish

```text
Owner Feed UI
   ├─ media → POST /api/feed/upload → R2
   └─ Note / Clip → POST /api/feed → D1 feed_posts
                      ↓ success
                  page reload
                      ↓
                  GET /api/feed
```

### Feed browse

```text
/feed
  → Astro page shell
  → FeedApp island
  → GET /api/feed
  → FeedStore.listPublic(...)
  → feed_posts + public_footprints
  → source visibility filtering
  → React timeline
```

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

### Home activity

```text
public source events / visibility changes
   → Activity Signal Projection
   → R2 activity-signals.json
   → Home StarMap island
```

Scheduled refresh 负责让时间阈值在无新事件时也能自然迁移。

### Finance

```text
Finance Pages
  → same-origin Finance API
  → finance-api Worker
  → finance D1 / auth KV / market providers
```

---

## 5. 边界约束

- Site、Feed Worker、Finance Worker 是独立 runtime / deployment units。
- Site SSR → Feed 使用 Request seam；不要通过 source import 绕过 Worker ownership。
- Browser API 保持同源；server-side transport 与 browser transport 可以不同。
- 主站与 Finance 的认证和数据必须保持隔离。
- Public Timeline 是读取 projection，不是新的持久表。
- Home Activity Signal 是最小静态 projection，不是 Public Timeline 缩略版。
- Blog / Learn public visibility 由 source + runtime lifecycle 共同决定。
- 具体 schema 读 `data-model.md`；认证读 `auth.md`；部署 wiring 读 `DEPLOY.md`。
