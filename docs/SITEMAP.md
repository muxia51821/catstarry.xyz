# 站点地图 (SITEMAP)

> catstarry.xyz 全站 URL 结构与各页面间链接关系。
> 最后更新：2026-07-15

---

## 主站 (catstarry.xyz)

### `/` — Home

| 属性 | 值 |
| --- | --- |
| 渲染 | 待定向 Phase 3 架构复核；Home 不再承担内容聚合 |
| 内容 | 宇宙入口 → 接近星域 → 自由星图总览 → 页脚；About 在 Home 原地展开 |
| 数据来源 | 星图导航所需数据待定向 Phase 3 裁决；不读取 Blog / Feed / Learn / Projects 的最新内容作聚合流 |
| 链接到 | /blog、/feed、/projects、/learn；点击对应星球后进入各功能页面 |

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
| 内容 | 公开足迹／来时路：碎碎念、剪藏，以及 Blog 发布、Learn 小节完成、Projects 实质更新产生的系统事件；具体事件模型待定向 Phase 3 裁决 |
| 认证 | 发布需登录（右下角浮动 + 按钮）                                  |
| 状态 | ✅ 需求已锁定，🔴 未开发                                         |

### `/projects/` — 项目展示

| 属性 | 值                                                     |
| ---- | ------------------------------------------------------ |
| 渲染 | SSG                                                    |
| 内容 | 卡片网格，最近 2 个项目（含 poker.catstarry.xyz 链接） |
| 状态 | ✅ 需求已锁定，🔴 未开发                               |

### `/learn/` — 学习笔记

| 属性 | 值                                   |
| ---- | ------------------------------------ |
| 渲染 | SSG                                  |
| 内容 | teach skill 产出的 lesson track 列表 |
| 状态 | ✅ 需求已锁定，🔴 未开发             |

---

## 子域名

### `f.catstarry.xyz` — 财务面板

| 属性       | 值                              |
| ---------- | ------------------------------- |
| 部署       | 独立 CF Pages / Workers 项目    |
| 访问控制   | 密码鉴权（木下读写、cati 只读） |
| 与主站关系 | 完全不显示在 Home               |
| 状态       | ✅ 需求已锁定，🔴 未开发        |

### `poker.catstarry.xyz` — Poker PWA

| 属性 | 值                    |
| ---- | --------------------- |
| 部署 | Netlify（CNAME 指向） |
| 状态 | ✅ 已上线             |

---

## API 端点

| 端点            | Worker      | 方法     | 说明                                      |
| --------------- | ----------- | -------- | ----------------------------------------- |
| `/api/views`    | feed-api    | GET/POST | 阅读量计数，D1 + KV 去重                  |
| `/api/feed`     | feed-api    | GET/POST | 时间线数据 + 发布帖子                     |
| `/api/auth`     | feed-api    | POST     | 登录/登出，bcrypt + KV session            |
| `/api/home`     | feed-api    | GET      | 待定向 Phase 3 退役或替代；旧职责为 Home 聚合数据（blog/feed/learn/projects） |
| `/api/trades`   | finance-api | GET/POST | 交易记录 CRUD                             |
| `/api/holdings` | finance-api | GET      | 实时持仓 + 偏离预警                       |
| `/api/market`   | finance-api | GET      | 行情数据（15 分钟延迟）                   |
| `/api/pe`       | finance-api | GET      | PE 温度计数据                             |
| `/api/circuit`  | finance-api | GET      | 熔断状态                                  |
