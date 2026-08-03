# ADR-008: Public Learn Notes Use Markdown as the Canonical Content Format

> Status: **Accepted**
> Date: 2026-08-03
> Deciders: 木下
> Scope: Learn public note authoring format only

---

## Context

catstarry.xyz 的 Learn 最初在 Phase 1 中采用了这样一条假设：

```text
Teach lesson HTML
→ extract
→ MDX
→ Public Learn Note
```

历史需求明确提出 Teach lesson HTML → MDX，并要求 `learn-import` 输出 `.mdx`。

同时，当时的 Learn article 需求又规定：

* quiz；
* simulator；
* 其他 Teach lesson 内的交互组件；

在转换 Public Learn Note 时默认不直接保留，而是丢弃或转换成 placeholder。

因此，历史设计虽然选择了 MDX，但 Public Learn Note 实际需要保留的主体主要仍然是：

* headings；
* paragraphs；
* links；
* lists；
* code blocks；
* images；
* references。

这些内容都可以由标准 Markdown 表达。

随着 Learn Pilot 01 的真实使用，Learn 的产品模型进一步发生了变化。

Pilot 01 实际形成的学习链路是：

```text
Question / Real project problem
↓
Research
↓
Teaching
↓
Retrieval practice
↓
Learning Record
↓
Reference
↓
Selective rewriting
↓
Public Learn Note
```

因此已经确认：

```text
Private Lesson
≠ Learning Record
≠ Public Learn Note
```

Public Learn Note 不是 Teach lesson 的直接发布副本，而是学习完成后，经过筛选、整理和重写形成的公开知识内容。

Pilot 01 的第一篇真实 Public Learn Draft：

```text
domain-dns-http.md
```

完整使用标准 Markdown 能力即可表达。

当前 runtime baseline 同时存在以下事实：

* `learn-import.mjs` 仍固定生成 `.mdx`；
* Learn Content Collection 仍声明接受 `.md` 与 `.mdx`；
* 当前 Astro runtime 没有配置 MDX integration；
* 当前产品没有经过真实需求验证的 inline JSX/component authoring requirement。

这说明历史 MDX authoring assumption 已经与当前实际产品和 runtime contract 发生漂移。

---

## Product Direction

Learn 不被定义为一个自建完整课程平台。

当前更准确的定位是：

> Learn 是一个以真实问题和项目实践触发、允许未来接入系统课程、通过主动回忆和复习巩固理解，并最终沉淀为私人知识与精选公开笔记的个人学习环境。

它可以同时承接两种学习来源：

```text
              Personal Learning
                     │
           ┌─────────┴─────────┐
           │                   │
 Structured Backbone    Project-triggered Learning
成熟课程 / 教材 / Curriculum    真实项目问题触发的深入学习
           │                   │
           └─────────┬─────────┘
                     ↓
            Retrieval Practice
                     ↓
             Learning Record
                     ↓
                Reference
                     ↓
          Selective Public Learn
```

因此：

> Public Learn Note 的内容文件格式，不应被等同于整个 Learn 学习能力的上限。

---

## Options

### Option A — Add MDX runtime support now

增加 Astro MDX integration，并继续使用 `.mdx` 作为 Public Learn 的主要内容格式。

#### Advantages

* 可以在正文中直接嵌入 JSX / interactive components；
* 将来可以实现类似：

```text
<Quiz />
<Simulator />
<InteractiveDiagram />
```

的 inline authoring。

#### Disadvantages

* 当前没有真实 Public Learn 内容需要 inline JSX/component；
* 增加新的 dependency 与 rendering surface；
* 会继续强化已经被 Pilot 01 推翻的 “Teach lesson → Public Note direct conversion” 假设；
* 提前为尚未验证的未来能力增加复杂度；
* 将 content source 与 interactive runtime 更紧密耦合。

### Option B — Use Markdown as the canonical Public Learn content format

Public Learn Note 使用 `.md`。

交互行为继续由页面层、Astro components、React Islands 或未来独立学习模块提供。

#### Advantages

* 与第一篇真实 Public Learn Draft 一致；
* 当前 Astro pipeline 已直接支持；
* authoring contract 简单；
* 内容与交互能力解耦；
* Public Learn Note 可以保持长期、可移植的知识文档性质；
* 不阻止未来增加 Quiz、Review 或 Simulator。

#### Disadvantages

* 如果未来确认需要在某篇 Note 正文内部由作者直接编排 JSX/component，则需要重新评估 MDX。

### Option C — Nominally support both Markdown and MDX without a defined MDX runtime contract

保持 `.md` / `.mdx` 两种格式都被 collection 和 tooling 宣称支持，但不明确 MDX runtime、authoring 和测试要求。

#### Result

Rejected.

这会继续保留当前已经出现的 contract drift：

```text
tool says MDX
collection says MDX
runtime does not actually support MDX
```

---

## Decision

选择 **Option B**。

当前：

```text
Public Learn canonical content source
= Markdown (.md)
```

`learn-import` 后续应生成 `.md`。

Public Learn collection 后续不应声明当前 runtime 实际没有支持的 MDX 能力。

