**Category**: enhancement
**Triage**: ready-for-agent
**Triage Date**: 2026-07-04

# Slice 9：阅读量显示位置 — 从详情页底部移至标题下方 meta 区

> **状态**：`ready-for-agent`
> **创建日期**：2026-07-04
> **来源 PRD**：`.scratch/blog/issue.md`
> **覆盖 User Stories**：US5（访客看阅读量）、US10（木下查看阅读量统计）

---

## 目标

调整阅读量在文章详情页的显示位置：从独立的底部区块移动到文章标题下方 meta 信息区域（与日期、分类、标签同行），符合 PRD 中「元信息（日期、分类、标签、阅读量）」的设计意图。

## 验收标准

### 文章详情页

- [ ] 阅读量显示在文章标题下方的 meta 行中，与日期、分类、标签并排
- [ ] meta 行顺序：日期 → 分类 → 标签 → 阅读量
- [ ] 阅读量显示格式：「123 次阅读」，数字从 feed-api Worker GET /api/views 获取
- [ ] 阅读量数字实时更新（客户端 fetch）
- [ ] 无阅读记录时显示「0 次阅读」

### 列表页

- [ ] 博客列表页（/blog/）的文章卡片中同样显示阅读量
- [ ] 列表页使用批量查询 API（`GET /api/views?slugs=slug1,slug2,...`）减少请求数

### 视觉

- [ ] 阅读量在 meta 行中视觉权重不高于分类和标签（字号、颜色与标签一致）
- [ ] 所有列表页（/blog/、分类页、标签页）meta 行布局统一

## 技术要点

- 修改 `src/pages/blog/[slug].astro` 中的 meta 渲染逻辑
- 修改 `src/pages/blog/index.astro` 中的卡片 meta 区域
- 使用现有的 `useViewCount.ts` hook（或新建 `useViewCountBatch.ts` 支持批量查询）
- 不修改 Worker API（GET /api/views 已支持单个和批量查询）

## 测试接缝

- 打开一篇已有阅读量的文章 → 标题下方 meta 行显示「123 次阅读」
- 打开一篇 0 阅读量的文章 → 显示「0 次阅读」
- 打开 /blog/ 列表页 → 每篇文章卡片 meta 行有阅读量
- 多次刷新同一页面 → 阅读量不变（去重生效）

## 依赖

- Slice 5（阅读量统计 — Worker API 已部署，D1 blog_views 表有数据）

## 被依赖

- 无

---

> **Triage**：`ready-for-agent`
