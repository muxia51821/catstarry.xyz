# 数据模型 (Data Model)

> catstarry.xyz 全站数据结构定义 — D1 schema + KV namespace + Content Collection schema + API 类型定义。

本文件描述当前概念模型与关键不变量；逐表字段和索引以 migrations、当前查询与 route 实现为准。

---

## 架构决策：数据库拆分

| 数据库 | D1 Binding | 用途 |
| --- | --- | --- |
| `catstarry-db` | `env.DB`（主站 Worker） | Feed、Public Footprint、Learn publication、Blog views、主站 session |
| `finance-db` | `env.DB`（Finance Worker） | Finance 交易、资产、行情、风险与审计数据 |

财务数据保持独立数据库（ADR-001）。Home 页面不直接访问主站 D1；Home Activity Signal 由 Feed Worker 内部 projection module 计算后发布为静态资源。

---

## 1. 主站 D1 — `catstarry-db`

### 1.1 `feed_posts`

Feed 原生 Note / Clip 写模型。

```sql
CREATE TABLE IF NOT EXISTS feed_posts (
  id         TEXT PRIMARY KEY,
  type       TEXT NOT NULL CHECK(type IN ('note','clip')),
  content    TEXT,
  media_json TEXT,
  link_url   TEXT,
  link_title TEXT,
  link_summary TEXT,
  link_image TEXT,
  visibility TEXT NOT NULL DEFAULT 'public' CHECK(visibility IN ('public','private')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

| 字段 | 说明 |
| --- | --- |
| `id` | UUID；当前由 `crypto.randomUUID()` 生成。排序不依赖 UUID 时间语义 |
| `type` | `note` / `clip` |
| `content` | Note / Clip 的个人内容，可为空 |
| `media_json` | Feed R2 keys 的 JSON array |
| `link_*` | Clip 外部对象 metadata |
| `visibility` | `public` / `private` |
| `created_at` / `updated_at` | ISO 8601 timestamps |

主要索引：

```sql
CREATE INDEX idx_feed_posts_created ON feed_posts(created_at DESC);
CREATE INDEX idx_feed_posts_visibility ON feed_posts(visibility);
CREATE INDEX idx_feed_posts_type ON feed_posts(type);
CREATE INDEX idx_feed_posts_public_timeline
  ON feed_posts(visibility, created_at DESC, id DESC);
CREATE INDEX idx_feed_posts_type_timeline
  ON feed_posts(type, created_at DESC, id DESC);
```

`GET /api/feed` 不是 `feed_posts` 单表查询；Public Timeline 见 1.3。

### 1.2 `public_footprints`

Public Footprint 独立写模型。它记录 Blog 首次发布、Learn Note 首次发布 / 修订、Projects meaningful update，并兼容读取历史 Learn completion event；原生 Note / Clip 不写入本表。

```sql
CREATE TABLE IF NOT EXISTS public_footprints (
  id              TEXT PRIMARY KEY,
  source_module   TEXT NOT NULL CHECK(source_module IN ('blog','learn','projects')),
  source_ref      TEXT NOT NULL,
  source_version  TEXT NOT NULL,
  event_type      TEXT NOT NULL CHECK(event_type IN ('blog_published','learn_section_completed','learn_note_published','learn_note_revised','project_updated')),
  snapshot_json   TEXT NOT NULL,
  occurred_at     TEXT NOT NULL,
  visibility      TEXT NOT NULL DEFAULT 'public' CHECK(visibility IN ('public','private')),
  idempotency_key TEXT NOT NULL UNIQUE,
  created_at      TEXT NOT NULL
);

