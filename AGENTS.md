# catstarry.xyz — Agent Instructions

## Agent skills

### Issue tracker

Local markdown — issues live as files under `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Five canonical labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context — one `CONTEXT.md` at repo root, ADRs in `docs/adr/`. See `docs/agents/domain.md`.

## 文件写入

禁止 Set-Content、here-string 管道、-c 三重引号等任何依赖 PowerShell 编码层的方式。唯一可靠方式：先写 .py 脚本到磁盘（UTF-8 without BOM），再 python script.py 执行，事后删除脚本。



### python -c 与 PowerShell 引号冲突

禁止在 PowerShell 下用 python -c 传递三重引号字符串、内含单引号的单引号字符串，或包含反斜杠转义的字符串。PowerShell 会在 Python 看到之前解析引号和反斜杠，导致不可预测的语法错误。

可靠替代方案：
- 短内容：python -c 用双引号包围，内部 Python 字符串用单引号，避免单引号嵌套和反斜杠转义
- 长内容：写 .py 脚本 - 执行 - 删除（上文已述）
- 追加写入：多次 python -c 分片写入同一文件

已验证安全的形式（PowerShell 下）：python -c 内用单引号字符串，无反斜杠，无美元符

已确认危险的形式：
- python -c 内含三重引号
- python -c 内含反斜杠转义单引号
- 任何包含美元符的字符串（PowerShell 变量展开）
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
