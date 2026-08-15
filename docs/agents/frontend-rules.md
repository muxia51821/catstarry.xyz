# catstarry.xyz 前端施工规则

> 状态：**Phase 8 current frontend implementation rules。**
>
> 用途：把已确认的 Product / Architecture / Design 边界转成前端施工约束。它不替代 Product Contract、Architecture、`DESIGN.md`、current source 或 task-specific acceptance，也不要求 Phase 8 的每个小改动重新执行 Phase 4 / 5 productionization 流程。

## 1. 权威来源与适用范围

前端任务先按问题职责恢复足够真源，不使用一份固定“全仓库阅读清单”：

1. `AGENTS.md`：权限、行为、Git 与安全边界；
2. `CONTEXT.md`：稳定项目概览；
3. 当前任务对应的 Product authority：Content 从 `docs/content/README.md` 进入 Family Contract / Master Ledger；其他模块读取其 current-facing Product / acceptance source；
4. 技术边界：`docs/architecture.md`、相关 architecture child / ADR；
5. 视觉与交互方向：`DESIGN.md`；
6. 当前实现事实：相关页面、组件、styles、runtime、tests；
7. 本文件：只负责施工 guardrails，不得反向覆盖上游 Product / Architecture / Design。

`docs/workflow-orchestration.md` 负责 Phase 8 任务如何分类、升级和验证；历史 final requirements、旧 acceptance、prototype 或旧 Wave sequencing 不是默认 Product authority。

发生冲突时先判断冲突属于 Product、Architecture、Design 还是 implementation drift。不要因为 current code 存在某行为就自动把它提升成设计规范，也不要因为旧文档存在某句历史要求就恢复已 Supersede 的行为。

## 2. Durable frontend boundaries

- 三画布、Home 的空间叙事、`Star Map → Focus → action`、About 双路径、HAS 语义、豹猫身份与 selected planet identity 属于已确认边界；普通维护不得顺手改成新的产品方向。
- Home 不恢复为内容首页、时间线、Card wall、`Recently` 或跨模块聚合入口。Blog / Feed / Learn / Projects 的真实内容属于各自功能页；Home Focus 只承担观察、短说明与 destination action。
- Content Family 共享 Cream Gallery、semantic token 与 accessibility language，但不共享统一 Card、Opening、width、radius、Tag、pagination、footer 或 hover treatment。
- 前端不得把底层 storage / API / Worker / D1 / KV / R2 机制直接泄露成 Public Copy 或视觉层级。需要改变这些技术合同的任务回 Architecture，而不是在组件中发明新语义。
- 在既有合同内修 bug、补状态、优化实现或做明确授权的新能力可以直接实施；只有真正改变 Product / Architecture / Design contract 时才升级，不以“Phase 5 只能微调”阻塞 Phase 8 正常维护。

## 3. 三画布与 pointer interaction 必须分离

| 画布 | 页面 | 必须保持 | Pointer signature |
| --- | --- | --- | --- |
| Home / Deep Space | `/` | 深空星域、暖性地质星球、空间导航、About 原地展开 | **Cursor Meteor**：movement signature，完整但克制 |
| Content / Cream Gallery | `/blog`、`/feed`、`/learn`、`/projects` | 奶油画廊、内容可读性、Warm Ink、restrained Hairline | **Paw Trail + independent Click Feedback** |
| Finance / Cyber Arena | `f.catstarry.xyz` | 深色数据面、数字优先、精确操作 | **neither** |

- 页面继续使用既有 `data-canvas="home|content|finance"` 语义消费对应 canvas styling；若 current source 改变 selector 组织，保持 canvas semantic boundary，而不是把某个 selector 名当成永久 Product contract。
- Content Paw Trail 是 movement effect；Click Feedback 是独立 pointer-down response。两者都不是弱化版 Home Cursor Meteor，也不得因为历史 implementation filename 带有 `meteor` 就恢复旧语义。
- 这些装饰性 pointer effects 只在合适的 fine-pointer / hover 环境启用，并尊重 `prefers-reduced-motion`；它们不能承载 information、navigation 或 required feedback。
- 首屏 DISCOVER MORE meteor 与 Home Cursor Meteor 仍是不同语义。
- 类别颜色只是冗余提示，不能成为内容类型、状态或操作结果的唯一编码。

## 4. Canonical CSS、token 与 runtime ownership

