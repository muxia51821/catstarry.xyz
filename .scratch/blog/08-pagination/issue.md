# Slice 8：博客列表分页

> **状态**：`ready-for-agent`
> **创建日期**：2026-07-04
> **来源 PRD**：`.scratch/blog/issue.md`
> **覆盖 User Stories**：US3（列表页倒序）、US12（手机平板浏览体验）

---

## 目标

为 /blog/ 列表页、分类页（/blog/category/[category]/）、标签页（/blog/tag/[tag]/）添加分页功能。每页显示固定数量文章，超出时生成分页导航和对应的静态页面。移动端分页导航适配。

## 验收标准

### 列表页分页

- [ ] /blog/ 首页每页显示最多 10 篇文章（含文章卡片：标题、日期、分类、标签、摘要）
- [ ] 文章超过 10 篇时，生成 /blog/2/、/blog/3/ 等分页
- [ ] 分页导航包含：上一页、页码列表、下一页
- [ ] 当前页码高亮，不可点击
- [ ] 第 1 页的 URL 为 /blog/（不带 /1/ 后缀）
- [ ] 从第 2 页起 URL 为 /blog/{page}/
- [ ] 分页导航同时出现在列表顶部和底部

### 分类页分页

- [ ] /blog/category/tech/ 等分类页同样分页，每页 10 篇
- [ ] 分页 URL：/blog/category/tech/2/ 等
- [ ] 导航结构与列表页一致

### 标签页分页

- [ ] /blog/tag/astro/ 等标签页同样分页，每页 10 篇
- [ ] 分页 URL：/blog/tag/astro/2/ 等
- [ ] 导航结构与列表页一致

### 边界情况

- [ ] 文章总数不足 10 篇时不显示分页导航
- [ ] draft 文章不计入总数，不出现在任何分页中
- [ ] 访问不存在的页码（如只有 3 页但访问 /blog/5/）→ 返回 404 页面

### 移动端

- [ ] 手机屏幕宽度下分页导航按钮大小适合手指点击（最小 44x44px 触控区域）
- [ ] 平板端分页导航不过于拥挤

## 技术要点

- 使用 Astro 内置 `getStaticPaths()` + `paginate()` API
- 三个列表页（index、category、tag）各自独立调用 paginate
- `pageSize` 设为 10
- `/blog/` 首页是 index.astro 的 page 1，不需要 `/blog/1/` 路由（在 `getStaticPaths` 的 `paginate` 返回中处理）
- 分页导航组件可复用（放在 `src/components/Pagination.astro`）

## 测试接缝

- 文章 10 篇 → build → /blog/ 有 1 页，无分页导航
- 文章 15 篇 → build → /blog/ + /blog/2/，导航显示「上一页 1 [2] 下一页」
- 访问 /blog/category/tech/ → 确认分页导航正确
- 访问 /blog/5/（超出范围）→ 返回 404

## 依赖

- Slice 1（博客骨架 — 列表页已存在）
- Slice 4（分类 + 标签系统 — 分类页和标签页已存在）

## 被依赖

- 无

---

> **Triage**：`ready-for-agent`
