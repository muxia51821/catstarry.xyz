---
version: 2.0
name: catstarry.xyz-design-system
description: catstarry.xyz 视觉与交互设计系统。Home 是从远处接近 catstarry 星域的空间导航入口；Content 是奶油画廊；Finance 是赛博数据暗面。以 Klein Blue 作为全站 Brand Voltage，以暖性地质星球、克制粒子与滚动纵深构成 Home 的宇宙语法，同时保持 CJK 优先、WCAG 与 GB/T 44808 可访问性约束。
---

# catstarry.xyz 设计系统

> Phase 4.1（Design 2.0）审定稿。
>
> 本版以 ADR-005、ADR-006、Home / Feed 定向回流后的需求与验收为边界。它替代 Design 1.4 中“Home 两栏布局、About 首屏卡片、Home 混合时间线”的旧假设。

---

## 0. 状态、边界与使用方式

### 0.1 当前阶段

- Phase 4.1 已完成：Design 2.0、canonical CSS token、CJK 基线与通用工具类已完成重锁。
- Phase 4.2 尚未开始：等待流程治理确认后，只负责用一次性原型校准滚动距离、视差比例、资源规格与动效参数。
- Phase 5 尚未开始：本文件不授权生产组件、页面或数据实现。

### 0.2 上游边界

- ADR-005：Feed 的原生内容与 Public Footprint 物理存储分离，但 UI 读取统一的 Public Timeline 投影；视觉组件不得感知底层表结构。
- ADR-006：Home 是静态星图入口，采用 SSG；没有 /api/home、HomeTimelineItem、五源聚合、Recently 或跨模块最新内容读取。
- Home 只承担空间叙事、导航、About 原地展开和静态 SEO。
- Blog、Feed、Learn、Projects 保持各自真实功能布局，不被改造成“星球内部页面”。

### 0.3 锁定与待验证

本文件锁定：

- 三画布及品牌色关系；
- Home 的叙事顺序、星图职责、星球视觉语言与交互语义；
- About 星球与豹猫卫星的双路径；
- 鼠标流星尾的画布范围；
- Feed 原生内容与系统足迹的视觉分工；
- 新 token 家族的命名职责和资产接口。

Phase 4.2 只校准：

- 星图是否短暂 sticky，以及具体滚动距离；
- 各景深层的视差比例、模糊量与缩放量；
- 星球图片分辨率、裁切、加载切换点；
- 豹猫粒子密度、蓄能与回收时长的最终数值；
- 移动端粒子数量和动效降级幅度。

---

## 1. 视觉主题与氛围

catstarry.xyz 是木下持续生长的数字生活空间。宇宙是全站共享的空间语法，不是所有页面都铺满星星；内容本身始终是主角。

### 1.1 三画布系统

| 画布 | 页面 | 气质 | 核心职责 |
| --- | --- | --- | --- |
| Home / Deep Space | / | 克制、深邃、具有真实纵深的暖性地质宇宙 | 进入 catstarry、理解板块、直接导航、原地展开 About |
| Content / Cream Gallery | /blog、/feed、/learn、/projects | 温暖、安静、艺术出版物质感 | 阅读、时间流、学习节奏与项目展示 |
| Finance / Cyber Arena | f.catstarry.xyz | 精确、冷静、数据优先 | 私密财务数据与操作 |

统一关系：

- Klein Blue 是全站 Brand Voltage：负责导航、焦点、边缘光、信号与关键动作。
- Home 使用完整宇宙空间；Content 只借用少量地质材质和光学残响；Finance 不继承星图装饰。
- 豹猫是木下的个人签名，不是 Home 主角、全站 mascot 或分类图标。
- 五颗星球平权；大小、远近和出现顺序只表达空间纵深，不表达栏目重要性。

### 1.2 Home：同一片星域的连续空间

Home 不是多个独立 section 拼接出的作品集，也不是游戏地图。它是同一片星域从远到近的连续观察：

1. **宇宙入口**：深空、大留白、远处星点和待定世界观短句；一次性流星与 DISCOVER MORE 提供继续探索的入口。
2. **接近星域**：自然滚动推进 2–3 个视口的空间距离；远、中、近景产生轻量视差，星点逐渐分化为完整小型星球。
3. **自由星图总览**：About、Blog、Feed、Learn、Projects 五颗完整星球自由分布；标签低声量常驻，hover / focus 时清晰。
4. **直接抵达**：点击 Blog、Feed、Learn、Projects 后，从当前视角短暂推进目标星球，再进入对应功能页。
5. **About 例外**：点击 About 星球或通过豹猫彩蛋触发后，在 Home 原地展开介绍。
6. **自然收束**：星图释放后进入页脚；没有 Home Recently、内容卡片、类型筛选或无限信息流。

首次看见的总览与后续聚焦属于同一片星图，不重复建立第二张地图。

### 1.3 星球不是抽象节点

远处可以是抽象星点，但靠近后必须逐步成为具有体积、光照、大气或地表细节的星球。

