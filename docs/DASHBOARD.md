# catstarry.xyz 项目看板

> 最后更新：2026-07-22
>
> 一眼看全局。执行细节、定向回流规则见 `docs/workflow-orchestration.md`。

---

## 各路径状态

| 路径 | 需求分析 | 实现 |
| --- | --- | --- |
| / Home | ✅ 定向回流需求已更新 | 🔴 未开发 |
| /blog | ✅ | 🟡 原型已上线（Phase 5 重做） |
| /feed | ✅ 定向回流需求已更新 | 🔴 未开发 |
| /learn | ✅ | 🔴 未开发 |
| /projects | ✅ | 🔴 未开发 |
| f.catstarry.xyz | ✅ | 🔴 未开发 |
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
| 5 | 开发实现 | 🟡 Phase 5.0A 已完成；下一步 Phase 5.0B 前端规则固化，然后进入共享基础设施 F |
| 6 | 测试/QA | 🔴 |
| 7 | 部署上线 | 🔴 |
| 8 | 运营维护 | 🔴 |

---

## Home / Feed 定向回流

> 触发：Phase 4.1 已确认 Home 星图入口与 Feed 公开足迹方向。此表不改变全局 Phase 2、3 的完成状态。

| 环节 | 状态 | 范围 |
| --- | --- | --- |
| 定向 Phase 2 | ✅ | Home / Feed PRD、HF-01～HF-05、triage、验收清单已完成 |
| 定向 Phase 3 | ✅ | ADR-005 锁定 Public Footprint 分存；ADR-006 退役 `/api/home` 与 blog-metadata KV bridge |
| Design 2.0 返回 Phase 4.1 | ✅ | `DESIGN.md` v2.0 与 canonical CSS 已对齐；旧 Home / About Card / Timeline 语义已退役 |
| Astro 7 依赖基线迁移 | ✅ | Astro 7.0.9、@astrojs/react 6.0.1、React 19.2.7、Vite 8.1.4 已确认；build 通过；`.astro/` 已停止追踪 |
| Home Activity Signal 定向 Phase 2 | ✅ | PRD、HAS-01～HAS-03、triage 已完成；三态为 active / stable / dormant，阈值为 7 / 60 天 |
| Home Activity Signal 定向 Phase 3 | ✅ | ADR-007 锁定受控静态投影；不恢复 `/api/home`、Home 聚合或 Public Timeline 给 Home 的读取关系 |
| HAS 返回 Phase 4.1 | ✅ | 三态信号卫星视觉和 token 接口已在 `DESIGN.md` 与 canonical CSS 中重锁；不得重新裁决 HAS 产品/架构 |
| Design 2.1 极小重锁 | ✅ | 正式确认 Star Map → Focus → action、Drift 语义布局与星球候选资产边界；未改架构或 canonical CSS |
| Phase 4.2 | ✅ | 隔离原型完成并经木下目测验收；Drift、Entry / Approach / Overview、Star Map → Focus → action、mock HAS、About / 豹猫星座、触控、reduced-motion 与回归脚本均已验证；五颗星球资产继续作为可替换占位 |
| Phase 4.3 | ✅ | 获选原型视觉接口与参数已落回 canonical CSS；五颗星球 Overview / Focus / Mobile 三槽 selected assets 已闭合；CJK、keyboard、touch、reduced-motion、性能与视觉一致性 QA 已完成；不代表生产 Home 已实现 |

---

## 技术栈

Astro hybrid + React + shadcn/ui + CF Workers + D1 + KV + R2。

当前本地基线为 Astro 7.0.9 + `@astrojs/react` 6.0.1 + React 19.2.7 + Vite 8.1.4。依赖基线迁移已完成并经流程治理确认。

Phase 5.0A 复核结论：前端依赖维持现状，不启动独立依赖修复任务；Phase 5.0B 无阻塞。当前公开版本虽有 Astro 7.1.3、Vite 8.1.5 等同主线更新，但没有发现构建失败、兼容破坏或锁定架构无法满足的证据。Cloudflare adapter 未安装是正确状态，只有真正启用按需渲染时才应安装。

---

## 当前待办

1. 启动 Phase 5.0B：固化 `docs/agents/frontend-rules.md`，将 `DESIGN.md`、canonical CSS、CJK、三画布、Star Map / Planet / HAS / 豹猫星座边界写成开发线程必须引用的前端规则。
2. Phase 5.0B 完成后启动共享基础设施 F；F 的首个建置项是确定可跟踪的非机密 Worker 配置方案、核对真实 bindings、建立 Wrangler / type-generation 工具链，再执行 D1 / KV / R2 与 CI/CD。
3. 当前 `workers/feed-api/wrangler.toml` 存在但被根 `.gitignore` 的 `wrangler.toml` 规则忽略且未跟踪，且其中 D1 名称为 `feed-db`，与锁定架构的 `catstarry-db` 不一致；不得直接复用为部署配置。
4. Phase 5 开发实现不得重新裁决 Home / Feed 产品关系、HAS 架构、Phase 4.2 已验收交互或 Phase 4.3 已选资产身份。
5. 正式 Home、真实 HAS 投影、资源加载策略、路由与页面实现属于 Phase 5；Phase 4.3 只完成设计系统、资产身份和隔离原型 QA。
6. blog 原型在 Phase 5 按已锁定需求重做；当前 Astro 7 迁移只保证旧原型能构建，不为其保留 Design 1.x 兼容层。