- `src/styles/main.css` 是主站 canonical global style entry。维护 current import graph，不创建第二套全局入口，也不要因为文档曾记录三项 import 就假定 import list 永久固定。
- 修改全局 style entry、token 或 shared selector 前先读 current imports / consumers，避免把历史 dead stylesheet、prototype CSS 或已退出使用的接口重新接回 production。
- 组件优先消费已有 semantic / component token；不要在多个页面散落重复 raw color、spacing、motion constants 来绕过现有设计系统。
- 只有确有新的 durable visual role 时才新增 semantic token。一次性 layout tuning、runtime geometry、random seed、pointer gait、轨道 phase、scheduler、state-machine timing 不应为了“规范化”全部上升为 global token。
- CSS 负责 visual / responsive / state presentation；runtime 负责几何、时序、随机性、状态机、数据读取与 navigation trigger。边界以 current implementation / architecture 为准，不机械复制 Phase 4 prototype 的 toolbar、mock selector 或 experimental JS。
- Shared primitive ≠ shared final appearance。任何 shared CSS 改动都要检查是否意外 Card-normalize Blog / Feed / Learn / Projects，或抹掉 Projects 已确认的 elevation exception。

## 5. Typography 与 CJK

- 中文正文至少 16px，行高至少 1.85；中文标题至少 1.35，说明文字至少 1.65。
- 中文使用既有 CJK fallback；常用字重不高于 500，不用 700+ 制造“粗黑科技感”。
- 中文字距保持 `0` 或 `normal`；负字距只允许纯英文 / 数字 display。品牌自身 identity mark 如确有既有例外，不扩展到普通正文和标题。
- 保留 `text-spacing-trim`、`hanging-punctuation` 与 `:lang(zh*)` 的渐进增强。
- 中英 / 中文与数字混排当前由 browser-native `text-autospace` 处理；code / preformatted content 使用 no-autospace。**不要恢复 JS spacing，也不要插入破坏复制、搜索、读屏或断行的手工空格。**
- CJK 规则是可读性合同，不要求每个局部组件重新发明一套中文 typography overrides。

## 6. Module-specific guardrails

### 6.1 Home

- 保持 Entry → Approach → Overview → Focus → footer release 的同一连续星域；Overview 与 Focus 不建立第二张地图。
- 五颗星球保持 About / Blog / Feed / Learn / Projects 的既有 identity 与语义区域；深度和自然滚动顺序不表达栏目优先级。点击、键盘和航行入口必须可直接抵达目标 Focus。
- Blog / Feed / Learn / Projects 只有在 Focus action 后进入功能页；About 保持直接可访问主路径 + 豹猫彩蛋路径。豹猫不是理解 About 的前置条件，About 星球绝不爆炸。
- HAS 只服务四颗功能星球，表达 `active / stable / dormant` 的低音量活动状态，不是 unread badge、内容预览或第二导航。有效投影缺失时不能伪装成 `dormant`。
- `active / stable` 可以按已确认设计做低频完整轨道运动，hover / focus 可减速；`dormant` 静态；reduced motion 下运动退化为静态材质 / orbit residue / accessible text。不得由 HAS 自动巡航、改变 Star Map focus 或制造 notification-style blinking。
- `docs/design/assets/planets/selected/` 对应的 Overview / Focus / Mobile **identity** 是当前设计基线。不得因早期 prototype 的 placeholder 文字擅自重生成、换成相似星球或混用历史候选。性能、preload/lazy、2x、CDN 等按实际任务证据处理。
- 精确 runtime selector、orbit phase、pulse interval、豹猫节点参数、Home state-machine timing 由 current source / tests 拥有；本文件不维护第二份 selector ledger。

### 6.2 Content Family

Content 任务先读 `docs/content/README.md` 路由到对应 Product truth；以下只保留最关键的 shared guard：

- **Blog**：Archive 不 Card 化；Reading 保持 Tonal Paper 语义。不要用 shared surface rule恢复 border / shadow / radius。
- **Feed**：D — Quiet Deposition；Native Note / Clip / Footprint equal S2 rank、different grammar。不要恢复 Native high-card / Footprint low-row 或 system-log hierarchy。
- **Learn**：Knowledge Structure + Reading。Knowledge Map = Track directory × Graph；Track 是 domain context，不是 Public Note parent / curriculum；不要重新引入虚假 public progress / completion hierarchy。Public Note / Track index 不默认 Full Card / shadow / lift。
- **Projects**：Full Object Card、static shadow、hover lift、stronger hover shadow 是已确认 exception；不要因为 Family quietness 或 shared CSS flatten 掉它。
- Top-level Content 的 `返回星图` 指向 Home Star Map / Overview 语义；nested child 优先返回真正 parent。Learn Public Note primary return Learn corpus，不因 Track context 强制改为 track-nested identity。
- Content Paw Trail / Click Feedback 是 shared canvas-level enhancement，不得压过文本、表单、media viewer 或 module-specific interaction，也不把其精确 gait / opacity 写成跨模块 Product rule。

