---
version: 2.1
name: catstarry.xyz-design-system
description: catstarry.xyz 视觉与交互设计系统。Home 是从远处接近 catstarry 星域的空间导航入口；Content 是奶油画廊；Finance 是赛博数据暗面。Klein Blue 作为全站 Brand Voltage，暖性地质星球、克制粒子与滚动纵深构成 Home 的宇宙语法，同时保持 CJK 优先与可访问性。
---

# catstarry.xyz 设计系统

> 本文件定义当前 durable visual / interaction truth。Product semantics 以对应 Product authority 为准；前端施工与 runtime implementation 见 `docs/agents/frontend-rules.md` 和 current source。

---

## 1. 视觉主题与三画布

catstarry.xyz 是木下持续生长的数字生活空间。宇宙是共享空间语法，不要求所有页面铺满星星；内容本身始终是主角。

| 画布 | 页面 | 气质 | 核心职责 |
| --- | --- | --- | --- |
| Home / Deep Space | `/` | 克制、深邃、真实纵深的暖性地质宇宙 | 进入 catstarry、理解板块、直接导航、原地展开 About |
| Content / Cream Gallery | Blog / Feed / Learn / Projects | 温暖、安静、艺术出版物质感 | 阅读、时间流、知识结构、项目展示 |
| Finance / Cyber Arena | `f.catstarry.xyz` | 精确、冷静、数据优先 | 私密财务数据与操作 |

统一关系：

- Klein Blue 是全站 Brand Voltage：用于导航、焦点、边缘光、信号与关键动作。
- Home 使用完整宇宙空间；Content 只借用低剂量地质材质和光学残响；Finance 不继承星图装饰。
- 豹猫是木下的个人签名，不是全站 mascot 或分类图标。
- 五颗 Home 星球平权；大小、远近和出现顺序只表达空间纵深，不表达栏目重要性。

### 1.1 Content authority

Content Family 的 shared semantics 与 module exceptions 由 `docs/content/family-contract.md` / `master-ledger.md` 约束。本设计系统采用以下当前边界：

- Blog：frameless editorial Archive + Tonal Paper Reading；Reading no border / shadow / radius。
- Feed：D — Quiet Deposition；Native Note / Clip / Public Footprint equal S2 rank、different grammar。
- Learn：Knowledge Structure + Reading；Knowledge Map = Track × Graph；Track 是 domain context，不是 Note parent。
- Projects：Full Object Card + static shadow + hover lift + stronger hover shadow 是合法 module exception。
- Content Family 没有 universal Card、Opening、width、Tag、date、pagination、footer、radius 或 hover treatment。

---

## 2. Home：连续星域

Home 不是多个 section 拼成的作品集，也不是游戏地图。它是同一片星域从远到近的连续观察：

1. **Entry**：深空、大留白、远处星点、世界观短句；一次性流星与 DISCOVER MORE 提供继续探索的入口。
2. **Approach**：自然滚动推进空间距离；远、中、近景产生轻量视差，星点逐渐显现为完整小型星球。
3. **Star Map Overview**：About、Blog、Feed、Learn、Projects 五颗完整星球自由分布；标签低声量常驻。
4. **Planet Focus**：自然滚动可按 `About → Feed → Blog → Projects → Learn` 观察；顺序只组织镜头路径。
5. **Direct Focus**：点击、键盘或航行索引可以直接进入任一目标 Focus。
6. **Focus action**：Blog、Feed、Learn、Projects 在明确 action 后执行 Planet Push 并进入功能页。
7. **About exception**：About 在 Home 原地展开；豹猫彩蛋进入同一展开态。
8. **Ending**：最后一个 Focus 释放后自然进入页脚；没有 Home Recently、内容卡片、类型筛选或跨模块信息流。

Overview 与 Focus 属于同一张星图，不建立第二张地图。

### 2.1 星球观看尺度

