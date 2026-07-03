# Slice 3：文章详情页

> **状态**：`ready-for-agent`
> **创建日期**：2026-07-03
> **来源 PRD**：`.scratch/blog/issue.md`
> **覆盖 User Stories**：US4 部分（slug 路由 + 正文渲染）、US9 完整（代码高亮/图片/表格）、US14（URL 简洁可读）

---

## 目标

实现 `/blog/[slug]/` 文章详情页：Markdown 全文渲染（代码高亮、图片、表格）、slug 路由、SEO meta（Open Graph 标签）。draft 文章不生成页面。

## 验收标准

- [ ] `/blog/[slug]/` 路由正常工作，slug 从 frontmatter `slug` 或文件名派生
- [ ] 文章标题、日期、分类中文名、标签在页面顶部以元信息栏展示
- [ ] Markdown 正文渲染：代码块有语法高亮（如 Shiki）、图片正常显示、表格样式美观
- [ ] draft: true 的文章访问 `/blog/<draft-slug>/` 返回 404 或不生成页面
- [ ] 页面 `<head>` 包含完整 SEO meta：`<title>`、`<meta name="description">`、Open Graph（`og:title`、`og:description`、`og:type`、`og:url`、`og:image` 如有封面图）
- [ ] 使用 Slice 2 的排版基线：正文 ~680px 阅读宽度、≥ 18px 字号
- [ ] URL 格式为 `/blog/<slug>/`，简洁可读

## 技术要点

- 使用 Astro `getStaticPaths()` + `getCollection("blog")` 生成静态路由
- 代码高亮使用 Shiki（Astro 内置），主题与「艺术温暖」风格协调
- Markdown 渲染使用 Astro 内置 `<Content />` 组件或 `render()` 函数
- SEO meta 通过 Astro `<Head>` 或 `Astro.props` 注入
- 分类中文映射同 Slice 1
- 详情页底部预留 `<slot>` 或组件区域，供 Slice 5（阅读量）、Slice 6（底部栏）嵌入

## 测试接缝

- **构建产物验证**：`astro build` 后确认 `dist/blog/<slug>/index.html` 存在，包含渲染后的正文 HTML
- **draft 验证**：draft 文章的 slug 不出现在 `dist/blog/` 下
- **SEO meta 验证**：检查输出 HTML 中 `<meta property="og:*">` 标签存在且内容正确
- **代码高亮**：检查 `<pre><code>` 包含语法高亮 span
- **slug 优先级**：frontmatter 指定 `slug: custom-slug` 时，路由为 `/blog/custom-slug/`

## 依赖

- Slice 1（Content Collection + 列表页 — 提供文章数据和路由基础）
- Slice 2（排版基线 — 提供字号/行高/阅读宽度 token）

## 被依赖

- Slice 5（阅读量统计 — 在详情页显示阅读量）
- Slice 6（文章底部栏 — 嵌入详情页底部）

---

> **Triage**: `ready-for-agent`
