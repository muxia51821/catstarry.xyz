# Slice 2：全局排版基线

> **状态**：`ready-for-agent`
> **创建日期**：2026-07-03
> **来源 PRD**：`.scratch/blog/issue.md`
> **覆盖 User Stories**：US11（视觉风格与全站一致）、US12（移动端/平板排版正常）

---

## 目标

为全站（尤其是 /blog 板块）建立排版基线 token — 大字号、宽松行高、~680px 阅读宽度、响应式断点，确保后续 slice 不返工。

## 验收标准

- [ ] 定义排版 CSS 变量 / Tailwind token：正文字号（≥ 18px）、行高（≥ 1.8）、阅读最大宽度（~680px）、标题层级字号
- [ ] 定义响应式断点：手机（< 640px）、平板（640–1024px）、桌面（> 1024px），各断点下排版参数适配
- [ ] `/blog/` 列表页文章卡片在三个断点下布局正常（单列 / 双列 / 多列按设计稿）
- [ ] 中文优先字体栈：系统默认中文字体优先，英文 fallback
- [ ] 文章正文容器居中、左右留白合理，阅读宽度不超出 680px
- [ ] 颜色 / 间距 token 遵循全站「艺术温暖」基调：暖色系为主、不极简

## 技术要点

- 排版 token 放在全局样式文件或 Tailwind 配置中（`tailwind.config.ts` 的 `theme.extend`），避免散落在组件内
- 与 Slice 1 的 Content Collection + 列表页结合时，列表页卡片即用这些 token
- 字体栈参考：`system-ui, "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif`
- 设计阶段由 AI 设计工具定稿具体色板；一期可用一组暖色 token 做基线（如 amber/warm gray 色系）

## 测试接缝

- **视口验证**：分别在 375px（手机）、768px（平板）、1280px（桌面）下检查列表页排版
- **阅读宽度**：文章正文容器 `max-width` ≤ 680px
- **字号行高**：计算样式确认正文 `font-size ≥ 18px`、`line-height ≥ 1.8`

## 依赖

- Slice 1（博客骨架 — 列表页已存在，可在其上验证排版效果）

## 被依赖

- Slice 3（文章详情页 — 使用排版基线）
- Slice 4（分类/标签页面）
- Slice 6（文章底部栏 — React island 继承排版 token）

---

> **Triage**: `ready-for-agent`
