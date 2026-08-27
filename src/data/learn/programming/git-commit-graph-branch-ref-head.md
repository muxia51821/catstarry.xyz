---
slug: git-commit-graph-branch-ref-head
title: "Git 的历史不是时间线：Commit、Branch、Ref 与 HEAD"
track: programming
section: git-control
tags:
  - git
  - commit
  - branch
  - ref
  - head
excerpt: "从 Commit 的快照与 parent 关系出发，分清 Branch、Ref、HEAD、Working Tree 和 Index 各自指向或保存什么。"
---

Git 的很多误操作，不是因为少记了一条命令，而是把不同层次的状态混成了同一件事。

例如，“我切了 branch”不等于复制了一份项目；“我 commit 了”也不等于远端已经有这份历史。先把 Commit、Branch、Ref 和 HEAD 分开，才更容易预测一次操作真正会改变什么。

## 先分开工作文件、暂存内容与历史

一个本地 repository 至少有三层日常可见的状态：

```text
Working Tree  当前 checkout 到磁盘的工作文件
Index         下一次 commit 的候选内容
Commit history 已保存的历史快照
```

修改文件先改变 Working Tree。`git add` 把选定内容写入 Index；`git commit` 再根据 Index 创建新的 Commit。它们不是同一步，也不会自动把内容送到远端。

`.git` 则保存本地 repository 的管理数据，其中包含 objects、refs、HEAD 和 Index。它不是只用来“暂存”的目录。

## Commit 保存快照与关系，不是按时间排队的 diff

Commit 可以理解成一个不可变对象。它会指向某次项目状态的 root Tree，也记录 parent Commit 和必要的 metadata。

```text
Commit D
├── root tree ──> 文件与目录的快照
└── parent ────> Commit C
```

Tree 保存名称、目录结构以及它们到 Blob 或子 Tree 的关系；Blob 保存文件内容本身。由 parent 关系串起来的 Commit 才构成 Git history graph。

因此，判断一条历史是否能 fast-forward，关键是一个 Commit 是否位于另一个 Commit 的 parent chain 上，而不是两条提交记录谁的时间更晚。

## Branch 是可移动的 Ref

Ref 是一个有名字的指向位置。Branch 是一种可移动的 Ref，通常指向某个 Commit；它不是一套独立复制出来的项目。

正常工作时可以先这样理解：

```text
HEAD ──> current branch ──> current commit
```

在 `main` 指向 C 时，从它创建 `task/learn` 并产生新 Commit D：

```text
main       ──> C
task/learn ──> D
HEAD       ──> task/learn
```

创建 D 没有修改 C；移动的是 `task/learn` 这条 Ref。这个区别也是理解 reset、rebase 和恢复操作的基础。

## HEAD 表示当前检出位置

通常 HEAD 间接指向当前 branch，再由 branch 指向 Commit。切换 branch 会改变当前检出位置，并让 Working Tree 反映目标 Commit 的内容；这不代表其他 branch 消失或被改写。

Detached HEAD 也不是损坏状态：它表示 HEAD 直接指向某个 Commit，而不是通过 branch Ref 指向。风险在于新 Commit 没有稳定的 branch 名称作为入口，因此应该尽快确认并保护需要保留的工作。

## 操作前先问四个问题

对任何会改动 Git 状态的命令，先分别判断：

1. 当前在哪个 repository、branch 和 worktree？
2. 哪个 Ref、Index、Working Tree 或 object 会变化？
3. 哪些状态不应自动变化？
4. 完成后用什么 `status`、`diff`、`log` 或 graph 证据核对？

这比把命令当成“回到某个状态”的按钮更可靠。遇到 Commit 看似消失或 branch 被移动时，可继续阅读 [[git-recovery-reflog-reset]]。

## 参考

- [Pro Git: Git Objects](https://git-scm.com/book/en/v2/Git-Internals-Git-Objects)
- [Pro Git: Branches in a Nutshell](https://git-scm.com/book/en/v2/Git-Branching-Branches-in-a-Nutshell)
- [Git repository layout](https://git-scm.com/docs/gitrepository-layout)
- [git-switch documentation](https://git-scm.com/docs/git-switch)
