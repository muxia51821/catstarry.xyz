# Slice 5：阅读量统计 — API + 前端

> **状态**：`ready-for-agent`
> **创建日期**：2026-07-03
> **来源 PRD**：`.scratch/blog/issue.md`
> **覆盖 User Stories**：US5（文章阅读量显示）、US10（木下查看阅读量统计）

---

## 目标

在 feed-api Worker 上新增 `/api/views` 端点，D1 存储计数，KV 做去重。前端在列表页和详情页显示阅读量。

## 验收标准

- [ ] `POST /api/views` — body `{ slug: string }` 记录一次阅读，返回当前计数
- [ ] `GET /api/views?slug=xxx` — 返回 `{ slug: string, count: number }`
- [ ] `GET /api/views?slugs=slug1,slug2,...` — 批量查询，返回 `{ views: [{ slug, count }] }`
- [ ] D1 中 `blog_views` 表存在：`slug TEXT PRIMARY KEY, count INTEGER DEFAULT 0`
- [ ] 去重逻辑：同一 IP + 同一 slug + 同一日期，当日只计一次（KV key `view:${ip}:${slug}:${date}`，TTL 24h）
- [ ] 详情页加载时自动 POST 记录阅读，并在底部元信息区域显示阅读量
- [ ] 列表页文章卡片显示阅读量（通过 GET 批量查询）
- [ ] 阅读量显示格式：如 `123 次阅读`

## 技术要点

- **复用 feed-api Worker**：在现有 Worker 代码中添加 `/api/views` 路由处理
- **D1 表创建**：在 Worker 的迁移脚本或 `wrangler d1 execute` 中执行 `CREATE TABLE IF NOT EXISTS blog_views (slug TEXT PRIMARY KEY, count INTEGER DEFAULT 0)`
- **去重 KV**：key 格式 `view:${ip}:${slug}:${date}`，`expirationTtl: 86400`
- **POST 幂等**：INSERT OR IGNORE 后 UPDATE count+1（原子操作）
- **前端 Hook**：封装 `useViewCount(slug)` 和 `useBatchViewCount(slugs)` 两个自定义 Hook
- 前端需处理 API 不可用时的降级（不显示阅读量，不报错）

## 测试接缝

- **API 契约测试**（最高优先级）
  - POST 新 slug → 返回 count=1
  - POST 同 slug 同 IP 同日 → count 不变（去重生效）
  - GET 单个 slug → 返回正确 count
  - GET 批量 slugs → 返回所有 count
- **前端行为测试**
  - 详情页加载后阅读量显示正确
  - 列表页多篇文章阅读量批量显示
  - API 不可用时页面正常渲染（无阅读量显示，无报错）

## 依赖

- Slice 1（Content Collection — 文章 slug 已定义）

## 被依赖

- 无（后续板块 /projects、/learn 可复用此端点）

---

> **Triage**: `ready-for-agent`
