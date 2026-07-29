# catstarry.xyz 项目看板

> 最后更新：2026-07-29
>
> 一眼看全局。执行细节、定向回流规则见 `docs/workflow-orchestration.md`。

---

## 各路径状态

| 路径 | 需求分析 | 实现 |
| --- | --- | --- |
| / Home | ✅ 定向回流需求已更新 | 🟡 RC1 已部署到 staging；final manual acceptance 未完成 |
| /blog | ✅ | 🟡 RC1 已部署到 staging；final manual acceptance 未完成 |
| /feed | ✅ 定向回流需求已更新 | 🟡 RC1 已部署到 staging；`/api/feed` staging HTTP 200 已验证 |
| /learn | ✅ | 🟡 RC1 已部署到 staging；final manual acceptance 未完成 |
| /projects | ✅ | 🟡 RC1 已部署到 staging；final manual acceptance 未完成 |
| f.catstarry.xyz | ✅ | 🟡 Finance staging auth、protected API、same-origin `/api/*` 与 cross-site smoke 已通过；待 final manual acceptance |
| poker.catstarry.xyz | N/A | ✅ |

---

## Phase 进度

| # | Phase | 状态 |
| --- | --- | --- |
| 0 | 基础设施 | ✅ |
| 1 | 需求澄清 | ✅ |
| 2 | 规格化 | ✅ |
| 3 | 架构设计 | ✅ |
| 4 | UI/原型 | ✅ 已闭合；Phase 4.3 设计侧完成，canonical CSS、五颗星球三槽资产与 UI QA 已闭合 |
| 5 | 开发实现 | ✅ RC1 已 merge 到 main，提交 `a524b0d` |
| 6 | 测试/QA | 🟡 自动化技术验收已完成；下一步 final manual acceptance |
| 7 | 部署上线 | 🟡 staging gate ready for final manual acceptance；production release 未启动 |
| 8 | 运营维护 | 🔴 |

---

## Home / Feed 定向回流

> 触发：Phase 4.1 已确认 Home 星图入口与 Feed 公开足迹方向。此表不改变全局 Phase 2、3 的完成状态。

| 环节 | 状态 | 范围 |
| --- | --- | --- |
| 定向 Phase 2 | ✅ | Home / Feed PRD、HF-01～HF-05、triage、验收清单已完成 |
| 定向 Phase 3 | ✅ | ADR-005 锁定 Public Footprint 分存；ADR-006 退役 `/api/home` 与 blog-metadata KV bridge |
| Design 2.0 返回 Phase 4.1 | ✅ | `DESIGN.md` v2.0 与 canonical CSS 已对齐；旧 Home / About Card / Timeline 语义已退役 |
| Astro 7 依赖基线迁移 | ✅ | 当前锁定基线为 Astro 7.1.3、@astrojs/react 6.0.1、@astrojs/cloudflare 14.1.4、React 19.2.7、Wrangler 4.113.0；RC1 build / automated technical acceptance 已通过 |
| Home Activity Signal 定向 Phase 2 | ✅ | PRD、HAS-01～HAS-03、triage 已完成；三态为 active / stable / dormant，阈值为 7 / 60 天 |
| Home Activity Signal 定向 Phase 3 | ✅ | ADR-007 锁定受控静态投影；不恢复 `/api/home`、Home 聚合或 Public Timeline 给 Home 的读取关系 |
| HAS 返回 Phase 4.1 | ✅ | 三态信号卫星视觉和 token 接口已在 `DESIGN.md` 与 canonical CSS 中重锁；不得重新裁决 HAS 产品/架构 |
| Design 2.1 极小重锁 | ✅ | 正式确认 Star Map → Focus → action、Drift 语义布局与星球候选资产边界；未改架构或 canonical CSS |
| Phase 4.2 | ✅ | 隔离原型完成并经木下目测验收；Drift、Entry / Approach / Overview、Star Map → Focus → action、mock HAS、About / 豹猫星座、触控、reduced-motion 与回归脚本均已验证；五颗星球资产继续作为可替换占位 |
| Phase 4.3 | ✅ | 获选原型视觉接口与参数已落回 canonical CSS；五颗星球 Overview / Focus / Mobile 三槽 selected assets 已闭合；CJK、keyboard、touch、reduced-motion、性能与视觉一致性 QA 已完成；不代表生产 Home 已实现 |

---

## 技术栈

Astro hybrid + React + shadcn/ui + CF Workers + D1 + KV + R2。

当前本地基线为 Astro 7.1.3 + `@astrojs/react` 6.0.1 + `@astrojs/cloudflare` 14.1.4 + React 19.2.7 + Wrangler 4.113.0。依赖基线迁移与 RC1 集成已完成并经流程治理确认。

Phase 5.0A 复核结论已被 RC1 集成基线 supersede：当前以 `package.json` 锁定版本为准，不在 staging gate 中静默升级依赖。

---

## Phase 5 执行状态