| 尺度 | 必须看到 | 禁止退化为 |
| --- | --- | --- |
| Entry / 远景 | 星点、微光、极少量星尘 | 五个文字圆按钮 |
| Approach | 星点分化为完整小型球体 | 永久抽象节点、发光圆环 |
| Overview | 五颗完整星球，可辨地貌 / 环 / 气层 / 切面 | 五张等大产品卡片 |
| Focus | 高细节弧面、地表、阴影、大气与材料 | 简单放大低清总览图 |
| Push | 目标星球快速占据视野并带入材质色调 | 长时间不可跳过影片 |

首选方案是高质量预渲染星球图 + 2.5D 演出。真实感来自一致光照、体积、阴影和材质，不要求实时 WebGL 自转或可拖拽 3D。

### 2.2 暖性地质宇宙

> 共享温暖地质，差异化地貌；共享 Klein Blue 光学，不共享 Klein Blue 地表。

- 主体材质使用奶油、砂岩、陶土、赭色、浅矿物与冷阴影。
- Klein Blue 只用于边缘光、航线、焦点、卫星和交互反馈。
- 自然天体是主体；纸浆、陶釉、颜料沉积等只在近看时成为微观质感。
- 每颗星球只保留一个总览主地貌和至多一个近看材料重点。
- 五颗星球共享主光方向、景深规律、阴影温度和资产校色标准。

| 星球 | 总览主地貌 | 聚焦微观质感 | 应避免 |
| --- | --- | --- | --- |
| About | 安静、低修辞的浅色岩质星体 | 细微毛发般矿物纹理 / 柔和尘埃 | 猫头星、猫形星球、强 mascot |
| Blog | 风化层状岩、沉积地层 | 纸浆纤维、墨迹矿脉、颜料沉积 | 书本、羽毛笔等直白符号 |
| Feed | 有流向感的低洼地表、沉积河谷 | 脚印、闪屑、时间冲刷纹理 | 社交 App 图标、信息流屏幕 |
| Learn | 地质断层、显露矿脉 | 刻线、石墨、微晶结构 | 知识水晶、大脑隐喻 |
| Projects | 自然地表上的人工切割 / 台地 | 陶釉、金属嵌线、几何构造 | 全机械星球、赛博工厂 |

### 2.3 Content 借材质，不搬运星球

- Blog 可借层状沉积、纸浆与风化痕迹。
- Feed 可借河谷时间方向、沉积纹理与足迹语义。
- Learn 可借断层、刻线、矿脉表达 knowledge structure、domain orientation 与 Note relations；不以 completion / progress 为视觉骨架。
- Projects 可借台地、切面与嵌线表达项目对象。
- Content 页面不出现完整行星、星图滚动、3D 飞行或宇宙背景。

---

## 3. 色彩与 Token

### 3.1 三层 token contract

设计系统采用三层 token contract；`src/styles/variables.css` 是当前 CSS realization，但变量存在本身不能反向创造新的 Design requirement。

| 层级 | 设计职责 | 当前 CSS namespace 示例 |
| --- | --- | --- |
| Primitives | 原始色阶、材质、尺寸、时长、曲线 | `--blue-*`、`--gray-*`、`--warm-*`、`--geo-*`、type / spacing / radius / motion primitives |
| Semantic | 画布、品牌、材料与交互角色 | `--klein-*`、`--home-*`、`--content-*`、`--finance-*`、`--space-*`、shared planet optics |
| Component | 稳定组件视觉接口 | `--star-map-*`、`--planet-*`、`--has-*`、`--leopardcat-*`、generic control tokens |

Design 负责定义角色与 namespace contract；具体 consumer、selector 与兼容实现由 frontend rules / current source 负责。Runtime geometry、轨道相位、随机星场、豹猫物理、pointer gait、sampling、scheduler 等不属于 durable design token。

### 3.2 Klein Blue

| Token | 值 | 用途 |
| --- | --- | --- |
| `--klein-600` | `#001F70` | 亮底 Hover / Active |
| `--klein-500` | `#002FA7` | 品牌基准、亮底 CTA / focus |
| `--klein-400` | `#335CFF` | 暗底交互与边缘光 |
| `--klein-300` | `#6685FF` | 暗底辅助信号 |
| `--klein-100` | `#E6ECFF` | 亮底淡提示 |

暗底交互必须优先满足可见性和对比度。

### 3.3 画布基础色