| 观看尺度 | 必须看到 | 禁止退化为 |
| --- | --- | --- |
| Entry / 远景 | 星点、微光、极少量星尘 | 五个带文字的圆形按钮 |
| Approach / 接近 | 星点分化为完整的小型球体，开始出现不同轮廓和材质 | 永久抽象节点、发光圆环 |
| Overview / 总览 | 五颗完整星球全貌，自由分布，可区分地貌、环、气层或切面 | 五张等大的产品卡片 |
| Focus / 聚焦 | 高细节弧面、地表、阴影、大气与微观材料；可只露出局部 | 简单放大低清总览图 |
| Push / 点击推进 | 目标星球快速占据视野并把材质色调带入页面转场 | 长时间不可跳过的影片 |

首选视觉方案是高质量预渲染星球图与 2.5D 演出。真实感来自一致的光照、体积、阴影和材质，不要求实时 WebGL 自转或可拖拽 3D。

当写实渲染过于接近通用科幻素材时，可采用高质量抽象地质绘画作为创作分支。像素化或点阵化只用于远景显影、信号干扰和转场，不能成为全部星球的永久样式。

### 1.4 共享暖性地质宇宙

统一原则：

> 共享温暖地质，差异化地貌；共享 Klein Blue 光学，不共享 Klein Blue 地表。

- 星球主体使用奶油、砂岩、陶土、赭色、浅矿物与冷阴影。
- Klein Blue 只用于边缘光、航线、焦点、卫星和交互反馈，不大面积涂满星球。
- 自然天体是主体；纸浆、陶釉、颜料沉积等艺术材料只在聚焦近看时成为微观质感。
- 每颗星球只保留一个总览可辨认的主地貌，至多一个近看艺术质感，避免堆叠环、植物、晶体、机械、云海与建筑。
- 五颗星球使用同一主光方向、景深规律、阴影温度与资产校色标准。

### 1.5 五颗星球材质矩阵

| 星球 | 总览主地貌 | 聚焦后的微观质感 | 应避免 |
| --- | --- | --- | --- |
| About | 安静、低修辞的浅色岩质星体 | 细微毛发般矿物纹理或柔和尘埃层 | 猫头星、猫形星球、强人格 mascot |
| Blog | 风化层状岩、沉积地层 | 纸浆纤维、墨迹般矿脉、颜料沉积 | 书本、羽毛笔等直白文学符号 |
| Feed | 有流向感的低洼地表、沉积河谷 | 脚印、细小闪屑、被时间冲刷的纹理 | 社交 App 图标、信息流屏幕、水球直译 |
| Learn | 地质断层、逐步显露的矿脉 | 刻线、石墨、微晶结构 | “知识水晶”、大脑等常见 AI 隐喻 |
| Projects | 自然地表上的人工切割、台地或嵌入式结构 | 陶釉、金属嵌线、几何构造 | 全机械星球、赛博工厂、飞船基地 |

### 1.6 Content：借用材质，不搬运星球

Blog、Feed、Learn、Projects 继续使用 Cream Gallery 的现有功能布局。星球只是入口与材质母题。

- Blog 可借层状沉积的页首纹理、文章封面裁切或分隔线。
- Feed 可借河谷的时间方向、轻微沉积纹理和足迹语义。
- Learn 可借断层、刻线或矿脉关系表达章节与进度。
- Projects 可借台地、切面与嵌线表达项目状态和结构。
- Content 页面不出现完整行星、星图滚动、3D 飞行或宇宙背景。
- 借用必须低剂量，不能改变文章列表、时间线、学习节奏和项目卡片的主体信息架构。

---

## 2. 色彩与 Token 系统

### 2.1 三层 Token 架构

设计 token 分三层：

| 层级 | 职责 | 示例 |
| --- | --- | --- |
| Layer 1 / Primitives | 原始色值、尺寸、时长、曲线、材质值 | Klein Blue 色阶、地质色、基础透明度 |
| Layer 2 / Semantic | 画布和语义角色 | bg-base、text-primary、space-star-near、planet-rim |
| Layer 3 / Component | 组件状态映射 | star-map-label、about-satellite、cursor-meteor、feed-footprint |

组件只能消费 Layer 2 或 Layer 3，不直接跨层绑定 Layer 1 原始值。Phase 4.1 锁定 token 的职责和命名家族；Phase 4.2 才校准大部分新数值。

纹理文件、星球贴图、豹猫节点数据和图片裁切不是 CSS token，应进入资产清单。

### 2.2 Klein Blue 色阶

| Token | 值 | 用途 |
| --- | --- | --- |
| --klein-600 | #001F70 | 亮底 Hover / Active |
| --klein-500 | #002FA7 | 品牌基准、亮底 CTA 与重点 |
| --klein-400 | #335CFF | 暗底可交互元素与可见边缘 |
| --klein-300 | #6685FF | 暗底辅助图标、次级信号 |
| --klein-100 | #E6ECFF | 亮底选中背景与淡提示 |

Klein Blue 的艺术纯度由 --klein-500 定义；暗底交互必须根据对比度使用更亮阶，不能为了品牌纯度牺牲可见性。

### 2.3 画布基础色

