# catstarry.xyz 项目看板

> 最后更新：2026-07-23
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
| 5 | 开发实现 | 🟡 Phase 5.0A、5.0B 与共享基础设施 F 已完成；下一单一执行模块：Home |
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

## Phase 5 执行状态

| 环节 | 状态 | 说明 |
| --- | --- | --- |
| Phase 5.0A 依赖基线复核 | ✅ | 维持 Astro 7.0.9、@astrojs/react 6.0.1、React 19.2.7、Vite 8.1.4、Node 24.15.0；不启动独立依赖修复任务 |
| Phase 5.0B 前端规则固化 | ✅ | `docs/agents/frontend-rules.md` 已创建；Phase 5 前端线程必须引用，不得重新裁决 Phase 4 设计事实 |
| 共享基础设施 F | ✅ | 提交 `2ab3d83`、`51cd489`；独立 Code Review 已完成，P0/P1 已修复并增量复审通过 |
| 下一个单一模块 | 🟡 | Home；不并线，不先拆 Finance |

### F deferred

- Cloudflare 真实资源 ID、远程 migration、路由与生产部署留到 Phase 7。
- 旧生产 `feed-api` 继续保留，新 skeleton 已使用非生产名称机械隔离。
- Blog views API 兼容留到 Blog / API 模块。
- 旧 `from-zero → 2` 数据在生产切换时处理。
- `Base.astro` / `global.css` 入口迁移留到首个正式前端模块。
- 依赖安全告警另立维护事项。

### 治理维护项（不阻塞 Home）

- **Phase 5 流程减重**：登记为独立治理维护项，不阻塞 F 关闭或 Home 启动。
- 最小修改范围：后续只精简 `docs/workflow-orchestration.md` 的 Phase 5 执行规则、`docs/cold-start-governance.md` 的硬编码当前状态，以及必要的 `DASHBOARD.md` / `CONTEXT.md` 状态表达。
- 目标方向：Phase 5 默认单一执行主线；流程治理只在里程碑、Phase 切换、跨模块冲突、定向回流和架构 Gate 介入；普通业务切片不再机械返回流程治理；Code Review 按风险分级。

---

## 当前待办

1. 启动 Home 模块生产实现：读取 PRD / ADR / acceptance / DESIGN / frontend-rules，不重新设计 Home。
2. Home 模块只能实现正式页面、路由、资源接入与已锁定交互；不得接入真实 HAS 投影，除非对应架构和数据投影任务明确进入范围。
3. Phase 5 开发实现不得重新裁决 Home / Feed 产品关系、HAS 架构、Phase 4.2 已验收交互或 Phase 4.3 已选资产身份。
4. blog 原型在 Phase 5 按已锁定需求重做；当前 Astro 7 迁移只保证旧原型能构建，不为其保留 Design 1.x 兼容层。