| 画布 | 基底 | 表面 | 主文字 | 主 CTA |
| --- | --- | --- | --- | --- |
| Home | `#0A0A0C` | `#121722` | `#E5E7EB` | Klein Blue |
| Content | `#FAF9F5` | warm cream surfaces | `#141413` | Klein Blue |
| Finance | `#0B0E11` | `#1E2329` | `#EAECEF` | Finance turquoise / state colors |

### 3.4 暖性地质基线

| Token | 值 | 角色 |
| --- | --- | --- |
| `--geo-cream` | `#E8DFD0` | 浅岩、纸浆、盐地 |
| `--geo-sand` | `#CBB184` | 沉积层、河谷、风化地貌 |
| `--geo-clay` | `#A8755B` | 陶土、切面、较深地层 |
| `--geo-mineral` | `#BBB8AE` | 中性矿物、断层与结晶基底 |
| `--geo-graphite` | `#4B4E55` | 刻线、冷暗细节 |
| `--geo-pigment` | `#7A5C48` | 墨迹与颜料沉积 |
| `--geo-metal` | `#9DA2A8` | Projects 人工嵌线 |

### 3.5 Design → CSS namespace contract

| Design role | Canonical namespace / interface | Boundary |
| --- | --- | --- |
| Canvas identity | `--home-*` / `--content-*` / `--finance-*` + shared semantic aliases | 三画布语义独立；不因 shared alias 获得相同 appearance |
| Deep Space | `--space-*` | 背景、haze、dust、far/mid/near stars、route / depth optics；随机 field geometry runtime-owned |
| Planet optics / material / identity | `--planet-*` | 主光、阴影、rim、atmosphere、material、overview/focus identity；位置和导航 state runtime-owned |
| Star Map interaction | `--star-map-*` / `--interaction-*` | label、focus、hit / navigation visual interface；Focus 顺序与 navigation state 不属于 token |
| Home Activity Signal | `--has-*` | body / rim / band / orbit / state visual contract；orbit phase、period、depth、pulse scheduling runtime-owned |
| Leopard Cat | `--leopardcat-*` | contour / link / aura / node / residue visual contract；节点坐标、burst physics、recovery runtime-owned |
| Home Cursor Meteor | `--cursor-meteor-*` | 只对应 Home movement signature 的设计语义；不能据此恢复 Content movement meteor |
| Learn local material surfaces | module-local `--learn-*` derived from Cream Gallery / geo semantics | `canvas / field / functional / engraving` 是 Learn visual roles；它们不是新的 Family-wide palette 或 token obligation |
| Content Paw Trail | component-local `--content-paw-*` interface | Paw visual interface 可使用局部 custom properties；exact gait / spacing / lifetime / speed threshold runtime-owned |
| Content Click Feedback | semantic behavior is canonical；当前不规定独立全局 token namespace | Klein Blue core / echo 是 Design truth；不得从 legacy implementation naming 推导新的 Content Meteor 设计 |
| Public Footprint | no dedicated framed-surface token obligation | Footprint 与 Native equal S2 rank；任何遗留 surface token 都不能反向恢复 Card / system-row hierarchy |

五颗星球通过共享 `--planet-*` 光学与地质材料形成不同 identity，不建立五套独立品牌色。一个 token family 是否继续作为 active implementation contract，必须同时满足当前 Design semantics 与真实 consumer；历史变量的存在不是 Design authority。

---

## 4. Home Activity Signal

Home Activity Signal 只把 `active`、`stable`、`dormant` 映射为低音量天体状态，不是未读提醒、内容预览或第二套导航。

- 仅 Blog、Feed、Learn、Projects 最多各有一颗信号卫星；About / 豹猫不参与。
- 信标是微小轨道天体：有暗面、细 rim、嵌入式 Klein Blue signal band。
- 轨道痕迹低透明度、不完整；不画完整高亮环或通知轨道。
- 前后层通过真实遮挡表达，不用 opacity 淡出假装被主星遮挡。
- 状态由材质、轨道、受限 motion 与 accessible text 共同表达，不只靠颜色。
- 数据不可用时隐藏信号卫星，不能伪装成 `dormant`。

