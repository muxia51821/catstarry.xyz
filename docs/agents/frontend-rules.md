# catstarry.xyz 前端施工规则

> Phase 8 前端 implementation guardrails。Product / Architecture / Design 决策仍由各自事实源负责。

## 1. 使用边界

前端任务按需读取：

- 权限、Git、production safety：`AGENTS.md`
- Product：当前任务对应的 Product authority；Content 从 `docs/content/README.md` 进入
- Architecture：`docs/architecture.md` 与相关 child / ADR
- Design：`DESIGN.md`
- Implementation：相关页面、组件、styles、runtime 与 tests

本文件只规定前端施工时不得破坏的 shared implementation boundaries。发生 authority 冲突时按 `AGENTS.md` 处理，不在本文件重新裁决 Product / Architecture / Design。

## 2. 三画布

| 画布 | 页面 | 核心实现边界 |
| --- | --- | --- |
| Home / Deep Space | `/` | 空间导航、暖性地质星球、About 原地展开 |
| Content / Cream Gallery | `/blog`、`/feed`、`/learn`、`/projects` | 阅读优先、Warm Ink、restrained Hairline、module-specific surfaces |
| Finance / Cyber Arena | `f.catstarry.xyz` | 深色数据面、数字与精确操作优先 |

主站页面继续使用 `data-canvas="home|content|finance"` 作为 canvas semantic boundary；不要把 Home 的空间装饰传播到 Content / Finance，也不要用 shared CSS 抹平 Content module differences。Selector 组织可以演进，但 canvas identity 本身不能因为局部重构消失。

### Pointer signatures

- **Home**：Cursor Meteor。
- **Content**：Paw Trail + independent Click Feedback。
- **Finance**：neither。

Paw Trail 是 movement effect；Click Feedback 是独立 pointer-down response。它们不共享 Home Cursor Meteor 的 runtime grammar，也不能承载 required information、navigation 或 accessibility feedback。

Pointer enhancement 只在合适的 fine-pointer 环境启用，并尊重 `prefers-reduced-motion`。

当前 `src/scripts/content-meteor.ts` 文件名与一部分 `--cursor-meteor-*` token 是历史兼容命名；该代码现在实现的是 Content Click Feedback，而不是 Content movement meteor。不要从 legacy filename / token name 反推新的 Design semantics，也不要继续扩展“Content Meteor”概念。

## 3. CSS 与 token

`src/styles/main.css` 是主站 canonical global style entry。当前 global chain 从 `variables.css`、`typography.css`、`components.css` 进入，并另外加载 Content pointer styles；维护 current import graph，不创建第二套全局入口。

### 3.1 三层 token implementation contract

`src/styles/variables.css` 当前实现三层结构：

1. **Primitive**：原始色阶、材质、type / spacing / radius / motion scale；
2. **Semantic**：品牌、canvas、材料和 interaction role；
3. **Component**：稳定组件视觉接口。

施工约束：

- Component CSS 优先消费 Semantic / Component token，不直接复制 Primitive raw value 到多个 consumer；
- shared token 只表达真实 shared semantics，不要求不同模块获得相同最终 appearance；
- 一个变量存在于 `variables.css`，不等于它仍拥有 Design authority；使用前同时检查 `DESIGN.md` 的当前语义和真实 consumer；
- unused / legacy token 不得成为恢复旧 UI 的理由；
- component-local custom property 可以用于局部 runtime-driven visual interface，例如 Paw Trail；它不会因此自动升级为 global Layer 3 token；
- runtime geometry、random seed、pointer gait、orbit phase、scheduler、state-machine timing 不应仅为了“统一”提升为 global token。

### 3.2 当前主要 namespace

| Design role | Implementation namespace / boundary |
| --- | --- |
| Canvas / brand | `--home-*`、`--content-*`、`--finance-*`、`--klein-*` + shared semantic aliases |
| Deep Space | `--space-*`；random field geometry 仍由 runtime 拥有 |
| Planet / Star Map | `--planet-*`、`--star-map-*`、`--interaction-*` |
| HAS | `--has-*`；orbit phase / period / scheduling 不进 CSS contract |
| Leopard Cat | `--leopardcat-*`；node geometry / burst physics 在 runtime |
| Home Cursor Meteor | `--cursor-meteor-*` 的 active Design semantics 只属于 Home movement signature |
| Content Paw Trail | `--content-paw-*` component-local interface；exact gait / lifetime / speed threshold 在 runtime |
| Content Click Feedback | 当前实现复用少量 legacy cursor-meteor color tokens；这是兼容实现，不是 canonical Design namespace |

`variables.css` 中仍可能保留早期 Blog/Feed Card、Footprint surface 或 Content meteor 相关变量。除非当前 Design semantics 与真实 consumer 同时要求，否则不要把这些遗留变量重新接回页面。

修改 shared selector / token 前检查所有真实 consumers，尤其避免：Blog Card 化、Feed Card 化、Learn structural surface Card 化、Projects elevation 被压平。

## 4. Typography 与 CJK

