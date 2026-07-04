**Category**: enhancement
**Triage**: ready-for-agent
**Triage Date**: 2026-07-04

# Slice F06：认证登录 — 用户名+密码 + Session 管理

> **状态**：`ready-for-agent`
> **创建日期**：2026-07-04
> **来源需求**：`docs/final-requirements-feed.json`
> **覆盖 Goals**：G005（认证登录）

---

## 目标

实现木下专用的用户名+密码认证系统。登录后发布按钮可见、管理后台入口可见；未登录访客无法看到任何管理功能。认证信息存 Cloudflare KV，session 有效期 12 小时。

## 验收标准

### 登录面板

- [ ] /feed 页面右下角浮动按钮：
  - 未登录时：显示「登录」图标/文字
  - 登录后：显示「+」发布按钮（见 F02）
- [ ] 点击登录 → 弹出登录面板：用户名输入框 + 密码输入框 + 登录按钮

### 认证逻辑

- [ ] 用户名+密码提交到 `POST /api/auth/login`
- [ ] Worker 端从 KV 读取用户信息，bcrypt 验证密码
- [ ] 验证成功 → 生成 session token → 存 KV（key: `session:{token}`，value: `{username, expires_at}`，TTL 12h）
- [ ] 返回 session token 给前端（Set-Cookie 或 response body）

### 登录状态

- [ ] 登录成功后：发布按钮（F02）和管理后台入口（F07）可见
- [ ] 12 小时后 session 过期，需重新登录
- [ ] 支持手动退出登录：`POST /api/auth/logout` → 删除 KV 中的 session

### 安全约束

- [ ] 密码存储使用 bcrypt hash，不存明文
- [ ] 登录接口限流：同一 IP 5 分钟内最多 10 次尝试，超过后返回 429
- [ ] 密码可修改（`PATCH /api/auth/password`，需验证旧密码）

### 未登录行为

- [ ] 未登录时：发布按钮隐藏
- [ ] 直接访问 `/feed/admin` → 重定向到 `/feed`
- [ ] 访客无需注册——木下是唯一发布者（需求决策：B3-1 第 1 层，用户确认）

## 技术要点

- Worker 新增三个端点：`/api/auth/login`（POST）、`/api/auth/logout`（POST）、`/api/auth/session`（GET 验证当前 session）
- KV namespace 复用现有 `VIEW_KV`，或新建 `AUTH_KV`（Phase 3 架构决定）
- bcrypt 使用 `bcryptjs` npm 包（纯 JS，兼容 Workers）
- 限流：KV 中存 `ratelimit:login:{ip}`，TTL 5 分钟，每次失败 +1，超 10 次返回 429

## 测试接缝

- 未登录访问 `/feed` → 右下角显示「登录」→ 点击弹出登录面板
- 用错误密码登录 → 提示「用户名或密码错误」→ 第 10 次后返回 429 → 5 分钟后恢复
- 正确登录 → 发布按钮出现 → 12 小时后刷新页面 → 发布按钮消失（需重新登录）
- 未登录直接访问 `/feed/admin` → 重定向到 `/feed`

## 依赖

- F01（Worker API 骨架 — 需要 KV namespace 和 Worker 路由扩展）

## 被依赖

- F02（发布面板 — 登录后 + 按钮才可见）
- F07（内容管理后台 — 登录后才能访问）

---

> **Triage**：`ready-for-agent`
