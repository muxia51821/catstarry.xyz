# Slice 4：分类 + 标签系统

> **状态**：`ready-for-agent`
> **创建日期**：2026-07-03
> **来源 PRD**：`.scratch/blog/issue.md`
> **覆盖 User Stories**：US4 完整（分类和标签筛选）、US5 筛选部分（通过分类/标签发现文章）

---

## 目标

实现分类页面（`/blog/category/[category]/`）、标签页面（`/blog/tag/[tag]/`）、列表页的分类筛选 + 标签云组件。

## 验收标准

- [ ] `/blog/category/tech/`、`/blog/category/life/`、`/blog/category/opinion/` 三个分类页面正常生成，列出该分类下的所有文章
- [ ] `/blog/tag/<tag>/` 标签页面正常生成，列出打有该标签的所有文章
- [ ] 分类和标签页面显示文章卡片（复用列表页卡片组件），含分页
- [ ] `/blog/` 列表页侧栏或顶部有分类筛选组件（点击分类跳转到对应分类页）和标签云（点击标签跳转到对应标签页）
- [ ] 分类和标签页面显示中文名（"技术" / "生活" / "观点"），URL 使用英文 slug
- [ ] 标签云中标签按文章数量调节字号/权重
- [ ] 分类和标签页面使用 Slice 2 排版基线
- [ ] draft 文章不出现在任何分类/标签页面中

## 技术要点

- 分类页面路由：`src/pages/blog/category/[category].astro`
- 标签页面路由：`src/pages/blog/tag/[tag].astro`
- 使用 `getStaticPaths()` 从 Content Collection 中提取所有不重复的分类和标签
- 分类中文映射复用 Slice 1 的映射表：`tech` → "技术"、`life` → "生活"、`opinion` → "观点"
- 标签云组件为 React island（需客户端交互如 hover 效果），或纯 CSS 静态实现（一期可简化为静态链接列表）
- 分类筛选和标签云在列表页的位置：可与 Slice 1 的列表页卡片区域组合

## 测试接缝

- **构建产物验证**：`astro build` 后检查 `dist/blog/category/tech/index.html`、`dist/blog/tag/astro/index.html` 等页面存在
- **筛选正确性**：确认分类页只列出该分类的文章，标签页只列出打有该标签的文章
- **draft 过滤**：draft 文章不在任何分类/标签页中出现
- **标签云权重**：多个标签时权重差异可感知

## 依赖

- Slice 1（Content Collection + 列表页 — 提供文章数据和卡片组件）

## 被依赖

- 无（这是一个终端 slice，不阻塞后续功能）

---

> **Triage**: `ready-for-agent`
