**Category**: enhancement
**Triage**: completed
**Triage Date**: 2026-07-04

# Slice 7：RSS Feed

> **状态**：`completed`
> **创建日期**：2026-07-03
> **来源 PRD**：`.scratch/blog/issue.md`
> **覆盖 User Stories**：US7（RSS 订阅）

---

## 目标

构建时从 Content Collection 生成 `/blog/rss.xml`（RSS 2.0 格式），并在 `/blog/` 列表页 `<head>` 添加 RSS 自动发现链接。

## 验收标准

- [ ] `astro build` 后在 `dist/blog/rss.xml` 生成有效的 RSS 2.0 XML
- [ ] RSS 包含所有非 draft 文章，每篇包含：`<title>`、`<link>`、`<description>`、`<pubDate>`（RFC 822 格式）
- [ ] RSS `<channel>` 包含 `<title>`（博客名称）、`<link>`（博客 URL）、`<description>`（博客简介）、`<lastBuildDate>`
- [ ] `/blog/` 列表页 `<head>` 包含 `<link rel="alternate" type="application/rss+xml" href="/blog/rss.xml">`
- [ ] draft 文章不出现在 RSS 中
- [ ] XML 内容正确转义（标题/摘要中的 `&`、`<`、`>` 等特殊字符）

## 技术要点

- 使用 Astro 静态文件端点（`src/pages/blog/rss.xml.ts` 或 `.astro`），在构建时生成
- 从 `getCollection("blog")` 获取文章数据，过滤 draft
- 日期格式化为 RFC 822（如 `Mon, 01 Jan 2024 00:00:00 +0800`）
- 文章 URL 使用完整域名（`https://catstarry.xyz/blog/<slug>/`）
- 如文章无 `description` frontmatter 字段，用正文前 200 字截断作为摘要

## 测试接缝

- **构建产物验证**：`astro build` 后 `dist/blog/rss.xml` 存在
- **XML 格式检查**：解析为有效 XML，包含所有 `<item>` 节点
- **draft 过滤**：draft 文章的 slug 不出现在 XML 中
- **日期格式**：`<pubDate>` 符合 RFC 822 格式
- **自动发现**：`dist/blog/index.html` 中包含 `<link rel="alternate" type="application/rss+xml">` 标签

## 依赖

- Slice 1（Content Collection — 文章数据源）

## 被依赖

- 无

---

> **Triage**: `completed`
