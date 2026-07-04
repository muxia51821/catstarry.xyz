# Phase 2 任务说明 — 给规格化对话

> 流程治理产出，2026-07-04。**Phase 2 已于 2026-07-04 20:34 完成。**

---

## 你的职责

Phase 2：规格化。把 Phase 1 产出的 5 份需求 JSON 拆成开发 issue + 验收清单。

## 输入

`docs/final-requirements-*.json`（5 份）：
| 模块 | 文件 | 目标数 | 置信度 |
|------|------|--------|--------|
| /feed | `final-requirements-feed.json` | 6 | high |
| /learn | `final-requirements-learn.json` (+3份子文档) | 13 | high |
| /projects | `final-requirements-projects.json` | 3 | high |
| /finance | `final-requirements-finance.json` | 8 | high |
| **/** | `final-requirements-homepage.json` | 6 | high |

## 执行顺序

| #   | 动作                          | skill       |
| --- | ----------------------------- | ----------- |
| 1   | 全量需求 → 开发 issue         | `to-issues` |
| 2   | 逐 issue triage 分类 + 打标签 | `triage`    |
| 3   | 复杂模块出 PRD                | `to-prd`    |
| 4   | 生成验收清单                  | —           |

## 产出物要求

### 给 AI（`.scratch/*/issue.md`）

- 英文/技术语言，可包含 D1 schema、KV key、CORS、API route 等技术细节
- 每个 issue 自包含、可独立开发、有清晰的依赖关系
- 已完成的模块（blog、feed）已有 issue，检查是否需要更新而非重建

### 给木下（`docs/acceptance-*.md`）

- 纯中文业务语言，"这个功能做到了/没做到"
- 尽量不出现 D1、KV、CORS、schema、endpoint 等技术词
- 每模块一页，按用户操作流程组织
- 确保与issue.md无偏差

## 关键约束

### 语义一致性（必须）

**issue 和 acceptance 之间不允许语义偏差。** 生成验收清单后，做一轮反向校验：

- 逐条检查 acceptance 的每条是否能在某个 issue 中找到对应的技术实现
- 逐条检查 issue 的核心功能是否在 acceptance 中有对应验收项
- 发现偏差立即修正，以需求 JSON 为准

### 已有 issue 处理（blog 11 个 + feed 8 个）

blog 和 feed 的 issue 已存在但没有验收清单。你需要：

- 逐一审查已有 issue 质量（是否过时、是否与技术栈冲突、依赖链是否合理）
- 不合格的 issue 直接更新或重建
- 为 blog 和 feed 补充 `docs/acceptance-blog.md` 和 `docs/acceptance-feed.md`

## 可参考（只读）

- `GLOSSARY.md` — 术语定义
- `CONTEXT.md` — [已锁定] 为准
- `docs/tech-decisions-20260703.md` — 技术栈
- `docs/workflow-orchestration.md` — Phase 2 详细步骤

## 做完后

提醒木下回到「流程治理」对话更新进度。