CREATE INDEX idx_public_footprints_public ON public_footprints(visibility, occurred_at DESC, id DESC);
CREATE INDEX idx_public_footprints_source ON public_footprints(source_module, source_ref, source_version);
```

| 字段 | 说明 |
| --- | --- |
| `source_ref` | 来源稳定标识：Blog slug、Learn Note slug、Projects project id；legacy Learn row 可保留旧 section reference |
| `source_version` | 本次公开事件的明确版本身份 |
| `snapshot_json` | event-time 展示快照；普通来源编辑不改写 |
| `idempotency_key` | 同一公开事件只写一次 |
| `visibility` | Footprint 自身 public / private；不向来源传播 |

| 来源 | `source_version` | `idempotency_key` |
| --- | --- | --- |
| Blog | `first-production-v1` | `blog:{slug}:first-production-v1` |
| Learn | first publication `first-production-v1`；revision `r:{timestamp}`；legacy row 保留旧 identity | `learn:{slug}:{source_version}` |
| Projects | source-defined `update_id` | `projects:{project_id}:{update_id}` |

Projects Footprint 的 canonical destination 是 `/projects/`；Project Card 本身继续使用 external `project.url`。

Blog collection 的可选 `publication_id` 目前不参与 publication identity；current sync 使用 `first-production-v1`。

**生命周期不变量**：

- event-time snapshot 与 source 后续普通编辑解耦；
- source hide / delete 不级联删除 Footprint record；
- Footprint 自身 visibility 可以独立变化；
- storage independence 不等于 public projection independence；
- Blog Footprint 只有 source 当前处于 published projection 时进入 Public Timeline；
- 正常 Learn Note Footprint 只有 source 当前位于 runtime public publication set 时进入 Public Timeline；
- legacy `learn_section_completed` 保持 readable compatibility；
- source 恢复公开时复用既有 Footprint，不创建 duplicate first-publication record。

Dead-destination / tombstone 的 UI 行为不由本数据模型定义；读取 projection 必须继续遵守对应 Product / Architecture contract。

### 1.3 Public Timeline 读取投影

`feed_posts` 与 `public_footprints` 不合并为持久写表。`FeedStore.listPublic(...)` 将二者统一为 `TimelineEntry`，按 `(occurred_at, id)` 排序和 cursor pagination，并应用 Blog / Learn 当前 publication projection。

内部 `TimelineEntry.kind` 仍使用 `system_footprint` 作为 code discriminator；项目共享术语是 `Public Footprint`。

### 1.4 Home Activity Signal 静态投影

Home Activity Signal 不是 D1 表、不是 Public Timeline 的缩略响应，也不是 `/api/home`。它由 `Activity Signal Projection` 计算并发布为固定静态对象。

```json
{
  "schema_version": 1,
  "signals": {
    "blog": { "state": "active" },
    "feed": { "state": "stable" },
    "learn": { "state": "dormant" },
    "projects": { "state": "active" }
  }
}
```

| 规则 | 约束 |
| --- | --- |
| 允许字段 | `schema_version` + 四个 module 的 `state` |
| 状态 | `active`（≤7 天）、`stable`（>7 且≤60 天）、`dormant`（>60 天或无公开活动） |
| 来源 | Blog / Learn / Projects 使用最新公开 Footprint；Feed 使用公开 native / Footprint 中较新者 |
| About | 不进入 projection |
| 禁止 | 内容、标题、摘要、链接、精确时间、数量、unread/read |
| unavailable | Home 隐藏信号卫星，不映射成 `dormant` |

Projection 在相关公开事件 / visibility 变化后刷新，并由 hourly scheduled refresh 覆盖时间阈值自然迁移。

### 1.5 `blog_views`

按 slug / date 聚合 Blog view count；当前计数由 `blog_view_visitors` INSERT trigger 驱动。

```sql
CREATE TABLE IF NOT EXISTS blog_views (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  slug      TEXT NOT NULL,
  view_date TEXT NOT NULL,
  count     INTEGER DEFAULT 1,
  UNIQUE(slug, view_date)
);
```

### 1.6 `blog_view_visitors`

持久化 visitor 去重边界。相同 `(slug, view_date, visitor_hash)` 只允许插入一次；`VIEW_KV` 是快速去重 / rate-limit 层，不替代 D1 uniqueness。

```sql
CREATE TABLE IF NOT EXISTS blog_view_visitors (
  slug TEXT NOT NULL,
  view_date TEXT NOT NULL,
  visitor_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (slug, view_date, visitor_hash)
);

CREATE INDEX IF NOT EXISTS idx_blog_view_visitors_created
  ON blog_view_visitors (created_at);
```

### 1.7 `auth_sessions`

主站 session 持久化 fallback；KV 是优先读取层。

```sql
CREATE TABLE IF NOT EXISTS auth_sessions (
  token      TEXT PRIMARY KEY,
  username   TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  ip         TEXT
);

