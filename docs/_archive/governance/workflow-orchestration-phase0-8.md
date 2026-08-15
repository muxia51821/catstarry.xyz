# Phase 0–8 Website Delivery Lifecycle Reference

> 这是一份可复用的完整网站项目生命周期参考，来源于 catstarry.xyz 从启动到长期维护的真实协作经验。
>
> 它不是 catstarry.xyz 当前 Phase 8 的日常执行手册。当前维护流程见 `docs/workflow-orchestration.md`。
>
> 未来启动新的独立网站项目时，可以把本文件作为第一版流程骨架读取，再根据项目复杂度删减；不要机械复制 catstarry.xyz 的模块、技术栈或治理细节。

---

## 0. 总体模型

```text
Phase 0  基础设施与协作基线
    ↓
Phase 1  需求发现与澄清
    ↓
Phase 2  产品规格化与验收边界
    ↓
Phase 3  架构设计
    ↓
Phase 4  UI / UX / Prototype
    ↓
Phase 5  Implementation
    ↓
Phase 6  Integration / QA / Acceptance
    ↓
Phase 7  Deployment / Production Acceptance
    ↓
Phase 8  Long-term Maintenance
```

这个模型的目的不是制造审批关卡，而是避免在信息不足时过早实现。

绿色新项目中，前后 Phase 通常具有依赖关系；进入 Phase 8 后，不再要求每个小任务从 Phase 1 重新开始，而是只回流到真正受到影响的层级。

---

## Phase 0 — 基础设施与协作基线

### 目标

建立项目可以被人和 Agent 安全维护的最低基础。

### 典型工作

- 创建 repository、默认 branch 和基本目录结构；
- 确定运行环境、package manager、lockfile 和基础依赖；
- 建立 Agent 行为、Git、安全和 production authority 规则；
- 建立最小项目 context、术语和文档入口；
- 明确 secret、环境变量和本地开发边界；
- 建立最小 build / lint / test 能力。

### 退出条件

- 一个新 Session 能找到项目入口并运行基础验证；
- Git 与 production 权限边界明确；
- 不需要先知道大量聊天历史才能开始工作。

### 避免

不要在 Phase 0 预先设计未来所有模块、治理表格和扩展点。

---

## Phase 1 — 需求发现与澄清

### 目标

回答“为什么做、给谁用、真正需要解决什么”。

### 典型工作

- 收集真实使用场景、问题和目标；
- 区分用户需求、个人偏好、技术想法和暂时猜测；
- 识别关键对象、角色、访问范围和主要用户旅程；
- 找出必须裁决的问题，而不是把所有可能性都讨论完。

### 主要产物

可以是讨论结论、Product Synthesis、简短 PRD 或需求清单，不要求固定格式。

### 退出条件

- 核心产品目标清楚；
- 主要范围和明确不做什么已经确定；
- 尚未确定的问题不会阻碍下一阶段。

### 避免

不要因为“需求阶段”而强迫用户回答几十个对当前决策没有影响的问题。

---

## Phase 2 — 产品规格化与验收边界

### 目标

把已确认的产品意图转成可实施、可验收的行为边界。

### 典型工作

- 将大问题拆成模块、能力或任务；
- 定义 observable behavior；
- 明确 Public / Owner / Private 等访问边界；
- 确定 acceptance criteria；
- 标记 Confirmed / Open / Parked / Superseded 等状态；
- 建立必要的跨模块 Product Contract。

### 主要产物

按项目需要选择：

- Product Ledger；
- Closure Sheet；
- Capability Ledger；
- implementation-ready task；
- acceptance checklist。

不要求所有项目同时拥有这些文档。

### 退出条件

实现者可以回答：

- 要做什么；
- 不做什么；
- 什么叫完成；
- 哪些问题不能自行重新设计。

---

## Phase 3 — 架构设计

### 目标

为已经确认的产品行为找到足够简单、可维护的技术结构。

### 典型工作

- 模块和部署单元划分；
- 数据模型与持久化选择；
- API / Worker / service 边界；
- auth / authorization；
- public / private data flow；
- failure / fallback / rollback；
- 重要 architecture decision 的取舍。

### 文档原则

- current architecture 写“现在系统是什么”；
- ADR 只记录值得未来维护者回答“为什么选 A 而不是 B”的长期决定；
- 不把每个 implementation choice 都升级成 ADR。

### 退出条件

关键 Product Contract 有清晰实现路径，且主要跨模块边界已经稳定。

---

## Phase 4 — UI / UX / Prototype

### 目标

在大规模实现前确认视觉语言、交互结构和关键体验。

### 典型工作

- 信息架构与导航；
- 页面层级；
- design system / tokens；
- typography、spacing、responsive；
- motion 和 accessibility；
- 关键复杂交互 prototype；
- 用户人工选择和体验验收。

