# 站点地图 (SITEMAP)

> 公开主站 URL 结构、项目内非公开组件与主要 API 关系。
> 详细接口以实际 Worker 路由为准；本文不维护易过期的 deployment SHA 或 release queue。

---

## 主站 (catstarry.xyz)

### `/` — Home

| 属性 | 值 |
| --- | --- |
| 渲染 | SSG；客户端 island 只处理滚动阶段、Star Map / Focus 切换、Planet Push 与 About 原地展开 |
| 内容 | 宇宙入口（远处星点）→ 2–3 屏接近同一星域 → 五颗完整暖性地质星球的自由总览 → 单星 Focus 浏览 → 页脚；About 在 Home 原地展开 |
| 数据来源 | 静态星图目的地配置 + `/activity-signals.json` 三态固定投影；不读取 Blog / Feed / Learn / Projects 的最新内容作聚合流 |
| 交互 | 自然滚动按 About → Feed → Blog → Projects → Learn 浏览 Focus；总览可直接跳到任一 Focus；非 About 星球在 Focus action 后执行 Planet Push 并跳转；About 可直接展开，豹猫卫星是进入同一展开态的可选彩蛋 |
| 链接到 | /blog、/feed、/projects、/learn；在对应星球 Focus 中触发 action 后进入各功能页面 |

### `/blog/` — 博客列表页

| 属性   | 值                                                                |
| ------ | ----------------------------------------------------------------- |
| 渲染   | Site SSR；读取 source 后按 runtime Blog published projection 过滤 |
| 内容   | 当前 runtime published 文章，按日期倒序，分页                     |
| 失败   | publication service unavailable 时返回 503                        |
| 侧栏   | 分类筛选（中文显示名 + 计数）+ 标签云（加权字号）                 |
| RSS    | `<link rel="alternate">` 指向 `/blog/rss.xml`                    |
| 链接到 | `/blog/[slug]/`、`/blog/category/[category]/`、`/blog/tag/[tag]/` |

### `/blog/[slug]/` — 文章详情页

| 属性        | 值                                                              |
| ----------- | --------------------------------------------------------------- |
| 渲染        | Site SSR；只有当前 runtime published Blog source 正常公开       |
| 内容        | 标题 + 元信息 + Markdown/MDX 正文 + 阅读量 + 分享按钮 + Giscus 评论 |
| 状态        | publication service unavailable → 503；非当前 public slug → 404 |
| SEO         | OG 标签、Twitter card、meta description                         |
| slug 优先级 | frontmatter `slug` > 文件名                                     |
| 链接到      | `/blog/`（返回链接）、分类/标签筛选链接                         |

### `/blog/preview/[slug]/` — Blog 私有预览

| 属性 | 值 |
| --- | --- |
| 渲染 | Site SSR；共用 Feed owner session 与 `FEED_API` Service Binding |
| 内容 | draft / published / withdrawn 的 Blog source，使用正式文章阅读样式 |
| 安全 | 未认证跳转 `/feed/`；backend unavailable 返回 503；`noindex,nofollow,noarchive`；不记录公开阅读量、足迹或 activity |
| 链接到 | `/feed/admin/`（返回发布管理） |

### `/blog/admin/lifecycle` — Blog lifecycle Site proxy

| 属性 | 值 |
| --- | --- |
| 类型 | Site SSR API route；不是独立管理页面 |
| 方法 | PATCH |
| 作用 | `BlogLifecycleAdmin` 将 owner lifecycle mutation 通过 `FEED_API` transport 代理到 Feed Worker `/api/blog/admin/publications` |
| 失败 | Feed lifecycle service unavailable 时返回 503；认证/transition 校验由 Feed Worker contract 执行 |

### `/blog/category/[category]/` — 分类页

| 属性   | 值                                          |
| ------ | ------------------------------------------- |
| 渲染   | Site SSR；按 runtime published projection 过滤 |
| 类别   | tech（技术）、life（生活）、opinion（观点） |
| 内容   | 该分类下当前 published 文章列表，倒序      |
| 状态   | publication service unavailable → 503；无效分类／页码 → 404 |
| 链接到 | `/blog/`、`/blog/[slug]/`                   |