CREATE INDEX idx_auth_sessions_expires ON auth_sessions(expires_at);
```

### 1.8 `learn_publications`

Learn 正常 public lifecycle 的 runtime state；不存 Note content，也不替代 Markdown source。

```sql
CREATE TABLE IF NOT EXISTS learn_publications (
  slug TEXT PRIMARY KEY,
  visibility TEXT NOT NULL CHECK (visibility IN ('public', 'hidden')),
  published_at TEXT NOT NULL,
  last_revised_at TEXT,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_learn_publications_visibility
  ON learn_publications (visibility, published_at DESC);
```

| 字段 | 语义 |
| --- | --- |
| `slug` | Learn source stable slug |
| `visibility` | runtime `public` / `hidden` |
| `published_at` | first formal Publish；Hide / Show 不重置 |
| `last_revised_at` | 最近同步的 revision metadata |
| `updated_at` | runtime lifecycle / revision metadata 更新时间 |

**生命周期不变量**：

- first Publish 创建 runtime record，并在同一 D1 batch 创建 `learn_note_published` first footprint；
- Hide / Show 保留 `published_at`，不重复 first publication；
- production deploy sync 不创建 publication record，也不回填 first publication；
- public revision 可创建 `learn_note_revised` footprint；hidden revision 只更新 metadata；
- source `withdrawn` / `superseded` 不进入正常 public corpus；withdrawn direct URL 是页面兼容例外；
- Local Preview 不允许 lifecycle mutation。

Repository migration `0004_learn_publications.sql` 定义该表；远端环境是否已应用 migration 由 deployment evidence 决定。

---

## 2. Finance D1 — `finance-db`

### 2.1 `trades`

A 股 / ETF 交易业务字段：

```sql
CREATE TABLE IF NOT EXISTS trades (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  trade_date       TEXT NOT NULL,
  ticker           TEXT NOT NULL,
  ticker_name      TEXT,
  direction        TEXT NOT NULL CHECK(direction IN ('buy','sell')),
  quantity         REAL NOT NULL,
  price            REAL NOT NULL,
  position_category TEXT NOT NULL,
  reason           TEXT,
  needs_review     INTEGER DEFAULT 0
);
```

Current migrations 另包含 creator/updater、soft-delete、review metadata，并由 Finance audit tables 保存重要变更。

### 2.2 `holdings_snapshots`

```sql
CREATE TABLE IF NOT EXISTS holdings_snapshots (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  snapshot_date    TEXT NOT NULL,
  ticker           TEXT NOT NULL,
  quantity         REAL NOT NULL,
  avg_cost         REAL NOT NULL,
  position_category TEXT NOT NULL,
  UNIQUE(snapshot_date, ticker)
);
```

### 2.3 `market_data`

```sql
CREATE TABLE IF NOT EXISTS market_data (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  ticker     TEXT NOT NULL,
  price      REAL,
  pe_ttm     REAL,
  fetched_at TEXT NOT NULL,
  UNIQUE(ticker, fetched_at)
);
```

### 2.4 `circuit_breaker_log`

```sql
CREATE TABLE IF NOT EXISTS circuit_breaker_log (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  level        TEXT NOT NULL CHECK(level IN ('yellow','red','black')),
  reason       TEXT NOT NULL,
  triggered_at TEXT NOT NULL,
  resolved_at  TEXT
);
```

Finance migrations 还包含指数、月度记录、计划参数、现金流、资产快照、仓位 / investment rules / memo / rebalance、访问记录、导入 / review 与 audit tables。逐表 schema 直接读取 Finance migrations。

---

## 3. KV Namespace

| Namespace | Key Pattern | 用途 | TTL |
| --- | --- | --- | --- |
| `VIEW_KV` | `view:{date}:{slug}:{visitorHash}` | Blog view 快速去重 | 24h |
| `VIEW_KV` | `ratelimit:views:{minute}:{visitorHash}` | Blog view rate limit | 120s |
| `AUTH_KV` | `user:{username}` | 主站 bcrypt user record | permanent |
| `AUTH_KV` | `session:{token}` | 主站 session | 12h |
| `AUTH_KV` | `ratelimit:login:{ip}` | 主站 login rate limit | 5min |
| `AUTH_KV` | `blog:lifecycle-manifest:v1` / `blog:published-manifest` | Blog runtime lifecycle / public projection | no TTL |
| `AUTH_KV` | `learn:relation-manifest` | deployed Learn relation metadata | no TTL |
| `FINANCE_AUTH_KV` | `user:{username}` | Finance user / role | permanent |
| `FINANCE_AUTH_KV` | `session:{token}` | Finance session | 12h |
| `FINANCE_AUTH_KV` | `ratelimit:login:{hash}` | Finance login rate limit | 5min |

---

## 4. R2

| Bucket | Key | 用途 |
| --- | --- | --- |
| `catstarry-media` | `feed/{YYYY-MM}/{uuid}.{ext}` | Feed media |
| `home-projections` | `activity-signals.json` | Home Activity Signal static projection |

Account-level delivery / CORS configuration belongs to Cloudflare environment wiring, not this repository data model.

---

## 5. Astro Content Collections

### 5.1 Blog

`src/content.config.ts` loads `src/data/blog` Markdown / MDX。

主要字段：`title`、`date`、`category`、`tags`、`description`、`slug?`、`state` (`draft|published|withdrawn`) 以及 legacy / optional fields。

`publication_id` 是当前不参与 publication identity 的 optional field；publication lifecycle 由 runtime Blog state 与 current sync contract决定。

### 5.2 Learn

`src/content.config.ts` loads canonical Markdown from `src/data/learn`。

主要字段：`slug`、`title`、`track`、`section?`、`tags`、source `state?`、`publishedAt?`、`revisedAt?` 及 transitional legacy metadata。

Learn source 不包含 runtime visibility record。正常 public visibility 由 D1 `learn_publications` 拥有；source `withdrawn` / `superseded` 保持 source-level historical semantics。

Current source schema 不包含 `completionId`、`parentSlug` 或 `sourceUrl`。Legacy `learn_section_completed` 只存在于 historical Footprint records，不由 current Learn frontmatter 维护。

ADR-008 规定 Public Learn canonical source 为 Markdown；Blog 的 MDX capability 不传播给 Learn。

---

## 6. Blog lifecycle sync

```text
Blog source
   ↓ successful production deploy / owner lifecycle action
runtime lifecycle state
   ↓ never-published → published
first-production-v1 footprint（幂等）
```

关键不变量：

- first publication idempotency key：`blog:{slug}:first-production-v1`；
- source `state` 为 `draft` / `published` / `withdrawn`；
- initial lifecycle baseline 不回填历史 Blog publication footprint；
- baseline 之后，never-published source 第一次进入 `published` 可由 eligible deploy sync 或 owner lifecycle action创建 first footprint；
- Withdraw / Restore 不重复 first publication；
- 普通编辑、失败 deploy 和重复 sync 不制造 duplicate；
- `publication_id` 不属于 current Blog publication identity。

Blog lifecycle 与 Learn lifecycle 保持不同 storage / transition model，不合并为 generic publication framework。

---

## 7. Shared API type ownership

跨 Site / Worker 的 canonical declarations 位于 `shared/types.ts`。本节只维护职责索引，不复制完整 TypeScript shape。

| 类型 / family | 职责 |
| --- | --- |
| `PostType` / `Visibility` / `FeedPost` | Feed 原生 Note / Clip 与公开/私有状态的跨层 contract |
| `FootprintSource` / `FootprintEventType` / `PublicFootprint` | Public Footprint 来源、事件与 event-time snapshot contract |
| `TimelineEntry` / `PaginatedResponse<T>` | Public Timeline 统一读取 projection 与 cursor pagination contract |
| `BlogLifecycleState` / `BlogLifecycleEntry` | Blog runtime lifecycle 与 Site / Feed Worker 间的 publication contract |
| `LearnPublicationVisibility` / `LearnPublicationRecord` | Learn runtime public / hidden lifecycle contract |
| `ActivityState` / `ActivitySignalsManifest` | Home Activity Signal 固定静态 projection contract |
| auth request / response / session types | 主站与 Finance 各自认证 API 的跨层 payload / status contract |

具体字段、union 成员和新增类型以 `shared/types.ts` 为准。修改跨层 shape 时应更新该 canonical declaration 及其真实 consumers；本数据模型只在类型 family 的职责发生变化时同步。

---

## 8. 关系摘要

```text
catstarry-db
  feed_posts ─────────────┐
                          ├─ Public Timeline read projection
  public_footprints ──────┘

  learn_publications ───── Learn runtime public visibility

  blog_view_visitors ─trigger→ blog_views
  auth_sessions ────────── main-site session fallback

AUTH / VIEW KV
  sessions / users / rate limits
  Blog lifecycle metadata
  Learn relation metadata

R2
  Feed media
  Home activity projection

finance-db
  trades / holdings / market / cash-flow / asset / risk / review / audit
```