### Prototype 原则

Prototype 用于回答具体的不确定性，不是生产实现的平行版本。

验证完成后，应明确：

- 哪些 prototype 结论进入正式设计；
- 哪些只是实验；
- 哪些被拒绝。

### 退出条件

实现者不需要重新发明核心页面结构和关键交互。

---

## Phase 5 — Implementation

### 目标

在已确认的 Product / Architecture / Design 边界内实现最小正确版本。

### 默认执行循环

```text
恢复当前 evidence
→ 确认 scope
→ 实现最小变更
→ scoped tests / build
→ review diff
→ 用户或上游验收
```

### 规则

- 独立任务 branch；
- surgical changes；
- 不顺手重构无关代码；
- 不因为实现困难自行改变 Product Contract；
- implementation 中发现上游矛盾时升级，而不是猜。

### 并行

只有模块边界和共享依赖足够稳定后再并行。共享 schema、auth、公共 API 等依赖应优先解决。

---

## Phase 6 — Integration / QA / Acceptance

### 目标

证明“各部分放在一起仍然成立”，而不仅是单模块测试通过。

### 典型验证

- unit / integration / browser regression；
- cross-module navigation；
- auth boundary；
- responsive / keyboard / reduced-motion；
- error / fallback path；
- data lifecycle；
- production-like local preview；
- 用户人工体验验收。

### 原则

测试数量不等于测试有效性。

优先保护：

- 高影响 contract；
- 曾经真实出过事故的路径；
- 容易被后续改动破坏的 seam。

### 退出条件

Implementation Acceptance 与 Integration Acceptance 均有足够证据。

---

## Phase 7 — Deployment / Production Acceptance

### 目标

把已接受版本安全进入 production，并确认真实环境成立。

### 必须区分

```text
implementation complete
≠ accepted
≠ merged
≠ deployed
≠ production accepted
```

### 典型工作

- 核对 exact source / target；
- migrations / bindings / secrets；
- 按组件部署；
- production smoke；
- 关键数据和权限验证；
- rollback condition；
- 记录成功 release history。

### 原则

Deployment 最好与普通 implementation 分开处理，避免“代码写完”自动获得 production mutation authority。

---

## Phase 8 — Long-term Maintenance

### 目标

保持可用，持续改进，并随着真实使用让系统和流程变得更简单。

### 典型任务类型

- Bug；
- Maintenance；
- Experience refinement；
- Content update；
- New feature；
- Architecture / Product revalidation；
- Observe。

### Phase 8 与前七阶段最大的区别

**不再线性重走 Phase 1–7。**

使用 bounded return：

```text
小型明确修复
→ 直接实现 / 验证

触碰 Product Contract
→ 回 Product 层

触碰 durable architecture
→ 回 Architecture 层

触碰重大视觉 / interaction contract
→ 回 Design 层

需要上线
→ Deployment
```

### Touch-on-Conflict

只同步真正受到影响的 current facts；不要因为一个小修触发全仓库文档 reconciliation。

### 长期原则

> 维护项目，而不是维护一套比项目本身更重的治理系统。

---

## 跨 Phase 的通用规则

### 1. 用户是最终 Product / Acceptance 裁决者

Agent 可以提出反对意见和证据，但不能通过代码或文档偷偷覆盖明确裁决。

### 2. 当前实现不是所有维度的最高真源

代码证明“现在实现了什么”；它不能单独证明“产品本来就应该这样”。

### 3. 文档按职责分工

不要建立一份万能 canonical document。

Product、Architecture、Design、Implementation、Deployment evidence 应分别维护。

### 4. Handoff 优于重新发现

已有可信 predecessor 时，传递已收敛结论和关键 evidence，不要求新 Session 从零重复完整调查。

### 5. 复杂度跟随风险

低风险任务使用轻流程；高风险任务增加独立 review、验证和回滚准备。

### 6. Archive 与 Git history 有不同价值

未来仍可能作为 rationale / acceptance evidence 主动读取的历史材料可以归档；仅仅为了“不丢失旧文字”不必为每次改版制造 archive 副本，Git history 已经承担版本历史。

---

## 给下一个网站的使用方式

启动新网站时，不要直接照搬本文件的全部结构。

建议先回答三个问题：

1. 这个项目复杂到需要哪些 Phase 明确分开？
2. 哪些风险真的需要独立 Product / Architecture / Deployment gate？
3. 哪些 catstarry.xyz 的经验只是这个项目特有，不应该复制？

然后把 Phase 0–8 当作检查框架，而不是固定 bureaucracy。

对于很小的网站，Phase 1–4 可以在一次设计讨论中完成；对于具有多个 Worker、数据库、Owner lifecycle 或长期维护需求的网站，再把相关 Phase 拆开。
