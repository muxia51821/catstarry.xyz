# catstarry.xyz 项目看板

> 最后更新：2026-07-29
>
> 一眼看全局。执行细节、定向回流规则见 `docs/workflow-orchestration.md`。

---

## 各路径状态

| 路径 | 需求分析 | 实现 |
| --- | --- | --- |
| / Home | ✅ 定向回流需求已更新 | ✅ production release 已完成；manual smoke passed |
| /blog | ✅ | ✅ production release 已完成；manual smoke passed |
| /feed | ✅ 定向回流需求已更新 | ✅ production release 已完成；manual smoke passed |
| /learn | ✅ | ✅ production release 已完成；manual smoke passed |
| /projects | ✅ | ✅ production release 已完成；manual smoke passed |
| f.catstarry.xyz | ✅ | ✅ production release 已完成；manual smoke passed |
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
| 6 | 测试/QA | ✅ 自动化技术验收 + final manual acceptance 已完成 |
| 7 | 部署上线 | ✅ production release 已完成；Release SHA：`665fbb3c3f01eb7fa84fb55997def210f47fe1a3`；Production manual smoke：passed |
| 8 | 运营维护 | 🟡 运营维护已启动 |

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
| Phase 6 自动化技术验收 | ✅ | 已完成 |
| Phase 6 final manual acceptance | ✅ | Home、Blog、Feed、Learn、Projects、Finance 登录页 / dashboard 空数据展示、主站与 Finance 路径，桌面与移动视觉均可接受 |
| Phase 7 production release | ✅ | Release SHA：`665fbb3c3f01eb7fa84fb55997def210f47fe1a3`；Production manual smoke：passed |
| 协作方式 | 🟡 | 三常驻角色：流程治理、Phase 5 主执行 / 集成线程、网页端桥梁；普通模块允许模块级并行，但模块内部单 Owner |
| 当前分工记录 | 🟡 | `.scratch/phase5/dispatch.md`；只记录 base commit、active module、owner、allowed files、blocked by、next action |

### Phase 7 release closure

已完成：

- Phase 7 staging gate：complete。
- Phase 7 production release：complete。
- Release SHA：`665fbb3c3f01eb7fa84fb55997def210f47fe1a3`。
- Production manual smoke：passed。
- Phase 8 operations and maintenance：started。

上线后迭代 / 后续业务验收：

- 星球 selected assets 后续替换与视觉微调。
- Finance 历史真实数据迁移、真实行情 provider、双角色完整业务体验及年度流程。
- 其他真实数据驱动的业务差异。

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

1. 进入 Phase 8 运营维护。
2. 新问题按 bug、维护、体验微调或新需求分类处理。
3. Phase 8 独立维护事项按优先级逐项处理，不回写为 Phase 7 blocker。
