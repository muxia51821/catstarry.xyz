---
slug: git-recovery-reflog-reset
title: "Git 出问题时先找证据：Reflog、Reset 与安全恢复"
track: programming
section: git-control
tags:
  - git
  - recovery
  - reflog
  - reset
  - safety
state: draft
excerpt: "当 branch 被移动、commit 看起来消失或 HEAD 脱离 branch 时，先确认 Git 还保存了什么证据，再选择最小破坏的恢复动作。"
---

# Git 出问题时先找证据：Reflog、Reset 与安全恢复

Git 出问题时，最危险的反应往往是立刻输入一个看起来能“回到原来”的命令。

例如 branch 被 reset 了、刚才的 commit 不见了，或者在 Detached HEAD 上留下了工作。此时 `reset --hard`、强推、切换 branch 都可能继续改变现场。先停下来，判断证据和可恢复性，通常比先记住某条恢复命令更重要。

这篇的核心原则是：

> commit 看起来消失，不等于它已经被删除；找到它，也不等于应该立刻移动正式 branch。

---

## “不见了”到底是哪一层不见了？

Git 里至少要分开三件事：

```text
object existence
reachability
ref existence
```

Commit 是一个 object。Branch 是指向某个 commit 的可移动 ref。一个 commit 可能仍存在于对象数据库，却不再被当前 branch 指向；也可能暂时没有任何正常 ref 指向它，但仍能通过 reflog、另一条 ref、remote 或另一份 clone 找到。

因此，删除 branch 或把 branch 移回旧位置，并不立刻物理删除原来的 commit object。反过来，unreachable 也不是“永远可恢复”：reflog 会过期，Git 的清理也可能最终移除没有入口的对象。

先问的不是“该用什么命令”，而是：

```text
现在 HEAD、branch、Index、Working Tree 分别在哪？
目标 commit 是否仍有 SHA、ref、reflog 或其他 clone 的证据？
哪些未 commit 内容还只存在于当前 Working Tree？
```

---

## Reflog 是什么，又不是什么

`git reflog` 记录的是本地 HEAD 或 ref 的移动历史。例如切换 branch、commit、reset、rebase 可能留下本地记录。它常能帮助定位“刚才 branch 指向哪里”。

但 reflog 不是 commit graph，也不是完整备份：

* 它是本地记录，不会自动与其他 clone 互通；
* 它不证明 remote 现在仍指向哪里；
* 它会被过期和清理；
* 它提供的是 locate evidence，不是对正式 branch 的自动授权。

可以用它定位候选 SHA：

```bash
git status --short
git log --oneline --decorate --graph --all
git reflog --date=iso
git show <candidate-sha>
```

这些检查优先回答“现在是什么状态”。在目标尚未确认前，不要因为看到一条 reflog entry 就执行 `reset --hard`。

---

## Revert 和 Reset 处理的不是同一种问题

`git revert` 会创建一个新的 corrective commit，用新的历史记录抵消目标 commit 的效果。它通常适合已经共享、不能随意重写的历史。

`git reset` 则移动当前 branch / HEAD 的位置，并按模式影响 Index 和 Working Tree：

| 命令 | branch / HEAD | Index | Working Tree |
| --- | --- | --- | --- |
| `reset --soft <target>` | 移到 target | 保留 | 保留 |
| `reset --mixed <target>` | 移到 target | 重置为 target | 保留 |
| `reset --hard <target>` | 移到 target | 重置为 target | 重置为 target |

`--hard` 的风险不是“容易产生 conflict”，而是可能直接覆盖未 commit 的 Working Tree 内容。它只能在目标、现场和数据损失边界都确认后才考虑。

---

## Detached HEAD 和删除 branch：先重新建立入口

Detached HEAD 是合法状态：HEAD 直接指向一个 commit，而不是某条 branch。此时创建的新 commit 仍是完整、不可变的 Git object；风险在于它没有稳定 branch ref，之后很容易失去可发现的入口。