### 6.3 Finance

- Finance 保持独立 Cyber Arena 与精确数据操作，不继承 Home 星图、豹猫、Cursor Meteor 或 Content Paw Trail / Click Feedback。
- Finance 的业务行为、行情 provider、数据模型和操作合同不由本文件裁决；任务应读取对应 current Finance evidence。

## 7. Responsive、accessibility 与 performance

- 所有 required action 使用原生语义元素或等价语义，提供可见 `:focus-visible`、键盘路径和合理焦点恢复。
- 触控不能依赖 hover；重要 information / action 必须有 non-hover equivalent。
- `prefers-reduced-motion: reduce` 是正式功能分支：装饰性 motion 可关闭，但 navigation、content、state meaning 与 required feedback 必须保留。
- 动效优先低成本 `transform` / `opacity`；避免无必要的大面积 blur、逐节点长期 filter 或与阅读 / 数据操作竞争的持续特效。
- 不把一个历史 release 的固定 viewport / performance checklist 变成所有 Phase 8 小改动的强制全量 Gate。验证深度应匹配改动范围与风险。

## 8. Verification follows affected behavior

最低验证不是“一套永远相同的矩阵”，而是覆盖本次真正触及的合同：

| 改动类型 | 至少验证 |
| --- | --- |
| 普通页面 / CSS 局部修复 | relevant build / type or syntax check + affected page + no obvious regression |
| Typography / CJK | 中文真实内容、混排、overflow / wrap；涉及 spacing 时确认 `text-autospace` / code exception |
| Interaction / focus / dialog | keyboard、focus-visible、Escape / focus restore（如适用）、touch equivalent |
| Motion / pointer effect | fine/coarse pointer boundary、reduced motion、effect 不遮挡 required content |
| Responsive layout | 实际受影响的 narrow / wide failure points；不是无条件重跑所有历史 viewport |
| Shared CSS / token / layout primitive | 至少检查所有真实 consumers，特别是 Content 四模块的 exception 是否被抹平 |
| Asset / loading / performance | resource failure path、loading strategy、LCP / CLS 或其他与改动直接相关指标 |
| Architecture / API-facing frontend change | current contract、error/degraded state、相关 integration tests / production-like path |

高风险或跨模块改动可以扩大回归范围；低风险两行 CSS 修复不应自动升级成完整 release acceptance。反过来，涉及 shared token、navigation、auth、publication lifecycle 或 global runtime 的改动也不能只做一张局部截图就宣称完成。

## 9. 何时必须升级而不是顺手改

以下变化超出普通前端 implementation discretion，应回到对应职责真源：

- 改变三画布分工、Home 信息架构、Focus / action、About 双路径、HAS 产品语义或 selected planet identity；
- 改变 Content Family 已关闭的 Card / Feed rank / Learn Track-Graph / Projects elevation 等 Product / Design contract；
- 改变公开 lifecycle、source-event semantics、数据 schema、auth boundary、Worker / service binding 或 deployment topology；
- 用局部实现绕过 canonical CJK、accessibility、reduced-motion 或明确 Architecture boundary；
- current source 与 Product / Architecture / Design authority 出现真实冲突，且无法在 task scope 内确认哪一方是 drift。

升级的目标是解决具体 authority conflict，不是恢复旧 Phase 顺序或制造新的治理层。

## 10. 本文件不负责什么

- 不定义 Worker、D1、KV、R2、CI/CD、鉴权、API、binding 或 deployment 的详细实现；这些回 current Architecture / DEPLOY / source。
- 不裁决 Content Product lifecycle、Feed Footprint 业务规则、Learn publication semantics、HAS 计算规则或 Finance 业务需求；这些回各自 Product / Architecture authority。
- 不维护当前 selector、branch、SHA、release status、production status 或一份重复的 CSS inventory。
- 不要求重新执行 Phase 4.2 / 4.3 prototype acceptance；历史 prototype 只在具体设计问题需要追溯时读取。

## 11. 交接检查

开始前：确认已读当前任务真正相关的 Product / Architecture / Design 与 source，而不是机械读取全部历史材料。

提交前：确认改动仍在授权范围；相关 contract 得到对应验证；没有把 `.codex/`、scratch 或参考素材误纳入提交；如果改动触及 durable Product / Architecture / Design truth，按 Touch-on-Conflict 只同步直接相关 current doc。
