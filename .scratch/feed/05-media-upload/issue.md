**Category**: enhancement
**Triage**: ready-for-agent
**Triage Date**: 2026-07-04

# Slice F05：媒体上传完善 — HEIC 兼容 + R2 配置 + 上传重试 + 临时文件清理

> **状态**：`ready-for-agent`
> **创建日期**：2026-07-04
> **来源需求**：`docs/final-requirements-feed.json`
> **覆盖 Goals**：G004（媒体上传）

---

## 目标

完善媒体上传链路的边缘情况：前端 HEIC 格式预览兼容、R2 bucket 配置、上传失败自动重试、未发布临时文件定时清理。

## 验收标准

### HEIC 预览

- [ ] 前端选择 HEIC 文件后自动转换为 JPG 预览显示（使用 `heic2any` 或 canvas 方案）
- [ ] 转码过程不阻塞 UI，显示加载中的占位图

### R2 存储

- [ ] R2 bucket 创建，绑定到 feed-api Worker（`wrangler.toml` 中配置 r2_buckets binding）
- [ ] R2 CORS 配置：允许 `catstarry.xyz` 域名的 GET 请求
- [ ] 上传方式在 Phase 3 中确定：Worker 代理上传 或 前端 presigned URL 直传

### 上传重试

- [ ] 上传中断（网络断开或超时）后，自动重试一次
- [ ] 重试仍失败 → 前端显示错误标记 + 提示用户手动重新选择
- [ ] 不同文件的上传失败互不影响

### 临时文件清理

- [ ] Worker Cron Triggers 定时任务：每小时检查一次 R2
- [ ] 删除 `created_at` 超过 12 小时且未关联已发布帖子的文件
- [ ] 清理逻辑通过 `posts` 表的 `media_json` 字段判断文件是否已关联

### 上传完成提示

- [ ] 全部文件上传完成后，前端显示「✓ 上传完成」文字提示，停留 2 秒后自动消失

## 技术要点

- `heic2any` npm 包在前端做 HEIC → JPG 转换
- R2 文件路径命名：`feed/{YYYY-MM-DD}/{uuid}.{ext}`
- Cron Trigger 在 `wrangler.toml` 中配置 `triggers.crons = ["0 * * * *"]`（每小时）
- 判断文件是否关联已发布帖子：检查 posts 表的 media_json 是否包含该文件 key

## 测试接缝

- 选择 HEIC 图片 → 预览区显示 JPG 缩略图（而非空白）
- 上传中关闭浏览器标签页 → 重新打开 → 上传中断，文件不保留（需求决策：无断点续传）
- 等待 12 小时后 → 未发布的临时文件被 Cron 清理
- 已发布的帖子的媒体文件 → 不被清理

## 依赖

- F02（发布面板 — 上传 UI 入口）
- F01（Worker API 骨架 — D1 posts 表、Worker 运行环境）

## 被依赖

- 无

---

> **Triage**：`ready-for-agent`
