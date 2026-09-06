# Issue Tracker

- **Type**: Local markdown
- **Location**: `.scratch/<feature-slug>/` — 使用持久 ticket 时，一项 feature / bug 一个目录
- **Lifecycle**: 使用 ticket 的目录在 `spec.md` 中维护生命周期；其他 scratch 工件不因此要求补建 spec

是否需要持久 ticket，由 `docs/workflow-orchestration.md` 的“按任务补充记录与检查”或具体 handoff 决定。以下格式适用于已选择使用 ticket 的任务。

## Conventions

- One feature per directory: `.scratch/<feature-slug>/`
- The spec is `.scratch/<feature-slug>/spec.md`
- Implementation issues are one file per ticket at `.scratch/<feature-slug>/issues/<NN>-<slug>.md`, numbered from `01` — never a single combined tickets file
- Triage state is recorded as a `Status:` line near the top of each issue file (see `triage-labels.md` for the role strings)
- Comments and conversation history append to the bottom of the file under a `## Comments` heading

## Legacy format (pre-2026-08)

Existing history keeps the old layout and stays valid as-is:

- `.scratch/<feature>/issue.md` — spec/PRD file
- `.scratch/<feature>/<NN>-<slug>/issue.md` — implementation issue

Do not migrate these files; only new issues use the conventions above.

## When a skill says "publish to the issue tracker"

Create a new file under `.scratch/<feature-slug>/` (creating the directory if needed).

## When a skill says "fetch the relevant ticket"

Read the file at the referenced path. The user will normally pass the path or the issue number directly.

## Lifecycle（目录生命周期）

使用 ticket 的目录在其 `spec.md` 头部维护一行 `Lifecycle:` 字段，取值：

- `active` — 工作未结束或待裁决
- `closed-keep-evidence` — 已完结，且含生产操作证据、备份等需长期留存的工件
- `closed-safe-to-archive` — 已完结，PR 描述即完整记录，可提议归档或清理；该标签本身不授予删除权限

规则：

- 实施方在使用 ticket 的任务合并收尾时更新已有 spec 的 Lifecycle。
- 清点是只读动作：汇总已有 Lifecycle；缺少 spec / 字段或无法定性的目录，在报告中列为待确认并按 `active` 保守处理，不写回文件。
- **永不自动删除**任何目录；生产操作证据、备份等工件必须保留，是否清理由木下逐项决定。
- 本字段是目录级生命周期，与单个 issue 的 `Status:`（triage 流转）互不影响
- 需要给历史目录补 spec / Lifecycle 时，放到明确授权的整理任务中执行，不作为清点的附带写入。