### `/blog/tag/[tag]/` — 标签页

| 属性   | 值                              |
| ------ | ------------------------------- |
| 渲染   | Site SSR；按 runtime published projection 过滤 |
| 内容   | 该标签下当前 published 文章列表，倒序 |
| 状态   | publication service unavailable → 503；无效标签／页码 → 404 |
| 链接到 | `/blog/`、`/blog/[slug]/`       |

### `/blog/rss.xml` — RSS Feed

| 属性 | 值 |
| ---- | --- |
| 渲染 | Site SSR |
| 格式 | RSS 2.0 |
| 包含 | 当前 runtime published Blog + runtime public Learn Note；按时间倒序 |
| 失败 | Blog 或 Learn publication service unavailable 时返回 503 |

### `/feed/` — Public Timeline

| 属性 | 值                                                               |
| ---- | ---------------------------------------------------------------- |
| 渲染 | SSR                                                              |
| 内容 | 面向访客呈现 Public Timeline：混排原生碎碎念、剪藏与 Public Footprint。Public Footprint 由 Blog、Learn、Projects 的合资格足迹来源事件产生，保存创建时快照并拥有独立可见性；原生 Feed 内容不属于 Public Footprint。 |
| 认证 | 访客浏览无需认证；Feed 发布与管理需要主站认证，登录交互位于 `/feed` |

### `/feed/admin/` — Feed / Blog 管理

| 属性 | 值 |
| --- | --- |
| 渲染 | SSR |
| 访问 | 需要主站认证；未认证时返回 `/feed/` |
| 内容 | Feed 管理与 Blog lifecycle / preview 入口 |
| 索引 | `X-Robots-Tag: noindex, nofollow`；页面使用 private/no-store 响应 |
| session | 与 `/feed` 共享主站认证 session |

### `/projects/` — 项目展示

| 属性 | 值                                                     |
| ---- | ------------------------------------------------------ |
| 渲染 | SSG                                                    |
| 内容 | 公开项目展示与项目外链；不在此维护项目数量或发布状态 |

### `/learn/` — 学习笔记

| 属性 | 值 |
| ---- | --- |
| 渲染 | Site SSR |
| 内容 | 从 Learn Markdown source 与 D1 runtime public publication state 合成当前公开 Note / Track 导航 |
| 状态 | publication service unavailable 时返回 503 |

### `/learn/notes/[slug]/` — Learn Note

| 属性 | 值 |
| --- | --- |
| 渲染 | Site SSR |
| 正常公开 | source 存在、不是 `withdrawn` / `superseded`，且 slug 当前位于 runtime public publication set |
| 状态 | publication service unavailable → 503；非当前 public Note → 404 |
| 历史例外 | source `withdrawn` 的直接 URL 可以保留历史页面与 withdrawn notice；它不因此重新进入正常 public corpus |

### `/learn/track/[track]/` — Learn Track

| 属性 | 值 |
| --- | --- |
| 渲染 | Site SSR |
| 内容 | 只使用当前 runtime public Note 组成该 Track 的 section / note 列表 |
| 状态 | publication service unavailable → 503；Track 无当前 public Note → 404 |

### `/learn/preview/[slug]/` — Learn 私有预览

| 属性 | 值 |
| --- | --- |
| 渲染 | Site SSR |
| 访问 | 需要主站 owner session；未认证跳转 `/feed/` |
| 内容 | source Note + owner runtime publication state；与正式 Note 共用阅读视图 |
| 索引 | private/no-store；`noindex,nofollow,noarchive` |

### `/learn/admin/` — Learn 管理

| 属性 | 值 |
| --- | --- |
| 渲染 | Site SSR |
| 访问 | 需要主站认证；未认证时返回 `/feed/` |
| 内容 | Owner Admin 提供 Publish / Hide / Show；production runtime 是正式 publication authority；withdrawn / superseded 只读 |
| Local Preview | 可登录、查看管理列表与预览，但 lifecycle mutation disabled |
| 索引 | `X-Robots-Tag: noindex, nofollow,noarchive`，并设置 `noindex` meta |
| session | 与 `/feed` 共享主站认证 session |

