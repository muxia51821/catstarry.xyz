# AGENTS.md

## Behavioral Principles

These rules apply to coding, implementation, testing, and repository tasks.

### 1. Think Before Coding

- Prefer existing code and project documents over assumptions.
- Ask only when missing information materially changes implementation, risk, or acceptance.
- For safe and reversible ambiguity, state the assumption and continue.
- Do not invent unrequested product requirements.

### 2. Simplicity First

- Prefer the smallest implementation that satisfies the requirement.
- Do not introduce unrequested abstractions, configuration, or extensibility.
- Do not refactor unrelated code in pursuit of a cleaner design.

### 3. Surgical Changes

- Modify only files directly relevant to the current task.
- Do not format, fix, delete, or reorganize unrelated content.
- Every change must be traceable to a stated requirement.

### 4. Verify the Result

- Bugs: reproduce -> fix -> verify.
- Refactors: verify behavioral equivalence.
- Run relevant tests, builds, or static checks.
- Report unperformed verification explicitly; never claim it passed.

## Agent Operating Context

- Issue tracker：`.scratch/<feature>/`，见 `docs/agents/issue-tracker.md`。
- Triage labels：见 `docs/agents/triage-labels.md`。
- `CONTEXT.md`：Agent 快速上下文和少量长期事实摘要。
- `GLOSSARY.md`：共享命名、别名和术语边界。
- `docs/SITEMAP.md`：路由、页面职责和公开／非公开范围。
- Content Family 产品事实：从 `docs/content/README.md` 进入，按需读取 Family Contract / Master Ledger；其他模块使用仍明确有效的 Product Closure、验收基线或当前任务裁决。
- 历史 requirements / acceptance：只作为历史证据，除非文件或当前任务明确说明其仍是现行 authority。
- `docs/adr/`、`docs/architecture*.md`：架构决策与技术事实。
- `DESIGN.md`：设计事实。
- 当前代码和测试：已实现行为的直接证据，但不能自行推翻明确的 Product Closure、架构决策或用户裁决。
- Git HEAD、部署 source、production 状态等易过期事实：需要时现场核验，不从长期文档猜测。

## 项目与流程

- 所有项目文档和与木下的对话使用中文。
- 代码标识符、文件名和 Git commit message 使用英文 ASCII。
- 木下是非程序员用户；说明改动时应使用可理解的语言，并提供精确命令。
- `AGENTS.md` 负责 Agent 行为、权限和仓库安全。
- `docs/workflow-orchestration.md` 负责 Phase 8 执行调度、Touch-on-Conflict 和高风险任务流程。
- `CONTEXT.md` 负责快速定向，不承担完整 Product / Architecture / Design 状态复制。
- Triage labels 只表示 Issue 状态，不具备执行调度权。
- 执行前明确当前任务、模块和允许修改的范围。
- 不得修改未经授权的模块。
- 生产发布、架构变更和依赖主版本升级必须单独立项。
- `docs/_archive/` 用于保存版本化的历史或已 superseded 证据；它不属于正常 current-truth reading path，只有历史追溯或 rationale 需要时再读取。

## Production 安全

- 未经木下明确授权，不得部署或修改 production 资源。
- Production 资源包括 Workers、Pages、D1、KV、R2、DNS、routes、Cron、secrets 和 GitHub production environment。
- 不得在代码、日志、文档或回复中暴露密码、Token、Secret、哈希或认证记录。
- 执行 production 操作前，必须说明影响范围、验证步骤和回滚条件。

## Git 约束

- 功能开发、Bug 修复和其他可能影响生产行为的任务，默认从最新 `main` 创建独立任务分支（例如 `task/finance-reliability`）；不要直接在 `main` 上进行此类开发。CHANGELOG 更新等纯文档性改动不受此限：可直接在 `main` 提交并推送，无需开分支或 PR；PR 保留给影响生产行为的代码改动。
- 同一任务分支同时只允许一台电脑主动修改。任务完成并提交后 push 该任务分支；合并回 `main` 后，其他电脑必须先同步最新 `main`，再创建新的任务分支。不要让两台电脑同时推进同一个分支。
- 同步远端 `main` 使用 `git pull --ff-only`：本机 `main` 与远端分叉时直接停下报错，不自动生成 merge commit。
- 默认情况下 commit / push 由木下执行。对于明确授权的复杂 implementation task，Codex 可以在独立 `task/*` 或 `codex/*` 分支上 commit 和 push。Codex 不得直接 push `main`，不得自行 merge PR，也不得因此取得 deployment 或 production mutation authority。是否授权 Codex commit/push 由任务 handoff 明确说明；未明确授权时按木下执行。
- 修改文件前必须运行：

```powershell
git status --short
git log -1 --oneline
```

- 不得修改或暂存与当前任务无关的 tracked 或 untracked 文件。
- 未经明确授权，不得使用 `git add .` 或 `git add -A`。
- 未授权 commit / push 时，完成后列出实际改动文件，并提供按路径限定的 `git add`、`git commit` 和必要的 `git push` 命令。
- 如需快照，提供精确命令并等待木下执行后再继续。

## 依赖基线

- 默认使用 `package.json` 和 lockfile 已锁定的版本。
- 不得在功能、设计、修复或原型任务中静默升级依赖。
- 主版本升级必须作为独立的依赖审计和迁移任务执行。

## 文件写入

- 使用 PowerShell 7（`pwsh`），不得使用 Windows PowerShell 5.1（`powershell.exe`）。
- Keep PowerShell commands simple; avoid long one-liners and fragile nested quoting/regex.
- A PowerShell parser or command failure is a tooling failure, not evidence that the application or test failed.
- 修改已有文件时优先使用 patch/edit 工具。
- 避免整文件重写和无关换行符变化。
- 新建或完整覆盖文件时使用 UTF-8 无 BOM。
- 写入后检查 `git diff`，不得产生与当前任务无关的变更。

## 文档传播边界

- 小型修复不触发 repo-wide 文档 reconciliation。
- 只同步直接受影响、且仍承担 current authority 的文档。
- 历史文档与当前实现不同通常不是 Bug；只有它会误导当前任务时，才补边界或归档。
- 完整 Touch-on-Conflict 规则见 `docs/workflow-orchestration.md`。

## 冲突处理

- Agent 行为、权限和仓库安全：以 `AGENTS.md` 为准。
- 执行调度、Touch-on-Conflict 和高风险流程：以 `docs/workflow-orchestration.md` 为准。
- 共享命名、别名和术语边界：以 `GLOSSARY.md` 为准。
- 路由、页面职责和公开／非公开范围：以 `docs/SITEMAP.md` 为准。
- 产品行为：以当前有效的 Product Closure / Contract / 明确用户裁决为准；历史 requirements / acceptance 不自动拥有 current authority。
- 架构：以 ADR 和 current `docs/architecture*.md` 为准。
- 设计：以 `DESIGN.md` 为准。
- 实现状态：以当前代码、测试和必要的 production evidence 为准。
- Issue 状态：以 triage labels 为准。
- 不存在一份文档可以跨职责维度覆盖所有其他文档。
- 如果 Glossary 的命名与上游事实发生冲突，Agent 必须停止并报告冲突，不得擅自选一份覆盖另一份。
- 无法判断时，说明冲突来源，不得自行覆盖已有决策。
