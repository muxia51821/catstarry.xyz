# catstarry.xyz — Agent Instructions

## Agent skills

### Issue tracker

Local markdown — issues live as files under `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Five canonical labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context — one `CONTEXT.md` at repo root, ADRs in `docs/adr/`. See `docs/agents/domain.md`.

## 文件写入

所有包含中文的 .md 文件通过 Python `pathlib.write_text(content, encoding='utf-8')` 写入，禁止使用 PowerShell `Set-Content`（中文 Windows GBK 编码导致乱码）。**PowerShell here-string 管道到 Python 同样会经过 GBK 编码，不可用。唯一可靠方式：先写 .py 脚本文件到磁盘，再 `python script.py` 执行。**

## 项目术语

见 `GLOSSARY.md`.

## 技术栈

Astro hybrid + React (shadcn/ui) + CF Workers + D1 + KV + R2。详见 `README.md` 和 `docs/tech-decisions-20260703.md`.

## 约束

- 所有文档和用户对话用中文
- 代码标识符、文件名、Git commit 用英文 ASCII
- 非程序员用户（Vibe Coding），AI agent 负责编码
- **执行权限**：docs/workflow-orchestration.md 是唯一执行调度系统（single source of execution truth）。triage labels 和 CONTEXT.md 仅提供信息，不具备流程控制权。
- **流程约束**：所有开发工作必须遵循 `docs/workflow-orchestration.md` 定义的 Phase 顺序。对话开始时必须明确声明当前负责的 Phase，不得越权处理其他 Phase 的事项。Phase 顺序不可跳。
- **CONTEXT.md 约定性质**：`[原型约定]` 标记的内容是 blog 原型阶段的临时产物，对应的 Phase 到达时必须重新审查，有权推翻；`[已锁定]` 标记的内容不可改。
- **进度上报**：当前 Phase 完成后，提醒木下回到「流程治理」对话更新 DASHBOARD.md。
- **Git 推送**：沙箱环境推 GitHub 时使用 `git -c http.sslBackend=schannel push`。木下本地终端走 SSH（`git@github.com:muxia51821/catstarry.xyz.git`）。
- **Git 快照**：改动文档/代码前先 `git add` + `git commit`，确保可回退。
- **Python -c 调用**：不在 `-c` 内使用三重引号（PowerShell 误解析）；换行用 `chr(10)` 替代 `\n`；单个 `-c` 不超过 3 行；长脚本先写 .py 文件再执行。