如果已经定位到需要保留的 commit，第一步常常只是创建一条保护 ref：

```bash
git branch recovery/found-tip <target-sha>
```

这一步不需要把正式 branch 移过去。它先把重要 evidence 重新变为 reachable，给后面的检查留下安全空间。被误删的 branch 也类似：先从 reflog、已知 SHA 或其他 clone 定位旧 tip，再建立恢复 branch，而不是默认把当前工作 branch reset 回去。

---

## 一个可重复的 recovery workflow

```text
STOP
→ INSPECT
→ LOCATE
→ PROTECT
→ CONFIRM TARGET
→ MINIMAL MUTATION
→ VERIFY
```

每一步只解决一个问题：

1. **STOP**：停止继续写入、切换、清理或 push，避免覆盖尚未确认的 Working Tree data。
2. **INSPECT**：检查 repository、worktree、current branch、HEAD、Index、Working Tree、local refs 与 remote-tracking refs。
3. **LOCATE**：从 reflog、已知 SHA、其他 branch、remote-tracking ref 或另一 clone 找候选 commit。
4. **PROTECT**：先为不可替代的 candidate 建立 recovery ref。
5. **CONFIRM TARGET**：确认目标 commit、parent ancestry、尚未提交的内容，以及 actual remote branch 是否需要单独读取。
6. **MINIMAL MUTATION**：按场景选择只保留 recovery branch、local reset、revert 或其他最小动作。
7. **VERIFY**：再次看 `status`、graph、目标内容和必要的 remote 状态；local mutation 不自动等于 remote mutation。

---

## 简化场景：C → D → E → F

假设共享 branch 原本沿着这条链前进：

```text
C → D → E → F
```

现在 local branch 被 reset 回 `C`。`E` 和 `F` 看起来不见了，但 `git reflog` 仍能定位 `F`；remote-tracking ref 只记录上次 fetch 时的 `D`。

正确的判断顺序是：

```text
确认当前 branch 在 C
→ 从 reflog locate F
→ 建立 recovery/found-tip → F
→ 检查 D 是否为 F 的 ancestor
→ 单独确认 actual remote branch
→ 再选择 local branch 如何恢复
```

如果确认 actual remote 还在 `D`，而 `D` 确实是 `F` 的 ancestor，那么把 local branch 恢复到 `F` 后的正常 push 是 fast-forward；不需要把 `push --force` 当作默认工具。

但 `origin/task` 只是本地的 remote-tracking evidence，不是远端此刻的实时状态。是否触碰 remote，始终是另一个授权和验证边界。

---

## 必须停下来的情况

以下情况不应继续猜命令：

* Working Tree 有未 commit 的重要内容，而你还没有确认它是否有副本；
* 候选 SHA、目标 branch 或 ancestor 关系不明确；
* 需要改写 shared history，或另一 clone 可能已基于后续 commit 工作；
* 对 actual remote branch 没有独立证据；
* 只有“可能存在”的 object，没有可验证的 SHA、reflog、ref 或其他副本；
* 下一步需要 force push、删除 ref 或运行可能清理对象的命令。

此时最小的正确动作可以是只保护已找到的 evidence，并请求进一步确认。

---

## 记住的不是一条命令

恢复并不等于把 history 变成“看上去熟悉的样子”。它是一个先保全证据、再确认目标、最后才改变状态的过程。

> 先确认 object、ref 和 Working Tree 分别发生了什么；先保护没有其他副本的 commit；最后才选择最小破坏的 mutation。

## 参考资料

* [git-reflog documentation](https://git-scm.com/docs/git-reflog)
* [gitrevisions documentation](https://git-scm.com/docs/gitrevisions)
* [git-reset documentation](https://git-scm.com/docs/git-reset)
* [git-revert documentation](https://git-scm.com/docs/git-revert)
* [git-gc documentation](https://git-scm.com/docs/git-gc)
* [git-push documentation](https://git-scm.com/docs/git-push)
