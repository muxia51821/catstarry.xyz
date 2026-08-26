# Issue Tracker

- **Type**: Local markdown
- **Location**: `.scratch/<feature-slug>/` — each feature request and bug gets its own directory
- **Lifecycle**: every directory carries a lifecycle label in its `spec.md` — see the Lifecycle section below

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

## Wayfinding operations

Used by `/wayfinder`. The **map** is a file with one **child** file per ticket.

- **Map**: `.scratch/<effort>/map.md` — the Notes / Decisions-so-far / Fog body.
- **Child ticket**: `.scratch/<effort>/issues/NN-<slug>.md`, numbered from `01`, with the question in the body. A `Type:` line records the ticket type (`research`/`prototype`/`grilling`/`task`); a `Status:` line records `claimed`/`resolved`.
- **Blocking**: a `Blocked by: NN, NN` line near the top. A ticket is unblocked when every file it lists is `resolved`.
- **Frontier**: scan `.scratch/<effort>/issues/` for files that are open, unblocked, and unclaimed; first by number wins.
- **Claim**: set `Status: claimed` and save before any work.
- **Resolve**: append the answer under an `## Answer` heading, set `Status: resolved`, then append a context pointer (gist + link) to the map's Decisions-so-far in `map.md`.

## Lifecycle（目录生命周期）

每个 `.scratch/<feature>/` 目录在其 `spec.md` 头部维护一行 `Lifecycle:` 字段，取值：

- `active` — 工作未结束或待裁决
- `closed-keep-evidence` — 已完结，且含生产操作证据、备份等需长期留存的工件
- `closed-safe-to-archive` — 已完结，PR 描述即完整记录，磁盘清理时可随目录移除

规则：

- 实施方在对应 PR 合并收尾时自标本目录的 Lifecycle；跨会话清点时对无法定性的目录保守标 `active`
- 合并后的清点是只读动作：扫描各 spec.md 的 Lifecycle 汇总即可，**永不自动删除**任何目录；是否清理由木下逐项决定
- 本字段是目录级生命周期，与单个 issue 的 `Status:`（triage 流转）互不影响
- 缺少 spec.md 的历史目录在清点时补最小 spec（标题 + Lifecycle + 一句话来源）
