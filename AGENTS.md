# catstarry.xyz — Agent Instructions

## Agent skills

### Issue tracker

Local markdown — issues live as files under `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Five canonical labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context — one `CONTEXT.md` at repo root, ADRs in `docs/adr/`. See `docs/agents/domain.md`.

---

## 项目术语

见 `GLOSSARY.md`。

## 技术栈

Astro hybrid + React (shadcn/ui) + CF Workers + D1 + KV + R2。详见 `README.md` 和 `docs/tech-decisions-20260703.md`。

## 约束

- 所有文档和用户对话用中文
- 代码标识符、文件名、Git commit 用英文 ASCII
- 非程序员用户（Vibe Coding），AI agent 负责编码
