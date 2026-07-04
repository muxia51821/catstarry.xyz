# Slice F04：剪藏发布 — URL 粘贴 + Open Graph 抓取 + 用户评论

> **状态**：`ready-for-agent`
> **创建日期**：2026-07-04
> **来源需求**：`docs/final-requirements-feed.json`
> **覆盖 Goals**：G003（剪藏发布）

---

## 目标

在发布面板中新增剪藏模式：粘贴 URL → Worker 自动抓取目标页面的 Open Graph 标签（og:title/og:description/og:image）→ 显示摘要供用户确认 → 用户补充评论 → 发布为剪藏卡片出现在时间线。

## 验收标准

### 剪藏 UI

- [ ] 发布面板中有「剪藏」tab 或模式切换按钮，与「碎碎念」模式并列
- [ ] 剪藏模式显示：URL 输入框 + 抓取按钮（或自动触发）+ 预览区 + 评论输入框
- [ ] 粘贴（或输入）URL 后自动发起抓取请求（不需要额外点击）

### 抓取与预览

- [ ] Worker 端用 `fetch()` 抓取目标 URL 的 HTML
- [ ] 解析 HTML 中的 Open Graph 标签：`og:title`、`og:description`、`og:image`
- [ ] 前端显示抓取结果：标题、摘要（截断至 200 字）、封面缩略图
- [ ] 抓取成功 → 显示完整预览
- [ ] 抓取失败 → 显示友好提示：「无法获取页面信息，请检查链接或手动填写」，用户可手动填写标题和摘要

### 补充评论与发布

- [ ] 用户可在评论输入框中补充个人感想/评论
- [ ] 点击发布 → 调用 `POST /api/feed`（type=clip，含 link_url/link_title/link_summary/link_image + content 为用户评论）
- [ ] 发布后时间线出现剪藏卡片

### 剪藏卡片展示

- [ ] 卡片顶部：标题（可点击跳转原链接，`target="_blank"`）
- [ ] 卡片中部：摘要 + 封面缩略图
- [ ] 卡片底部：用户评论文字 + 发布时间
- [ ] 视觉风格与碎碎念卡片有明显差异（设计阶段定稿）

## 技术要点

- Worker 端新增 `/api/og-fetch?url=xxx` 端点，负责抓取和解析 OG 标签
- 超时策略：抓取超时 5 秒，不重试（由用户手动重新触发）
- 剪藏卡片数据存储复用 F01 的 posts 表 `link_*` 字段
- 前端组件为发布面板的子模块，复用 F02 的面板结构

## 测试接缝

- 粘贴一个有效的博客链接 → 确认标题、摘要、封面都正确显示
- 粘贴一个无 OG 标签的页面 → 确认友好错误提示
- 补充评论后发布 → 确认时间线出现剪藏卡片，标题可点击跳转

## 依赖

- F01（Worker API 骨架 — 需 D1 posts 表中有 link_url/link_title/link_summary/link_image 字段）
- F03（时间线页面 — 需要剪藏卡片的展示样式）

## 被依赖

- 无

---

> **Triage**：`ready-for-agent`
