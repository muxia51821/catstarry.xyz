# 项目共享词汇表 (GLOSSARY)

> 本文件是 catstarry.xyz 的稳定共享命名与术语边界来源，供 AI agent、木下和实际参与项目维护的协作者快速查阅。

## 使用边界与事实来源

GLOSSARY 只记录跨模块、跨 Phase、容易被误解或存在命名漂移的稳定词汇。它负责 canonical naming、别名和“不包含什么”，不负责产品行为、技术架构、视觉参数、实现规则或易过期状态。

详细事实按职责分工存放：

- `CONTEXT.md`：Agent 快速上下文和少量高频摘要。
- `docs/architecture.md` 及子文档：技术架构、数据模型、API、存储和数据流。
- `DESIGN.md`：三画布、视觉状态、资产和动效设计事实。
- `docs/agents/frontend-rules.md`：前端施工规则和验收约束。
- `docs/SITEMAP.md`：路由、页面和公开／非公开范围。
- `docs/cold-start-governance.md`：治理身份、文件地图和流程边界。

术语语义发生变化时，应先修改对应的产品、ADR、架构或设计事实源，再同步更新本文件；GLOSSARY 不自行裁决新的产品、架构、设计或实现规则。

## 角色与访问范围

| 术语 | 定义 |
| --- | --- |
| **木下** | 项目所有者和最终决策者。 |
| **cati** | Finance workspace 的指定只读协作者，不是公开站点角色。 |
| **访客** | 公开主站访问者，不包含 Finance workspace 使用者。 |

## 公开主站与板块

| 术语 | 定义与边界 |
| --- | --- |
| **公开主站** | `catstarry.xyz` 主域上的 Home、Blog、Feed、Learn、Projects 及其公开页面集合；不包含 `f.catstarry.xyz`、独立部署的项目子域，或本地写作、学习、预览和管理工作区。具体页面事实见 [`docs/SITEMAP.md`](docs/SITEMAP.md)。 |
| **Home (`/`)** | 公开主站的宇宙入口和空间导航，不是跨模块内容聚合页。 |
| **Blog (`/blog`)** | 公开长文模块；不指 DOCX 草稿、本地 workbench 或发布流程。 |
| **Feed (`/feed`)** | 公开时间线模块，呈现原生 Feed 内容和公开足迹。详细关系见“Feed 与公开足迹”。 |
| **Learn (`/learn`)** | 公开学习笔记模块；不指本地私有学习区、课程生成 workspace 或 draft preview 工具。 |
| **Projects (`/projects`)** | 公开项目展示模块。 |
| **Finance workspace** | `f.catstarry.xyz` 的内部私密财务工作区，不属于公开主站、Home 导航或公开内容模块。详细 Finance 术语见下文。 |

## Home 导航与交互词汇

### 导航关系

```text
星图
  → 目标星球
    → Planet Focus
      → Focus action
        ├─ Blog / Feed / Learn / Projects
        │    → Planet Push → 对应功能页
        └─ About → About 展开态
```

- 星图不是内容列表。
- 星球不是抽象按钮、节点或卡片。
- Planet Focus 不是板块详情页。
- Focus action 是明确的目的地动作，不是额外确认层。
- Planet Push 是短暂转场行为，不是目的地。
- About 是例外，进入 Home 原地展开态，而不是独立 About 页面。

| 术语 | 定义与边界 |
| --- | --- |
| **星图** | Home 中用于观察和进入五颗导航星球的空间导航；不承载内容聚合、时间线或板块详情。 |
| **Planet Focus** | Home 内对目标星球的观察状态，显示近景、名称、极短说明和明确 action；不加载真实板块内容。 |
| **Focus action** | Planet Focus 中的明确目的地动作；功能星球触发 Planet Push，About 进入 Home 原地展开态。 |
| **Planet Push** | Focus action 之后发生的短暂、可中断的空间转场；不是页面或内容层。 |
| **About 展开态** | Home 内 About 信息的原地展开状态，可由 About 主路径或豹猫卫星彩蛋进入。 |
| **Home Activity Signal** | Home 消费的最小板块活动状态投影，只表达 Blog、Feed、Learn、Projects 的 `active`、`stable`、`dormant`；不包含内容、标题、摘要、链接、数量、精确时间或访客未读语义。它不是 Public Timeline 的简化版本，也不进入 Feed。详细事实见 [ADR-007](docs/adr/007-home-activity-signal-static-projection.md) 和架构文档。 |
| **信号卫星** | 四颗功能星球旁用于表达 Home Activity Signal 状态的视觉载体；About 和豹猫卫星不消费这套三态语义。数据不可用不等于 `dormant`。 |
| **豹猫卫星** | About 附近的特殊活动／交互信号卫星，也是木下的个人签名元素；通过可选彩蛋进入与 About 主路径相同的展开态。它不消费 Home Activity Signal，也不是四颗功能星球的 HAS 三态信号卫星。“豹猫星座”只可作为视觉形态或历史称呼。 |
| **鼠标流星尾** | 跟随指针的个人交互签名；在 Home 保留，在 Content 弱化，在 Finance 关闭；不等同于首屏一次性的 DISCOVER MORE 流星。 |
| **Entry Display** | Home 宇宙入口的世界观短句排版角色；不承担产品 landing page 式促销标题。 |
| **暖性地质宇宙** | Home 五颗导航星球共享的材质和光学母题；具体视觉参数、资产和动效由 `DESIGN.md` 负责。 |

