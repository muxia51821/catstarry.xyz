# 数据模型 (Data Model)

> catstarry.xyz 全站数据结构定义 — D1 schema + KV namespace + Content Collection schema + API 类型定义
> 当前主站与 Finance 数据概念模型；字段和索引以 migrations 与当前查询实现为准。

本文件按需读取：仅在 schema、存储、Content Collection 或 API 类型任务中进入本文件。逐表结构以 migrations、字段行为以当前查询和 route 实现为准。

---

## 架构决策：数据库拆分

| 数据库         | D1 Binding                 | 用途                                   |
| -------------- | -------------------------- | -------------------------------------- |
| `catstarry-db` | `env.DB`（主站 Worker）    | /feed 帖子、/blog 阅读量、认证 session |
| `finance-db`   | `env.DB`（finance Worker） | 交易记录、持仓快照、行情数据、熔断日志 |

**理由**：财务数据隔离更安全（ADR-001）。主站 D1 同时承载原生 Feed、公开足迹、阅读量和认证；Home 不查询它做内容聚合。ADR-007 的内部投影 module 可读取最小事件事实，但 Home 页面本身不获得 D1 访问权。

---

## 1. 主站 D1 — `catstarry-db`

### 1.1 feed_posts 表

/feed 板块的帖子和剪藏内容。

```sql
CREATE TABLE IF NOT EXISTS feed_posts (
  id         TEXT PRIMARY KEY,              -- UUID v7
  type       TEXT NOT NULL CHECK(type IN ('note','clip')),
  content    TEXT,                          -- 文字正文（碎碎念或剪藏点评）
  media_json TEXT,                          -- JSON 数组，R2 文件 key 列表
  link_url   TEXT,                          -- 剪藏原链接（仅 clip 类型）
  link_title TEXT,                          -- 剪藏标题（og:title）
  link_summary TEXT,                        -- 剪藏摘要（og:description）
  link_image TEXT,                          -- 剪藏封面图 URL
  visibility TEXT NOT NULL DEFAULT 'public' CHECK(visibility IN ('public','private')),
  created_at TEXT NOT NULL,                 -- ISO 8601
  updated_at TEXT NOT NULL                  -- ISO 8601
);
```

**字段说明**：

| 字段           | 类型    | 约束                 | 说明                                       |
| -------------- | ------- | -------------------- | ------------------------------------------ |
| `id`           | TEXT PK | UUID v7              | 时间有序的 UUID，用于游标分页              |
| `type`         | TEXT    | `note` or `clip`     | 帖子类型，不可混用                         |
| `content`      | TEXT    | 可为空（纯图碎碎念） | 文字内容                                   |
| `media_json`   | TEXT    | JSON 数组            | R2 key 列表，如 `["feed/2026-07/abc.jpg"]` |
| `link_url`     | TEXT    | clip 类型必填        | 剪藏目标 URL                               |
| `link_title`   | TEXT    |                      | og:title 自动抓取                          |
| `link_summary` | TEXT    |                      | og:description                             |
| `link_image`   | TEXT    |                      | og:image URL                               |
| `visibility`   | TEXT    | `public`/`private`   | 公开/仅我可见                              |
| `created_at`   | TEXT    | NOT NULL, ISO 8601   | 创建时间                                   |
| `updated_at`   | TEXT    | NOT NULL, ISO 8601   | 最后更新时间                               |

**索引**：

```sql
CREATE INDEX idx_feed_posts_created ON feed_posts(created_at DESC);
CREATE INDEX idx_feed_posts_visibility ON feed_posts(visibility);
CREATE INDEX idx_feed_posts_type ON feed_posts(type);
```

**游标分页查询**（GET /api/feed）：

```sql
SELECT * FROM feed_posts
WHERE visibility = 'public'
  AND (created_at, id) < (?1, ?2)
ORDER BY created_at DESC, id DESC
LIMIT ?3;
```

### 1.2 public_footprints 表