| 画布 | 基底 | 表面 | 主文字 | 主 CTA |
| --- | --- | --- | --- | --- |
| Home | --home-void: #0A0A0C | --home-surface-soft: #121722 | --home-text-primary: #E5E7EB | --klein-400 |
| Content | --content-gallery: #FAF9F5 | --content-surface-card: #EFE9DE | --content-text-primary: #141413 | --klein-500 |
| Finance | --finance-dark: #0B0E11 | --finance-surface: #1E2329 | --finance-text-primary: #EAECEF | --finance-cta-green: #5EAF9E |

继续保留现有暖墨正文、Content 发丝线、Finance 涨跌色与 WCAG 对比度要求。

#### 暖性地质基线

| Token | 值 | 角色 |
| --- | --- | --- |
| --geo-cream | #E8DFD0 | 浅岩、纸浆、盐地 |
| --geo-sand | #CBB184 | 沉积层、河谷、风化地貌 |
| --geo-clay | #A8755B | 陶土、切面、较深地层 |
| --geo-mineral | #BBB8AE | 中性矿物、断层与结晶基底 |
| --geo-graphite | #4B4E55 | 刻线、冷暗细节与学习矿脉 |
| --geo-pigment | #7A5C48 | 墨迹与颜料沉积 |
| --geo-metal | #9DA2A8 | Projects 的人工嵌线 |

五颗星球通过共用材质组合形成差异，不建立独立品牌色：About 使用 cream + mineral；Blog 使用 sand + clay + graphite / pigment；Feed 使用 sand + clay + pigment；Learn 使用 cream + mineral + graphite；Projects 使用 clay + mineral + metal。星球贴图决定真实地貌，CSS 色负责统一调色、光学叠加与资源降级。

### 2.4 Home 空间 Token 家族

以下是 v2 必须提供的语义接口。canonical CSS 提供安全基线；透明度、尺度与光学强度由 Phase 4.2 校准：

| 家族 | 建议 Token | 职责 |
| --- | --- | --- |
| Deep Space | --space-bg、--space-haze、--space-dust | 深空、远雾、微尘 |
| Depth Stars | --space-star-far、--space-star-mid、--space-star-near | 三档景深星点的颜色、透明度和尺度 |
| Depth State | --space-depth-muted、--space-depth-active | 非焦点与当前焦点的光学差异 |
| Route | --space-route、--space-route-active | 低音量航线与交互增强 |

### 2.5 星球光学、材质与状态 Token

星球可能需要较多 token，但必须按职责分组，不能为每张贴图建立一套无规律变量。

| 家族 | 建议 Token | 职责 |
| --- | --- | --- |
| Optical | --planet-light-main、--planet-shadow-cold、--planet-rim、--planet-atmosphere | 统一主光、冷阴影、边缘光与大气 |
| Surface | --planet-surface-cream、--planet-surface-sand、--planet-surface-clay、--planet-surface-mineral | 暖性地质基础 |
| Detail | --planet-detail-graphite、--planet-detail-pigment、--planet-detail-metal、--planet-grain | 近看微观材料 |
| Contrast | --planet-surface-contrast、--planet-surface-saturation、--planet-detail-opacity | 总览与聚焦的材质强度 |
| Scale | --planet-scale-entry、--planet-scale-overview、--planet-scale-focus | 三档观看尺度 |
| Focus | --planet-focus-rim、--planet-focus-glow、--planet-focus-label | hover / focus 状态 |
| Transition | --planet-push-scale、--planet-push-fade、--planet-push-duration | 点击短推进的语义接口 |

五颗星球通过 Layer 3 别名映射这些共用值，例如 planet-blog-surface、planet-feed-detail。禁止建立五套互相无关的品牌色。

### 2.6 Home Activity Signal 卫星

ADR-007 已授权 Home 读取一份最小、静态的活动状态投影。Klein Blue 信号卫星只把 `active`、`stable`、`dormant` 映射为低音量的物理状态；它不是未读提醒、内容预览或第二套导航。

共同边界：

- 仅 Blog、Feed、Learn、Projects 四颗功能星球最多各有一颗；About 永不参与，豹猫卫星也不共享这套语义；
- 卫星必须是有暗面、细边缘光与局部开放轨道弧的微小天体，不能退化成纯蓝点、通知红点或标签旁装饰；
- 位于主星轮廓外，不遮挡地表、标签和可点击区；轨道只允许一段不完整、低透明度的开放弧，不画完整环或矩形虚线尾迹；
- 状态通过天体材质、轨道残留、受限运动和可访问文字共同表达，不能只靠颜色、亮度或运动；
- 若 Home 没有有效的活动状态投影，四颗功能星球都隐藏活动卫星；绝不能把数据不可用伪装成 `dormant`。

| 状态 | 总览视觉 | 局部运动与反馈 |
| --- | --- | --- |
| `active` | 最清晰但仍低音量的卫星：深 Klein Blue 核心、细边缘辉光、可见短开放轨道弧 | 可沿短开放弧低频微移；进入视野、hover 或 keyboard focus 时只作一次边缘辉光与极小前移 |
| `stable` | 同一实体卫星，但更冷静、更暗，轨道更短、更断续 | 微移幅度与速度均低于 `active`；hover 或 focus 时只作一次更弱的回应 |
| `dormant` | 可辨认的冷却卫星与极弱轨道残片；不能消失，以免与投影缺失混淆 | 默认静止；hover 或 focus 只强化标签和轮廓，不发出辉光脉冲 |