## Feed 与公开足迹

### 原生内容与足迹关系

```text
碎碎念 / 剪藏
    → Feed 原生记录
                         ┐
足迹来源事件             ├→ Public Timeline → /feed
    → Public Footprint  ┘
```

| 术语 | 定义与边界 |
| --- | --- |
| **碎碎念** | Feed 原生的个人原创短内容；作为原生记录参与 Public Timeline，不转化为 Public Footprint。 |
| **剪藏** | Feed 原生的网页收藏，包含链接、自动摘要或封面以及用户评论；作为原生记录参与 Public Timeline，不转化为 Public Footprint。 |
| **备忘录感** | Feed 的低摩擦发布原则：写完即发、不以编辑和打磨为前置条件；不是技术流程或内容审核规则。 |
| **足迹来源事件** | Blog、Learn 或 Projects 中满足足迹生成合同、可以产生 Public Footprint 的来源事件。不包含普通编辑、重复部署、碎碎念、剪藏或已经写入的 Public Footprint 记录。旧文档中的“系统足迹事件”统一以本名称为准。 |
| **Public Footprint（公开足迹）** | 足迹来源事件固化形成的独立记录，保存创建时的来源身份和内容快照，并拥有独立可见性；不等于整个 Feed，也不包含碎碎念和剪藏。来源内容的普通编辑、隐藏或删除不会自动改写或删除该记录。详细存储决策见 [ADR-005](docs/adr/005-public-footprint-separate-storage.md)。 |
| **Public Timeline（公开时间线）** | Feed 在读取时将原生碎碎念、剪藏与公开足迹统一排序形成的读取投影，也是 `/feed` 面向访客的呈现；不是数据库表，不是 Public Footprint 的别名，也不被 Home 使用。 |

## Finance workspace（内部）

以下术语仅适用于内部 Finance workspace，不属于公开主站内容或公开站点导航。具体公式、档位、阈值、流程和实现以当前 Finance requirements 与验收文档为准。

| 术语 | 简短定义 |
| --- | --- |
| **修正迪茨法** | Finance 用于处理期间现金流影响的收益率计算方法。 |
| **高水位线** | Finance 用于判断历史净值和超额分成基准的参考线。 |
| **PE 温度计** | 将受支持指数的 PE-TTM 映射为离散估值温度和操作提示的 Finance 估值视图。 |
| **仓位偏离预警** | 当持仓相对目标范围发生重要偏离时，Finance 提供的状态提示和再平衡提醒。 |
| **三级熔断** | Finance 的分级风险保护机制；具体级别、触发、解除和沟通规则不在本词汇表定义。 |

详细规则见 [`docs/finance-requirements-20260703.json`](docs/finance-requirements-20260703.json)、[`docs/final-requirements-finance.json`](docs/final-requirements-finance.json) 和 [`docs/acceptance-finance.md`](docs/acceptance-finance.md)。

## 不纳入本词汇表与维护规则

不纳入：

- 普通技术词汇，归 `docs/architecture.md` 及其子文档。
- 设计施工和实现词汇和依赖基线迁移；归设计、施工、流程治理或实现文档。
- HEAD、commit SHA、Phase 状态、当前数量、provider、具体阈值、临时功能状态和 release queue。

### Canonical naming

| Canonical term | 允许的语境名称 | 弃用或禁止误读 |
| --- | --- | --- |
| Public Timeline | 公开时间线 | 公开足迹时间线 |
| 足迹来源事件 | — | 系统足迹事件 |
| 豹猫卫星 | 豹猫星座（仅视觉形态） | HAS 三态信号卫星 |
| Planet Focus | Focus | 星球详情页 |
| Entry Display | — | Hero Display |

### 准入与维护

- 术语至少应满足以下一项：跨两个以上权威文档反复使用；横跨产品、架构、设计或实现边界；已经造成 AI agent 误解；或存在需要裁决的别名漂移。
- 术语事实由对应产品、ADR、架构或设计事实源提供；流程治理负责边界审查、一致性检查和经确认后的同步。
- Phase 完成不会自动触发术语新增。
- 公式、流程、实现细节和新的产品、架构、设计决策必须回到对应事实来源。
- 无法仅凭现有资料裁决的词义冲突标记为“待木下确认”，不在 Glossary 中自行猜测。
