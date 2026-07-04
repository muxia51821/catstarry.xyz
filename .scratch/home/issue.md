**Category**: enhancement
**Triage**: ready-for-agent
**Triage Date**: 2026-07-04

# Home（聚合首页） — Product Requirement Document

> Status: ready-for-agent
> Date: 2026-07-04
> Source: to-prd skill, Phase 1 JSON
> Phase: Phase 2

---

## Problem Statement

catstarry.xyz has multiple content sections: /blog, /feed, /learn, /projects. Each works alone, but no unified entry for visitors to see Muxia digital life at a glance - like a flowing river mixing all content.

## Solution

Build Home at / (root) - B-type digital life stream:

- First item: about card (3D particle portrait + one-line intro, click to expand full self-intro + animation)
- Timeline mix: 5 sources (blog, feed notes, feed clips, projects, learn), time desc, 15 per page, auto-load next
- Type visual distinction: card design differences + colored badge with text label
- Login filter: Muxia can filter by type after login; visitors cannot
- Independent navbar: cleaner, sci-fi design feel (different from Base layout)
- SEO: complete title, description, OG tags

## Hard Constraints (from Phase 1 JSON)

- 技术栈：Astro hybrid(SSR模式) + React(shadcn/ui)
- 部署：Cloudflare Pages
- 数据来源仅限站内已上线板块，不拉外部平台
- f.catstarry.xyz不显示在首页（私密）
- poker.catstarry.xyz作为/projects的一个项目出现，不直接嵌入首页卡片
- 草稿博客(draft:true)和隐藏feed帖子(仅我可见)不出现在首页
- /learn按最后更新时间混排（不按创建时间，因为笔记会持续修订）
- 无格言横幅、无签名式大标语
- 一期全站中文

## User Stories

1. 打开 catstarry.xyz，第一眼看到 about 卡片：3D 粒子画像 + 一句话简介，知道这是木下的个人网站。
2. 点击 about 卡片，原地展开看到完整自我介绍 + 动画效果，不需要跳转到独立 /about 页面。
3. about 卡片下方是五个来源的混合时间线，按时间倒序排列，像流动的河浏览木下的数字生活。
4. 看到博客卡片（标题+摘要+标签）、碎碎念卡片（文字+图片网格/视频封面）、剪藏卡片（标题+摘要+封面缩略图+点评）、项目卡片、学习笔记卡片，五种卡片视觉可区分。
5. 每种内容卡片上有彩色角标+文字标签（博客/碎碎念/剪藏/项目/学习笔记），不看卡片样式也能知道内容类型。
6. 滚动到页面底部时自动加载下一页 15 条（或翻页导航：上一页/页码/下一页），浏览不中断。
7. 点击任意卡片跳转到对应的内容详情页（/blog/xxx, /feed, /learn, /projects 等）。
8. 登录后首页出现类型筛选按钮，可以选择只看博客/碎碎念/剪藏/项目/学习笔记，预览各板块内容。
9. 退出登录/访客访问时筛选按钮隐藏，时间线始终保持全量混排。
10. 首页导航栏简洁、有科幻设计感，与 /blog、/feed 等子页的导航栏明显不同。
11. 首页 title 显示猫星云 - 木下的数字生活，分享到社交媒体时有漂亮的 OG 预览卡片。
12. 草稿博客（draft:true）、隐藏 feed 帖子（仅我可见）、草稿 learn 笔记均不出现在首页。
13. learn 笔记按最后更新时间（非首次发布时间）参与排序，修订后的笔记能重新出现在时间线前方。
14. f.catstarry.xyz 不显示在首页（私密），poker.catstarry.xyz 作为 /projects 的一个项目出现。

## Implementation Decisions

### 架构决策

- 渲染模式：SSR。需要实时反映最新内容，SSG 不适合动态聚合五个数据源。Phase 3 裁决具体数据获取策略（KV 缓存 + 短 TTL 降低首次加载时间）。
- 数据来源：五个板块各自提供数据接口或静态数据：
  - /blog：Astro Content Collections（已上线，SSG）
  - /feed：D1（feed_posts 表）
  - /learn：D1/文件（待 Phase 3 确定）
  - /projects：待定义（Phase 3+）