Markdown 被选择的原因是：

> 它满足当前经过真实 Pilot 验证的 Public Learn Note authoring requirement，同时保持最小、明确和稳定的运行契约。

这不是对 Learn 未来交互能力的否定。

---

## Important Boundary

本 ADR 裁决的是：

> **Public Learn Note 的 canonical content source format。**

它不裁决：

> **Learn 整体是否可以具有交互学习能力。**

可以存在：

```text
Public Note (.md)
        │
        ├── Astro page UI
        ├── React Island
        ├── Review module
        ├── Quiz system
        └── Simulator
```

而无需让这些能力进入 Markdown 正文本身。

---

## Non-Decisions

ADR-008 **不决定**以下事项。

### Retrieval Practice

不决定 Learn 是否应该提供主动回忆（Retrieval Practice）。

Pilot 01 已经通过对话式问答实际使用这种方法，并发现它能够暴露真实 Mental Model 错误。

未来可以继续研究：

* free recall；
* explanation questions；
* scenario diagnosis；
* classification；
* transfer questions。

### Quiz

不决定 Learn 是否应拥有 Quiz。

未来 Quiz 应优先以学习效果为目标，而不是以题库 UI 为目标。

例如应优先考虑：

```text
解释
↓
判断
↓
诊断
↓
迁移到新场景
```

而不是只依赖容易通过 recognition 完成的单选题。

### Spaced Review

不决定是否建立：

```text
/learn/review
```

或类似长期复习能力。

未来可以根据真实使用验证：

```text
已学知识
↓
间隔一段时间
↓
主动回忆
↓
反馈
↓
重新进入 review queue
```

### Simulator

不决定是否允许 Simulator。

Simulator 可在知识本身适合动态因果探索时引入，例如：

* layout；
* state；
* caching；
* networking；
* finance；
* mathematical relationships。

Simulator 不应成为每篇 Note 的默认要求。

### Structured Curriculum

不决定 Learn 是否建立完整自有课程体系。

未来若需要系统学习某领域，可以采用成熟课程、教材或 curriculum 作为知识主干，同时继续使用 catstarry 的 Project-triggered Learning 深挖真实项目问题。

### Future MDX

不永久禁止 MDX。

如果未来出现真实需求：

> 某类 Public Learn 内容必须在正文内部，由内容作者逐篇编排 interactive component。

例如：

```text
正文
↓
特定交互实验
↓
继续正文
↓
另一个与上下文紧密绑定的模拟器
```

则可以重新评估 MDX。

届时必须通过新的 ADR 明确：

* 为什么页面层组件不足；
* 为什么 interaction 必须嵌入 content source；
* MDX dependency；
* Astro integration；
* allowed components；
* security boundary；
* authoring contract；
* testing contract；
* migration strategy。

MDX 不应因为历史文件扩展名而被隐式重新引入。

---

## Consequences

### Authoring

后续实现任务应将 `learn-import` 的 canonical output 改为：

```text
.md
```

而不是：

```text
.mdx
```

**ADR 本任务本身不实施该代码修改。**

### Runtime

当前不引入：

```text
@astrojs/mdx
```

或其他 MDX runtime capability。

### Content Collection

如果后续 inventory 确认没有真实 Learn MDX 内容需要兼容，Learn collection 应只声明当前实际支持的 Markdown content contract。

这属于后续 implementation task。

### Interaction

Learn 页面仍然可以使用：

```text
Astro
React
client-side JavaScript
```

实现：

* Search；
* Tree；
* navigation；
* admin；
* private preview；
* future review；
* future quiz；
* selected simulator。

这些能力不要求 Public Note 本身使用 MDX。

### Testing

后续 Learn authoring contract 不应只测试：

```text
HTML
→ Markdown string
```

而应覆盖：

```text
authoring input
↓
generated .md
↓
Content Collection
↓
render/build
```

确保 tooling 宣称产生的格式真的能够被 runtime 消费。

### Historical Records

以下历史需求保持不修改：

```text
docs/final-requirements-learn*.json
.scratch/learn/07-teach-to-mdx/issue.md
```

它们继续作为设计演化证据。

ADR-008 只 supersede 其中：

> Public Learn 必须以 MDX 作为输出格式

这一历史假设。

不 supersede 其他仍然有效的 Learn 产品需求。

---

## Learn Design Principle Derived from Pilot 01

Pilot 01 得出的长期原则是：

> 不提前产品化尚未被真实学习行为证明的能力。

因此 Learn 的演进顺序应当是：

```text
真实学习行为
↓
发现有效机制
↓
重复验证
↓
发现现有工具不足
↓
才产品化
```

而不是：

```text
Quiz 看起来适合学习
↓
做 Quiz

Simulator 看起来高级
↓
做 Simulator

MDX 可以嵌组件
↓
先上 MDX
```

Learn 的复杂度必须由真实学习效果驱动。

---

## Current Result

ADR-008 生效后：

```text
Public Learn Note
= durable Markdown knowledge artifact

Learn
= broader personal learning environment
```

前者保持简单和稳定。

后者保留未来发展的空间。