| 环节 | 状态 | 说明 |
| --- | --- | --- |
| Phase 5.0A 依赖基线复核 | ✅ | RC1 当前基线：Astro 7.1.3、@astrojs/react 6.0.1、@astrojs/cloudflare 14.1.4、React 19.2.7、Wrangler 4.113.0；staging gate 不静默升级 |
| Phase 5.0B 前端规则固化 | ✅ | `docs/agents/frontend-rules.md` 已创建；Phase 5 前端线程必须引用，不得重新裁决 Phase 4 设计事实 |
| 共享基础设施 F | ✅ | 提交 `2ab3d83`、`51cd489`；独立 Code Review 已完成，P0/P1 已修复并增量复审通过 |
| Home 模块 | ✅ | 提交 `8dc447e`；木下人工验收、`npm run build`、`npm run test:home` 均通过 |
| RC1 实现 | ✅ | `a524b0d` 已 merge 到 main；Phase 5 implementation complete |
| Phase 6 自动化技术验收 | ✅ | 已完成；不等同于 staging 后 final manual acceptance |
| Phase 7 staging deployment gate | 🟡 | 当前 staging candidate：`4b41e4a`；historical RC1 merge point：`a524b0d`；staging gate ready for final manual acceptance，production 未部署 |
| 协作方式 | 🟡 | 三常驻角色：流程治理、Phase 5 主执行 / 集成线程、网页端桥梁；普通模块允许模块级并行，但模块内部单 Owner |
| 当前分工记录 | 🟡 | `.scratch/phase5/dispatch.md`；只记录 base commit、active module、owner、allowed files、blocked by、next action |

### Phase 7 staging deployment gate

已完成：

- 隔离 staging D1、KV、R2 已创建。
- Feed、Finance API、主站 Astro Worker、Finance Pages 已部署。
- staging migrations 已应用并复核。
- `staging.catstarry.xyz` 已绑定；主站、`/api/feed`、`/activity-signals.json` 均已验证 HTTP 200。
- `f-staging.catstarry.xyz` DNS 已完成验证；A / AAAA 解析正常，HTTPS 正常，Finance staging 首页返回 HTTP 200。
- `f-staging.catstarry.xyz/api/health` 返回 Finance API 的 JSON `not_found` error envelope，证明同源 `/api/*` 已到达 Finance API router；`/api/health` 本身不是现有业务路由，不视为 routing failure。
- `npm run test:finance:site` 通过。
- `npm run test:finance:http` 通过。
- staging-only 测试账号已写入 `FINANCE_AUTH_KV_STAGING`，7 天 TTL；凭据值不写入仓库文档。
- 浏览器 staging smoke 已验证：匿名 session、未认证 protected API 401、login、session、`/api/holdings`、`/api/market`、logout、logout 后 protected API 401。
- Cookie 属性已验证：host-only、`HttpOnly`、`Secure`、`SameSite=Strict`。
- Finance frontend 所有 API 请求均为 `https://f-staging.catstarry.xyz/api/*`。
- UI 登录后 dashboard 可见，登出后回到登录页；无 console error / exception。
- 主站 ↔ Finance 双向导航成功；主站 DOM 未包含 Finance 域名。
- 主站直接跨域调用 Finance API 被 CORS 拒绝，符合 same-origin 设计。
- 未修改生产资源，未部署 production。

待完成：

- 执行 final manual acceptance。
- Wrangler 4.113.0 对含 trigger migration 的远程批量执行存在已确认限制；staging 已用等价导入完成，production 前需独立处理升级 / 验证任务。

剩余风险：

- PowerShell / headless 客户端会被 Cloudflare challenge 拦截；正常非 headless 浏览器验证通过。
- staging Finance 当前 holdings / market 数据为空；API / auth 链路通过，但真实业务数据展示仍需最终人工确认。
- staging-only 测试账号 7 天后过期；final manual acceptance 应在 TTL 内完成或重新配置 staging 账号。

### F deferred

- Cloudflare 真实资源 ID、远程 migration、路由与生产部署留到 Phase 7。
- 旧生产 `feed-api` 继续保留，新 skeleton 已使用非生产名称机械隔离。
- Blog views API 兼容留到 Blog / API 模块。
- 旧 `from-zero → 2` 数据在生产切换时处理。
- `Base.astro` / `global.css` 入口迁移留到首个正式前端模块。
- 依赖安全告警另立维护事项。

### Phase 5 协作减重规则

- 普通模块由临时 Codex Agent 执行；完成并合并后结束 session。
- 模块 Agent 只读取模块任务包和直接相关真源，不默认重读完整 `CONTEXT.md`、完整 workflow、全部 ADR 或其他模块文档。
- 共享文件只能由 Phase 5 主执行 / 集成线程修改：package 与全局配置、Base layout、shared contracts、migrations、auth / CORS、CI/CD 与生产部署。
- 流程治理只在模块启动、关闭、跨模块冲突、定向回流、依赖 / 架构 Gate 和 Phase 切换时介入。
- Code Review 按风险分级：低风险自检 + build + 木下验收；普通风险测试 + 主集成检查；高风险独立 Review。

---

## 当前待办

1. 启动 Phase 6 final manual acceptance。
2. 在 staging-only 测试账号 TTL 内完成人工验收，或先重新配置 staging 账号。
3. final manual acceptance 通过后，回到流程治理关闭 Phase 6 / Phase 7 对应状态。
4. 在 Phase 6 / 7 关闭前，不得推进 production release。
