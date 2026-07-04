# Phase 3 任务说明 — 给架构设计对话

> 流程治理产出，2026-07-04 23:40

---

## 你的职责

Phase 3：架构设计。基于 Phase 2 产出的 PRD 和 issue，确定技术架构细节。

## 输入

- docs/tech-decisions-20260703.md — 已锁定的 7 项技术决策
- .scratch/\*/issue.md — 52 个开发 issue（6 个模块）
- docs/acceptance-\*.md — 6 份验收清单

## 执行顺序

| #   | 动作                                                                                   | skill                               |
| --- | -------------------------------------------------------------------------------------- | ----------------------------------- |
| 3.1 | 领域建模（术语表 → D1 schema、API 数据结构） → `architecture/data-model.md`            | domain-modeling                     |
| 3.2 | 代码库架构（目录结构、模块边界、依赖） → `architecture.md` + `architecture/modules.md` | codebase-design                     |
| 3.3 | 数据流设计（Workers 路由、D1/KV/R2 读写、Cron） → `architecture/modules.md`            | cloudflare + workers-best-practices |
| 3.4 | 鉴权方案（/feed + f.catstarry.xyz 的具体实现） → `architecture/auth.md`                | cloudflare-one                      |
| 3.5 | 架构决策记录（每个重大决策一条：为什么选 A 不选 B） → `docs/adr/*.md`                  | —                                   |

## 产出物

- docs/architecture.md — 架构总览（模块关系图 + 数据流向 + 技术栈映射）
- docs/architecture/data-model.md — D1 schema + API 类型定义
- docs/architecture/auth.md — /feed + finance 鉴权方案
- docs/architecture/modules.md — 目录结构 + Workers 路由 + 依赖规则
- docs/adr/\*.md — 每个重大决策一条（为什么选 A 不选 B）
- docs/SITEMAP.md — 更新路径状态

## 关键约束

- 技术栈不可改（Astro + React + shadcn/ui + CF Workers + D1 + KV + R2）
- CONTEXT.md 目录结构 [原型约定 | Phase 3 重新裁决] — 你有权推翻 blog 原型的目录结构
- CONTEXT.md 前端/后端约定 [原型约定 | Phase 5 重新裁决] — 不属于你，不改

## 可参考（只读）

- GLOSSARY.md — 术语定义
- CONTEXT.md — [已锁定] 为准，目录结构可裁决
- AGENTS.md — 全局约束
- docs/workflow-orchestration.md — Phase 3 详细步骤
- docs/SITEMAP.md — 当前站点结构

## 做完后

提醒木下回到「流程治理」对话更新进度。
