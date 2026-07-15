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
| 4 | UI/原型 | 🟡 4.1 定向回流中；4.2 未启动 |
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
| 定向 Phase 3 | 🔶 | Public Footprint 边界、事件数据与模块关系、`/api/home` 退役方案 |
| 返回 Phase 4.1 | ⏳ | 定向 Phase 3 锁定后，重锁 Home 星图、Feed 关系、DESIGN.md 与原型边界 |
| Phase 4.2 | ⏸ | 等待返回 Phase 4.1 完成后启动 |

---

## 技术栈

Astro hybrid + React + shadcn/ui + CF Workers + D1 + KV + R2

---

## 当前待办

1. 启动定向 Phase 3：Home / Feed Public Footprint 架构复核。
2. 定向 Phase 3 完成后回到本对话，恢复 Phase 4.1 并更新 DESIGN.md、SITEMAP 与 Phase 4 brief。
3. Phase 4.1 重锁后，再开始 Phase 4.2 原型生成。
4. blog 原型在 Phase 5 按已锁定需求重做。
