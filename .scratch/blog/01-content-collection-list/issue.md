**Category**: enhancement
**Triage**: completed
**Triage Date**: 2026-07-04

# Slice 1：博客骨架 — Content Collection + 列表页

> **状态**：`completed`
> **创建日期**：2026-07-03
> **来源 PRD**：`.scratch/blog/issue.md`
> **覆盖 User Stories**：US1（git push 自动上线）、US2（frontmatter schema）、US3（列表页倒序）、US9 部分（Markdown 渲染基础）

---

## 目标

搭建 /blog 板块的骨架：定义 Content Collection schema、放一篇示例文章、生成 `/blog/` 文章列表页（分页、倒序、卡片）。构建成功后 `dist/blog/` 下出现列表页和示例文章页。

## 验收标准

- [ ] `src/content/config.ts` 中定义 `blog` collection，schema 包含：`title`（string）、`date`（Date）、`category`（string）、`tags`（string[]）、`description`（string）、`slug`（string optional）、`draft`（boolean optional）
- [ ] `content/blog/` 下至少有一篇示例文章（`.md`），frontmatter 字段完整
- [ ] `/blog/` 页面（`src/pages/blog/index.astro`）列出所有非 draft 文章，按 `date` 倒序
- [ ] 每篇文章卡片显示：标题（链接到详情页）、发布日期、分类中文名、标签、摘要
- [ ] 列表页支持分页（如每页 10 篇），超出时显示分页导航
- [ ] draft 文章不出现在列表页，且不生成独立页面
- [ ] `astro build` 成功，`dist/blog/` 下输出列表页 HTML

## 技术要点

- 使用 Astro Content Collections（`getCollection("blog")`）
- 分类中文映射：`tech` → "技术"、`life` → "生活"、`opinion` → "观点"
- slug 优先级：frontmatter `slug` > 文件名（去扩展名）
- 分页使用 Astro 内置 `paginate()` 或手动实现
- 列表页 `<head>` 包含基础 SEO meta（title、description）

## 测试接缝

- **构建产物验证**：`astro build` 后检查 `dist/blog/index.html` 存在，包含文章列表 HTML
- **draft 过滤**：指定一篇 draft: true 的文章，确认不出现在 `dist/` 中
- **分页**：文章数量超过每页上限时，确认 `dist/blog/2/`（或对应分页路径）生成

## 依赖

- 无前置依赖（这是第一个 slice）

## 被依赖

- Slice 2（全局排版基线）
- Slice 3（文章详情页）
- Slice 4（分类 + 标签系统）
- Slice 5（阅读量统计）
- Slice 7（RSS Feed）

---

> **Triage**: `completed`