总览中，`active`、`stable`、`dormant` 的卫星可见直径分别约为主星的 4.5–5.5%、3.8–4.8%、3.2–4.2%。这是视觉边界而非最终数值；具体尺寸、透明度、短弧范围、时长与辉光强度由 Phase 4.2 用 mock states 校准。

`active` 与 `stable` 的低频局部微移是“卫星存在感”的受限例外：它不能完成整圈公转、自动改变星图焦点、诱导用户点击或形成通知式循环闪烁。`dormant` 不自动移动。reduced motion 下三态均退化为静态材质、开放轨道残留与文字状态。

建议 token 分为两组：

- 共享材质：--signal-satellite-core、--signal-satellite-rim、--signal-satellite-shadow、--signal-satellite-orbit、--signal-satellite-focus-glow、--signal-satellite-pulse-duration；
- 三态别名：--signal-satellite-{active,stable,dormant}-{size,opacity,orbit-opacity}，以及仅 active / stable 使用的 drift-range、drift-duration、pulse-strength。

Phase 4.2 只能以本地 mock states 验证这些接口：至少覆盖混合三态、全 `dormant`、状态轮换与投影缺失时全部隐藏。不得在原型中 fetch `activity-signals.json`，也不得接入 Worker、R2 或其他生产数据链路。

About 的豹猫卫星与 Home Activity Signal 卫星是两种不同角色，不共享行为、数据或 token 语义。

### 2.7 豹猫 Token 家族

豹猫使用 Klein Blue 光学体系，不单独建立“暖铜豹猫”品牌色。

建议 token：

- --leopardcat-particle、--leopardcat-line、--leopardcat-glow；
- --leopardcat-rest-opacity、--leopardcat-focus-opacity；
- --leopardcat-charge-scale、--leopardcat-charge-orbit；
- --leopardcat-dust-radius、--leopardcat-recover-duration。

旧版 --cat-warm、--cat-dark、--cat-eye-glow 等过早预设已从 canonical CSS 废弃；豹猫统一使用上述 Klein Blue 光学语义。

### 2.8 鼠标流星尾 Token 家族

建议 token：

- --cursor-meteor-head；
- --cursor-meteor-trail；
- --cursor-meteor-glow；
- --cursor-meteor-length；
- --cursor-meteor-width；
- --cursor-meteor-decay；
- --cursor-meteor-debris-opacity。

画布范围已锁定：

- Home：完整但克制的鼠标流星尾；
- Content：更短、更淡、碎屑更少，只作为个人签名残响；
- Finance：关闭，避免干扰数据读取和精确操作。

鼠标流星尾与首屏 DISCOVER MORE 流星不是同一个组件，也不承担同一种语义。

### 2.9 Feed Public Footprint Token

Feed 仍可保留现有内容类别色，但颜色只作冗余标记，不能成为唯一编码。

新增语义接口：

- --footprint-surface、--footprint-border、--footprint-source；
- --footprint-action、--footprint-meta、--footprint-link；
- --footprint-blog、--footprint-learn、--footprint-project。

这些 token 只决定统一时间线中的视觉层级，不暴露 Public Footprint 与原生 Feed 内容的物理存储差异。

---

## 3. 排版系统

### 3.1 字体角色

| 角色 | 字体 | 用途 |
| --- | --- | --- |
| Display | IBM Plex Sans + HarmonyOS Sans | Home 入口、画廊标题、品牌骨架 |
| UI / Body | Geist + HarmonyOS Sans | 导航、正文、卡片与操作 |
| Data / Mono | JetBrains Mono | Finance 数值、时间戳、低音量坐标 |
| CJK Fallback | HarmonyOS Sans SC、PingFang SC、Microsoft YaHei | 中文兜底 |

Home 的原“Hero Display”角色更名为 **Entry Display**。它服务宇宙入口的世界观短句，不承担产品 landing page 的大促销标题。

### 3.2 字号层级

| 角色 | EN | CN | 字重 | 行高原则 |
| --- | --- | --- | --- | --- |
| Entry Display | 最大 94px | 最大 84px | EN 300 / CN 400 | EN 0.9；CJK ≥ 1.25 |
| Heading LG | 最大 78px | 最大 70px | EN 300 / CN 400 | CJK ≥ 1.30 |
| Heading | 最大 54px | 最大 48px | 400 | CJK ≥ 1.35 |
| Subheading | 最大 39px | 最大 35px | 400 | CJK ≥ 1.40 |
| Body LG | 18px | 16px | EN 300 / CN 400 | CJK ≥ 1.85 |
| Body | 16px | 16px | 400 | CJK ≥ 1.85 |
| Nav | 14px | 14px | EN 600 / CN 500 | 1.20 |
| Caption | 12px | 12px | 400 | 1.50 |

Display 至 Heading 必须流式缩放。中文显示字号约为英文的 0.9 倍，不使用负字距。

### 3.3 CJK 强制规则

