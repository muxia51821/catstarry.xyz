# 架构总览 (Architecture)

> catstarry.xyz 全站架构总览 — 模块关系图 + 数据流向 + 技术栈映射
> Phase 3 架构设计产出 | 定向回流复核：2026-07-16

---

## 技术栈映射

| 层            | 选型                                | 部署              | 用途                                      |
| ------------- | ----------------------------------- | ----------------- | ----------------------------------------- |
| **前端框架**  | Astro (hybrid: SSG + SSR)           | CF Pages          | 全站页面渲染                              |
| **交互组件**  | React 19 + shadcn/ui                | 嵌入 Astro island | 发布面板、公开足迹时间线、管理后台、Home 交互 |
| **API**       | CF Workers (feed-api + finance-api) | wrangler deploy   | 数据读写、认证、Cron 任务                 |
| **数据库**    | D1 (catstarry-db + finance-db)      | CF                | 原生 Feed、公开足迹、交易、阅读量、session |
| **缓存/配置** | KV                                  | CF                | 阅读量去重、认证、限流                    |
| **文件存储**  | R2（catstarry-media + home-projections） | CF             | /feed 媒体文件 + Home 最小活动状态静态投影 |
| **CI/CD**     | GitHub Actions + wrangler           | GitHub            | Git push → build → deploy                 |
| **域名**      | catstarry.xyz + f.catstarry.xyz     | CF DNS            | 主站 + 财务子域名                         |

---

## 模块关系图

```
                         catstarry.xyz (CF Pages)
                    ┌──────────────────────────────────┐
                    │            Astro                  │
                    │                                   │
  / (SSG)           │  ┌──────┐ ┌──────┐ ┌──────────┐ │
  /blog/* (SSG)     │  │ Home │ │ Blog │ │ Projects │ │
  /feed/* (SSR)     │  └──┬───┘ └──┬───┘ └────┬─────┘ │
  /learn/* (SSG)    │     │        │           │       │
  /projects/* (SSG) │  ┌──┴───┐ ┌──┴───┐ ┌────┴─────┐ │
                    │  │ Feed │ │ Learn│ │  shared/  │ │
                    │  └──┬───┘ └──┬───┘ │ components│ │
                    │     │        │     └───────────┘ │
                    └─────┼────────┼───────────────────┘
                          │        │
                    HTTP fetch   HTTP fetch
                          │        │
          ┌───────────────┼────────┼───────────────────┐
          │               ▼        ▼                   │
          │     feed-api.workers.dev                   │
          │     ┌──────────────────────────┐           │
          │     │ /api/feed  /api/views    │           │
          │     │ /api/auth  /api/learn    │           │
          │     └──────┬───────┬───────────┘           │
          │            │       │                       │
          │     ┌──────▼──┐ ┌──▼──────┐ ┌───────────┐ │
          │     │ D1      │ │ KV      │ │ R2        │ │
          │     │feed_posts│ │VIEW_KV │ │catstarry- │ │
          │     │footprints│ │AUTH_KV │ │media      │ │
          │     └─────────┘ └─────────┘ └───────────┘ │
          │                                            │
          └────────────── Cloudflare Workers ──────────┘


                    f.catstarry.xyz (独立 CF Pages)
                    ┌──────────────────────────────────┐
                    │     finance-api.workers.dev      │
                    │  ┌──────────────────────────┐    │
                    │  │ /api/trades /api/holdings │    │
                    │  │ /api/market /api/pe       │    │
                    │  │ /api/circuit              │    │
                    │  │ Cron: fetch-prices        │    │
                    │  │ Cron: fetch-pe            │    │
                    │  │ Cron: clean-r2            │    │
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
木下写 Markdown（含首次发布标识）→ Git push → astro build → CF Pages production deploy
                                                                  ↓ 仅生产部署成功
                                                       Publication Signal Adapter
                                                                  ↓ 幂等写入
                                                   D1 public_footprints（Blog 快照）
```

### Feed 发布流

```
木下 → 发布面板 → 选文件 → 上传 R2（自动）
                            ↓
                  选文字 + 点发布 → POST /api/feed → D1 feed_posts
                            ↓
                  时间线自动刷新 ← GET /api/feed
```

### Feed 浏览流（访客）

```
访客 → /feed → Astro SSR → fetch GET /api/feed
        → Public Timeline 模块 → D1 feed_posts + public_footprints
        → 统一排序、游标分页、可见性过滤 → 渲染时间线
```

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

### Finance 行情流

```
Cron (每15分钟) → fetch-prices task → a-stock-data API → D1 market_data
Cron (每日收盘) → fetch-pe task → PE-TTM 数据 → D1 market_data
木下/cati → /dashboard → SSR → fetch /api/holdings + /api/market → 渲染
```

### 认证流

```
未登录用户 → /feed → 右下角「登录」按钮
    ↓ 点击
登录面板 → POST /api/auth/login → bcrypt 验证 → KV session → Set-Cookie
    ↓ 成功后
右下角 →「+」发布按钮出现
12h 后 → session 过期 → KV TTL 自动清除 → 回到未登录状态
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
| `docs/adr/005-public-footprint-separate-storage.md` | 原生帖子与系统足迹分存、统一读取                                         | 定向 3   |
| `docs/adr/006-retire-home-aggregation-and-kv-bridge.md` | 退役 Home 聚合与 KV bridge                                           | 定向 3   |
| `docs/adr/007-home-activity-signal-static-projection.md` | Home 最小活动状态的静态投影、刷新与降级                           | 定向 3   |
| `docs/architecture.md`                      | 本文件（架构总览）                                                              | 汇总      |
| `DESIGN.md`                                 | 根目录视觉设计系统；目录以文件当前版本为准                                      | 4.1       |

---

## 与 Phase 0 技术选型的差异

tech-decisions-20260703.md 中的 7 项决策全部保留，但以下三点在 Phase 3 中细化：

1. **D1 拆分**（决策 #1）：从"1 个 D1"细化为"2 个 D1（主站 + 财务独立）"→ ADR-001
2. **博客元数据不入 D1**：Blog 内容继续以 Markdown 为源；原 KV bridge 已由 ADR-006 退役
3. **Workers 拆分**（决策 #2）：保持 2 个，但 feed-api 升级为主站 API Worker → ADR-003

其余 4 项决策（Astro hybrid、React+shadcn/ui、Monorepo、行情 API、CI/CD）不变。

---

## 定向 Phase 3 交接状态

Home / Feed 的原定向 Phase 3 已完成，ADR-005、ADR-006 及本架构文档已经锁定。Home Activity Signal 是后续极小定向回流：它以 ADR-007 增加无内容的静态状态投影，不恢复 Home 聚合、`/api/home`、KV bridge 或 Public Timeline 给 Home 的读取关系。

ADR-007 闭合后，应由流程治理将 Phase 4 标记为“返回 4.1 重锁中”。随后 Design 2.0 只需重锁三态信号卫星的视觉接口；Phase 4.2 只能以模拟投影校准视觉，不读取真实数据。Astro 7 基线不受本次定向回流影响。
