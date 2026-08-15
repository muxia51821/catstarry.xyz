# catstarry.xyz 开发流程编排方案

> 当前执行手册。catstarry.xyz 已进入 Phase 8 长期维护；Phase 0–7 只保留为历史背景，不再作为每个维护任务必须重新经过的流程。

---

## 1. 当前角色与边界

Phase 8 的目标是：

> 保持可用，持续改进，让项目随着真实使用变得更简单。

网页端 Governance / Web Session 负责在需要时：

- 恢复当前项目现实；
- 判断问题属于小型直接修复、专项审查、Product / Architecture 裁决、implementation、Deployment 或 Observe；
- 处理跨模块冲突和 authority 不清；
- 为 implementation 准备已经收敛的 handoff；
- 审查 implementation 是否符合上游裁决；
- 决定是否进入独立 Deployment task。

Governance 不是所有小修的 mandatory gate，也不负责为了流程完整而制造额外流程。

Codex / implementation session 负责明确授权范围内的实现与验证；是否可 commit / push 由任务 handoff 明确说明。Git 与 production authority 见 `AGENTS.md`。

---

## 2. Phase 8 默认维护循环

```text
发现真实问题 / 新需求
        ↓
恢复足够的当前证据
        ↓
分类与定范围
        ↓
┌──────────────────────────────┐
│ 小型直接修复                 │
│ 专项网页审查                 │
│ Product / Architecture 裁决 │
│ implementation              │
│ Deployment                  │
│ Observe                     │
└──────────────────────────────┘
        ↓
最小改动 / 对应专项处理
        ↓
相关自动验证
        ↓
木下验收（需要时）
        ↓
如需上线 → 独立 Deployment task
        ↓
Production verification
        ↓
成功 release 写入 CHANGELOG
```

### 小型直接修复

适用于：

- scope 清楚；
- 不改变已关闭 Product / Architecture contract；
- 不引入新的跨模块依赖；
- 风险可逆；
- 验证路径明确。

这类任务不需要为了形式重新启动完整 Product / Architecture review。

### 专项审查 / Product / Architecture

当任务触碰以下边界时升级：

- authority 不清；
- 已关闭 Product Closure 可能被改变；
- durable architecture contract 可能改变；
- 多模块共享语义发生冲突；
- implementation evidence 与 current authority 明显矛盾。

### Observe

没有足够证据证明需要修改时，可以明确选择 Observe。Phase 8 不要求每个发现都立即转化为代码或文档工作。

---

## 3. 证据与职责路由

不要建立一条跨所有维度的单线文档优先级。按问题职责选择真源：

- Agent 行为、Git、production safety：`AGENTS.md`
- 快速项目定向：`CONTEXT.md`
- 共享命名：`GLOSSARY.md`
- Content Product：`docs/content/README.md` → Family Contract / Master Ledger（按需）
- 其他 Product：仍明确有效的 Product Closure、验收基线或当前任务裁决
- Architecture：ADR + current architecture docs + current code evidence
- Design：`DESIGN.md`
- 前端施工：`docs/agents/frontend-rules.md`
- Routes / public-owner visibility：`docs/SITEMAP.md`
- Deployment：`docs/DEPLOY.md`
- Implementation reality：current code / tests
- Production reality：live / deployment evidence on demand
- 已完成 release history：`CHANGELOG.md`

历史 requirements、acceptance、Phase briefing、prototype、QA evidence 可以用于追溯 rationale，但不得仅因文件名像“final / acceptance / canonical”就自动视为 current authority。

---

## 4. Touch-on-Conflict

Phase 8 使用 bounded propagation，而不是 repo-wide reconciliation。

1. **小型修复**：不自动触发全仓库文档同步。
2. **直接相关 current doc 明显 stale**：在同一任务中做最小同步。
3. **historical doc 与 current reality 不同**：通常保持历史原样；只有它会误导当前任务时才补边界或归档。
4. **accepted Product Closure 被改变**：回到 Product governance，而不是让 implementation 自行改写 Product Truth。
5. **Architecture / ADR contract 被改变**：进行 architecture review；只有值得长期回答“为什么选 A 不选 B”的重要决定才新增 ADR。
6. **无关 stale doc**：可以报告，不顺手扩大当前 scope。
7. **Governance 介入条件**：authority unclear、closed Product / Architecture 被触碰、或存在 cross-module contract risk。

