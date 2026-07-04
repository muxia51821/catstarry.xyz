# 鉴权方案 (Auth)

> catstarry.xyz 全站认证与权限控制方案 — /feed 登录 + /learn 管理后台 + f.catstarry.xyz 角色鉴权
> Phase 3 / 3.4 产出 | 2026-07-05

---

## 整体方案

| 模块 | 认证方式 | 存储 | Session 有效期 | 用户角色 |
|------|---------|------|---------------|---------|
| /feed（发布+管理） | 用户名 + 密码 | KV（bcrypt hash）+ D1（session） | 12h | 木下（唯一发布者） |
| /learn/admin（草稿管理） | 共用 /feed 认证 | 同上 | 12h | 木下 |
| f.catstarry.xyz | 密码鉴权 + 角色区分 | KV（bcrypt hash）+ D1（session） | 12h | 木下（r/w）+ cati（r/o） |

**设计原则**：
- 木下是唯一的管理/发布者——不需要注册、没有多用户
- 访客无需认证即可浏览 /feed、/blog、/learn、/projects、Home
- 密码存储：bcrypt hash（Workers 兼容的 bcryptjs 或 Web Crypto API）
- Session：随机 token → KV 存储 → D1 持久化（双写，KV 快查 + D1 可审计）

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

| 方法 | 路径 | 功能 | 限流 |
|------|------|------|------|
| `POST` | `/api/auth/login` | 验证用户名+密码，返回 session token | 5min/10次/IP |
| `POST` | `/api/auth/logout` | 清除 session | 无 |
| `GET` | `/api/auth/session` | 验证当前 session 是否有效 | 无 |
| `PATCH` | `/api/auth/password` | 修改密码（需旧密码） | 5min/3次 |

### 1.3 登录流程

```
用户输入 username + password
        ↓
POST /api/auth/login { username, password }
        ↓
Worker 检查 rate-limit KV: ratelimit:{ip}
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

### 1.4 Session 验证 Middleware

```typescript
// workers/feed-api/src/middleware/auth.ts

export async function verifySession(
  request: Request,
  env: Env
): Promise<{ authenticated: boolean; username?: string }> {
  const cookie = request.headers.get("Cookie") || "";
  const token = cookie.match(/token=([^;]+)/)?.[1];
  if (!token) return { authenticated: false };

  // 优先读 KV（快）
  const session = await env.AUTH_KV.get(`session:${token}`, "json");
  if (session) return { authenticated: true, username: session.username };

  // fallback 读 D1
  const row = await env.DB.prepare(
    "SELECT username, expires_at FROM auth_sessions WHERE token = ?"
  ).bind(token).first();
  if (row && new Date(row.expires_at) > new Date()) {
    return { authenticated: true, username: row.username };
  }

  return { authenticated: false };
}
```

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
├── /login          → 登录页（未认证时唯一可见页面）
├── /dashboard      → 持仓面板（认证后可见）
└── /api/*          → finance-api Worker 路由
```

### 2.2 角色定义

| 用户 | 密码 | 角色 | 权限 |
|------|------|------|------|
| 木下 | bcrypt hash in KV `user:muxia` | `admin` | 读 + 写（录入交易、查看全部） |
| cati | bcrypt hash in KV `user:cati` | `viewer` | 只读（查看持仓、PE 温度计，无交易入口） |

### 2.3 角色 Middleware

```typescript
// workers/finance-api/src/middleware/auth.ts

export type Role = "admin" | "viewer";

export async function verifyFinanceSession(
  request: Request,
  env: Env
): Promise<{ authenticated: boolean; username?: string; role?: Role }> {
  // ... 同主站 session 验证逻辑 ...

  // 从 KV 读取角色
  const user = await env.AUTH_KV.get(`user:${session.username}`, "json");
  return { authenticated: true, username: session.username, role: user.role };
}

// 路由中使用：
// const { role } = await verifyFinanceSession(request, env);
// if (role !== "admin") return new Response("Forbidden", { status: 403 });
```

### 2.4 财务面板隔离

- 财务 Worker 使用独立的 AUTH_KV namespace
- 财务 D1 `finance-db` 不存储 auth_sessions（session 存 KV）
- f.catstarry.xyz 完全不在主站 Home 显示

---

## 3. 安全措施