- 分页策略：单页 15 条，自动加载下一页（前端 fetch，后端返回下一页数据）。
- 缓存策略：首页数据变化频率低，可 KV 缓存首页数据 + 短 TTL（如 60 秒），减轻混合查询压力。

### about 卡片

- 位置：时间线第一条（固定）。
- 默认态：3D 粒子画像（AI 生成木下头像）+ 一句话简介。
- 展开态：原地撑大（非弹窗），完整自我介绍文案 + 动画过渡。
- 收起：再次点击或点击外部区域。
- 3D 画像的具体艺术方向在 Phase 4 设计阶段确定。

### 时间线混合排序规则

- 按时间倒序：blog（发布时间）、feed 碎碎念/剪藏（created_at）、projects（发布时间）、learn（最后更新时间 updated_at）。
- 单页 15 条。
- 超过 15 条：自动加载下一页。备选方案：翻页导航（上一页/页码/下一页）。

### 卡片视觉区分

五种内容类型各有独立的卡片设计 + 角标：

| 内容类型 | 角标文字 | 卡片特征 |
|----------|---------|---------|
| 博客 | 博客 | 标题+摘要+标签 |
| 碎碎念 | 碎碎念 | 文字+图片网格/视频封面 |
| 剪藏 | 剪藏 | 标题+摘要+封面缩略图+点评 |
| 项目 | 项目 | 项目名+描述+链接 |
| 学习笔记 | 学习笔记 | 标题+摘要（角标颜色更醒目） |

具体角标颜色值在 Phase 4 设计阶段确定。

### 导航栏

- 首页独立导航栏，不复用 Base 布局导航。
- 风格：简洁 + 科幻设计感，与子页差异化。
- 具体视觉方向和交互细节在 Phase 4 设计阶段细化。

### SEO

- title: 猫星云 — 木下的数字生活
- meta description: 木下的个人网站，写技术、生活和观点，记录碎片与思考
- OG 标签：og:title, og:description, og:type(website), og:url, og:image（待定）

### 设计基调

- 继承全站艺术温暖视觉风格。
- 首页为独立 layout（非 Base layout），科幻导航栏需与温暖基调协调（Phase 4 解决——科幻感可通过色彩/动效/字体体现，不改变温暖基调）。
- 首页 og:image：待定（Phase 4 设计阶段生成 AI 画像时可一并产出）。

## Testing Decisions

- 最高接缝：astro build 或 wrangler dev 产物。验证首页 HTML 包含 about 卡片和 15 条混排内容。
- 数据接缝：五个数据源的聚合逻辑——验证草稿/隐藏内容被正确排除，learn 笔记按 updated_at 排序。
- 分页接缝：验证自动加载下一页返回正确的后续内容。
- 认证接缝：登录后筛选按钮出现，筛选逻辑正确。
- 先验参考：博客板块的静态验证模式。Home 为 SSR，需额外验证服务端聚合正确性。
- 测试哲学：只测外部可观测行为——HTML 结构、渲染结果、交互行为。

## Out of Scope

- 访客端筛选——不做。木下登录后的筛选是内部功能。
- 格言横幅/签名式大标语——不做。about 卡片已涵盖自我介绍。
- 外部平台内容聚合（Twitter、GitHub 等）——不做。只聚合站内已上线板块。
- f.catstarry.xyz 显示——不做。私密板块。
- poker.catstarry.xyz 直接嵌入首页卡片——不做。作为 /projects 项目出现。

## Further Notes

- Home 是 Phase 5+ 的板块，依赖 /blog、/feed、/learn、/projects 全部或部分上线后才有内容聚合。
- 五个数据源的聚合接口需要在 Phase 3（架构设计）中统一定义，避免各板块各自实现导致重复工作。
- KV 缓存是降低首页加载时间的关键——不需每次请求都查询 D1+Content Collections+文件系统。
- about 卡片是首页唯一的固定元素（不参与分页），其余内容按时间倒序+分页。
- 科幻导航栏与全站艺术温暖基调的协调是 Phase 4 设计的核心挑战。

---

> **Triage**: ready-for-agent - PRD 已完整。Phase 3 架构设计时确定数据聚合接口和缓存策略。
