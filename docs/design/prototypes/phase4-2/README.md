# Phase 4.2 — Cinematic Star Map calibration prototype

> 一次性隔离原型。它不属于生产路由，不读取 API，也不引用或修改 `src/styles/`。

## 运行

```powershell
python -m http.server 4172 --directory docs/design/prototypes/phase4-2
```

打开：

```text
http://localhost:4172/?variant=drift&mock=mixed
```

## 行为回归

原型在已开启 Chrome DevTools Protocol（`127.0.0.1:9227`）且本地 server 运行时，可执行：

```powershell
node docs/design/prototypes/phase4-2/behavior-regression.mjs
```

它检查四个 mock、桌面两阶段点击、蓄能超时与滚动取消、豹猫回收、触控单击 burst → About、reduced-motion 直接路径、`unavailable` 隐藏和控制台错误。它不判断 HAS 或豹猫的视觉质量。

Learn 星球命中与 Focus 路径可单独检查：

```powershell
node docs/design/prototypes/phase4-2/learn-focus-regression.mjs
```

它以真实鼠标坐标验证 Learn 的 ready、命中元素和直接进入 Focus，并覆盖侧边 LEARN、自然滚动、返回星图与 footer-release。

## URL 校准面

| 参数 | 值 | 验证内容 |
| --- | --- | --- |
| `variant` | `orbit` / `drift` | `drift` 是 Design 2.1 主构图方向；`orbit` 只保留为布局对照，不是同等候选。 |
| `mock` | `mixed` / `quiet` / `rotation` / `unavailable` | HAS 三态卫星或无投影时的整体隐藏。 |

`mock-activity-states.js` 是唯一活动状态来源。它没有时间戳、标题、数量、摘要、fetch 或生产地址；About 永远不在该结构内。

## 集中视觉参数

所有主要动画与尺度参数集中在：

```text
docs/design/prototypes/phase4-2/visual-parameters.js
```

| 参数组 | 负责内容 |
| --- | --- |
| `camera` | 入口到星图的旅行距离、阶段阈值、视差，以及默认 Focus 顺序、Hold / Handoff、单星滚动步长和页脚释放距离。 |
| `environment` | 深空背景光、暖性星尘，以及可复现的三层星域密度、亮度、星团和暗区。 |
| `meteor` | 三层首屏流星，以及移植自旧 About 原型的 Canvas 光标流星轨迹。 |
| `satellite` | 三态卫星尺度、亮度、局部运动、粒子、指针视差和一次响应。 |
| `planet.depthScale` | 五颗星球的语义纵深倍率，不改变板块优先级。 |
| `planet.emergence` | 五颗远端目标星在各自最终语义区域内转为完整星球的时序、光晕、色温和纵深差。 |
| `planet.focusShots` | 五个 Focus 的独立镜头位置、尺度、裁切、进退方向和文字构图；包含移动端覆盖值。 |
| `planet.materials` | 五颗预渲染资产路径、对比度、饱和度和 Overview / Focus 材质倍率。 |
| `planet.lighting` | 终止线、单侧大气边缘和软投影。 |
| `aboutCompanion` | About 豹猫星座的相对位置、节点、爆开、残粒、显影和视差。 |
| `transition` | Focus、action、豹猫、微交互的全部主要时长。 |
| `layout` | Orbit / Drift 的相机原点与五颗星球位置。 |

校准这些值不需要改 `index.html` 的交互逻辑。

## 验收顺序

1. 从 Entry 正常滚动：五个远端目标星应从一开始就在最终语义区域内，以 `目标星 → 光晕 → 微小天体 → 完整球体` 的顺序原地显现；不应从共同中心散开，也不应有滚动劫持。
2. 用 `Orbit` 与 `Drift` 比较受控构图。五颗完整球体保持稳定语义区域；About 位于右上远端，且不是最大主星。
3. hover 或 Tab 聚焦 Blog / Feed / Learn / Projects：标签增强，且对应 `active` / `stable` 信号卫星保持克制的椭圆公转、减速与光学响应；`dormant` 完全静止。活动状态以仅屏幕阅读器可见的描述关联到对应星球，不在星图中增加状态文字。
4. 依次切换四个 mock：`unavailable` 必须同时隐藏四颗活动卫星，不能把它们猜成 dormant。
5. 从 Star Map 继续自然滚动：依次进入 `About → Feed → Blog → Projects → Learn` 的单星 Focus。检查每个镜头是否不同、文字是否是主体、星球是否只作为空间窗口；每个 Focus 仅有标题、1–3 条原型事实和 action，不加载板块内容。About 是例外：它直接显示同一 Home 原地内容态，只保留“返回星图”。
6. 慢速、快速和反向滚过两个相邻 Focus：前一镜头应先稳定停留，在共享 Handoff 区间中退场，下一镜头同时进入；不应出现突然换球、空白帧、残留副本或持续追赶滚动位置的动画。
7. 从 Star Map 点击任一星球，或用侧边航行索引选择任一名称：直接进入目标 Focus，不必经过前序星球。
8. 在非 About Focus 点击 `ENTER`：只模拟约 600ms 的路由推进，绝不跳转生产路由；点击“返回星图”或按 Esc 回到总览。
9. 从总览直接点击 About、自然滚动到 About Focus，或完成豹猫彩蛋：都直接进入同一个 Home 原地内容态；不再存在 `OPEN ABOUT` 的二级步骤。
10. 在 About 邻近区域操作豹猫星座：Rest 仅保留低音量节点与断续轮廓，进入引力范围后显出完整侧面行走豹猫。桌面使用两次独立点击：第一次蓄能，第二次节点与轮廓采样粒子爆开后进入相同 About 展开态；这不是浏览器 `dblclick`。触控端单击直接爆开后进入 About；关闭后沿用节点、连线、轮廓的回收逻辑。
11. 检查三层首屏流星的方向、长度与远近，以及 Canvas 鼠标流星尾的头部辉光、渐变拖尾和碎屑。
12. 在浏览器启用 `prefers-reduced-motion`，或用触控设备访问：应直接得到完整、可读、可点击的静态星图；触控端 HAS 停止持续公转与尘埃漂移，reduced-motion 下信标与豹猫均取消过程动画。触控豹猫直接进入 About，reduced-motion 下豹猫也直接进入 About；所有主路径仍可用。

