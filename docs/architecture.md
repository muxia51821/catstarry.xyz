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
        │
        └─ successful production deploy sync
                ↓
        Blog runtime lifecycle state
                ↓
        Site SSR public projection
                ↓
        first formal publication（幂等）
                ↓
        D1 public_footprints
```

Blog source 与公开 projection 是不同边界。首次 publication 可以由 owner lifecycle transition 或符合条件的 deploy sync 完成，两条路径共享同一幂等 publication identity。公开 Blog routes、RSS 和 sitemap 只使用当前 runtime published projection。

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

`feed_posts` 与 `public_footprints` 是独立写模型；Public Timeline 只在读取时统一。Home 不消费 Public Timeline。

当前 `/feed` 页面由 Astro 输出页面壳，`FeedApp` island 在浏览器读取 `/api/feed` 并渲染时间线。

### Home

```text
/ (SSG)
  → Entry / Star Map / Focus / About
  → static destinations
  → /activity-signals.json
       → blog / feed / learn / projects
       → active / stable / dormant only
```

Home 不请求 `/api/home`，不读取跨模块标题、摘要、列表或最近内容。Activity Signal Projection 在 Feed Worker 内根据合资格公开事件计算最小状态，并写入 R2 固定对象；投影不可用时 Home 隐藏信号卫星。

### Finance

```text
Finance Pages
    → finance-api Worker
    → finance D1 / Finance auth KV
    → market providers / scheduled refresh
```

Finance 与公开主站使用独立 Worker、D1、认证和页面部署，不进入 Content Family 数据链路。

### Authentication

主站 owner session 由 Feed Worker 管理，Site SSR owner routes 通过 `FEED_API` transport 验证；浏览器通过同源 auth routes 登录。Finance 使用独立 session storage 与 cookie，不与主站共享认证状态。

---

## 架构边界

- 主站 deployment unit 是 Cloudflare Site Worker；Finance frontend 是独立 Cloudflare Pages deployment。
- Site SSR 与 Feed Worker 通过 Request boundary 解耦，不直接 import Worker implementation。
- Blog / Learn source presence 不等于 public visibility；两者的公开 route 都受 runtime publication lifecycle 约束。
- Public Footprint 与原生 Feed 记录分存；Public Timeline 是统一读取 projection。
- Learn Markdown 是 canonical source；runtime publication state 不存 Note 正文；deployed relation metadata 不构成 relation database。
- Home 只消费最小 activity projection，不恢复跨模块内容聚合。
- 主站与 Finance 保持独立数据和认证边界。
- Durable architecture decisions 由 `docs/adr/` 记录；current implementation details 由对应 architecture child、source 和 tests 负责。
