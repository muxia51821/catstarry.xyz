# Slice 6：文章底部栏 — Giscus 评论 + 分享按钮

> **状态**：`ready-for-agent`
> **创建日期**：2026-07-03
> **来源 PRD**：`.scratch/blog/issue.md`
> **覆盖 User Stories**：US6（Giscus 评论）、US8（分享按钮）

---

## 目标

在文章详情页底部嵌入一个统一的底部栏 React island，包含 Giscus 评论区 + 分享按钮（X/Twitter、复制链接、微信朋友圈引导）。两个功能在同一个 island 中实现以简化组件层级。

## 验收标准

### Giscus 评论

- [ ] 文章详情页底部渲染 Giscus 组件（`@giscus/react`）
- [ ] Giscus 配置：repo 为 `catstarry.xyz` 仓库，按文章 slug 映射 discussion（`term: slug`）
- [ ] Giscus 支持亮/暗主题，初始跟随全站主题
- [ ] Giscus 评论加载正常，iframe 存在且可交互

### 分享按钮

- [ ] 三个分享按钮横向排列在评论区上方或独立一行
- [ ] **X/Twitter**：点击在新窗口打开 `https://twitter.com/intent/tweet?text=<标题>&url=<文章URL>`
- [ ] **复制链接**：点击调用 `navigator.clipboard.writeText()`，成功后显示「已复制」toast 提示（2 秒消失）
- [ ] **微信朋友圈**：点击显示提示文案（如「请复制链接后在微信中粘贴分享」），包含文章完整 URL
- [ ] 分享按钮样式与全站「艺术温暖」基调一致

### 整体

- [ ] 底部栏作为单一 React island（`<ArticleFooter client:load>`）嵌入详情页底部
- [ ] 移动端布局：按钮间距和字号适配小屏
- [ ] 组件边界清晰：接受 `slug`、`title`、`url` 作为 props
- [ ] 使用 Slice 2 排版 token（字号、间距、颜色）

## 技术要点

- React island 写法：`<ArticleFooter client:load slug={slug} title={title} />`
- Giscus 使用 `@giscus/react` 的 `<Giscus>` 组件，repo 配置硬编码
- 分享链接构造在客户端完成（`window.location.href`）
- Toast 组件用 React state 管理显示/隐藏，2 秒自动消失（`setTimeout`）

## 测试接缝

- **分享 URL 正确性**：点击 X/Twitter 按钮后，新窗口 URL 包含正确的 `text` 和 `url` 参数
- **复制链接**：点击后 clipboard 内容为文章完整 URL
- **Giscus 加载**：页面渲染后 Giscus iframe 存在（`document.querySelector('iframe[src*="giscus"]') !== null`）
- **Toast 行为**：复制链接后 toast 出现，2 秒后消失
- **移动端**：375px 视口下按钮不溢出、间距合理

## 依赖

- Slice 3（文章详情页 — 底部栏嵌入位置已预留）

## 被依赖

- 无

---

> **Triage**: `ready-for-agent`