目标是：

> 维护项目，而不是维护一套比项目本身更重的治理系统。

---

## 5. Session 与 handoff

### 有可信 predecessor

优先：

```text
旧 Session 已收敛结论
→ concise handoff
→ 新 specialist / implementation Session
```

不要让新 Session 重做已经完成的审查。

### 没有 predecessor

按任务需要读取：

```text
current repo evidence
→ current entry docs
→ task-specific authority
```

没有 mandatory cold-start block，也不要求一次性加载整个文档树。

### Handoff 原则

一个好的 implementation handoff 应尽量包含：

- current task scope；
- 已经裁决、不得重开的结论；
- 允许修改 / 禁止修改；
- 关键 current evidence；
- 验证与 acceptance boundary；
- Git / deployment authority。

判断层已经完成时，不要求 Codex 再做一遍同样的治理判断。

---

## 6. Git 与分支

Git authority 以 `AGENTS.md` 为准，本文件不复制完整规则。

Phase 8 的默认工作方式：

- 有意义的功能、Bug、架构或复杂文档任务使用独立 `task/*` 或 `codex/*` branch；
- 同一任务分支单机独占；
- `main` 不是日常开发工作区；
- 是否授权 Agent commit / push 由具体 handoff 明确说明；
- 不允许 Agent 直接 push `main` 或自行 merge。

---

## 7. 验证与验收

验证强度跟随风险，不为了“更完整”默认运行所有测试。

| 风险 | 典型范围 | 最小要求 |
| --- | --- | --- |
| 低 | 文案、局部文档、无行为变化 | scoped diff / reference check |
| 普通 | 模块功能、局部状态、UI 行为 | 相关 tests + build/typecheck（按需） |
| 高 | DB、migration、auth、shared contract、CI/CD、production | 独立 review + 对应专项验证 |

木下是最终产品与 acceptance 裁决者。Agent 的测试通过不等于用户体验自动接受。

---

## 8. Deployment 是独立边界

以下状态必须分开：

```text
implementation complete
≠ accepted
≠ merged
≠ deployed
≠ production accepted
```

未经明确授权，普通 implementation session 不部署。

需要上线时进入独立 Deployment task，按 `docs/DEPLOY.md` 核查：

- source / target；
- 受影响组件；
- migration / binding / secret boundary；
- deployment evidence；
- production smoke；
- rollback condition。

Site、Feed、Finance 等组件可以处于不同 production source；不要为了 SHA 形式一致而重复部署没有变化的组件。

Git HEAD、待发布 commit、production source 等易过期状态按需现场核验，不放进长期“当前状态看板”。

---

## 9. 文档传播与历史证据

### Current-facing docs

只在其职责真正受到影响时维护。

### `docs/_archive/`

用于保存版本化的 historical / superseded evidence。它不属于正常 current-truth reading path；只有历史追溯或 rationale 需要时再读取。

### Existing historical namespaces

Phase briefing、prototype、QA、reference design、ADR history 等历史材料可以保留当时语境，不要求 repo-wide 文案现代化。

### CHANGELOG

只记录已经发生的重要 repository / release history。它不是 Dashboard、dispatch queue 或实时 project status。

---

## 10. Phase 0–7 历史摘要

Phase 0–7 已完成并进入历史：

```text
Phase 0  基础设施
Phase 1  需求澄清
Phase 2  规格化 / Acceptance
Phase 3  架构设计
Phase 4  UI / Prototype
Phase 5  Implementation
Phase 6  Test / QA
Phase 7  Production Release
Phase 8  Long-term Maintenance（当前）
```

早期阶段的详细要求、acceptance、briefing、prototype 和 QA 仍可用于历史追溯，但不再要求每个 Phase 8 任务顺序重走 Phase 1 → 7。

如果新的真实需求足以改变 Product / Architecture，可以定向回到相应职责层处理，而不是把整个项目状态改回旧 Phase。

---

## 11. 木下的当前角色

Phase 8 中木下主要负责：

- 提出真实使用中的问题和需求；
- 裁决 Product / Architecture / Design 分歧；
- 验收重要用户体验；
- 决定 merge / deployment / production mutation；
- 决定哪些问题值得继续、哪些暂时 Observe。

Agent 负责尽量降低完成这些判断所需的技术负担，而不是增加新的治理负担。