## 预渲染行星资产

五颗透明 WebP 位于：

```text
docs/design/prototypes/phase4-2/assets/planets/
```

当前五张图片只承担可热替换的校准占位：共享左上主光、暖性地质基底与克制大气感，并尝试区分 About 浅岩、Blog 层状沉积、Feed 河谷冲刷、Projects 切割台地、Learn 断层矿脉。同一占位资产暂时连续用于 Overview 和 Focus；CSS 地质渐变只作为加载失败占位。

这些资产由内置 `imagegen` 生成并经透明背景、1536px WebP 优化，仅用于 Phase 4.2 结构、尺度与替换链路验证。它们尚未通过五颗星球视觉身份 Gate，不自动成为最终生产资产。五张文件合计约 1.85 MB。

新候选资产使用：

```text
docs/design/prototypes/phase4-2/planet-asset-prompt-kit-v2.md
```

Phase 4.2 只验证五颗可替换占位的接入、尺度、裁切和接口连续性；最终 Overview / Focus / Mobile 身份确认属于 Phase 4.3。Phase 4.3 已完成同系列 selected assets 与 manifest，见 `docs/design/assets/planets/planet-asset-manifest.md`。本目录旧图继续保留为原型历史证据，不自动升级为 selected assets。

## 当前关键数值

- 入口到星图的相机基线：Orbit `400vh` / Drift `430vh` / Mobile `350vh`；该值保留木下手调结果，不含后续 Focus 段。
- Focus 序列：总览停留 `45vh`；Overview → About 交接为桌面 `54vh` / 移动端 `42vh`；每颗桌面 `144vh` / 移动端 `126vh`；每步前 `72%` 为稳定 Hold，后 `28%` 为共享 Handoff；最后释放到页脚 `35vh`。因此 Drift 桌面原型总高度为 `1284vh`。在 `1440×900` 检查中，每个桌面 Focus 段为 `1296px`，其中约 `933px` 为 Hold、`363px` 为 Handoff。
- Focus 进入 / 退出：`1100ms / 800ms`；action preview：`600ms`。
- Star Emergence / 星域本轮校准：目标星不透明度 `0.70`、标签起点 `.68`、光晕强度 `.50`；固定 seed 三层星场密度为远 / 中 / 近 `720 / 255 / 60` 每百万像素。密度、seed、星团和暗区属于运行时原型参数，不是生产 Token。
- HAS 卫星周期：active `28s`、stable `36s`；以完整椭圆轨道公转、前后遮挡、低频 pulse 和 hover 减速表达状态；dormant 静止。仅在 fine pointer 且未启用 reduced-motion 时运行；触控端保留静态三态材质。
- 豹猫：蓄能 `3800ms`、爆开 `1140ms`、回收 `2750ms`。
- 三层首屏流星：`5–6.6s`、`330–760px`；Cursor Meteor 最多 `45` 个轨迹点。

## 已知且有意的范围

- 当前行星是 Phase 4.2 可替换占位；它们只能验证接入、尺度和空间关系，视觉身份尚未通过。
- `Star Map → Planet Focus → action` 已由 Design 2.1 极小重锁转为正式交互；自然滚动 Focus 序列、侧边索引直接跳转与星图点击路径已接入并通过木下 Phase 4.2 目测验收。
- Focus 自然滚动使用原生、位置驱动的直接 scrub 计算，不依赖 GSAP，也不创建 ScrollTrigger；两个永久镜头槽位承担全部 Handoff，不在滚动中创建临时节点、监听器或追帧动画。
- 三层星域由固定 seed 生成，同一视口与参数下可复现；星团、暗区和移动端密度均由 `environment.starfield` 集中控制。
- Drift 是主构图方向；About 保持右上远端，Feed 保持最容易接近，Blog / Projects / Learn 分别稳定在左上 / 左下 / 右下语义区域。允许区域内人工微调，不做运行时随机换位。
- 未接入 `activity-signals.json`、Worker、R2、D1、KV 或任何生产数据链路。
- HAS 与豹猫的行为可靠性、信标材质基线、节点爆开结构和主要视觉状态已经完成 Phase 4.2 目测验收；它们仍不是生产组件，也不授权真实 HAS 数据接入。
- `prototype-verdict.md` 记录 Phase 4.2 验收事实；Phase 4.3 只把适合 CSS 的视觉接口落回 canonical styles，不把轨道相位、pulse 调度或节点物理迁入 CSS。
