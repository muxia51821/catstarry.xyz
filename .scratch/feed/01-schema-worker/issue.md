# Slice F01：Feed Worker 基础 — D1 Schema + API 路由骨架

> **状态**：`ready-for-agent`
> **创建日期**：2026-07-04
> **来源需求**：`docs/final-requirements-feed.json`
> **覆盖 Goals**：G001（发布）、G002（时间线展示）、G003（剪藏发布）

---

## 目标

在现有 `workers/feed-api` 上扩展 D1 schema，新增 `/api/feed` 路由骨架，支持帖子的基本 CRUD（创建、查询时间线），为后续发布面板、时间线页面、剪藏发布提供数据层。

## 验收标准

- [ ] D1 新增 `posts` 表，schema 包含：
  - `id` TEXT PRIMARY KEY（UUID）
  - `type` TEXT NOT NULL（`note` | `clip`）
  - `content` TEXT（正文文字）
  - `media_json` TEXT（JSON 数组，存储 R2 文件 key 列表）
  - `link_url` TEXT（剪藏原链接）
  - `link_title` TEXT（剪藏标题，来自 og:title）
  - `link_summary` TEXT（剪藏摘要，来自 og:description）
  - `link_image` TEXT（剪藏封面图，来自 og:image）
  - `visibility` TEXT NOT NULL DEFAULT `public`（`public` | `private`）
  - `created_at` TEXT NOT NULL（ISO 8601）
  - `updated_at` TEXT NOT NULL（ISO 8601）
- [ ] `POST /api/feed` — 创建帖子，接收 body `{ type, content, media?, link_url?, link_title?, link_summary?, link_image? }`，入库并返回新建帖子的完整 JSON
- [ ] `GET /api/feed?limit=20&cursor=xxx` — 分页查询公开帖子（`visibility='public'`），按 `created_at` 倒序，支持游标分页
- [ ] 所有 API 响应包含 CORS 头（`Access-Control-Allow-Origin: *`、`Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS`、`Access-Control-Allow-Headers: Content-Type, Authorization`）
- [ ] `wrangler deploy` 成功，`curl` 测试通过
- [ ] 复用现有 feed-api Worker 的 `env.DB`（D1 binding）和 `env.VIEW_KV`（KV binding）

## 技术要点

- 表名使用 snake_case
- 游标分页：用 `created_at` + `id` 做复合游标（`WHERE (created_at, id) < ($cursor_time, $cursor_id)`），避免 offset 分页的性能问题
- 新增 schema 通过 `wrangler d1 execute feed-db --file=schema.sql --remote` 执行
- 复用现有 Worker 的 `src/index.ts` 路由结构（`/api/views` 已存在，新增 `/api/feed` 路由）

## 测试接缝

- `curl -X POST https://feed-api.catstarry.workers.dev/api/feed -H "Content-Type: application/json" -d '{...}'` → 返回 200 + 新帖 JSON
- `curl https://feed-api.catstarry.workers.dev/api/feed?limit=5` → 返回 `{ items: [...], next_cursor: "..." }`
- 确认 CORS 头存在于所有响应中

## 依赖

- 无前置依赖（基于现有 `workers/feed-api` Worker 扩展，D1 已绑定 `feed-db`，KV 已绑定 `VIEW_KV`）

## 被依赖

- F02（发布面板）— 依赖 POST /api/feed
- F03（时间线页面）— 依赖 GET /api/feed 查询
- F04（剪藏发布）— 依赖 POST /api/feed 含 link_* 字段
- F07（内容管理后台）— 依赖 PATCH/DELETE /api/feed/:id

---

> **Triage**：`ready-for-agent`
