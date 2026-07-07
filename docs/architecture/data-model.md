# 数据模型 (Data Model)

> catstarry.xyz 全站数据结构定义 — D1 schema + KV namespace + Content Collection schema + API 类型定义
> Phase 3 / 3.1 领域建模产出 | 2026-07-05

---

## 架构决策：数据库拆分

| 数据库         | D1 Binding                 | 用途                                   |
| -------------- | -------------------------- | -------------------------------------- |
| `catstarry-db` | `env.DB`（主站 Worker）    | /feed 帖子、/blog 阅读量、认证 session |
| `finance-db`   | `env.DB`（finance Worker） | 交易记录、持仓快照、行情数据、熔断日志 |

**理由**：财务数据隔离更安全（ADN-001）。主站模块共库可简化 Home 聚合查询。

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

### 1.2 blog_views 表

/blog 文章阅读量统计。已存在（Phase 1 原型）。

```sql
CREATE TABLE IF NOT EXISTS blog_views (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  slug      TEXT NOT NULL,        -- 文章 slug
  view_date TEXT NOT NULL,        -- 阅读日期 YYYY-MM-DD
  count     INTEGER DEFAULT 1,   -- 当日计数
  UNIQUE(slug, view_date)
);
```

### 1.3 auth_sessions 表

认证 session 存储（/feed 登录后 12h 有效期）。

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

每笔 A 股/ETF 交易记录。

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

---

## 3. KV Namespace

| Namespace   | Key Pattern          | 用途                               | TTL        |
| ----------- | -------------------- | ---------------------------------- | ---------- |
| **VIEW_KV** | `view:{slug}:{date}` | 阅读量去重（IP→count）             | 24h        |
| **VIEW_KV** | `blog-metadata`      | blog 元数据 JSON（用于 Home 聚合） | 构建时写入 |
| **AUTH_KV** | `user:{username}`    | 用户密码 bcrypt hash               | 永久       |
| **AUTH_KV** | `session:{token}`    | 登录 session                       | 12h        |
| **AUTH_KV** | `ratelimit:{ip}`     | 登录限流计数器                     | 5min       |

---

## 4. R2 Bucket

| Bucket            | 路径模式                      | 用途           | CORS                 |
| ----------------- | ----------------------------- | -------------- | -------------------- |
| `catstarry-media` | `feed/{YYYY-MM}/{uuid}.{ext}` | /feed 媒体文件 | Allow: catstarry.xyz |

---

## 5. Content Collections（Astro）

### 5.1 blog collection

已存在（Phase 1）。Markdown frontmatter 定义在 `src/content/config.ts`。

```typescript
// 字段保持 Phase 1 定义：
// title, slug, date, category, tags, excerpt, draft, description
```

### 5.2 learn collection

Phase 5 开发时扩展 `src/content/config.ts`。

```typescript
const learnCollection = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(), // 笔记标题
    track: z.string(), // 学习轨道（如 astro）
    section: z.string().optional(), // 分节（如 pages-routing）
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    publishDate: z.date(),
    lastModified: z.date().default(() => new Date()),
    excerpt: z.string().optional(),
  }),
});
```

---

## 6. 博客元数据流 — KV Bridge

blog 用 Markdown frontmatter（不存入 D1），但 Home 聚合需要 blog 元数据。通过 KV bridge 解决：

```
Markdown frontmatter
    ↓ astro build
  getCollection("blog")
    ↓ 生成 JSON
  blog-metadata.json  [写入 KV]
    ↓
  Worker GET /api/home
    ↓ 读取 KV
  blog 卡片混合到 Home 时间线
```

**blog-metadata KV value 结构**：

```json
{
  "posts": [
    {
      "slug": "from-zero",
      "title": "从零搭建个人网站",
      "date": "2026-07-03",
      "category": "tech",
      "tags": ["astro", "cloudflare", "个人网站"],
      "excerpt": "..."
    }
  ],
  "updated_at": "2026-07-05T12:00:00Z"
}
```

Phase 5 开发时，在 `astro.config.mjs` 的构建钩子中实现 KV 写入（deploy hook 或 build 集成）。

---

## 7. API 类型定义

### 7.1 共享类型 (shared/)

```typescript
// shared/types.ts

// --- /feed ---
export type PostType = "note" | "clip";
export type Visibility = "public" | "private";

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

// --- Home 聚合 ---
export interface HomeTimelineItem {
  type: "blog" | "feed" | "learn" | "project";
  slug: string;
  title: string;
  excerpt: string | null;
  date: string;
  url: string;
  media_url: string | null;
  badge_label: string;
  badge_color: string;
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
  view:{slug}:{date} → count        catstarry-media/
  blog-metadata → JSON                feed/2026-07/uuid.jpg
  user:{username} → bcrypt hash
  session:{token} → session data
  ratelimit:{ip} → counter
```
