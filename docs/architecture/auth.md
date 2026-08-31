# 鉴权方案 (Auth)

> catstarry.xyz 主站认证与权限控制方案 — /feed 登录 + Blog / Learn 管理与预览。
> 当前认证、session 和 cookie 边界；端点以当前 Worker route handlers 为准。

---

## 整体方案

| 模块                     | 认证方式            | 存储                             | Session 有效期 | 用户角色                 |
| ------------------------ | ------------------- | -------------------------------- | -------------- | ------------------------ |
| /feed（发布+管理）       | 用户名 + 密码       | `AUTH_KV`（用户与 session）+ D1 `auth_sessions` fallback | 12h | 木下（唯一发布者） |
| /learn/admin（草稿管理） | 共用 /feed 认证     | 同上                             | 12h            | 木下                     |

**设计原则**：

- 木下是唯一的管理/发布者——不需要注册、没有多用户
- 访客无需认证即可浏览 /feed、/blog、/learn、/projects、Home
- 密码存储：主站使用 KV 中的 bcrypt hash
- 主站 session：随机 token → `AUTH_KV` + D1 `auth_sessions` 双写；读取时 KV 优先、D1 fallback

---

## 1. 主站认证（/feed + /learn/admin）

### 1.1 架构

```
┌──────────┐     POST /api/auth/login      ┌──────────────┐
│  前端     │ ──────────────────────────────→│              │
│ (React)  │ ←── Set-Cookie: token=xxx      │  feed-api    │
│          │                                │  Worker      │
│          │  GET /api/auth/session         │              │
│          │ ──────────────────────────────→│  KV:         │
│          │ ←── { authenticated: true }    │   user:muxia │
│          │                                │     → bcrypt │
│          │  POST /api/feed                │   session:xxx│
│          │ ──────────────────────────────→│     → {user, │
│          │  Cookie: token=xxx             │       expires}│
│          │ ←── 201 { post }              │              │
└──────────┘                                └──────────────┘
```

### 1.2 端点

| 方法    | 路径                 | 功能                                | 限流         |
| ------- | -------------------- | ----------------------------------- | ------------ |
| `POST`  | `/api/auth/login`    | 验证用户名+密码，返回 session token | 5min/10次/IP |
| `POST`  | `/api/auth/logout`   | 清除 session                        | 无           |
| `GET`   | `/api/auth/session`  | 验证当前 session 是否有效           | 无           |

### 1.3 登录流程

```
用户输入 username + password
        ↓
POST /api/auth/login { username, password }
        ↓
Worker 检查 rate-limit KV: ratelimit:login:{ip}
  超过限制 → 429 Too Many Requests
        ↓
Worker 从 KV 读取 user:{username} → bcrypt hash
        ↓
bcrypt.compare(password, hash)
  不匹配 → 401 Unauthorized
        ↓
生成 session token = crypto.randomUUID()
        ↓
双写：
  KV: session:{token} = { username, created_at, expires_at }  TTL 12h
  D1: INSERT INTO auth_sessions (token, username, created_at, expires_at, ip)
        ↓
Set-Cookie: token=xxx; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=43200
        ↓
返回 { token, expires_at }
```

### 1.4 Session 验证

主站 route handlers 通过 `shared/auth.ts` 的 `getMainSiteSession` 验证 cookie
中的 UUID token：先读 `AUTH_KV`，没有命中时查询 D1 `auth_sessions`，两处都检查
`expires_at`。登出同时删除 KV session 和 D1 `auth_sessions` 记录。

### 1.5 前端认证状态

- 未登录：右下角显示「登录」图标；发布按钮隐藏；/feed/admin 重定向到 /feed
- 登录后：「登录」图标变为「+」发布按钮；/feed/admin 可访问
- 过期处理：12h 后 session 过期，前端收到 401 后显示「登录已过期」toast，切换回未登录 UI

---

## 2. 安全措施

| 措施         | 当前实现 |
| ------------ | -------- |
| 密码哈希     | `AUTH_KV` 保存 bcrypt hash；比较逻辑在 `modules/passwords.ts` |
| Session storage | `AUTH_KV` + D1 `auth_sessions` fallback |
| Session TTL   | 12h，并由 KV TTL 与读取时的 `expires_at` 检查共同约束 |
| Cookie 安全  | HttpOnly + Secure + SameSite=Lax |
| 登录限流     | KV 计数器，5 分钟窗口、10 次上限 |
| State-changing origin | 共享 CORS helper 拒绝不受信任 Origin 的 POST/PUT/PATCH/DELETE |
| 权限     | 主站只有木下 owner / publisher |

---

## 3. Admin 页面路由保护

| 路径           | 保护方式                                                      | 未认证行为     |
| -------------- | ------------------------------------------------------------- | -------------- |
| `/feed/admin`  | Astro SSR page 转发原始 cookie → `FEED_API` Service Binding → Feed Worker `/api/auth/session` | 302 → `/feed/`；binding/backend failure → 503 |
| `/learn/admin` / `/learn/preview/*` | 与 Feed Admin 共用 Site SSR owner-auth adapter 和 `FEED_API` Service Binding | 302 → `/feed/`；binding/backend failure → 503 |
| `/blog/preview/*` | 与 Feed Admin 共用 Site SSR owner-auth adapter 和 `FEED_API` Service Binding；预览不记录公开阅读量或活动 | 302 → `/feed/`；binding/backend failure → 503 |

## 4. KV Key 设计

```
# 主站 AUTH_KV
user:muxia              → { password_hash, role: "admin" }
session:{token}         → { username, created_at, expires_at }  TTL: 12h
ratelimit:login:{ip}    → counter  TTL: 5min
```

---

## 5. Current-state boundary

本文件只记录当前认证端点、session 存储、cookie 属性、角色和页面保护边界。
密码初始化、部署 secrets、Cloudflare 资源配置和未来 MFA 选择属于部署或安全运营事实，
不在 current-state architecture 中维护。

Finance 已迁移至独立私有仓库；其认证 current authority 在私有仓库。本仓库不维护、连接或复述 Finance 用户、角色、session、secret 或数据边界。
