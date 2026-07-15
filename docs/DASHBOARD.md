# catstarry.xyz 项目看板

> 最后更新：2026-07-15
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
| 4 | UI/原型 | 🟡 4.1 进行中：Design 2.0 已锁定，canonical CSS 待对齐；4.2 未启动 |
| 5 | 开发实现 | 🔴 |
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
| 返回 Phase 4.1 | 🟡 | `DESIGN.md` v2.0 已锁定；`src/styles/` 的 token、旧 Home 语义与通用工具类仍待对齐 |
| Phase 4.2 | ⏸ | 尚未启动；须先完成 Phase 4.1 CSS 设计系统对齐并由流程治理确认 |

---

## 技术栈

Astro hybrid + React + shadcn/ui + CF Workers + D1 + KV + R2

---

## 当前待办

1. 在 Phase 4.1 对齐 `variables.css`、`components.css` 与 `typography.css`：保留通用设计系统，退役旧 Home / About Card / Timeline 语义，建立 Design 2.0 token 契约；不实现星图组件。
2. CSS 对齐验证通过后，木下回到「流程治理」报告 Phase 4.1 完成，再确认 Phase 4.2 的启动提示词与产物边界。
3. Phase 4.2 只用一次性原型校准滚动距离、视差比例、星球资源切换与 About 彩蛋手势；不写生产实现，也不把实验 CSS 直接写入 canonical styles。
4. blog 原型在 Phase 5 按已锁定需求重做。
