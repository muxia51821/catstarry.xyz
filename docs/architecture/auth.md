# 鉴权方案 (Auth)

> catstarry.xyz 全站认证与权限控制方案 — /feed 登录 + /learn 管理后台 + f.catstarry.xyz 角色鉴权
> 当前认证、session、cookie 和角色边界；端点以当前 Worker route handlers 为准。

---

## 整体方案

| 模块                     | 认证方式            | 存储                             | Session 有效期 | 用户角色                 |
| ------------------------ | ------------------- | -------------------------------- | -------------- | ------------------------ |
| /feed（发布+管理）       | 用户名 + 密码       | `AUTH_KV`（用户与 session）+ D1 `auth_sessions` fallback | 12h | 木下（唯一发布者） |
| /learn/admin（草稿管理） | 共用 /feed 认证     | 同上                             | 12h            | 木下                     |
| f.catstarry.xyz          | 独立用户名 + 密码 + 角色 | `FINANCE_AUTH_KV`（用户与 session）；D1 仅写 `finance_access_log` | 12h | 木下（admin）+ cati（viewer） |

**设计原则**：

- 木下是唯一的管理/发布者——不需要注册、没有多用户
- 访客无需认证即可浏览 /feed、/blog、/learn、/projects、Home
- 密码存储：主站与 Finance 都使用 KV 中的 bcrypt hash；Finance 实现使用 `bcryptjs`
- 主站 session：随机 token → `AUTH_KV` + D1 `auth_sessions` 双写；读取时 KV 优先、D1 fallback
- Finance session：随机 token → 独立 `FINANCE_AUTH_KV`；D1 只记录访问行为，不作为 session store

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

## 2. 财务面板认证（f.catstarry.xyz）

### 2.1 架构

独立认证系统（与主站隔离），同样是用户名+密码。**两个用户，不同角色**。

```
f.catstarry.xyz
├── index.html      → 登录表单与认证后的 Finance workspace shell
└── /api/*          → finance-api Worker 路由
```

### 2.2 角色定义

| 用户 | 密码                           | 角色     | 权限                                    |
| ---- | ------------------------------ | -------- | --------------------------------------- |
| 木下 | bcrypt hash in KV `user:muxia` | `admin`  | 读 + 写（录入交易、查看全部）           |
| cati | bcrypt hash in KV `user:cati`  | `viewer` | 只读（查看持仓、PE 温度计，无交易入口） |

### 2.3 角色验证

Finance route handlers 通过 `shared/auth.ts` 的 `getFinanceSession` 读取
`FINANCE_AUTH_KV` 中的 session，并用 `hasRole` 检查 `admin` / `viewer`。Finance
登录、登出和 session route 位于 `workers/finance-api/src/routes/auth.ts`。

### 2.4 财务面板隔离

- 财务 Worker 使用独立的 `FINANCE_AUTH_KV` namespace
- 财务 D1 `finance-db` 不存储 auth_sessions（session 存 KV）
- f.catstarry.xyz 完全不在主站 Home 显示

---

## 3. 安全措施

| 措施         | 当前实现                                                | 范围        |
| ------------ | ------------------------------------------------------- | ----------- |
| 密码哈希     | KV 中保存 bcrypt hash；主站比较逻辑在 `modules/passwords.ts`，Finance 使用 `bcryptjs` | 主站 + Finance |
| Session storage | 主站 `AUTH_KV` + D1 fallback；Finance 仅 `FINANCE_AUTH_KV` | 分离 |
| Session TTL   | 两套 session 都按 12h 创建和 KV TTL 过期 | 主站 + Finance |
| Cookie 安全  | 主站 HttpOnly + Secure + SameSite=Lax；Finance HttpOnly + Secure + SameSite=Strict | 主站 + Finance |
| 登录限流     | KV 计数器，5 分钟窗口、10 次上限；Finance 使用哈希后的 IP key | 主站 + Finance |
| State-changing origin | 共享 CORS helper 拒绝不受信任 Origin 的 POST/PUT/PATCH/DELETE | 主站 + Finance |
| 角色权限     | Finance `admin` 可写，`viewer` 只读；主站只有木下发布者 | 主站 + Finance |

---

## 4. Admin 页面路由保护

### 主站

| 路径           | 保护方式                                                      | 未认证行为     |
| -------------- | ------------------------------------------------------------- | -------------- |
| `/feed/admin`  | Astro SSR page 检查 cookie → Worker `/api/auth/session` | 302 → `/feed`  |
| `/learn/admin` | Astro SSR page 检查同一主站 session                   | 302 → `/feed/` |

### 财务

| 路径                    | 保护方式                      | 未认证行为     |
| ----------------------- | ----------------------------- | -------------- |
| `f.catstarry.xyz`       | Finance 页面调用 `/api/auth/session`；未认证时显示登录 shell | 显示登录表单 |
| `f.catstarry.xyz`       | 认证后按 `admin` / `viewer` 控制 workspace actions | 保留页面 shell |

---

## 5. KV Key 设计

```
# 主站 AUTH_KV
user:muxia              → { password_hash, role: "admin" }
session:{token}         → { username, created_at, expires_at }  TTL: 12h
ratelimit:login:{ip}    → counter  TTL: 5min

# 财务 AUTH_KV（独立 namespace）
user:muxia              → { password_hash, role: "admin" }
user:cati               → { password_hash, role: "viewer" }
session:{token}         → { username, role, expires_at }  TTL: 12h
ratelimit:login:{hash}  → counter  TTL: 5min
```

---

## 6. Current-state boundary

本文件只记录当前认证端点、session 存储、cookie 属性、角色和页面保护边界。
密码初始化、部署 secrets、Cloudflare 资源配置和未来 MFA 选择属于部署或安全运营事实，
不在 current-state architecture 中维护。