| 状态 | 视觉 | Motion |
| --- | --- | --- |
| active | 最清晰但仍低音量；Klein Blue band / rim / readable orbit | 低频完整公转；hover / focus 减速 |
| stable | 同一信标冷却、尺寸与亮度降低 | 更慢低频完整公转；hover / focus 同比减速 |
| dormant | 冷却卫星 + 极弱轨道残留 | 静止 |

核心直径基线约为主星的 `6.375%`；状态 scale：active `1`、stable `.88`、dormant `.76`。

Active / stable 的完整低频公转是受限例外：不得自动改变焦点、诱导点击或形成通知式闪烁。Reduced motion 下全部退化为静态材质、轨道残留和 accessible state。

---

## 5. 豹猫视觉语言

豹猫统一使用 Klein Blue 光学体系，不建立独立暖铜品牌色。

视觉语义：

- 侧面行走姿态；必须能读出双耳、侧脸、背线、四足和长尾。
- 外轮廓优先，内部骨架克制。
- Rest → Reveal → Charged → Burst / Residue → Recovery。
- 只有豹猫粒子爆开，About 星球绝不爆炸。
- Focus residue 不显示完整幽灵豹猫。
- 不做自由拖拽、滚轮缩放或持续自动旋转。

豹猫是 About 的可选彩蛋路径，不是理解或进入 About 的前置条件。

---

## 6. Pointer signatures

### Home — Cursor Meteor

- 指针光点、短渐变尾迹和少量碎屑组成。
- 跟随真实鼠标移动，不捕获点击、不改变系统指针语义。
- 停止后快速衰减，不覆盖正文、表单、数据或星球标签。

### Content — Paw Trail + Click Feedback

- **Paw Trail**：fine-pointer movement 留下低音量猫爪足迹。
- **Click Feedback**：独立的点击 response，以克制 Klein Blue core / echo 表达。
- 两者彼此独立，也都不是“弱化 Cursor Meteor”。

### Finance — neither

Finance 不使用 Cursor Meteor、Paw Trail 或 Content Click Feedback。

所有 pointer signature 都是 enhancement；reduced motion / 不适合的 pointer environment 下可完全关闭，不影响内容与操作。

---

## 7. Typography 与 CJK

### 7.1 字体角色

| 角色 | 字体 | 用途 |
| --- | --- | --- |
| Display | IBM Plex Sans + HarmonyOS Sans | Home Entry、画廊标题、品牌骨架 |
| UI / Body | Geist + HarmonyOS Sans | 导航、正文、Card 与操作 |
| Data / Mono | JetBrains Mono | Finance 数值、时间戳、结构 metadata |
| CJK Fallback | HarmonyOS Sans SC、PingFang SC、Microsoft YaHei | 中文兜底 |

> 现实注记（2026-08-26）：当前构建未自托管任何字体（仓库无 @font-face，`public/` 无字体文件）。上表字体族以 CSS font-family 名称声明，实际渲染依赖访客系统已安装的同名字体，缺失时按栈回退到 PingFang SC / Microsoft YaHei / system-ui。`docs/design/font/` 为选型素材库（含许可证），未接入构建；若未来要兑现品牌渲染，需自托管精简子集（可变字体 + OFL）并补 @font-face。

### 7.2 字号层级

| 角色 | EN | CN | 字重 | 行高原则 |
| --- | --- | --- | --- | --- |
| Entry Display | 最大 94px | 最大 84px | EN 300 / CN 400 | EN 0.9；CJK ≥1.25 |
| Heading LG | 最大 78px | 最大 70px | EN 300 / CN 400 | CJK ≥1.30 |
| Heading | 最大 54px | 最大 48px | 400 | CJK ≥1.35 |
| Subheading | 最大 39px | 最大 35px | 400 | CJK ≥1.40 |
| Body LG | 18px | 16px | EN 300 / CN 400 | CJK ≥1.85 |
| Body | 16px | 16px | 400 | CJK ≥1.85 |
| Nav | 14px | 14px | EN 600 / CN 500 | 1.20 |
| Caption | 12px | 12px | 400 | 1.50 |