### `/learn/admin/lifecycle` — Learn lifecycle Site proxy

| 属性 | 值 |
| --- | --- |
| 类型 | Site SSR API route |
| 方法 | PATCH |
| 作用 | 将 owner lifecycle mutation 通过 `FEED_API` transport 代理到 Feed Worker `/api/learn/admin/publications` |
| 失败 | Feed lifecycle service unavailable 时返回 503 |

### `/sitemap.xml` — Public sitemap

| 属性 | 值 |
| --- | --- |
| 渲染 | Site SSR |
| 包含 | 固定公开入口 + 当前 runtime published Blog URL / category / tag + current public Learn Note / active Track |
| 不包含 | owner/admin/preview、Finance、非当前 public Learn Note |
| 失败 | Blog 或 Learn publication service unavailable 时返回 503 |

### `404` — 未匹配路由

| 属性 | 值 |
| ---- | -- |
| 渲染 | SSG 自定义 `404.html` |
| 内容 | 可理解的未找到状态，以及 Home / Blog / Learn 返回路径 |

---

## 相关项目组件

### `f.catstarry.xyz` — Finance（非公开）

| 属性       | 值                                                                                 |
| ---------- | ---------------------------------------------------------------------------------- |
| 公开性     | 内部私有工作区，不属于公开主站模块                                                 |
| 仓库职责   | current authority 在独立私有仓库；本仓库不维护其代码、部署、数据或认证             |
| 与主站关系 | 不出现在 Home 或公开 `sitemap.xml`，也不与主站数据或认证连接                        |

### `poker.catstarry.xyz` — Poker PWA

| 属性 | 值                    |
| ---- | --------------------- |
| 范围 | 独立站点，不属于公开主站内容或私有 Finance workspace |

---

## 主要 API 端点

### 主站 API（含公开与受保护接口）

| 端点 | Worker | 方法 | 说明 |
| --- | --- | --- | --- |
| `/api/views` | feed-api | GET/POST | 阅读量计数；POST 使用 D1 持久去重 + VIEW_KV 快速去重/限流，GET 需要 owner session |
| `/activity-signals.json` | feed-api | GET/HEAD | Home Activity Signal 静态投影读取 |
| `/api/feed` | feed-api | GET/POST | Public Timeline 读取与原生 Feed 发布；公开读取同时应用 Blog / Learn source lifecycle projection |
| `/api/auth/*` | feed-api | GET/POST | session、登录/登出，bcrypt + KV/D1 session |
| `/api/blog/publications` | feed-api | GET | 当前 runtime published Blog slug projection |
| `/api/blog/admin/publications` | feed-api | GET/PATCH | owner Blog lifecycle 读取与 published / withdrawn mutation |
| `/api/blog/internal/publications` | feed-api | POST | 受保护的 successful-production deploy manifest sync；维护 Blog runtime lifecycle，并按幂等规则处理合资格首次 publication |
| `/api/learn/publications` | feed-api | GET | D1 当前 public Learn publication projection（slug + published_at） |
| `/api/learn/admin/publications` | feed-api | GET/PATCH | owner runtime publication state；首次 Publish / Hide / Show；Local Preview mutation 返回 403 |
| `/api/learn/internal/publications` | feed-api | POST | 受保护的 Learn deploy sync v3；只处理已有 publication 的 revision metadata / revision footprint，并刷新 relation manifest；不执行首次 Publish |
| `/api/learn/complete` | feed-api | POST | 已认证的 legacy writer retirement boundary；固定返回 `410 legacy_writer_retired` |

Production-like Site SSR 通过 `FEED_API` Service Binding 调用这些 Feed Worker contracts；Local Preview 使用 localhost HTTP fallback。浏览器公开 API 仍通过同源 `/api/*` 访问。
