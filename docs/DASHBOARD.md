# catstarry.xyz 项目看板

> 最后更新：2026-07-16
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
| 4 | UI/原型 | 🟡 4.1 已完成；Astro 7 依赖基线已确认；4.2 可启动 |
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
| 返回 Phase 4.1 | ✅ | `DESIGN.md` v2.0 与 canonical CSS 已对齐；旧 Home / About Card / Timeline 语义已退役 |
| Astro 7 依赖基线迁移 | ✅ | Astro 7.0.9、@astrojs/react 6.0.1、React 19.2.7、Vite 8.1.4 已确认；build 通过；`.astro/` 已停止追踪 |
| Phase 4.2 | 🟡 | 可启动；仅做隔离原型和参数校准，不写生产实现 |

---

## 技术栈

Astro hybrid + React + shadcn/ui + CF Workers + D1 + KV + R2。

当前本地基线为 Astro 7.0.9 + `@astrojs/react` 6.0.1 + React 19.2.7 + Vite 8.1.4。依赖基线迁移已完成并经流程治理确认。

---

## 当前待办

1. fork Phase 4.2 隔离原型任务。
2. Phase 4.2 只用一次性原型校准滚动距离、视差比例、星球资源切换与 About 彩蛋手势；不写生产实现，也不把实验 CSS 直接写入 canonical styles。
3. Phase 4.2 完成后回到「流程治理」报告，由流程治理确认是否进入 Phase 4.3。
4. blog 原型在 Phase 5 按已锁定需求重做；当前 Astro 7 迁移只保证旧原型能构建，不为其保留 Design 1.x 兼容层。
