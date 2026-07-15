**Category**: enhancement
**Triage**: ready-for-agent
**Triage Date**: 2026-07-04

# /blog 板块 — Product Requirement Document

> **状态**：`ready-for-agent`
> **创建日期**：2026-07-03
> **作者**：to-prd skill → AI agent 合成
> **阶段**：Phase 1（首批上线）

---

## Problem Statement

木下需要一个个人博客，用来发表技术总结、生活感悟和个人观点。当前没有线上写作空间，无法将自己的思考沉淀为公开内容、也无法分享给他人。写作频率不高（2 周到 1 月一篇），但希望每篇文章都有深度和个人印记——像安永全《我的高考》那样的真实个人能量，配以 Airing 博客的干净结构。文章写完只需 git push 就能自动上线，零运维负担。

## Solution

在 catstarry.xyz 上建造 `/blog` 板块：基于 Markdown 写作、Git push 触发 Cloudflare Pages 自动构建部署的静态博客。每篇文章以「标题 → 背景（为什么）→ 过程（什么）→ 结果（感受/数据）」为叙事骨架。支持 RSS 订阅、分类/标签浏览、Giscus 评论、分享按钮、阅读量统计。一期全中文，二期加英文 UI 切换。

## User Stories

1. 作为木下，我想在本地用 Markdown 写完文章后 git push，文章自动上线，这样我不需要关心部署流程。
2. 作为木下，我想在文章 frontmatter 里填写标题、日期、分类、标签，构建时自动生成正确的页面路由和元数据。
3. 作为访客，我想在 /blog 首页看到按发布时间倒序排列的文章列表，每篇显示标题、日期、摘要和标签。
4. 作为访客，我想通过分类和标签筛选文章，快速找到感兴趣的内容类型。
5. 作为访客，我想在每篇文章底部看到阅读量，了解这篇文章的受欢迎程度。
6. 作为访客，我想通过 Giscus 评论系统对文章发表评论或查看他人评论，无需注册独立账号。
7. 作为访客，我想通过 RSS 订阅博客，在其他阅读器里接收更新通知。
8. 作为访客，我想通过分享按钮（X/Twitter、复制链接、微信朋友圈）将文章分享给朋友。
9. 作为木下，我想在文章中使用代码高亮、图片、表格等丰富的 Markdown 语法，技术文章也能美观呈现。
10. 作为木下，我想查看每篇文章的阅读量统计，了解内容传播情况。
11. 作为木下，我想博客的视觉风格与全站「艺术温暖」基调一致，不极简、有温度。
12. 作为访客，我在手机和平板上浏览博客时排版正常、阅读体验舒适。
13. 作为木下，我想文章 SEO 友好（Open Graph 标签、结构化元数据），让搜到的访客看到漂亮的分享预览。
14. 作为木下，我想文章 URL 简洁可读（如 /blog/why-i-started-blogging），便于分享和记忆。
15. 作为木下，我想未来能轻松加上英文 UI 切换（i18n），一期不需要改动架构。
16. 作为木下，我想一篇新文章只在首次生产部署成功后产生一条 Feed 公开足迹；普通编辑、失败或重复部署不增加足迹。

## Implementation Decisions

### 架构决策

- **渲染模式**：SSG（纯静态生成）。/blog 板块的全部页面在 `astro build` 时生成静态 HTML，无运行时依赖。与「决策 3」一致。
- **内容源**：`content/blog/` 目录下的 Markdown 文件，每篇一个 `.md` 文件。使用 Astro Content Collections 管理。
- **路由**：`/blog/` 为文章列表首页，`/blog/[slug]/` 为文章详情页。slug 从文件名或 frontmatter 的 `slug` 字段派生。
- **构建触发**：Git push → main 分支 → Cloudflare Pages 自动构建部署（`astro build`，输出目录 `dist/`）。
- **公开足迹触发**：只有新文章的首次生产部署成功后，受控生产者才调用 Public Footprint Writer。稳定 `publication_id` 是去重依据；Git SHA、部署 ID、构建开始、构建失败和重复部署均不构成足迹版本。

### /blog 页面结构

- `/blog/` — 文章列表页（分页，按发布时间倒序）
  - 每篇文章卡片：标题、发布日期、分类、标签、摘要
  - 侧栏或顶部：分类筛选 + 标签云
- `/blog/[slug]/` — 文章详情页
  - 文章标题 + 元信息（日期、分类、标签、阅读量）
  - Markdown 渲染正文
  - 底部：分享按钮 → Giscus 评论区
- `/blog/rss.xml` — RSS feed（构建时生成）

### 文章 frontmatter schema

每篇 Markdown 文件顶部携带以下元数据：

```
title: string          # 文章标题
date: Date             # 发布日期（YYYY-MM-DD）
category: string       # 分类（如 "tech" | "life" | "opinion"）
tags: string[]         # 标签列表（如 ["astro", "cloudflare"]）
description: string    # 摘要（用于列表页 + SEO meta）
slug?: string          # 可选自定义 slug，默认从文件名派生
draft?: boolean        # 草稿标记，true 时不生成页面
```

### 分类与标签

- **分类**：粗粒度分组，一篇文章只属于一个分类。一期定义三类：`tech`（技术）、`life`（生活）、`opinion`（观点）。
- **标签**：细粒度主题词，一篇文章可有多个标签。用于标签云和交叉发现。
- 分类页面路由：`/blog/category/[category]/`
- 标签页面路由：`/blog/tag/[tag]/`