`public_footprints` 是 Public Footprint 的独立写模型。它记录已经发生、可公开展示的 Blog 发布、Learn Note 发布／修订和 Projects 实质更新，并兼容读取历史 Learn 小节完成事件；不存原生碎碎念或剪藏。创建时固化来源身份和展示快照，但不表示整条记录的所有字段都绝对不可变；`visibility` 可以独立变化。

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
| `source_ref` | 来源稳定标识，例如 Blog slug、Learn Public Note slug（legacy row 可保留旧 section reference）、Projects project id |
| `source_version` | 本次足迹对应的明确发布／完成／更新标识；不是普通 `lastModified` |
| `snapshot_json` | 创建时标题、摘要、链接、来源名称和事件展示文案；之后不随来源普通编辑改写 |
| `idempotency_key` | 同一来源版本只产生一次足迹的唯一键 |
| `visibility` | 足迹独立公开或隐藏；不向来源内容传播 |

| 来源 | `source_ref` | `source_version` | `idempotency_key` |
| --- | --- | --- | --- |
| Blog | `slug` | `first-production-v1` | `blog:{slug}:first-production-v1` |
| Learn | Public Note slug；legacy row 可保留旧 section reference | publication / revision marker；legacy row 可保留旧 completion identity | `learn:{slug}:{source_version}` |
| Projects | 稳定 `project_id` | 木下显式给出的 `update_id` | `projects:{project_id}:{update_id}` |

Projects Footprint snapshot 的 canonical destination 是 `/projects/`；Projects Card 自身仍以 external `project.url` 作为 whole-card destination。

Blog collection 仍保留可选的 `publication_id` 字段，但当前生产同步脚本不读取它；首次同步建立已发布 slug 基线，基线之后的新 slug 使用 `first-production-v1` 创建足迹。是否将 `publication_id` 重新定为 Blog 的发布身份，待木下确认。

**来源生命周期**：写入成功后，足迹的存储与 event-time snapshot 独立于来源。来源普通编辑不改写 snapshot；来源隐藏、删除或链接失效不级联删除 Footprint record；木下仍可独立把足迹设为 private。

存储独立不等于公开投影独立。已关闭的 Blog / Feed 产品合同规定：Blog source hidden 时，原 Footprint 与 snapshot 保留，但该 Blog Footprint 不进入 Public Timeline；Blog restore 可恢复原记录的投影而不创建 duplicate。Hard delete 后的 exact tombstone / dead-destination behavior 仍是 Architecture Revalidate。

### 1.3 Public Timeline 读取投影

`feed_posts` 与 `public_footprints` 不合并为写表。`GET /api/feed` 由 Public Timeline 模块按 `(occurred_at, id)` 统一排序和游标分页，返回访客可读的 `TimelineEntry`。该投影不是 D1 表，也不应被 Home 使用。

当前内部 `TimelineEntry.kind` 仍使用 `system_footprint` 作为稳定代码 discriminator；面向项目共享语言时 canonical term 为 `Public Footprint`。内部类型名不改变产品语义。

当前 `FeedStore.listPublic()` 会结合 published Blog manifest 过滤 Blog Footprint；Blog source hidden 时保留 record 与 snapshot，但不进入 Public Timeline，restore 后恢复同一记录且不创建 duplicate。Hard-delete tombstone / known-dead destination 的精确行为仍保留为后续边界。

### 1.4 Home Activity Signal 静态投影

Home Activity Signal 不是 D1 表、不是 Public Timeline 的简化响应，也不是 `/api/home` 的替代。它是 `Activity Signal Projection` 内部计算后发布的固定静态对象。

**公开契约**：

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
| 允许字段 | `schema_version` 与四颗功能星球各自的 `state` |
| 状态值 | `active`（≤7 天）、`stable`（>7 且≤60 天）、`dormant`（>60 天或无公开活动） |
| 来源 | Blog / Learn / Projects 取最新公开 Public Footprint；Feed 取公开原生帖子与公开 Public Footprint 中较新者 |
| About | 不得出现在投影中；豹猫卫星不参与活动状态 |
| 禁止字段 | 标题、正文、摘要、链接、列表、时间线、事件数、精确时间、事件／来源标识、`generated_at`、unread/read |
| 失败降级 | Home 隐藏活动卫星，不能把不可用状态视为 `dormant` |

投影在合资格公开事件写入、原生帖子删除或可见性变化、Public Footprint 可见性变化后刷新；每小时完整校正一次，以覆盖 7 天和 60 天的自然状态迁移。来源内容删除不级联删除 Public Footprint，保持 ADR-005 的来源生命周期。