- 中文正文行高不低于 1.85，标题不低于 1.35，说明文字不低于 1.65。
- 中文最高常用字重 500，不使用 700 以上制造“粗黑科技感”。
- 中文字距为 0 或 normal；负字距只用于纯英文或数字标题。
- 中英文、中文与数字之间保留约 1/4 em 的自动间距。
- 支持标点挤压和行首行尾禁则；多行中文标题的绝对 line-gap 不低于 16px。
- 星球标签默认低声量，但仍需满足可发现性；hover / focus 后必须达到正文可读对比度。

### 3.4 Finance 排版

Finance 保持数字优先：主要数值使用 JetBrains Mono，表格密度高于 Content 页面；不继承 Home 的 Entry Display、星球标签或流星尾。

---

## 4. 组件与交互

### 4.1 Home Entry

首屏只保留：

- 待定的中英文世界观短句位置；
- DISCOVER MORE；
- 一次性流星引导；
- 远处星域与足够留白。

世界观短句尚未锁定，不应在设计或实现中擅自补写 constellation 等英文 slogan。

DISCOVER MORE 同时支持：

- 点击后平滑进入接近星域阶段；
- 用户自然滚动进入同一阶段；
- 键盘 focus 和 Enter / Space 触发；
- reduced motion 下直接移动到可读的星图状态。

首屏流星只播放一次，结束后保留极低音量的静态轨迹或端点；首次滚动后淡出，不循环。

### 4.2 Star Map Stage

- 五颗星球自由分布，不使用规整轨道或中心太阳。
- 总览必须看见完整球体；聚焦可只见弧面和高细节局部。
- 星球在任何可点击阶段都能直接导航，不要求按固定顺序“通关”。
- 星体位置、尺度和清晰度只表达深度，不表达内容优先级。
- 星图不得自动旋转、自动巡航或持续改变焦点。

### 4.3 Planet Label

| 状态 | 表现 |
| --- | --- |
| 默认总览 | 名称低对比、小字号、常驻且可发现；可贴近星体或使用极细引线 |
| Hover / Focus | 名称和可点击性清晰；可增加一行极短板块说明 |
| Touch | 不依赖 hover；点按必须能获得同等名称与进入提示 |
| Push | 标签与星球共同向前，进入页面前淡出 |

名称不能完全隐藏，否则星图会退化为猜谜式艺术海报。所有星球还必须在全站导航中有普通文字入口。

### 4.4 Planet Push

- 点击 Blog、Feed、Learn、Projects 后，从当前观察位置快速锁定目标。
- 星球放大并显露更多材质，随后进入对应页面。
- 过渡必须短、可中断、不锁滚动、不要求二次确认。
- 页面落地后回归对应功能画布；不建立 Home 内的“星球详情页”。
- reduced motion 下直接进行普通页面导航。

### 4.5 About 的双路径

About 必须有两条通往同一展开态的路径：

**主路径：直接、可访问**

- 点击 About 星球或文字标签；
- 镜头轻推近；
- About 信息在星球附近原地展开；
- 不要求用户发现豹猫或完成彩蛋。

**彩蛋路径：豹猫卫星**

- 星图总览中，About 附近只出现低音量 Klein Blue 卫星，并隐约保留猫耳与长尾线索；
- 指针进入 About 的引力范围或键盘 focus 时，侧面行走的豹猫轮廓清晰显现；
- 第一次点击豹猫：进入 2–3 秒蓄能态，粒子略向核心收拢、亮度提高，并出现极克制的不完整轨道与“再次点击”的轻提示；
- 第二次点击豹猫：只有豹猫粒子爆开，About 星球绝不爆炸；
- 粒子在 About 附近短暂形成局部轨道尘埃，随后落向星球表面；
- 镜头轻推近，进入与主路径相同的 About 展开态；
- 展开态不保留豹猫，避免个人签名持续抢占内容；
- 关闭 About 时反向回收星尘，重新组成豹猫卫星；
- 若蓄能后未再次点击，应缓慢退回静止态。

豹猫形态要求：

- 侧面、行走姿态，不采用坐姿 mascot；
- 近看必须能读出双耳、侧脸、背线、四足和长尾；
- 外轮廓优先，内部骨架线克制；
- 只做轻微 2.5D 深度响应，不允许自由拖拽、滚轮缩放或持续自转。

触控设备必须始终保留 About 星球直接展开的主路径。豹猫彩蛋的触控手势由 Phase 4.2 验证，可简化，但不得增加理解 About 所必需的第三次操作。

### 4.6 About Expanded

- 信息在星球表面或附近出现，不恢复旧版左侧玻璃卡片主舞台。
- 展开区可包含姓名、简介、外部链接和必要的个人信息。
- 文字必须在稳定、足够对比度的阅读层中呈现，不能直接压在复杂地表上。
- 关闭入口明确，可通过键盘操作；关闭后焦点回到 About 星球或触发元素。
- About 是五颗星球之一，不因展开成为全站中心天体。

### 4.7 Cursor Meteor

鼠标流星尾是木下的个人交互签名：

- 由指针光点、短渐变尾迹和少量碎屑组成；
- 只跟随真实鼠标移动，不捕获点击，不改变系统指针语义；
- Home 完整但低音量；Content 更短、更淡；Finance 关闭；
- 仅在 fine pointer 且支持 hover 的设备启用；
- 指针停止后快速衰减，不持续漂浮；
- 不能覆盖正文、表单、数据或星球标签；
- reduced motion 下关闭。

