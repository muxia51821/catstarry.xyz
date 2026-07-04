# Slice 2：全局排版基线

> **状态**：`ready-for-agent`
> **创建日期**：2026-07-03
> **来源 PRD**：`.scratch/blog/issue.md`
> **覆盖 User Stories**：US11（视觉风格与全站一致）、US12（移动端/平板排版正常）

---

## 目标

为全站（尤其是 /blog 板块）建立排版基线 token — 中文优先、宽松舒适阅读体验、响应式断点、暖色基调，确保后续 slice 不返工。

## 验收标准

- [ ] 定义排版 CSS 变量 / Tailwind token：
  - 正文字号：中文优先、大字号（具体数值由 Phase 4 UI 设计确定）
  - 行高：宽松舒朗，适合中文长时间阅读
  - 阅读最大宽度：限制正文内容列宽，避免全屏横扫
  - 标题层级：H1-H4 字号和字重梯度
- [ ] 定义响应式断点：手机（< 640px）、平板（640–1024px）、桌面（> 1024px），各断点下排版参数适配
- [ ] `/blog/` 列表页文章卡片在三个断点下布局正常
- [ ] 中文优先字体栈：系统默认中文字体优先，英文 fallback
- [ ] 文章正文容器居中、左右留白合理
- [ ] 颜色 / 间距 token 遵循全站「艺术温暖」基调：暖色系为主、不极简

> **原型约定**：Phase 0 原型阶段采用了 `font-size >= 18px`、`line-height >= 1.85`、`max-width = 680px` 作为临时排版基线。这些是原型阶段的实践值，Phase 4（UI/设计）时由设计对话根据 artistic warm 方向重新裁决，有权保留、调整或推翻。

## 技术要点

- 排版 token 放在全局样式文件或 Tailwind 配置中（`tailwind.config.ts` 的 `theme.extend`），避免散落在组件内
- 与 Slice 1 的 Content Collection + 列表页结合时，列表页卡片即用这些 token
- 字体栈参考：`system-ui, "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif`
- 设计阶段由 AI 设计工具定稿具体色板；一期可用一组暖色 token 做占位

## 测试接缝

- **视口验证**：分别在 375px（手机）、768px（平板）、1280px（桌面）下检查列表页排版
- **阅读宽度**：文章正文容器有合理的最大宽度限制，不会全屏横扫
- **字号行高**：正文符合 Phase 4 确定的设计规范（Phase 5 实现时对照设计稿校验）

## 依赖

- Slice 1（博客骨架 — 列表页已存在，可在其上验证排版效果）

## 被依赖

- Slice 3（文章详情页 — 使用排版基线）
- Slice 4（分类/标签页面）
- Slice 6（文章底部栏 — React island 继承排版 token）

---

> **Triage**：`ready-for-agent`