- 中文正文至少 16px，行高至少 1.85；中文标题行高至少 1.35，说明文字至少 1.65。
- 中文常用字重不高于 500；普通中文标题 / 正文不使用英文式负字距。
- 保留 current CJK fallback、`:lang(zh*)`、`text-spacing-trim` 与 `hanging-punctuation` 的渐进增强。
- 中英 / 中文与数字混排使用 browser-native `text-autospace`；code / preformatted content 使用 no-autospace。
- 不恢复 JS spacing，也不插入破坏复制、搜索、读屏或断行的手工空格。

## 5. Accessibility 与 motion

- Required actions 使用原生语义元素或等价语义，并提供可见 `:focus-visible`。
- Hover 信息必须有 keyboard / touch equivalent；触控不能依赖 hover 才能理解或操作。
- Dialog / overlay 按实际行为处理 focus entry、Escape、focus restore 和 background interaction。
- `prefers-reduced-motion: reduce` 是正式功能分支：装饰性 motion 可以关闭，但 navigation、state meaning 与 required feedback 必须保留。
- 动效优先低成本 `transform` / `opacity`；避免无必要的大面积 blur、长期 filter 或与阅读 / 数据操作竞争的持续特效。

## 6. Module exception guardrails

以下只列出最容易被 shared implementation 误伤的边界；详细 Product / Design semantics 回对应 authority。

| Module | Guardrail |
| --- | --- |
| Blog | Archive 不使用 Full Card；Reading 保持 Tonal Paper 的 no border / shadow / radius 语义。 |
| Feed | D — Quiet Deposition；Native Note / Clip / Footprint equal S2 rank、different grammar，不恢复 high-card / low-system-row hierarchy。 |
| Learn | Knowledge Structure + Reading；Track 是 domain context 而不是 Public Note parent / curriculum；Public Note / Track index 不默认 Full Card / shadow / lift。 |
| Projects | Full Object Card + static shadow + hover lift + stronger hover shadow 是 accepted module exception，不得被 Family quietness 或 shared CSS flatten。 |

Top-level Content 的 global exit 返回 Home Star Map / Overview。Learn Public Note 的 primary return target 是 Learn corpus；Track context 不改变 Note identity。

## 7. Home implementation guardrails

- 保持 Entry → Approach → Overview → Focus → footer release 的连续星域；Overview 与 Focus 不建立第二张地图。
- 五颗导航星球保持既有 identity；深度和默认滚动顺序不表达栏目优先级。
- Blog / Feed / Learn / Projects 在 Focus action 后进入功能页；About 保持直接主路径 + 豹猫彩蛋路径。
- HAS 只服务四颗功能星球并表达 `active / stable / dormant`；数据不可用不能伪装成 `dormant`。
- `active / stable` 可低频完整公转，hover / focus 可减速；`dormant` 静态；reduced motion 下停止连续运动。
- `docs/design/assets/planets/selected/` 的 Overview / Focus / Mobile identity 是当前设计基线。性能、加载与资源策略按实际任务证据处理。
- 精确 selector、orbit phase、pulse interval、豹猫粒子参数和 Home state-machine timing 由 current source / tests 负责。

## 8. Responsive 与性能

- Responsive 以真实 layout failure point 为准，不要求所有模块共享相同 breakpoint 数值。
- 移动端保持同一 Product logic，不为桌面 hover 动效建立第二套功能。
- Asset / loading / performance 改动需要验证对应 resource failure、loading behavior、LCP / CLS 或其他实际受影响指标。
- Finance 的高密度数据操作优先于装饰性 motion，不继承 Home / Content pointer signatures。

## 9. Verification follows affected behavior

| 改动类型 | 至少验证 |
| --- | --- |
| 页面 / CSS 局部修复 | relevant build / syntax check + affected page |
| Typography / CJK | 真实中文、混排、wrap / overflow、code exception |
| Interaction / dialog | keyboard、focus、touch；Escape / focus restore 如适用 |
| Motion / pointer | fine/coarse pointer、reduced motion、内容遮挡 |
| Responsive | 实际受影响的 narrow / wide failure point |
| Shared CSS / token | 所有真实 consumers 与 module exceptions |
| Asset / performance | loading / failure path + 相关性能指标 |
| API-facing frontend | current contract、error/degraded state、相关 integration path |

验证范围随改动风险扩大；不要用局部视觉检查替代跨模块或高风险 change 所需的回归验证。

## 10. 需要升级的变化

以下变化超出普通前端 implementation discretion：

- 改变三画布、Home IA、Focus / action、About 双路径、HAS 产品语义或 selected planet identity；
- 改变 Content Family 已关闭的 Card / Feed rank / Learn Track-Graph / Projects elevation contract；
- 改变 publication lifecycle、source-event semantics、schema、auth boundary、Worker / service binding 或 deployment topology；
- current source 与 Product / Architecture / Design authority 出现无法在任务范围内解释的真实冲突。

这类变化回到对应 Product / Architecture / Design authority，不在组件层自行裁决。
