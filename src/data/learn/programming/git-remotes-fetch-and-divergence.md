---
slug: git-remotes-fetch-and-divergence
title: "两台电脑为何会看到不同的 Git 状态：Fetch、origin/main 与分叉"
track: programming
section: git-control
tags:
  - git
  - remote
  - fetch
  - divergence
  - fast-forward
excerpt: "分清 local branch、remote-tracking ref 与实际 remote branch，才能正确理解 fetch、pull、fast-forward 与历史分叉。"
---

两台电脑各自保存一份 local repository。即使它们都显示 `main` 或 `origin/main`，也不保证三处状态相同。

先建立 [[git-commit-graph-branch-ref-head]] 的 Ref 模型，再把下面三个对象分开看，才能判断一次同步操作会不会改变当前工作目录。

## 三个名称，三处状态

以 Home PC、Office PC 和 GitHub 为例：

```text
Home PC / Office PC
├── local main        这台电脑自己的 branch Ref
└── origin/main       这台电脑上次 fetch 后的 remote-tracking Ref

GitHub origin
└── main              remote repository 里的实际 branch Ref
```

`origin/main` 是本地保存的 last-known remote state，不是 GitHub `main` 的实时镜像。它只有在取得新的 remote evidence 后才可能更新。

## Fetch 更新知识，不自动整合当前工作

`git fetch` 通常会取得本地缺少的 Git objects，并更新 `origin/main` 这样的 remote-tracking refs。

它通常不会自动移动：

```text
local main
HEAD
Working Tree
```

所以，看到 `origin/main` 前进并不表示当前目录已经更新。fetch 之后仍要分别检查 local branch、remote-tracking Ref 和 Working Tree。

`git pull` 则包含 fetch 和后续 integration；它可能 fast-forward、merge 或 rebase 当前 branch。因此，pull 不是纯检查操作。

## Fast-forward 与分叉由 ancestry 决定

如果 local `main` 指向 C，fetch 后 `origin/main` 指向 D，且 D 的 parent chain 包含 C：

```text
main        ──> C
origin/main ──> D
               D parent = C
```

C 是 D 的 ancestor，local `main` 可以 fast-forward 到 D，不需要产生新的 merge Commit。

如果两边各自有另一边没有的 Commit：

```text
      H  <- local main
     /
C
     \
      O  <- origin/main
```

H 和 O 互相都不是对方的 ancestor，这才是 divergence。ahead、behind 与 divergence 都是 ancestry 判断，不是按 Commit 时间排序。

## 两台电脑同步时的安全顺序

当另一台电脑可能还有未整合工作时，不要把“拉到最新”当成单一步骤。先：

1. 检查当前 repository、branch 和 Working Tree。
2. `git fetch`，取得新的 remote-tracking evidence。
3. 比较 local branch 与 remote-tracking Ref 的 graph 关系。
4. 只在确认 fast-forward 或明确选择整合方案后，再执行会改变当前 branch 的操作。

`git pull --ff-only` 的价值在于：无法 fast-forward 时停止，而不是自动替你选择 merge 或 rebase。需要改写历史或处理远端拒绝时，继续阅读 [[git-rebase-conflicts-and-force-with-lease]]。

## 参考

- [git-fetch documentation](https://git-scm.com/docs/git-fetch)
- [git-pull documentation](https://git-scm.com/docs/git-pull)
- [git-branch documentation](https://git-scm.com/docs/git-branch)
- [Pro Git: Remote Branches](https://git-scm.com/book/en/v2/Git-Branching-Remote-Branches)
