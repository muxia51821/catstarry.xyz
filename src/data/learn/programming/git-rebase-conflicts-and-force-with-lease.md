---
slug: git-rebase-conflicts-and-force-with-lease
title: "Rebase、冲突与 Force-with-lease：历史重写前的判断边界"
track: programming
section: git-control
tags:
  - git
  - rebase
  - merge-conflict
  - force-with-lease
  - remote-safety
excerpt: "把 rebase 看成创建新 Commit 的可审查写操作，并在处理冲突或更新远端前保留状态检查、授权与验证边界。"
---

Rebase、冲突和 force push 容易被误解成三条“高级命令”。更准确的理解是：它们都会涉及历史和 ref 的变化，因此必须先判断 graph、共享范围与当前证据。

本文假设你已理解 [[git-commit-graph-branch-ref-head]]，并把异常恢复与正式 branch mutation 分开；恢复现场可先参考 [[git-recovery-reflog-reset]]。

## Rebase 会 replay Commit，不会修改旧 Commit

假设任务 branch 上有 D、E，而新的 base 是 N：

```text
old base ──> D ──> E
new base ──> N
```

普通 rebase 会把 D、E 的改动依次 replay 到 N 之后，产生新的 Commit D'、E'：

```text
new base ──> N ──> D' ──> E'
```

旧的 D、E 没有被原地修改；新 Commit 的 parent 和内容身份发生变化，因此 SHA 也不同。rebase 是写操作，不是“把 branch 自动更新到最新”的无风险快捷方式。

## 冲突不是文本问题的自动答案

三方比较（three-way comparison）至少涉及：

```text
Base   共同起点
Ours   当前一侧相对 Base 的改动
Theirs 另一侧相对 Base 的改动
```

Git 可以指出无法自动合并的位置，却不能决定最终内容是否符合产品语义。即使冲突标记都已移除、测试也通过，仍需要检查两个改动的意图是否被同时保留。

处理冲突时，应先确认正在进行 merge 还是 rebase、当前 Commit 和目标 base 分别是什么；需要停止时，使用对应流程的 abort，而不是在不清楚现场的情况下继续输入新命令。

## `--force` 与 `--force-with-lease` 的差别

普通 push 默认拒绝 non-fast-forward 更新，避免 remote ref 丢掉当前 tip。`--force` 允许覆盖这层保护，因此不能作为“push 被拒绝”的默认下一步。

`--force-with-lease` 会把更新建立在对 remote 旧 tip 的预期上：预期不成立时，push 被拒绝。这个拒绝不是需要绕过的障碍，而是 remote 在你取得上次 evidence 后又变化的信号。

```text
lease rejected
-> stop
-> fetch or inspect actual remote state
-> protect unique work
-> decide whether integration or authorized rewrite is still appropriate
```

它降低的是覆盖未知新工作的风险，不替代授权、状态检查或备份。

## 对远端历史重写保持显式控制

重写远端 branch 前，至少明确：

1. 当前 local branch、remote-tracking Ref 和实际 remote branch 分别指向什么。
2. 哪些 Commit 只存在于某一台电脑，必须先保护。
3. 谁授权这次 rewrite，以及哪些使用者会受影响。
4. 更新后用什么 graph、remote ref 或 CI 证据验证结果。

若另一台电脑仍基于旧历史有 unique work，先保护这些 Commit，再选择整合或恢复方式；不要用一次 pull、reset 或 force push 抹平现场差异。

## 参考

- [git-rebase documentation](https://git-scm.com/docs/git-rebase)
- [git-merge documentation](https://git-scm.com/docs/git-merge)
- [git-push documentation](https://git-scm.com/docs/git-push)
- [Pro Git: Rebasing](https://git-scm.com/book/en/v2/Git-Branching-Rebasing)