### 7.3 CJK design rules

- 中文正文行高不低于 1.85，标题不低于 1.35，说明文字不低于 1.65。
- 中文常用字重最高 500，不用 700+ 制造粗黑科技感。
- 中文字距为 0 / normal；负字距只用于纯英文或数字 display。
- 中英文、中文与数字之间保持自然自动间距；不通过内容本身插入人工空格塑造版式。
- 支持合理的 CJK punctuation trim / hanging behavior。
- 星球标签默认低声量，但 hover / focus 后达到可读对比度。

Finance 保持数字优先，主要数值使用 JetBrains Mono，不继承 Home 的 Entry Display 或星球标签语言。

---

## 8. Home components and interaction

### 8.1 Entry

首屏只保留：

- 世界观短句位置；
- DISCOVER MORE；
- 一次性流星引导；
- 远处星域与足够留白。

世界观短句未锁定，不擅自补写营销式 slogan。

DISCOVER MORE 支持点击、滚动、keyboard activation；reduced motion 下直接进入稳定星图状态。首屏流星只播放一次，不循环。

### 8.2 Star Map

- 五颗星球自由分布，不使用规整轨道或中心太阳。
- 总览看完整球体；Focus 可只见高细节弧面。
- 星球在可点击阶段都可直接进入对应 Focus。
- 位置、尺度、清晰度只表达深度，不表达内容优先级。
- 星图不自动旋转、自动巡航或持续改变焦点。

语义区域：

- About：右上远端；
- Blog：左上；
- Feed：中部偏右近景；
- Projects：左下；
- Learn：右下。

构图保持稳定，不按每次加载随机换位。

### 8.3 Planet Label

| 状态 | 表现 |
| --- | --- |
| Overview | 名称低对比、小字号、常驻可发现 |
| Hover / Focus | 名称与可进入性清晰，可增加极短说明 |
| Touch | 不依赖 hover；点按获得同等名称 / 进入提示 |
| Push | 标签与星球共同前推并在页面进入前淡出 |

名称不能完全隐藏。所有功能星球还有普通文字导航入口。

### 8.4 Planet Focus and Push

- Focus 是 Home 内观察状态：目标星球放大并显露更多材质，显示名称、极短说明和明确 action。
- 自然滚动按默认顺序浏览；点击 / keyboard / navigation index 可直接跳到任一 Focus。
- Focus 不加载 Blog / Feed / Learn / Projects 真实内容。
- 功能星球只有在 action 后执行短、可中断、不锁滚动的 Planet Push。
- 页面落地后回归对应功能画布，不建立 Home 内“星球详情页”。

### 8.5 About dual path

**主路径**：点击 About / Focus action 后，镜头轻推近并进入 About 展开态；不要求发现豹猫。

**彩蛋路径**：

- About 附近出现低音量 Klein Blue 豹猫轮廓 / 星座。
- Desktop 第一次独立点击进入 Charged，再次点击触发 burst；不是 browser `dblclick`。
- Touch 单次激活直接进入；reduced motion 跳过 burst。
- Burst 后少量 residue 延续到 About Focus；完整轮廓隐藏。
- 关闭 / 返回 / 离开时回收至 Rest。

### 8.6 About Expanded

- 信息在星球表面或附近出现，不恢复独立玻璃卡片主舞台。
- 可包含姓名、简介、外部链接和必要个人信息。
- 文本置于稳定、高对比阅读层，不直接压在复杂地表上。
- 关闭入口明确并可 keyboard 操作；关闭后焦点回到触发元素。

---

## 9. Content surfaces

### 9.1 Blog

- Archive = editorial article index，不使用 Full Card / shadow / hover lift。
- Reading = Tonal Paper；no border / shadow / radius。
- Desktop Summary 可 hover / focus reveal；Mobile always visible。
- Archive 与 Reading 使用不同 content measure。

### 9.2 Feed — Quiet Deposition

Design unit = **Activity**。Native Note、Native Clip、Public Footprint equal S2 rank、different grammar。

