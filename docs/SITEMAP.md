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
| 渲染   | SSG                                                               |
| 内容   | 所有非 draft 文章，按日期倒序，分页                               |
| 侧栏   | 分类筛选（中文显示名 + 计数）+ 标签云（加权字号）                 |
| RSS    | `<link rel="alternate">` 指向 `/blog/rss.xml`                     |
| 链接到 | `/blog/[slug]/`、`/blog/category/[category]/`、`/blog/tag/[tag]/` |

### `/blog/[slug]/` — 文章详情页

| 属性        | 值                                                              |
| ----------- | --------------------------------------------------------------- |
| 渲染        | SSG                                                             |
| 内容        | 标题 + 元信息 + Markdown 正文 + 阅读量 + 分享按钮 + Giscus 评论 |
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

### `/blog/category/[category]/` — 分类页

| 属性   | 值                                          |
| ------ | ------------------------------------------- |
| 渲染   | SSG                                         |
| 类别   | tech（技术）、life（生活）、opinion（观点） |
| 内容   | 该分类下非 draft 文章列表，倒序             |
| 链接到 | `/blog/`、`/blog/[slug]/`                   |

### `/blog/tag/[tag]/` — 标签页

| 属性   | 值                              |
| ------ | ------------------------------- |
| 渲染   | SSG                             |
| 内容   | 该标签下非 draft 文章列表，倒序 |
| 链接到 | `/blog/`、`/blog/[slug]/`       |

### `/blog/rss.xml` — RSS Feed

| 属性 | 值                                                     |
| ---- | ------------------------------------------------------ |
| 渲染 | SSG（构建时生成）                                      |
| 格式 | RSS 2.0                                                |
| 包含 | 非 draft 文章：title、link、description、pubDate、guid |

### `/feed/` — Public Timeline

| 属性 | 值                                                               |
| ---- | ---------------------------------------------------------------- |
| 渲染 | SSR                                                              |
| 内容 | 面向访客呈现 Public Timeline：混排原生碎碎念、剪藏与 Public Footprint。Public Footprint 由 Blog、Learn、Projects 的合资格足迹来源事件产生，保存创建时快照并拥有独立可见性；原生 Feed 内容不属于 Public Footprint。 |
| 认证 | 访客浏览无需认证；Feed 发布与管理需要主站认证，登录交互位于 `/feed` |

### `/feed/admin` — Feed 管理

| 属性 | 值 |
| --- | --- |
| 渲染 | SSR |
| 访问 | 需要主站认证；未认证时返回 `/feed` |
| 索引 | `X-Robots-Tag: noindex, nofollow`；页面使用 private/no-store 响应 |
| session | 与 `/feed` 共享主站认证 session |

### `/learn/admin` — Learn 管理

| 属性 | 值 |
| --- | --- |
| 渲染 | SSR |
| 访问 | 需要主站认证；未认证时返回 `/feed/` |
| 索引 | `X-Robots-Tag: noindex, nofollow, noarchive`，并设置 `noindex` meta |
| session | 与 `/feed` 共享主站认证 session |

### `/projects/` — 项目展示

| 属性 | 值                                                     |
| ---- | ------------------------------------------------------ |
| 渲染 | SSG                                                    |
| 内容 | 公开项目展示与项目外链；不在此维护项目数量或发布状态 |

### `/learn/` — 学习笔记

| 属性 | 值                                   |
| ---- | ------------------------------------ |
| 渲染 | SSG                                  |
| 内容 | 公开学习笔记与 lesson track 导航 |

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
| 公开性     | 项目内非公开工作区，不属于公开主站模块                                             |
| 访问范围   | 通过 `f.catstarry.xyz` 独立域名访问；Finance session required，木下 admin、cati viewer |
| 与主站关系 | 不出现在 Home 或公开 `sitemap.xml`；使用独立认证系统                                |

### `poker.catstarry.xyz` — Poker PWA

| 属性 | 值                    |
| ---- | --------------------- |
| 范围 | 独立站点，不属于公开主站内容或 Finance workspace |

---

## 主要 API 端点

### 主站 API（含公开与受保护接口）

| 端点            | Worker      | 方法     | 说明                                      |
| --------------- | ----------- | -------- | ----------------------------------------- |
| `/api/views`    | feed-api    | GET/POST | 阅读量计数，D1 + KV 去重                  |
| `/activity-signals.json` | feed-api | GET/HEAD | Home Activity Signal 静态投影读取 |
| `/api/feed`     | feed-api    | GET/POST | Public Timeline 读取与原生 Feed 发布；时间线统一呈现原生 Feed 记录和 Public Footprint |
| `/api/auth/*`   | feed-api    | GET/POST | session、登录/登出，bcrypt + KV/D1 session |
| `/api/blog/internal/publications` | feed-api | POST | 受保护的 Blog 首次生产发布 manifest |
| `/api/learn/internal/publications` | feed-api | POST | 受保护的 Learn publication manifest v2；仅生产部署后的新增／修订产生 Feed 足迹 |
| `/api/learn/complete` | feed-api | POST | 已认证的 legacy writer retirement boundary；固定返回 `410 legacy_writer_retired` |

### 非公开 Finance API

| 前缀                         | Worker      | 访问控制                 | 主要能力                                                                                  |
| ---------------------------- | ----------- | ------------------------ | ------------------------------------------------------------------------------------------- |
| `f.catstarry.xyz/api/*`      | finance-api | Finance session required | auth、trades、monthly、plan、cash-flows、assets、holdings、market、PE、risk、circuit、review、import-review、archive、stewardship |