### 1.5 blog_views 表

/blog 文章阅读量统计；阅读者去重由 `blog_view_visitors` 补充。

```sql
CREATE TABLE IF NOT EXISTS blog_views (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  slug      TEXT NOT NULL,        -- 文章 slug
  view_date TEXT NOT NULL,        -- 阅读日期 YYYY-MM-DD
  count     INTEGER DEFAULT 1,   -- 当日计数
  UNIQUE(slug, view_date)
);
```

### 1.6 auth_sessions 表

主站认证 session 持久化记录（/feed 登录后 12h 有效期）；KV 是优先读取层，D1 用作 fallback 与登出删除的持久记录。

```sql
CREATE TABLE IF NOT EXISTS auth_sessions (
  token      TEXT PRIMARY KEY,     -- session token（UUID）
  username   TEXT NOT NULL,
  created_at TEXT NOT NULL,        -- ISO 8601
  expires_at TEXT NOT NULL,        -- ISO 8601，12h 后过期
  ip         TEXT                  -- 登录 IP
);
```

**索引**：

```sql
CREATE INDEX idx_auth_sessions_expires ON auth_sessions(expires_at);
```

---

## 2. 财务 D1 — `finance-db`

### 2.1 trades 表

每笔 A 股/ETF 交易记录。当前 migration 还补充 `created_by`、更新时间、软删除和 review 字段，并由 `finance_trade_audit` 保存变更审计。

```sql
CREATE TABLE IF NOT EXISTS trades (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  trade_date       TEXT NOT NULL,    -- 交易日 YYYY-MM-DD
  ticker           TEXT NOT NULL,    -- 标的代码（如 510300）
  ticker_name      TEXT,             -- 标的名称（如 沪深300ETF）
  direction        TEXT NOT NULL CHECK(direction IN ('buy','sell')),
  quantity         REAL NOT NULL,    -- 数量
  price            REAL NOT NULL,    -- 成交单价
  position_category TEXT NOT NULL,   -- 仓位类别（宽基/行业/债券/现金等）
  reason           TEXT,             -- 交易原因（选填）
  needs_review     INTEGER DEFAULT 0 -- 0 = clean, 1 = Excel 迁移时发现 dirty data
);
```

`trades` 的 current migration 还包含 `created_at`、`created_by`、`updated_at`、`updated_by`、`deleted_at` 和 `deleted_by`；上面的字段表只展示交易业务核心字段。

### 2.2 holdings_snapshots 表

持仓快照（定时执行或交易后更新）。

```sql
CREATE TABLE IF NOT EXISTS holdings_snapshots (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  snapshot_date    TEXT NOT NULL,    -- 快照日期 YYYY-MM-DD
  ticker           TEXT NOT NULL,
  quantity         REAL NOT NULL,    -- 持有数量
  avg_cost         REAL NOT NULL,    -- 平均成本
  position_category TEXT NOT NULL,
  UNIQUE(snapshot_date, ticker)
);
```

### 2.3 market_data 表

行情数据（Worker Cron 定时拉取）。

```sql
CREATE TABLE IF NOT EXISTS market_data (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  ticker     TEXT NOT NULL,          -- 标的代码（或 PE 指标代码如 'SSE300_PE'）
  price      REAL,                   -- 最新价格（PE 数据时为 PE-TTM 值）
  pe_ttm     REAL,                   -- PE-TTM 值
  fetched_at TEXT NOT NULL,          -- 数据拉取时间 ISO 8601
  UNIQUE(ticker, fetched_at)
);
```

### 2.4 circuit_breaker_log 表

三级熔断触发日志。

```sql
CREATE TABLE IF NOT EXISTS circuit_breaker_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  level       TEXT NOT NULL CHECK(level IN ('yellow','red','black')),
  reason      TEXT NOT NULL,          -- 触发原因
  triggered_at TEXT NOT NULL,         -- 触发时间 ISO 8601
  resolved_at TEXT                    -- 解除时间（NULL 表示未解除）
);
```

当前 Finance migrations 还包含以下概念组：

