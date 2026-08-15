# Phase 0–8 网站生命周期参考

> 这是一份可复用的网站项目生命周期参考，不是 catstarry.xyz 当前 Phase 8 的 mandatory workflow。
>
> 它用于未来新项目、历史理解或需要重新从 0 建站时参考。具体项目可以跳过、合并或回流阶段；不要为了流程形式强迫项目经过不需要的步骤。

---

## 总体原则

一个长期网站通常会经历：

```text
Phase 0  基础设施 / 协作环境
Phase 1  需求澄清
Phase 2  规格化 / Acceptance
Phase 3  架构设计
Phase 4  UI / Prototype
Phase 5  Implementation
Phase 6  Test / QA
Phase 7  Production Release
Phase 8  Long-term Maintenance
```

这套阶段的价值是明确每种问题应该在哪一层解决，而不是制造流程门槛。

核心原则：

- Product 问题尽量在 implementation 前收敛。
- Architecture 解决 durable technical boundaries，不代替 Product decision。
- Prototype 用于验证视觉和交互，不自动等于 production implementation。
- Implementation complete、accepted、merged、deployed、production accepted 是不同状态。
- 进入长期维护后，不要求每次小修重新从 Phase 1 走到 Phase 7。
- 新证据推翻旧前提时，定向回到受影响职责层，而不是重启整个项目。
- 用户／产品所有者是最终 Product 与 Acceptance 裁决者；Agent 的职责是降低技术判断成本。

---

## Phase 0 — 基础设施与协作环境

### 目标

建立能够安全持续工作的项目基础，而不是先做产品功能。

### 典型工作

- 建立 repository 与基本目录；
- 确认 runtime、framework、package manager 与 lockfile；
- 建立 Agent / Git / production safety 规则；
- 建立最小项目 context 与共享术语；
- 建立 issue / task / branch 的基本工作方式；
- 确认开发、预览和 production 环境如何隔离。

### 典型产物

```text
README
AGENTS / contributor rules
CONTEXT
GLOSSARY
package.json + lockfile
initial deployment/runtime config
```

### 完成标准

团队或 Agent 可以回答：

- 这是个什么项目？
- 在哪里改？
- 什么不能随便改？
- 如何验证？
- 谁可以 commit / merge / deploy？

不要在 Phase 0 设计完整未来架构或预先建立大量治理文件。

---

## Phase 1 — 需求澄清

### 目标

把“我想做一个东西”转化成可判断、可取舍的 Product intent。

### 需要回答

- 谁使用？
- 为什么存在？
- 核心使用路径是什么？
- 什么是必须有？
- 什么明确不做？
- 成功是什么样？
- 哪些问题还不能决定？

### 推荐方式

用真实场景而不是功能列表讨论需求。

例如不要只问：

> 是否需要搜索？

而应问：

> 用户在什么情况下会需要重新找到之前的内容？现有导航是否已经足够？

### 完成标准

进入下一阶段时，主要 Product question 已经可以被明确表达；仍然不确定的问题应被标为 open / revalidate，而不是伪装成已确认。

---

## Phase 2 — 规格化与 Acceptance

### 目标

把已确认 Product intent 转化为 implementation 可以执行、用户可以验收的边界。

### 典型产物

- PRD / spec；
- task / issue；
- acceptance criteria；
- scope / non-goals；
- dependency / blocker。

### 两种语言要分开

#### Implementation language

可以包含：

- API；
- schema；
- state；
- error boundary；
- performance constraint；
- dependency。

#### User acceptance language

应该回答：

> 用户最终看见和做到什么？

而不是要求非技术用户验证内部实现。

### 完成标准

Implementation Agent 不需要重新猜 Product intent，用户也知道完成后怎么判断“接受 / 不接受”。

---

## Phase 3 — Architecture

### 目标

确定真正需要长期稳定的技术边界。

### 典型问题

- 模块如何分？
- 数据由谁拥有？
- 哪些是 source of truth？
- API / Worker / service boundary 在哪里？
- 数据如何持久化？
- Auth 如何工作？
- public / private boundary 是什么？
- deployment topology 是什么？

### Architecture 文档职责

可以拆分为：

```text
architecture overview
modules / ownership / seams
data model / storage / invariants
auth / security
ADR
```

不要把所有内容都塞进一份 architecture 文档。

### ADR 准入

只有未来维护者很可能问：

> 为什么选择 A，而不是 B？

并且这个答案长期有价值时，才值得新增 ADR。

普通 implementation correction 不需要 ADR。

### 完成标准

关键模块 ownership、数据边界、runtime / deployment seam 足够清楚，可以支撑实现而不需要 Agent 自行发明架构。

---

## Phase 4 — UI / Prototype

### 目标

在 production implementation 前验证：

- 信息架构；
- 视觉语言；
- 交互路径；
- responsive 行为；
- motion；
- accessibility；
- 内容密度。

### Reference-first

如果项目视觉要求较高，先建立少量人工选择的 reference，再形成自己的视觉系统，而不是让 Agent 从抽象形容词自行发散。

### Prototype 的边界

Prototype 可以验证：

- 是否好用；
- 是否好看；
- 交互是否成立；
- layout 是否适合真实内容。