### RSS feed

- 构建时从 Content Collection 读取已发布文章（非 draft），生成 `/blog/rss.xml`。
- 格式：RSS 2.0，包含文章标题、摘要、链接、发布日期。
- 在 `/blog/` 页面 `<head>` 中添加 `<link rel="alternate" type="application/rss+xml">` 自动发现标签。

### Giscus 评论

- 使用 Giscus 组件（`@giscus/react`），以 React island 形式嵌入文章详情页底部。
- 配置：GitHub Discussions 驱动，repo 为 catstarry.xyz 仓库，按文章 slug 映射到独立 discussion。
- 一期不需要邮件通知，Giscus 自带 GitHub 通知即可。

### 分享按钮

- 三个分享渠道，纯前端实现：
  - **X/Twitter**：构造 `https://twitter.com/intent/tweet?text=标题&url=文章链接`，新窗口打开
  - **复制链接**：`navigator.clipboard.writeText()`，点击后显示「已复制」toast
  - **微信朋友圈**：显示一个包含文章链接的提示文案（微信朋友圈不支持直接分享 URL，需引导用户手动复制）

### 阅读量统计

- 需要一个后端 API 端点记录和查询阅读量。
- **复用 feed-api Worker**：在现有 feed-api Worker 上新增 `/api/views` 端点。
  - `POST /api/views` — body: `{ slug: string }`，记录一次阅读
  - `GET /api/views?slug=xxx` — 返回 `{ slug: string, count: number }`
  - `GET /api/views?slugs=slug1,slug2,...` — 批量查询（列表页用）
- 前端：文章详情页加载时调用 POST 记录阅读；列表页和详情页通过 GET 获取阅读量显示。
- 去重：按 IP + 文章 slug + 当日日期去重（用 KV 存储 `ip:slug:date` key，TTL 24 小时），避免刷量。
- 数据存储：D1 中创建 `blog_views` 表（`slug TEXT PRIMARY KEY, count INTEGER DEFAULT 0`）。

### 测试接缝

- **最高接缝**：`astro build` 的构建产物（`dist/` 目录下的静态 HTML）。验证所有页面是否正确生成、路由是否可访问、meta 标签是否存在。
- **接口接缝**：阅读量 API（`POST/GET /api/views`）的 HTTP 请求/响应。验证计数逻辑和去重。
- **发布接缝**：新文章首次生产部署成功 → Feed 可看到一条来源为 Blog 的公开足迹；普通编辑、失败和重复部署不产生第二条。
- **组件接缝**：React island 组件（Giscus、分享按钮、分类/标签筛选）的客户端行为。

### 视觉基调

- 遵循全站「艺术温暖」风格：不极简，偏艺术，有温度。
- 排版：中文优先，大字号、宽松行高、舒适阅读宽度（~680px）。
- 文章详情页参考 Airing 的干净结构 + 安永全《我的高考》的个人表达能量。
- 具体视觉设计在实现阶段由 AI 设计工具定稿（木下在需求中已明确）。

## Testing Decisions

- **测试哲学**：只测外部可观测行为——页面生成正确、路由可访问、API 响应符合契约、交互行为正常。不测 Astro 内部实现细节或 React 组件内部状态。
- **构建验证**：`astro build` 成功后，检查 `dist/blog/` 目录下的输出——确认文章列表页、详情页、分类/标签页、RSS XML 均已生成，且 draft 文章未输出。
- **API 测试**：对 `/api/views` 端点发送模拟请求，验证 POST 增加计数、GET 返回正确值、去重逻辑生效。
- **组件测试**：分享按钮点击后 URL 正确构造、复制链接后 clipboard 内容正确。Giscus 加载后 iframe 存在。分类和标签筛选后列表变化正确。
- **先验参考**：项目中暂无已有测试。一期可为 `/api/views` 端点编写轻量 HTTP 契约测试（ping → assert status/body），使用 Astro 项目已有工具链（vitest 或 node:test）。

## Out of Scope

- **英文 UI 切换（i18n）**：一期全中文，二期再做多语言支持。
- **全文搜索**：一期不实现站内搜索，分类 + 标签 + 列表页已覆盖内容发现需求。
- **邮件订阅/邮件通知**：不做。RSS 已覆盖订阅需求，Giscus GitHub 通知已覆盖评论通知。
- **文章草稿预览**：不做。木下本地 `npm run dev` 即可预览。
- **社交媒体自动同步**：不做。分享按钮已提供手动分享入口。
- **评论审核/管理后台**：不做。Giscus 依赖 GitHub Discussions 原生管理。
- **文章评论数展示**：一期不做。Giscus 加载评论时会自带计数，如需要可在二期在列表页展示。

## Further Notes

- /blog 是 Phase 1 的旗舰板块，它的上线为后续模块建立 Markdown 内容与 Git push 部署模式；Home 不再聚合内容，重要发布由 Feed 记录为公开足迹。
- 阅读量 API 设计为通用计数器，后续 /projects、/learn 板块可直接复用同一端点，只需传不同的资源标识。
- 分类和标签的中文显示名（如 "技术" / "tech"）在实现时做映射。一期 frontmatter 用英文 slug（tech/life/opinion），前端映射为中文。
- RSS feed 的生成时机在 `astro build` 阶段，利用 Astro 的静态文件生成能力或自定义集成。

---

> **Triage**: `ready-for-agent` — PRD 已完整，可直接进入实现阶段。