### 4.8 Feed：原生内容与系统足迹

Feed 是木下的公开足迹／来时路，保持单列连续时间流：

| 类型 | 视觉形式 | 核心内容 |
| --- | --- | --- |
| Note / 碎碎念 | 原生内容卡片 | 文字、图片或视频 |
| Clip / 剪藏 | 原生剪藏卡片 | 标题、摘要、封面与木下点评 |
| Blog Published | 克制的系统足迹行或轻卡片 | 来源、发布动作、快照标题、摘要、时间、链接 |
| Learn Section Completed | 克制的系统足迹行或轻卡片 | 来源、完成动作、小节快照、时间、链接 |
| Project Materially Updated | 克制的系统足迹行或轻卡片 | 来源、实质更新动作、项目快照、时间、链接 |

系统足迹：

- 不使用作者头像、手写语气或大面积媒体，不能伪装成碎碎念；
- 来源与动作是第一识别层，标题与摘要是第二层，时间和链接是第三层；
- 使用图标、文字与色彩冗余编码，不能只靠类别色；
- 隐藏状态不改变源内容；
- UI 读取统一投影，不出现“来自哪张表”的视觉差异。

Feed 在所有断点保持单列，不采用旧版 Tablet 两列 feed 网格。

---

## 5. 布局与空间

### 5.1 Home 空间规则

- 入口、接近、总览是同一连续空间。
- 2–3 个视口只负责接近感和纵深，不逐屏讲解一个板块。
- 星球自由分布、允许不对称，但必须保持可点区域和标签不冲突。
- 可以使用短暂 sticky 舞台，但是否 pin、pin 多久由 Phase 4.2 验证；不得把它写成滚动劫持。
- 用户可快速滚过，也可在任何可点击阶段直接进入星球。
- 星图结束后自然进入页脚，不插入内容聚合区。

### 5.2 Content 布局

- Blog 以文章列表和阅读版心为主体。
- Feed 以单列连续时间流为主体。
- Learn 以学习轨道、章节与进度为主体。
- Projects 以项目展示与状态为主体。
- 所有 Content 页面以奶油画廊留白、8px 级锋利圆角和暖色发丝线建立层级。
- 地质纹理只出现于页首、封面、分隔或细节，不侵入正文可读区。

### 5.3 Finance 布局

Finance 保留高密度数据布局、精确网格和暗色操作面，不使用 Home 的星球、豹猫、鼠标尾迹或暖性地质材料。

---

## 6. 导航系统

### 6.1 全站导航

- 提供 Blog、Feed、Learn、Projects 的普通文字入口。
- 沉浸式星图不是唯一导航方式。
- About 可通过 Home 星球进入；若全站导航提供 About 锚点，应直接进入同一展开态。
- Finance 保持独立私密子站，不进入公开主星图。

### 6.2 Home 航行索引

首次滚动或点击 DISCOVER MORE 后，低音量侧边航行索引出现：

- 只锚定 Home 阶段，例如 Entry、Approach、Star Map；
- 不把 Blog、Feed、Learn、Projects 复制成第二套全站导航；
- 默认显示细刻度、编号或小点，hover / focus 后出现文字；
- 当前阶段用 Klein Blue 轻量高亮；
- 桌面端侧置，移动端可降级为顶部或底部的简短进度提示；
- 若最终 Home 没有额外 Signals 阶段，不得预留空锚点。

---

## 7. Do / Do Not

### 7.1 Do

- 把 Home 当作真实、有纵深的星图空间，而不是深色背景上的圆形按钮。
- 总览展示完整星球，聚焦展示高细节局部。
- 统一星球光学规律，用地貌和微观材质区分板块。
- 让内容页面保持安静、可读，只低剂量借用地质母题。
- 让每个星球、标签、DISCOVER MORE 和 About 都可键盘操作。
- 用一次触发的短脉冲、光照变化和回弹表达生命感。
- 让鼠标流星尾成为低音量个人签名，而不是持续特效。

### 7.2 Do Not

- 不恢复 Home 混合时间线、Recently、筛选器、分页或 /api/home。
- 不把星球永久做成抽象节点、彩色分类圆球或五张产品卡片。
- 不让五颗星球围绕中心太阳建立等级秩序。
- 不按滚动顺序规定 About、Blog、Feed、Learn、Projects 的重要性。
- 不做滚动劫持、强制影片、多场景世界跳转或不可跳过长转场。
- 不自动循环旋转星图、星球或豹猫。仅 Home Activity Signal 的 `active` / `stable` 卫星可作受限的局部微移；不得完整公转、自动巡航、自动聚焦或通知式闪烁。
- 不让豹猫成为全站 mascot，不把 About 星球做成猫头。
- 不在 Content 页面铺完整宇宙、完整行星或 3D 飞行。
- 不让系统足迹伪装成手写 Feed 帖子。
- 不让颜色成为类别、涨跌或状态的唯一表达。
- 不为写实度直接采用低辨识度的通用 NASA 素材拼贴。