- `finance_market_indexes`：指数快照，保存展示值、涨跌、市场状态和抓取时间；
- `monthly_records`、`plan_params`：月度记录和计划参数；
- `finance_cash_flows`、`finance_asset_snapshots`：真实现金流与资产快照；
- `position_limits`、`finance_investment_rules`、`finance_memos`、`finance_rebalance_records`：仓位与 stewardship 记录；
- `finance_trade_audit`、`finance_plan_audit`、`finance_cash_flow_audit`、`finance_rule_audit`：审计记录；
- `finance_access_log`、`finance_import_batches`、`finance_import_review`、`finance_workbook_imports`、`finance_workbook_review` 及其 audit 表：访问、导入和 workbook review 状态。

以上列表用于说明概念边界，不替代 migrations 的逐表 schema。

---

## 3. KV Namespace

| Namespace   | Key Pattern          | 用途                               | TTL        |
| ----------- | -------------------- | ---------------------------------- | ---------- |
| **VIEW_KV** | `view:{date}:{slug}:{visitorHash}` | 阅读量访问者去重记录             | 24h        |
| **AUTH_KV** | `user:{username}`    | 用户密码 bcrypt hash               | 永久       |
| **AUTH_KV** | `session:{token}`    | 主站登录 session                   | 12h        |
| **AUTH_KV** | `ratelimit:{ip}`     | 主站登录限流计数器                 | 5min       |
| **FINANCE_AUTH_KV** | `user:{username}` / `session:{token}` | Finance 用户、角色和 session | session 12h |

---

## 4. R2 Bucket

| Bucket            | 路径模式                      | 用途           | CORS                 |
| ----------------- | ----------------------------- | -------------- | -------------------- |
| `catstarry-media` | `feed/{YYYY-MM}/{uuid}.{ext}` | /feed 媒体文件 | Allow: catstarry.xyz |
| `home-projections` | `activity-signals.json`       | Home 最小活动状态固定资源 | 静态资源交付所需的最小允许来源 |

---

## 5. Content Collections（Astro）

### 5.1 blog collection

Blog collection 由 `src/content.config.ts` 定义；loader 读取 `src/data/blog`，接受 `.md` 与 `.mdx`。

```typescript
// 当前字段：title, date, category, tags, description,
// slug?, state (draft/published/withdrawn), legacy draft?, publication_id?
```

### 5.2 learn collection

Learn collection 由 `src/content.config.ts` 定义；loader 读取 `src/data/learn`，当前只接受 `.md`。

```typescript
const learnCollection = defineCollection({
  type: "content",
  schema: z.object({
    slug: z.string(),
    title: z.string(), // 笔记标题
    track: z.string(), // 学习轨道（如 astro）
    section: z.string().optional(), // 分节（如 pages-routing）
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(true),
    publishDate: z.coerce.date(),
    lastModified: z.coerce.date(),
    excerpt: z.string().optional(),
    completionId: z.string().optional(), // legacy section event compatibility；不是普通编辑时间
    parentSlug: z.string().optional(),
    sourceUrl: z.string().url().optional(),
  }),
});
```

`completionId` 仅作为旧 Learn section event 的 readable compatibility 保留；当前 Public Note 足迹使用 publication / revision marker，`lastModified` 继续用于 /learn 的自身排序，绝不用于生成或重排公开足迹。

这与 ADR-008 的边界一致：Learn public note 当前 canonical source 为 Markdown；Blog 仍可读取 MDX，但不代表 Learn runtime 支持 MDX。

---

## 6. Blog 生产部署成功信号

Blog 继续以 Markdown frontmatter 为内容源，`state` 是必填生命周期字段。Public Footprint 不在构建或草稿部署时写入：新文章只有 owner 显式 Publish 才可创建一次足迹。

```
Markdown（required state: draft；slug / publication_id 为可选字段）
    ↓ Git push / build / production deploy
受保护 manifest sync 登记 source，但不发布 draft
    ↓ owner preview → explicit Publish
Public Footprint Writer
    ↓ source_version = first-production-v1
D1 public_footprints
```

**约束**：