| Grammar | 核心内容 | 视觉边界 |
| --- | --- | --- |
| Note | What I said | frameless，content 是 anchor |
| Clip | What I saved + why I cared | 同 rank；external object 可有轻内部结构 |
| Footprint | What happened + what it was | 同 rank；event identity + snapshot + explicit destination |

共同约束：

- no full Activity background / border / shadow；
- no repeated divider、timeline rail、node、tick；
- Native 不天然更高，Footprint 不天然更轻；
- 不把 Footprint 画成 system-log row；
- chronology 由 year / date / time 与 vertical rhythm 承担。

### 9.3 Learn — Knowledge Structure + Reading

Learn 是 Cream Gallery 内的 knowledge system，不是独立 dashboard，也不是 LMS。其视觉层级分为 **Knowledge Field / Reading Field / Functional Local Surface**：宽屏空间用于结构与关系，长文阅读宽度保持受限；code、table、Wikilink preview、owner row 等局部功能表面可以有必要边界，但不把所有对象 Card 化。

#### Opening and Knowledge Map

- Learn opening 保持简洁；中文 motto 与 Latin motto 固定为两行，不因视口合并成一行。
- Home 只存在一个 **Knowledge Map**。Track directory、Graph 与 compact Search 属于同一知识结构系统，不拆成互相竞争的 hero / dashboard panels。
- Knowledge Map 使用 warm Cream / geological field；Graph 不使用黑底、洋红主题、发光星座或独立宇宙画布。
- Track identity 主要由 label、空间 clustering 与 whitespace 建立；不默认使用大色块或 bordered Track region。
- Search 非 sticky、视觉次于 Knowledge Map heading；active search 不隐藏 Graph、Tracks 或 Recent Knowledge。

#### Graph

- Graph nodes = Public Notes；edges = normalized explicit Note relations。shared Track 不产生 edge，也不表达 prerequisite。
- Layout 是 deterministic、Track-aware 的空间聚类；允许真实的不均匀、稀疏区、密集区与 cross-Track bridge，不为了几何对称牺牲可读性。
- 可读优先顺序：**label readability > node separation > relation legibility > visual symmetry**。
- Node 是低音量小点，标题始终可读；当前 accepted visual class 约为 5px resting / 6px active dot、14px class label。可点击 / 触控 hit area 必须明显大于视觉点。
- Relation 使用 restrained Hairline；active relation 转 Klein Blue 并轻微加强。不要 arrows、dash-type encoding、edge-type colors、bundling、glow 或 decorative S-curve。
- Graph 是 bounded content-aware field，不做 full-screen Graph，也不随 node count 无限增长。large-corpus scaling 在真实证据出现前保持 Parked。
- Hover / focus 可轻微放大 node、将 title / direct relation 变 Klein Blue，并软化无关节点；keyboard focus 必须清楚可见。

#### Track directory / Track page

- Track 是 categorical / domain directory，不是 curriculum、Note parent 或 colored taxonomy badge。
- Home Track directory 使用 plain text；辅助 count 可以在 hover / focus 时出现，但不能改变布局宽度，也不成为主视觉。
- Track page 是稳定单列 browse field：Track title / description → plain Section anchors → Section groups → frameless Note rows。
- 不使用 Track slug eyebrow、top count pill、`PUBLISHED NOTES`、Section pills、Note Cards、Note dates 或 recent chronology。
- Track page 宽屏可以增加 whitespace 与 row composition，但不变成 2/3-column Note grid，也不拉长正文行长。

#### Public Note / relations

- Public Note primary return = `返回 Learn`，不是返回 Track；Track / Section 是 context，不形成 ontology breadcrumb。
- Header 显示 Track / Section context、first publication date、仅在 substantive revision 后出现的 revision date、H1 与 excerpt；不公开 Mission、Batch、completion、source URL、maintenance modified date 或默认 tags。
- Reading 使用 fluid outer shell + bounded body measure；body 保持约 720–760px class，header 可以略宽。宽屏额外空间服务 Related rail / chapter navigation / breathing room，而不是增长阅读行长。
- Related Notes 与 Graph / Wikilink 使用同一 normalized relation truth。Wide 可使用低音量 relation rail；当 rail 开始损害阅读宽度时移到正文后方。
- Wikilink 是可直接导航的正文关系入口；preview 是辅助而非第二层 Card system。
- Preview 页面与 Public Note 使用同一 reading grammar；owner/private chrome 可以不同，但不能扭曲真实 Public Note layout。