---

## 8. 响应式与无障碍

### 8.1 断点行为

| 断点 | Home | Content / Feed |
| --- | --- | --- |
| Mobile < 640px | 保留星图而非改成卡片列表；减少粒子和景深层；只为焦点星球加载高细节；标签默认更清楚 | 单列、触控区不小于 44px |
| Tablet 640–1023px | 调整星球位置和标签引线，降低视差，不采用两列 Feed | Feed 仍单列；阅读版心扩展 |
| Desktop ≥ 1024px | 完整三层景深、自由星图、侧边航行索引、鼠标流星尾 | 完整 Cream Gallery 布局 |

### 8.2 可访问性

- 所有主要文本达到 WCAG 2.1 AA；暗底非文本交互边界达到至少 3:1。
- 星球是有名称的可聚焦链接或按钮，不是无语义 Canvas 热区。
- hover 信息必须有 focus 与 touch 等价路径。
- 当前焦点、活跃状态和类别不能只靠色彩表达。
- About 展开后管理焦点；关闭后恢复到触发元素。
- reduced motion 下：
  - 关闭视差、鼠标流星尾、豹猫爆开和持续位移；
  - Home Activity Signal 卫星保留三态材质、开放轨道残留与文字状态，但停止微移和辉光脉冲；
  - DISCOVER MORE 直接进入静态星图；
  - Planet Push 退化为普通导航；
  - About 以淡入 / 淡出或直接切换完成。
- 星图资源加载失败时，必须保留可读的文字导航与静态替代视觉。

---

## 9. Agent 使用指南

### 9.1 页面到画布映射

| 页面 | 画布 | 主色 | 艺术元素 |
| --- | --- | --- | --- |
| Home / | Deep Space | Klein Blue | 暖性地质星球、三层星域、豹猫卫星、鼠标流星尾 |
| Blog | Cream Gallery | Klein Blue | 层状沉积与纸浆残响 |
| Feed | Cream Gallery | Klein Blue | 单列时间流、河谷时间方向、系统足迹 |
| Learn | Cream Gallery | Klein Blue | 断层、刻线、矿脉残响 |
| Projects | Cream Gallery | Klein Blue | 台地、切面、金属嵌线残响 |
| Finance | Cyber Arena | Turquoise | 数据网格、涨跌双重编码；无星图与鼠标尾迹 |

### 9.2 Phase 4.2 / 4.3 原型验收基线

> 以下项目不是 Phase 4.1 的 CSS 闭合清单。Phase 4.2 用隔离原型验证交互和参数，Phase 4.3 在选定样式落回 canonical CSS 后完成最终勾选。

- [ ] Home 是静态宇宙入口和星图，不是内容聚合页。
- [ ] Entry、Approach、Overview、Push 属于同一片星域。
- [ ] 远景可抽象，接近后必须显现完整、具实星球。
- [ ] 总览用完整球体，聚焦用同材质高细节图。
- [ ] 五颗星球平权，尺度只表达深度。
- [ ] About 有直接展开主路径，豹猫只是可选彩蛋路径。
- [ ] 豹猫爆炸不影响 About 星球，关闭后反向重组。
- [ ] 鼠标流星尾：Home 完整、Content 弱化、Finance 关闭。
- [ ] Home 不直接读取 Public Footprint 或最近更新时间；仅可读取 ADR-007 定义的最小静态活动状态投影。
- [ ] Feed 系统足迹与原生内容清楚区分，但属于同一时间流。
- [ ] Content 页面只借用材质，不重做功能布局。
- [ ] 所有交互具备 keyboard、touch 和 reduced-motion 路径。

### 9.3 Phase 4.1 CSS 迁移边界

本节授权 Phase 4.1 对齐 token 契约、CJK 基线与通用工具类，并清理已失效的旧页面语义；不授权实现 Star Map、Planet、About Expanded、Leopard Cat 或 Cursor Meteor 页面组件。一次性原型 CSS 只能在 Phase 4.2 隔离验证，选定后于 Phase 4.3 落回 canonical styles。

| Design 1.4 / 现有 CSS 概念 | v2 处理 |
| --- | --- |
| Home two-column / Home Card | canonical CSS 已退役；由 Home Entry + Star Map Stage 取代 |
| About Card | canonical CSS 已退役；由 About Planet + About Expanded 取代 |
| Home Timeline / Timeline Card / Type Filter | canonical CSS 已退役；不提供替代 Home 组件 |
| Tablet two-column Feed | 废弃，Feed 全断点单列 |
| 粒子只属于 About Card | 已改为 Space / Leopard Cat / Cursor Meteor 三种明确语义 |
| --cat-warm、--cat-dark、--cat-eye-glow | 已废弃；迁移为 Klein Blue 豹猫光学 token |
| --cat-blog 等 category token | 已改名为 --category-blog 等；只作冗余标记，不再服务 Home 卡片 |
| prefers-color-scheme 决定画布 | 已废弃；Canvas 身份优先，由 data-canvas 明确映射 |
| 既有 CJK、Finance、三画布基础 token | 保留 |

---

## 10. 动效原则