Prototype 不自动证明：

- production architecture 成立；
- 数据流安全；
- performance 足够；
- accessibility 完整；
- production code 可以直接复用。

### 完成标准

关键体验已被产品所有者实际看过并接受，implementation 不需要重新发明视觉方向。

---

## Phase 5 — Implementation

### 目标

在已收敛的 Product / Architecture / Design 边界内实现真实系统。

### 默认循环

```text
读取 task-specific authority
→ 确认 scope
→ 实施最小改动
→ 自动验证
→ Review
→ 用户验收（需要时）
```

### 实施原则

- 优先复用现有代码；
- 不为未来可能性增加抽象；
- 不顺手重构无关模块；
- 不让 implementation 偷偷改变 Product decision；
- 发现上游冲突时上报，而不是擅自选择一方覆盖另一方。

### 并行开发

只有模块 seam 和 shared dependency 已清楚时才并行。

如果多个模块依赖同一基础设施：

```text
shared prerequisite
→ module-local implementation in parallel
→ integration
```

不要为了并行速度制造 duplicated implementation。

### 完成标准

实现满足已确认 scope，并通过与风险相匹配的自动验证。

---

## Phase 6 — Test / QA

### 目标

验证系统作为整体工作，而不仅是每个模块分别“测试通过”。

### 分层验证

#### Unit / contract

保护：

- 数据转换；
- 关键规则；
- API contracts；
- invariants。

#### Integration

保护：

- module seams；
- storage；
- auth；
- worker/service interactions。

#### Browser / UI

保护真实用户可以看到的关键行为。

#### Manual acceptance

保护机器测试不擅长判断的：

- 视觉；
- 阅读体验；
- 动效；
- 产品语义；
- 真实使用感受。

### 避免形式覆盖

测试数量不是目标。

每个重要测试都应该能回答：

> 如果这个测试不存在，什么真实 regression 会更容易进入 production？

回答不了的问题，可能只是形式覆盖。

### 完成标准

关键风险有真实验证，而不是只有测试文件存在。

---

## Phase 7 — Production Release

### 目标

把已接受的 implementation 安全带到 production，并获得 production evidence。

### Release 前

明确：

- exact source commit；
- target components；
- migrations；
- bindings / secrets；
- dependency order；
- rollback condition。

### 状态必须分离

```text
implementation complete
≠ accepted
≠ merged
≠ deployed
≠ production accepted
```

### Deployment

复杂系统可使用独立 Deployment session，避免 implementation session 因为“代码写完了”自然获得 production authority。

### Production verification

至少验证真正受影响的关键路径。

不要为了形式把没有变化的组件重复部署。

### 完成标准

目标组件已上线，并有足够证据确认真实 production 行为。

---

## Phase 8 — Long-term Maintenance

### 目标

项目开始服务真实使用后，持续修复、调整和简化，而不是继续维持建设期流程。

### 默认循环

```text
真实问题 / 新需求
→ 收集足够证据
→ 分类
→ 最小范围处理
→ 验证
→ 用户验收
→ 需要时部署
→ production verification
```

### 常见分类

- Bug；
- Maintenance；
- Experience refinement；
- New feature；
- Product / Architecture question；
- Observe。

### Small fix

scope 清楚、不改变 shared contract 的小修不需要重新进入完整 Product / Architecture process。

### Touch-on-Conflict

只有当前任务实际触碰旧决定时才传播：

```text
current task
→ relevant current doc / contract
→ necessary reconciliation only
```

不要因为发现一个 stale file 就做 repo-wide reconciliation。

### Observe 也是合法决定

不是所有问题都值得立即解决。

证据不足、影响很小或成本高于收益时，可以明确选择 Observe。

### 完成标准

Phase 8 没有“项目完成”这一终点。它的目标是让项目长期保持：

- 可用；
- 可理解；
- 可维护；
- 与真实需求一致；
- 治理成本低于治理带来的收益。

---

## 阶段回流

生命周期不是单向瀑布。

真实项目更接近：

```text
Phase 8 maintenance
      ↓
发现新的 Product question
      ↓
定向回 Phase 1 / 2
      ↓
如涉及 architecture → Phase 3
      ↓
如涉及体验 → Phase 4
      ↓
Phase 5 implementation
      ↓
Phase 6 validation
      ↓
Phase 7 release
      ↓
回 Phase 8
```

重点是**定向回流**。

不要因为一个新 feature 就把整个项目宣布“回到 Phase 1”。

---

## 对新项目的使用方式

启动一个新网站时，可以按以下顺序使用这份参考：

1. 先判断项目规模和风险；
2. 决定哪些 Phase 必须独立、哪些可以合并；
3. 为当前 Phase 定义明确输出和退出条件；
4. 不提前创建后续阶段不需要的文档；
5. 每个阶段结束后只把真正 durable 的事实写入 current docs；
6. 项目上线后主动切换到 Phase 8 maintenance 模式。

对于个人网站或小团队项目，Phase 可以很轻：

```text
需求 + Acceptance
→ Architecture（只做必要边界）
→ UI Prototype
→ Implementation + Test
→ Release
→ Maintenance
```

流程应该帮助项目减少返工，而不是成为项目本身。