#### Recent / mobile / sparse corpus

- Recent Knowledge 最多 5 条 frameless lifecycle rows；Title primary、excerpt secondary、Track/Section tertiary、event/date low weight。不要 Cards、tag pills、shadow、lift、CTA 或 raw maintenance modified date。
- Mobile 保留同一 Graph capability、same nodes / relations / Tracks；使用 portrait-specific reflow，不隐藏 Graph、不替换成普通 list、不要求页面横向滚动。
- 0 Public Notes 时只显示真实 empty state，不画 fake Graph / Track / Recent / CTA；1–2 Notes 使用真实节点，不放大节点或虚构 relation。
- 不为了让 Graph 看起来丰富而制造 Public Notes 或关系。

### 9.4 Projects

- Project = Full Object Card。
- 保留 static shadow、hover lift、stronger hover shadow。
- whole-card external destination 合法；arrow 是 cue，不增加重复 CTA。
- Tech Tags 是轻 bounded noninteractive annotation。
- Screenshot / visual evidence 是 Project identity evidence，不做 hover zoom。

---

## 10. Layout and navigation

### 10.1 Home

- Entry、Approach、Overview、Focus 是同一连续空间。
- 可以使用短暂 sticky stage，但不滚动劫持。
- 用户可快速滚过，也可直接进入目标星球。

### 10.2 Content

- Blog：Archive / Reading measure。
- Feed：单列 chronology。
- Learn：Knowledge Map + Recent Knowledge + Track browse + Public Note Reading。
- Projects：Project Object collection。
- Cream Gallery 共享留白、Warm Ink、restrained Hairline 与 Klein Blue interaction，不共享 universal width / radius / Card。

### 10.3 Navigation

- 全站提供 Blog、Feed、Learn、Projects 的普通文字入口；星图不是唯一导航方式。
- Top-level Content `返回星图` 返回 Home Star Map / Overview。
- Learn Track / Public Note 的 structural return target 是 Learn corpus。
- Finance 保持独立私密子站，不进入公开星图。

---

## 11. Do / Do Not

### Do

- 把 Home 当作真实、有纵深的星图空间。
- 总览展示完整星球，Focus 展示高细节局部。
- 统一星球光学规律，以地貌和材料区分板块。
- Content 保持安静、可读，只低剂量借用地质母题。
- 所有导航与关键 interaction 提供 keyboard / touch 路径。
- Home Cursor Meteor、Content Paw Trail / Click Feedback 保持低音量个人签名。

### Do Not

- 不恢复 Home 混合时间线、Recently、筛选、分页或 `/api/home`。
- 不把星球做成抽象节点、彩色分类圆球或五张产品卡片。
- 不让五颗星球围绕中心太阳建立等级秩序。
- 不做滚动劫持、强制影片或不可跳过长转场。
- 不自动循环旋转星图、主星或豹猫。HAS active / stable 卫星的低频公转是受限例外。
- 不让豹猫成为全站 mascot。
- 不在 Content 页面铺完整宇宙或 3D 飞行。
- 不恢复 Feed Native high-card / Footprint low-row hierarchy。
- 不把 Track 变成 Public Note parent、curriculum 或 progress container。
- 不让颜色成为类别 / state 的唯一表达。

---

## 12. Responsive and accessibility

| 范围 | Home | Content |
| --- | --- | --- |
| Mobile | 保留星图；减少粒子 / 景深；标签更清晰 | 单列、完整信息、触控友好 |
| Tablet | 调整星球位置 / 引线，降低视差 | Feed 仍单列；reading measure 自适应 |
| Desktop | 完整景深、自由星图、navigation index、Cursor Meteor | 完整 Cream Gallery layout |

Accessibility：

