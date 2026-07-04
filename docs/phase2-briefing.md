# Phase 2 任务说明 — 给规格化对话

> 流程治理产出，2026-07-04

---

## 你的职责

Phase 2：规格化。把 Phase 1 产出的 5 份需求 JSON 拆成开发 issue + 验收清单。

## 输入

`docs/final-requirements-*.json`（5 份）：
- `final-requirements-feed.json`
- `final-requirements-finance.json`
- `final-requirements-learn.json`
- `final-requirements-projects.json`
- 首页 / Home（handoff 已定义，无独立 JSON）

## 执行顺序

| # | 动作 | skill |
|---|------|-------|
| 1 | 全量需求 → 开发 issue | `to-issues` |
| 2 | 逐 issue triage 分类 + 打标签 | `triage` |
| 3 | 复杂模块出 PRD | `to-prd` |
| 4 | 生成验收清单 | — |

## 产出物要求

### 给 AI（`.scratch/*/issue.md`）
- 英文/技术语言，可包含 D1 schema、KV key、CORS、API route 等技术细节
- 每个 issue 自包含、可独立开发、有清晰的依赖关系
- 已完成的模块（blog、feed）已有 issue，检查是否需要更新而非重建

### 给木下（`docs/acceptance-*.md`）
- 纯中文业务语言，"这个功能做到了/没做到"
- 不出现 D1、KV、CORS、schema、endpoint 等技术词
- 每模块一页，按用户操作流程组织

## 可参考（只读）
- `GLOSSARY.md` — 术语定义
- `CONTEXT.md` — [已锁定] 为准
- `docs/tech-decisions-20260703.md` — 技术栈
- `docs/workflow-orchestration.md` — Phase 2 详细步骤

## 做完后
提醒木下回到「流程治理」对话更新进度。