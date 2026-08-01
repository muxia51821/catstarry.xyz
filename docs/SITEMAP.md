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
| 交互 | 自然滚动按 About → Feed → Blog → Projects → Learn 浏览 Focus；总览可直接跳到任一 Focus；非 About 星球在 Focus action 后执行 Planet Push 并跳转；About 可直接展开，豹猫星座是进入同一展开态的可选彩蛋 |
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

### `/feed/` — 统一时间线

| 属性 | 值                                                               |
| ---- | ---------------------------------------------------------------- |
| 渲染 | SSR                                                              |
| 内容 | 公开足迹／来时路：原生碎碎念、剪藏，以及 Blog 首次生产部署成功、Learn 小节完成、Projects 显式实质更新产生的系统事件；系统足迹保存创建时快照，可独立隐藏，不影响来源内容；不做历史回填 |
| 认证 | 发布需登录（右下角浮动 + 按钮）                                  |
| 状态 | 已实现：公开时间线、登录发布、管理、媒体与系统足迹；SSR 失败可理解 |

### `/projects/` — 项目展示

| 属性 | 值                                                     |
| ---- | ------------------------------------------------------ |
| 渲染 | SSG                                                    |
| 内容 | 卡片网格，最近 2 个项目（含 poker.catstarry.xyz 链接） |
| 状态 | 已实现：生产 JSON 数据、稳定 `projectId`、真实截图与外链；按已确认验收直接跳转项目外链，不设置站内详情路由 |

### `/learn/` — 学习笔记

| 属性 | 值                                   |
| ---- | ------------------------------------ |
| 渲染 | SSG                                  |
| 内容 | teach skill 产出的 lesson track 列表 |
| 状态 | 已实现：Content Collection、轨道/笔记、搜索、TOC、wikilink 与知识图谱 |

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
| 公开性     | 项目内非公开工作区，不属于公开站点模块                                             |
| 部署       | 独立 CF Pages / Workers 项目                                                       |
| 访问控制   | 密码鉴权（木下读写、cati 只读）                                                    |
| 与主站关系 | 不出现在 README、Home 或公开 `sitemap.xml`；通过独立 Finance 域名访问              |
| 状态       | Phase 7 production release 已完成；Phase 8 持续维护，真实数据/provider/完整业务流程按独立验收推进 |

### `poker.catstarry.xyz` — Poker PWA

| 属性 | 值                    |
| ---- | --------------------- |
| 部署 | Netlify（CNAME 指向） |
| 状态 | ✅ 已上线             |

---

## 主要 API 端点

### 主站 API（含公开与受保护接口）

| 端点            | Worker      | 方法     | 说明                                      |
| --------------- | ----------- | -------- | ----------------------------------------- |
| `/api/views`    | feed-api    | GET/POST | 阅读量计数，D1 + KV 去重                  |
| `/activity-signals.json` | feed-api | GET/HEAD | R2 固定 Home 三态投影；超过三小时拒绝陈旧资源 |
| `/api/feed`     | feed-api    | GET/POST | 公开足迹时间线（原生内容 + 系统足迹）+ 原生发布 |
| `/api/auth/*`   | feed-api    | GET/POST | session、登录/登出，bcrypt + KV/D1 session |
| `/api/blog/internal/publications` | feed-api | POST | 受保护的 Blog 首次生产发布 manifest |
| `/api/learn/*`  | feed-api    | POST     | Learn 发布适配器、完成足迹与发布 manifest |

### 非公开 Finance API

| 前缀                         | Worker      | 访问控制                 | 主要能力                                                                                  |
| ---------------------------- | ----------- | ------------------------ | ------------------------------------------------------------------------------------------- |
| `f.catstarry.xyz/api/*`      | finance-api | Finance session required | auth、trades、monthly、plan、cash-flows、assets、holdings、market、PE、risk、circuit、review、import-review、archive、stewardship |
