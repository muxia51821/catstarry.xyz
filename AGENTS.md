# AGENTS.md

## Behavioral Principles

These rules apply only in coding / implementation tasks and may override general behavior when in conflict.

### 1. Think Before Coding

- Do not assume ambiguous requirements; ask clarifying questions
- Surface trade-offs explicitly before implementation
- If unsure, pause and articulate uncertainty

### 2. Simplicity First

- Do not introduce unrequested abstractions or configurability
- Prefer minimal implementation over extensible design
- If simpler solution exists, refactor toward it

### 3. Surgical Changes

- Only modify code relevant to the request
- Do not refactor unrelated code, even if improved
- Ensure every change is traceable to requirement

### 4. Goal-Driven Execution

- Convert tasks into verifiable steps when necessary
- For bugs: reproduce -> fix -> verify
- For refactors: ensure behavioral equivalence before/after

## Agent Operating Context

### Issue tracker

Local markdown — issues live as files under `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Five canonical labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context — one `CONTEXT.md` at repo root, ADRs in `docs/adr/`. See `docs/agents/domain.md`.

## 文件写入方式

### 首选（长内容、中文、特殊字符）

使用 PowerShell Here-String + .NET WriteAllText，一次写入完整文件。
**适用条件**：文件内容不包含 `@'` 或行中 `'@` 序列。

```powershell
$content = @'
（在此处原样粘贴完整文件内容。单引号 ' 、双引号 " 、反斜杠 \ 、$ 符号均无需转义）
'@
[System.IO.File]::WriteAllText("D:\catstarry.xyz\目标文件.md", $content,[System.Text.UTF8Encoding]::new($false))
```

**约束**：  

- Here-String 用单引号：`@'` 开头，`'@` 结尾
- `'@` 必须顶格写在行首，单独占一行
- `[System.Text.UTF8Encoding]::new($false)` 确保无 BOM 的 UTF-8
- 如果内容含 `'@` 或行中 `@'`（如本文档本节自身），回退到备选方案。

### 备选（内容含 @' / 短内容 / 无复杂字符）

`python -c` + `pathlib.write_text`。仅限：单引号字符串、无反斜杠、无美元符、无三重引号。

### 禁止

- `Set-Content`（GBK 编码，中文乱码）
- `Out-File`（同上）
- `>` 重定向写中文文件（同上）
- `python -c` 内含三重引号或反斜杠转义
- 含美元符的 `python -c` 字符串（PowerShell 变量展开）

## 项目术语

见 `GLOSSARY.md`.

## 技术栈

Astro hybrid + React (shadcn/ui) + CF Workers + D1 + KV + R2。详见 `docs/architecture.md`.

## 项目与流程约束

- 所有文档和用户对话用中文
- 代码标识符、文件名、Git commit 用英文 ASCII
- 非程序员用户（Vibe Coding），AI agent 负责编码
- **执行权限**：docs/workflow-orchestration.md 是唯一执行调度系统（single source of execution truth）。triage labels 和 CONTEXT.md 仅提供信息，不具备流程控制权。
- **流程约束**：所有开发工作必须遵循 `docs/workflow-orchestration.md` 定义的 Phase 顺序。对话开始时必须明确声明当前负责的 Phase，不得越权处理其他 Phase 的事项。Phase 顺序不可跳。
- **CONTEXT.md 约定性质**：`[原型约定]` 标记的内容是 blog 原型阶段的临时产物，对应的 Phase 到达时必须重新审查，有权推翻；`[已锁定]` 标记的内容不可改。
- **进度上报**：当前 Phase 完成后，提醒木下回到「流程治理」对话更新 DASHBOARD.md。
- **Git 推送**：沙箱环境推 GitHub 时使用 `git -c http.sslBackend=schannel push`。木下本地终端走 SSH（`git@github.com:muxia51821/catstarry.xyz.git`）。
- **Git 快照**：改动文档/代码前先 `git add` + `git commit`，确保可回退。

## Rule Precedence

AGENTS.md > Workflow-orchestration > CONTEXT.md > labels > local heuristics