动效最高准则是：建立空间关系、提供方向与反馈，不持续消耗注意力。

### 10.1 动效职责

| 类型 | 职责 | 允许 |
| --- | --- | --- |
| Scroll-driven | 推进同一星域的远近关系 | 星点显影、星球尺度变化、阶段切换 |
| Parallax | 辅助纵深 | 远景慢、中景适中、前景稍快 |
| Hover / Focus | 表达可进入性 | 标签清晰、边缘光、一次短脉冲 |
| Planet Push | 完成导航转场 | 短暂锁定目标、放大、进入页面 |
| Activity Satellite | 表达最低限度的板块活动状态 | `active` / `stable` 的局部微移、一次 focus 反馈；`dormant` 静态 |
| About Cat | 可发现彩蛋 | 蓄能、局部爆开、尘埃落下、反向重组 |
| Cursor Meteor | 个人鼠标签名 | 短尾跟随、快速衰减 |

### 10.2 缓动语义

- ease-monopo：Planet Push、About 展开与关闭、豹猫回收等大范围变化。
- ease-scroll-in：星域显影、低音量阶段进入。
- ease-hover：标签、边缘光、按钮和可点击反馈。

现有曲线可继续作为基准；具体时长和组合由 Phase 4.2 校准，不在 v2 预设新的动画库。

### 10.3 强制约束

- 自然滚动优先，不修改用户滚轮方向、速度或惯性。
- 不做强制 snap 通关；用户能快速滚过星图。
- 环境可随滚动产生微弱漂移，但不允许无输入的循环屏保。Home Activity Signal 的 `active` / `stable` 卫星仅可作短开放弧的低频局部微移，不得整圈公转或改变星图焦点。
- 活动提示以三态材质、开放轨道残留与一次交互反馈共同表达；`active` 与 `stable` 可在首次进入或 focus 时短脉冲一次，`dormant` 不脉冲。
- CJK 文字不做 skew、持续旋转或难读的空间变形。
- 页面转场不能长到让用户误以为卡住。
- prefers-reduced-motion 是完整替代路径，不只是把 duration 设得更短。

---

## 11. 意象、资产与资源规范

### 11.1 星球资产接口

每颗星球至少准备同一材质与同一光照下的三种资产用途：

| 资产槽 | 用途 | 要求 |
| --- | --- | --- |
| Overview Full Sphere | 星图总览 | 完整球体、透明或深空友好边缘、总览尺寸可辨地貌 |
| Focus High Detail | 聚焦与点击推进 | 高分辨率地表、大气、阴影和局部弧面；与总览无换图感 |
| Mobile Optimized | 移动端 | 保留轮廓和主地貌，降低尺寸、粒度和透明叠层成本 |

资产验收：

- 光源方向一致；
- 暖性地质校色一致；
- 总览和聚焦来自同一材质体系；
- 边缘无低清锯齿、压缩 halo 或明显 AI 纹理重复；
- 近看细节达到清晰、可信的天体材质水平；
- 不要求实时 3D、自转或用户拖拽。

### 11.2 星点、尘埃与航线

- 星点分远、中、近三层，密度克制，避免屏保感。
- 尘埃只帮助显影、转场和 About 彩蛋，不作为全屏噪点层持续覆盖。
- 航线为极细、不完整、低透明度线条；不形成 HUD 控制台。
- 像素化只用于远景显影或信号时刻，不能永久覆盖写实星球。

### 11.3 豹猫资产

旧版粒子豹猫可作为节点、骨架、星座连线与爆开回收逻辑的研究输入，但不得原样嵌入：

- 不复用全屏深空 About 舞台；
- 不复用左侧玻璃卡片；
- 不复用拖拽环绕、滚轮缩放和持续自动旋转；
- 不把旧版复杂内部骨架直接缩小，避免猫形辨识度下降；
- 新资产优先保证行走侧影、双耳、侧脸、四足和长尾的轮廓。

### 11.4 Content 图片与纹理

- Content 图片保持 8px 级圆角与轻颗粒，正文图像不施加强烈宇宙着色。
- 地质纹理作为页首、封面或分隔资产，不作为整页背景。
- Blog / Feed / Learn / Projects 可共享一套暖性地质素材库，通过裁切和微观纹理建立关联。
- Finance 图片和图表不复用暖性地质纹理。

### 11.5 资源与性能原则

- 首屏优先加载远景与必要入口，不同时加载五颗星球的全部高细节资产。
- 总览加载完整球体的优化版本；只有焦点星球准备或加载高细节资产。
- 移动端减少粒子层、模糊叠层和大图尺寸，但保留星图本身。
- 资源失败不能破坏导航；文字标签和普通链接始终是可用兜底。

---

## 结论

Design 2.0 将 Home 从内容聚合布局重锁为一片连续、可导航的 catstarry 星域：远处是星点，靠近后成为具实体积和各自地貌的暖性地质星球；滚动只负责空间纵深，点击负责抵达内容。About 通过直接展开和豹猫彩蛋两条路径进入同一信息态。Feed 独立承担公开足迹，Content 页面保持功能与阅读优先。Klein Blue、鼠标流星尾和豹猫共同构成木下的个人签名，但都不取代内容成为主角。