- 当前 Blog 幂等键使用 `blog:{slug}:first-production-v1`，不使用 `publication_id`、deployment id 或普通 Git SHA。
- `state` 必须明确为 `draft`、`published` 或 `withdrawn`；缺失 state 的新内容在 authoring 与 manifest boundary 均失败，不回退为 published。
- 新 draft 部署不生成足迹；owner 首次 Publish 生成一次，Withdraw / Restore 不重复生成。
- 普通编辑、构建开始、部署失败与对同一发布标识的重复部署均不得产生新足迹。
- 生产部署成功后的受保护 manifest sync 由 repository workflow 与 publication-manifest scripts 触发；架构接口不依赖某个特定供应商回调格式。
- `publication_id` 是否成为未来 Blog 发布身份，待木下确认；本文件不提前裁决产品契约。

---

## 7. API 类型定义

### 7.1 共享类型 (shared/)

```typescript
// shared/types.ts

// --- /feed ---
export type PostType = "note" | "clip";
export type Visibility = "public" | "private";
export type FootprintSource = "blog" | "learn" | "projects";
export type FootprintEventType =
  | "blog_published"
  | "learn_section_completed"
  | "learn_note_published"
  | "learn_note_revised"
  | "project_updated";

export type ActivityState = "active" | "stable" | "dormant";

export interface ActivitySignalsManifest {
  schema_version: 1;
  signals: {
    blog: { state: ActivityState };
    feed: { state: ActivityState };
    learn: { state: ActivityState };
    projects: { state: ActivityState };
  };
}

export interface FeedPost {
  id: string;
  type: PostType;
  content: string | null;
  media_json: string | null; // JSON 字符串，前端 parse
  link_url: string | null;
  link_title: string | null;
  link_summary: string | null;
  link_image: string | null;
  visibility: Visibility;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}

export interface PublicFootprint {
  id: string;
  source_module: FootprintSource;
  source_ref: string;
  source_version: string;
  event_type: FootprintEventType;
  snapshot_json: string;
  occurred_at: string;
  visibility: Visibility;
}

export interface TimelineEntry {
  id: string;
  kind: "native_post" | "system_footprint";
  occurred_at: string;
  visibility: Visibility;
  payload: FeedPost | PublicFootprint;
}

export interface PaginatedResponse<T> {
  items: T[];
  cursor: string | null; // 下一页游标
  has_more: boolean;
}

// --- /blog ---
export interface BlogViewCount {
  slug: string;
  count: number;
}

// --- auth ---
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  expires_at: string;
}

export interface SessionStatus {
  authenticated: boolean;
  username: string | null;
}

```

---

## 8. 实体关系图

```
catstarry-db                    finance-db
┌─────────────┐                ┌──────────────────┐
│ feed_posts  │                │ trades           │
│  id (PK)    │                │  id (PK)         │
│  type       │                │  ticker          │
│  content    │                │  direction       │
│  media_json │                │  quantity, price │
│  visibility │                │  position_category│
│  created_at │                └────────┬─────────┘
└─────────────┘                         │
┌──────────────────┐                    │
│ public_footprints│                    │
│ id (PK)          │                    │
│ source_module    │                    │
│ source_ref       │                    │
│ source_version   │                    │
│ snapshot_json    │                    │
│ visibility       │                    │
│ idempotency_key  │                    │
└──────────────────┘                    │
┌─────────────┐                ┌────────▼─────────┐
│ blog_views  │                │ holdings_snapshots│
│  slug       │                │  ticker, quantity │
│  count      │                │  avg_cost         │
└─────────────┘                └────────┬─────────┘
┌─────────────┐                         │
│ auth_sessions│               ┌────────▼─────────┐
│  token (PK) │               │ market_data      │
│  username   │               │  ticker, price    │
│  expires_at │               │  pe_ttm           │
└─────────────┘               └────────┬─────────┘
                                        │
                               ┌────────▼─────────┐
                               │ circuit_breaker_ │
                               │ log              │
                               │  level, reason   │
                               └──────────────────┘

KV:                               R2:
  view:{date}:{slug}:{visitorHash}  catstarry-media/
    → daily dedup record             feed/2026-07/uuid.jpg
  user:{username} → bcrypt hash
  session:{token} → session data
  ratelimit:{ip} → counter
                                      home-projections/
                                        activity-signals.json
```
