# 项目共享词汇表 (GLOSSARY)

> catstarry.xyz 的稳定共享命名与术语边界来源。

GLOSSARY 只记录跨模块、跨 Phase、容易被误解或存在命名漂移的稳定词汇。它负责 canonical naming、别名和“不包含什么”，不负责 Product behavior、Architecture、Design parameters、implementation rules、repo wayfinding 或易过期状态。

## 角色与访问范围

| 术语 | 定义 |
| --- | --- |
| **木下** | 项目所有者和最终决策者。 |
| **cati** | Finance workspace 的指定只读协作者，不是公开站点角色。 |
| **访客** | 公开主站访问者，不包含 Finance workspace 使用者。 |

## 公开主站与板块

| 术语 | 定义与边界 |
| --- | --- |
| **公开主站** | `catstarry.xyz` 主域上的 Home、Blog、Feed、Learn、Projects 及其公开页面集合；不包含 `f.catstarry.xyz`、独立部署的项目子域，或本地写作、学习、预览和管理工作区。 |
| **Home (`/`)** | 公开主站的宇宙入口和空间导航，不是跨模块内容聚合页。 |
| **Blog (`/blog`)** | 公开长文模块；不指 DOCX 草稿、本地 workbench 或发布流程。 |
| **Feed (`/feed`)** | 公开时间线模块，呈现原生 Feed 内容和 Public Footprint。 |
| **Learn (`/learn`)** | 公开学习笔记模块；不指本地私有学习区、课程生成 workspace 或 draft preview 工具。 |
| **Projects (`/projects`)** | 公开项目展示模块。 |
| **Finance workspace** | `f.catstarry.xyz` 的内部私密财务工作区，不属于公开主站、Home 导航或公开 Content Family。 |

## Home 导航与交互词汇

```text
星图
  → 目标星球
    → Planet Focus
      → Focus action
        ├─ Blog / Feed / Learn / Projects
        │    → Planet Push → 对应功能页
        └─ About → About 展开态
```

| 术语 | 定义与边界 |
| --- | --- |
| **星图** | Home 中用于观察和进入五颗导航星球的空间导航；不承载内容聚合、时间线或板块详情。 |
| **Planet Focus** | Home 内对目标星球的观察状态，显示近景、名称、极短说明和明确 action；不加载真实板块内容。 |
| **Focus action** | Planet Focus 中的明确目的地动作；功能星球触发 Planet Push，About 进入 Home 原地展开态。 |
| **Planet Push** | Focus action 之后发生的短暂空间转场；不是页面或内容层。 |
| **About 展开态** | Home 内 About 信息的原地展开状态，可由 About 主路径或豹猫彩蛋进入。 |
| **Home Activity Signal** | Home 使用的最小板块活动状态，只表达 Blog、Feed、Learn、Projects 的 `active`、`stable`、`dormant`；不包含内容、数量、精确时间或 unread 语义，也不是 Public Timeline。 |
| **信号卫星** | 四颗功能星球旁用于表达 Home Activity Signal 状态的视觉载体；About 和豹猫不消费这套三态语义。数据不可用不等于 `dormant`。 |
| **豹猫卫星** | About 附近的特殊交互 companion / 个人签名元素；通过可选彩蛋进入与 About 主路径相同的展开态。它不消费 Home Activity Signal，也不是四颗功能星球的三态信号卫星。“豹猫星座”可用于描述其视觉形态。 |
| **Home Cursor Meteor（鼠标流星尾）** | Home Deep Space 中跟随 fine pointer 移动的个人交互签名；不等同于首屏一次性的 DISCOVER MORE 流星，也不是 Content interaction 的名称。 |
| **Content Paw Trail（猫爪轨迹）** | Content / Cream Gallery 中随 qualifying fine-pointer movement 留下的猫爪足迹个人签名；与 Home Cursor Meteor 是不同能力，不承担导航或内容语义。 |
| **Content Click Feedback** | Content 页面点击时的短暂局部反馈；与 Paw Trail 独立，也不是 Home Cursor Meteor 的弱化版本。 |
| **Entry Display** | Home 宇宙入口的世界观短句排版角色；不承担 product landing page 式促销标题。 |
| **暖性地质宇宙** | Home 五颗导航星球共享的材质和光学母题。 |

## Feed 与 Public Footprint

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
| **剪藏** | Feed 原生的网页收藏，包含链接、外部对象 metadata 与可选用户评论；作为原生记录参与 Public Timeline，不转化为 Public Footprint。 |
| **备忘录感** | Feed 的低摩擦发布原则：写完即发、不以编辑和打磨为前置条件；不是技术流程或内容审核规则。 |
| **足迹来源事件** | Blog、Learn 或 Projects 中满足足迹生成合同、可以产生 Public Footprint 的来源事件。不包含普通编辑、重复部署、碎碎念、剪藏或已经写入的 Public Footprint。旧文档中的“系统足迹事件”统一以本名称为准。 |
| **Public Footprint（公开足迹）** | 足迹来源事件固化形成的独立历史记录，保存事件时的来源身份和展示快照，并拥有独立可见性；不等于整个 Feed，也不包含碎碎念和剪藏。 |
| **Public Timeline（公开时间线）** | Feed 将原生碎碎念、剪藏与可公开 Footprint 统一排序形成的读取投影，也是 `/feed` 面向访客的呈现；不是数据库表，不是 Public Footprint 的别名，也不被 Home 使用。 |

## Finance workspace（内部）

以下术语仅适用于内部 Finance workspace，不属于公开主站 Content / navigation。

| 术语 | 简短定义 |
| --- | --- |
| **修正迪茨法** | Finance 用于处理期间现金流影响的收益率计算方法。 |
| **高水位线** | Finance 用于判断历史净值和超额分成基准的参考线。 |
| **PE 温度计** | 将受支持指数的 PE-TTM 映射为离散估值温度和操作提示的 Finance 估值视图。 |
| **仓位偏离预警** | 当持仓相对目标范围发生重要偏离时，Finance 提供的状态提示和再平衡提醒。 |
| **三级熔断** | Finance 的分级风险保护机制；具体级别、触发、解除和沟通规则不在本词汇表定义。 |

## Canonical naming

| Canonical term | 允许的语境名称 | 弃用或禁止误读 |
| --- | --- | --- |
| Public Timeline | 公开时间线 | 公开足迹时间线 |
| 足迹来源事件 | — | 系统足迹事件 |
| 豹猫卫星 | 豹猫星座（视觉形态） | HAS 三态信号卫星 |
| Home Cursor Meteor | 鼠标流星尾（Home 语境） | Content 弱化流星尾 |
| Content Paw Trail | 猫爪轨迹、Paw Trail | Content cursor meteor |
| Content Click Feedback | Content 点击反馈 | Content cursor meteor |
| Planet Focus | Focus | 星球详情页 |
| Entry Display | — | Hero Display |
| 上海时钟（`shared/shanghai-time.ts`） | Finance 域 `lib/dates.ts` 的 `shanghaiDay` 等；无构建静态脚本可就地镜像同一 Intl 语义 | 手动 +8 小时算术、UTC/设备本地时区充当业务日期 |

术语语义发生变化时，由对应 Product / Architecture / Design authority 先形成新的事实，再同步 canonical naming；GLOSSARY 不自行创造新的产品、架构、设计或实现规则。
