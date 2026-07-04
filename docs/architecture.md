# 架构总览 (Architecture)

> catstarry.xyz 全站架构总览 — 模块关系图 + 数据流向 + 技术栈映射
> Phase 3 架构设计产出 | 2026-07-05

---

## 技术栈映射

| 层 | 选型 | 部署 | 用途 |
|----|------|------|------|
| **前端框架** | Astro (hybrid: SSG + SSR) | CF Pages | 全站页面渲染 |
| **交互组件** | React 18 + shadcn/ui | 嵌入 Astro island | 发布面板、时间线、管理后台、about 卡片 |
| **API** | CF Workers (feed-api + finance-api) | wrangler deploy | 数据读写、认证、Cron 任务 |
| **数据库** | D1 (catstarry-db + finance-db) | CF | 结构化数据（帖子、交易、阅读量、session） |
| **缓存/配置** | KV (3 namespace) | CF | 阅读量去重、blog 元数据、认证、限流 |
| **文件存储** | R2 (catstarry-media) | CF | /feed 媒体文件（图片/视频） |
| **CI/CD** | GitHub Actions + wrangler | GitHub | Git push → build → deploy |
| **域名** | catstarry.xyz + f.catstarry.xyz | CF DNS | 主站 + 财务子域名 |

---

## 模块关系图

```
                         catstarry.xyz (CF Pages)
                    ┌──────────────────────────────────┐
                    │            Astro                  │
                    │                                   │
  / (SSR)           │  ┌──────┐ ┌──────┐ ┌──────────┐ │
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
          │     │ /api/auth  /api/home     │           │
          │     │ /api/learn               │           │
          │     └──────┬───────┬───────────┘           │
          │            │       │                       │
          │     ┌──────▼──┐ ┌──▼──────┐ ┌───────────┐ │
          │     │ D1      │ │ KV      │ │ R2        │ │
          │     │catstarry│ │VIEW_KV  │ │catstarry- │ │
          │     │-db      │ │AUTH_KV  │ │media      │ │
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

### Blog 发布流

```
木下写 Markdown → Git push → GitHub Actions → astro build → CF Pages deploy
                                    ↓
                              blog-metadata.json → KV (deploy hook)
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
访客 → /feed → Astro SSR → fetch GET /api/feed → D1 → 渲染时间线
```

### Home 聚合流

```
访客 → / → Astro SSR → fetch GET /api/home
                              ↓
                    Worker 聚合:
                      KV: blog-metadata (blog)
                      D1: feed_posts (feed, public only)
                      Astro: getCollection("learn") (learn)
                      Astro: getCollection("projects") (projects)
                              ↓
                    返回混合时间线 JSON → 渲染 Home
```

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

| 文件 | 内容 | 步骤 |
|------|------|------|
| `docs/architecture/data-model.md` | D1 schema + KV + R2 + Content Collections + API 类型定义 | 3.1 |
| `docs/architecture/modules.md` | 目录结构 + 模块边界 + Workers 路由 | 3.2 + 3.3 |
| `docs/architecture/auth.md` | /feed + finance 鉴权方案 | 3.4 |
| `docs/adr/001-d1-split.md` | 1 个 D1 vs 2 个 | 3.5 |
| `docs/adr/002-blog-metadata-kv-bridge.md` | KV bridge vs D1 迁移 | 3.5 |
| `docs/adr/003-worker-count.md` | 2 个 Worker vs 多 Worker | 3.5 |
| `docs/adr/004-feed-visibility-two-state.md` | visibility 两状态 vs 三状态 | 3.5 |
| `docs/adr/005-about-card-inline.md` | about 卡片原地展开 vs 模态弹窗 | 3.5 |
| `docs/architecture.md` | 本文件（架构总览） | 汇总 |

---

## 与 Phase 0 技术选型的差异

tech-decisions-20260703.md 中的 7 项决策全部保留，但以下三点在 Phase 3 中细化：

1. **D1 拆分**（决策 #1）：从"1 个 D1"细化为"2 个 D1（主站 + 财务独立）"→ ADR-001
2. **博客元数据不入 D1**（决策 #1 补充）：blog 走 KV bridge → ADR-002
3. **Workers 拆分**（决策 #2）：保持 2 个，但 feed-api 升级为主站 API Worker → ADR-003

其余 4 项决策（Astro hybrid、React+shadcn/ui、Monorepo、行情 API、CI/CD）不变。

---

## 接下来

Phase 3 完成。木下回到「流程治理」对话报告：

> Phase 3 架构设计已完成。产出物：
> - `docs/architecture/data-model.md`
> - `docs/architecture/modules.md`
> - `docs/architecture/auth.md`
> - `docs/architecture.md`
> - `docs/adr/001-005` 共 5 份决策记录
>
> 需要流程治理更新的文件：
> - DASHBOARD.md: Phase 3 = ✅
> - CONTEXT.md: [原型约定 | Phase 3 重新裁决] → [已锁定]，开发状态更新
> - GLOSSARY.md: about 卡片定义修正（原地展开，非模态弹窗）
> - SITEMAP.md: API 端点路径更新
