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
| 4 | UI/原型 | 🟡 4.1 已完成；Astro 7 定向依赖迁移待执行；4.2 暂停 |
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
| Astro 7 依赖基线迁移 | ⏳ | 在独立任务中将 Astro 5.18.2 对齐至 7.0.9，完成最小兼容修改与构建／内容渲染验证；不重开 Phase 4.1 |
| Phase 4.2 | ⏸ | 等待 Astro 7 定向迁移闭合；之后仅做隔离原型，不写生产实现 |

---

## 技术栈

Astro hybrid + React + shadcn/ui + CF Workers + D1 + KV + R2。

当前本地基线为 Astro 5.18.2 + `@astrojs/react` 6.0.1；目标基线为 Astro 7.0.9。版本迁移尚未执行。

---

## 当前待办

1. fork 独立的 Astro 7 定向依赖迁移任务；只升级依赖并完成必要的 Content Layer / Markdown / 编译兼容修改，不改视觉、需求或架构。
2. 迁移完成后回到「流程治理」确认新基线，再启动 Phase 4.2。
3. Phase 4.2 只用一次性原型校准滚动距离、视差比例、星球资源切换与 About 彩蛋手势；不写生产实现，也不把实验 CSS 直接写入 canonical styles。
4. blog 原型在 Phase 5 按已锁定需求重做；依赖迁移只保证它能在 Astro 7 下构建，不为其保留 Design 1.x 兼容层。