- 主要文本达到 WCAG AA；暗底非文本交互边界满足可见性要求。
- 星球是有名称的 focusable link / button，不是无语义 Canvas hot area。
- Hover information 有 focus / touch equivalent。
- State / category 不只靠颜色。
- About 展开管理焦点并在关闭后恢复。
- Reduced motion 关闭持续视差、pointer trail、豹猫 burst 与 HAS orbit；导航、内容和 state meaning 保留。
- 资源加载失败时保留可读文字导航。

---

## 13. Motion

| 类型 | 职责 | 允许 |
| --- | --- | --- |
| Scroll-driven | 推进同一星域远近关系 | 星点显影、星球尺度变化、阶段切换 |
| Parallax | 辅助纵深 | 远慢、中适中、前稍快 |
| Hover / Focus | 表达可进入性 | 标签清晰、rim、短脉冲 |
| Planet Push | 完成导航 | 短暂锁定目标、放大、进入页面 |
| HAS satellite | 表达最小活动状态 | active / stable 低频公转与 attention 减速 |
| About Cat | 可选彩蛋 | reveal、charge、burst、residue、recovery |
| Cursor Meteor | Home pointer signature | 短尾、快速衰减 |
| Content Paw Trail | Content movement signature | 低音量足迹、快速消退 |
| Content Click Feedback | Content click response | 克制 core / echo |

原则：

- 自然滚动优先，不修改滚轮方向、速度或惯性。
- 不做强制 snap 通关。
- 无输入时不形成全屏循环屏保。
- HAS active / stable 可沿圆 / 椭圆完整低频公转，但 orbit visual 低亮且不改变焦点。
- 页面转场不能长到让用户误以为卡住。
- Reduced motion 是完整替代路径，不只是缩短 duration。

---

## 14. Assets

### 14.1 Planet identity

每颗星球使用同一身份的三种用途：

| Slot | 用途 | 要求 |
| --- | --- | --- |
| Overview Full Sphere | Star Map | 完整球体、可辨主地貌 |
| Focus High Detail | Focus / Push | 高分辨率细节、大气、阴影；与 Overview 无换图感 |
| Mobile Optimized | Mobile | 保留轮廓和主地貌，降低成本 |

`docs/design/assets/planets/selected/` 中的 selected identity 是当前设计基线：

- Overview / Focus / Mobile 保持同一 master identity 和主地貌连续性。
- 无授权不得用“相似星球”或历史候选替换。
- 改变星球 identity / 地貌 / 系列属于 Design change。
- 性能、preload/lazy、density、CDN 等属于实现策略，不改变 identity contract。

资产验收：

- 光源方向一致；
- 暖性地质校色一致；
- Overview / Focus 同一材料体系；
- 边缘无明显锯齿、halo 或重复 AI texture；
- Focus 细节达到可信天体材质水平。

### 14.2 Space materials

- 星点分 far / mid / near 三层，密度克制。
- Dust 只帮助显影、transition 和豹猫事件，不持续覆盖全屏。
- Route line 极细、低透明、不完整，不形成 HUD。
- Pixelation 只用于远景显影 / signal moment，不永久覆盖星球。

### 14.3 Content imagery

- Content 图片没有 universal radius obligation。
- 正文图像不做强烈宇宙着色。
- 地质 texture 用于 header、cover、divider 或细节，不作为整页背景。
- Finance 图表不复用暖性地质 texture。

### 14.4 Performance principle

- Entry 优先加载远景和必要导航，不同时加载五颗星球全部 high-detail assets。
- Overview 使用优化后的 full-sphere assets；Focus 准备对应 high-detail identity。
- Mobile 减少粒子、blur layers 和图片成本，但保留 Star Map。
- Asset failure 不能破坏导航；文字标签和普通 link 始终可用。

---

## 15. Canonical summary

Home 是一片连续、可导航的暖性地质星域：从远处星点接近完整星球，经 Overview 与 Focus 进入真实功能页面；About 通过直接主路径和豹猫彩蛋进入同一信息态。

Content 保持 Cream Gallery 下不同产品身份：Blog editorial reading、Feed Quiet Deposition、Learn Knowledge Structure + Reading、Projects Full Object Card。Home 使用 Cursor Meteor；Content 使用 Paw Trail + independent Click Feedback；Finance 不继承二者。