| 措施 | 实现 | 范围 |
|------|------|------|
| 密码哈希 | bcrypt（cost=10），Workers 兼容 bcryptjs | 主站 + 财务 |
| Session 双写 | KV（快查）+ D1（审计），KV 过期=TTL 12h | 主站 + 财务 |
| Cookie 安全 | HttpOnly + Secure + SameSite=Lax | 主站 + 财务 |
| 登录限流 | KV 计数器：`ratelimit:{ip}`，5min window，10 次上限 | 主站 + 财务 |
| 密码修改 | 需旧密码验证 + 新密码 bcrypt hash 写回 KV | 主站 |
| CSRF | SameSite=Lax cookie + Origin header 检查 | 主站 + 财务 |
| 暴力破解防护 | 登录限流 + bcrypt 计算开销（cost=10） | 主站 + 财务 |

---

## 4. Admin 页面路由保护

### 主站

| 路径 | 保护方式 | 未认证行为 |
|------|---------|-----------|
| `/feed/admin` | Astro SSR middleware 检查 cookie → Worker `/api/auth/session` | 302 → `/feed` |
| `/learn/admin` | 同上，共用 /feed 认证 session | 302 → `/learn` |

### 财务

| 路径 | 保护方式 | 未认证行为 |
|------|---------|-----------|
| `f.catstarry.xyz/*` | Worker middleware 检查 cookie | 302 → `/login` |
| `f.catstarry.xyz/login` | 公开 | — |

---

## 5. KV Key 设计

```
# 主站 AUTH_KV
user:muxia              → { password_hash, role: "admin" }
session:{token}         → { username, created_at, expires_at }  TTL: 12h
ratelimit:{ip}          → counter  TTL: 5min

# 财务 AUTH_KV（独立 namespace）
user:muxia              → { password_hash, role: "admin" }
user:cati               → { password_hash, role: "viewer" }
session:{token}         → { username, role, created_at, expires_at }  TTL: 12h
ratelimit:{ip}          → counter  TTL: 5min
```

---

## 6. 初始密码设置

Phase 5 部署前由木下手工设置：
```bash
wrangler kv:key put --binding=AUTH_KV "user:muxia" '{"password_hash":"...","role":"admin"}'
wrangler kv:key put --binding=FINANCE_AUTH_KV "user:cati" '{"password_hash":"...","role":"viewer"}'
```

密码哈希使用 `bcryptjs` 预生成（或通过一次性 setup 端点）。


---

## 7. Cloudflare One 审查（适用部分）

> cloudflare-one skill 面向企业 Zero Trust 场景。catstarry.xyz 是个人网站，不适用 Access/Tunnel/WARP。
> 以下仅提取 cloudflare-one 中适用于个人站的安全通用原则进行审查。

### 7.1 适用原则对照

| 原则 | 审查结果 |
|------|---------|
| **最小权限** | ✅ 木下 admin（r/w），cati viewer（r/o），访客无权限。角色定义清晰 |
| **Session 管理** | ✅ 12h 有效期 + KV TTL 自动过期 + 手动登出 |
| **密码存储** | ✅ bcrypt cost=10，不存明文 |
| **登录限流** | ✅ IP 级别 rate-limit（5min/10次） |
| **Cookie 安全** | ✅ HttpOnly + Secure + SameSite=Lax |
| **MFA** | N/A — 个人网站，木下决定不需要 |

### 7.2 不需要的 cloudflare-one 产品

以下产品对 catstarry.xyz 的鉴权不适用，明确排除：

| 产品 | 排除理由 |
|------|---------|
| Cloudflare Access | 企业 ZTNA，需要 IdP（Google Workspace/Azure AD），个人站无 IdP |
| Cloudflare Tunnel | 网站托管在 CF Pages/Workers，不在私有网络 |
| WARP / Device Posture | 不要求设备认证 |
| DLP / CASB | 无企业数据合规需求 |

### 7.3 简化评估

当前自建密码认证 + session + bcrypt 方案对于个人网站是正确的选择。不需要引入 Cloudflare Access 或外部 IdP。复杂度匹配场景——木下和 cati 两个用户，密码认证即可。

一个可以考虑的改进（Phase 5 可选）：
- **Cloudflare Access with one-time PIN**：如果未来想免去密码输入，可用 Cloudflare Access 的 email OTP 方案。但当前需求不需要——两个用户、低频登录、密码改一次用一年。
