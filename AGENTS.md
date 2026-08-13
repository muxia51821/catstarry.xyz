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
- requirements / acceptance：产品需求与验收。
- `docs/adr/`、`docs/architecture*.md`：架构决策与技术事实。
- `DESIGN.md`：设计事实。
- 当前代码和测试：已实现行为的直接证据，但不能自行推翻明确的上游需求或架构决策。

## 项目与流程

- 所有项目文档和与木下的对话使用中文。
- 代码标识符、文件名和 Git commit message 使用英文 ASCII。
- 木下是非程序员用户；说明改动时应使用可理解的语言，并提供精确命令。
- `AGENTS.md` 负责 Agent 行为、权限和仓库安全。
- `docs/workflow-orchestration.md` 负责执行调度和高风险任务流程。
- `CONTEXT.md` 记录当前产品事实和已确认决策。
- Triage labels 只表示 Issue 状态，不具备执行调度权。
- 执行前明确当前任务、模块和允许修改的范围。
- 不得修改未经授权的模块。
- 生产发布、架构变更和依赖主版本升级必须单独立项。

## Production 安全

- 未经木下明确授权，不得部署或修改 production 资源。
- Production 资源包括 Workers、Pages、D1、KV、R2、DNS、routes、Cron、secrets 和 GitHub production environment。
- 不得在代码、日志、文档或回复中暴露密码、Token、Secret、哈希或认证记录。
- 执行 production 操作前，必须说明影响范围、验证步骤和回滚条件。

## Git 约束

- 功能开发、Bug 修复和其他可能影响生产行为的任务，默认从最新 `main` 创建独立任务分支（例如 `task/finance-reliability`）；不要直接在 `main` 上进行此类开发。纯文档或极小的非生产性维护可以按任务需要例外处理。
- 同一任务分支同时只允许一台电脑主动修改。任务完成并提交后 push 该任务分支；合并回 `main` 后，其他电脑必须先同步最新 `main`，再创建新的任务分支。不要让两台电脑同时推进同一个分支。
- 同步远端 `main` 使用 `git pull --ff-only`：本机 `main` 与远端分叉时直接停下报错，不自动生成 merge commit。
- 所有 `git commit` 和 `git push` 均由木下执行。
- 修改文件前必须运行：

```powershell
git status --short
git log -1 --oneline
```

- 不得修改或暂存与当前任务无关的 tracked 或 untracked 文件。
- 未经明确授权，不得使用 `git add .` 或 `git add -A`。
- 完成后列出实际改动文件，并提供按路径限定的 `git add` 和 `git commit` 命令。
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

## 治理上报

仅在以下情况提醒木下更新 `docs/DASHBOARD.md`：

- production release；
- 重要里程碑完成；
- 模块状态发生变化；
- 新增或关闭重大 blocker；
- 架构、依赖或运营治理基线发生变化。

普通维护修复无需单独更新治理状态。

## 冲突处理

- Agent 行为、权限和仓库安全：以 `AGENTS.md` 为准。
- 执行调度和高风险流程：以 `docs/workflow-orchestration.md` 为准。
- 共享命名、别名和术语边界：以 `GLOSSARY.md` 为准。
- 路由、页面职责和公开／非公开范围：以 `docs/SITEMAP.md` 为准。
- 产品行为：以对应 requirements、acceptance 和确认后的任务事实为准。
- 架构：以 ADR 和 `docs/architecture*.md` 为准。
- 设计：以 `DESIGN.md` 为准。
- 实现状态：以当前代码、测试和生产证据为准。
- Issue 状态：以 triage labels 为准。
- 不存在一份文档可以跨职责维度覆盖所有其他文档。
- 如果 Glossary 的命名与上游事实发生冲突，Agent 必须停止并报告冲突，不得擅自选一份覆盖另一份。
- 无法判断时，说明冲突来源，不得自行覆盖已有决策。
