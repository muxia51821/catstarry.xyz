# Phase 4.2 — Cinematic Star Map calibration prototype

> 一次性隔离原型。它不属于生产路由，不读取 API，也不引用或修改 `src/styles/`。

## 运行

```powershell
python -m http.server 4172 --directory docs/design/prototypes/phase4-2
```

打开：

```text
http://localhost:4172/?variant=orbit&mock=mixed
```

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
| `camera` | 旅行距离、阶段阈值、视差、Focus 相机推进。 |
| `environment` | 深空背景光、暖性星尘、三层星域透明度与尺度。 |
| `meteor` | 三层首屏流星，以及移植自旧 About 原型的 Canvas 光标流星轨迹。 |
| `satellite` | 三态卫星尺度、亮度、局部运动、粒子、指针视差和一次响应。 |
| `planet.depthScale` | 五颗星球的语义纵深倍率，不改变板块优先级。 |
| `planet.materials` | 五颗预渲染资产路径、对比度、饱和度和 Overview / Focus 材质倍率。 |
| `planet.lighting` | 终止线、单侧大气边缘和软投影。 |
| `aboutCompanion` | About 豹猫 companion 的相对位置、远景 LOD、显影和视差。 |
| `transition` | Focus、action、豹猫、微交互的全部主要时长。 |
| `layout` | Orbit / Drift 的相机原点与五颗星球位置。 |

校准这些值不需要改 `index.html` 的交互逻辑。

## 验收顺序

1. 从 Entry 正常滚动：在约 2–3 个视口的自然旅行内抵达同一片星域；不应有滚动劫持。
2. 用 `Orbit` 与 `Drift` 比较受控构图。五颗完整球体保持稳定语义区域；About 位于右上远端，且不是最大主星。
3. hover 或 Tab 聚焦 Blog / Feed / Learn / Projects：标签增强，且对应 `active` / `stable` 伴星只回应一次。其低频运动应是长时间静止后的短弧移动；`dormant` 完全静止。
4. 依次切换四个 mock：`unavailable` 必须同时隐藏四颗活动卫星，不能把它们猜成 dormant。
5. 点击任一星球：先进入该星球 Focus，只看近景材质、标题和 action；不加载 Feed、Blog、Projects 或 Learn 内容。当前点击路径已存在，自然滚动的 `About → Feed → Blog → Projects → Learn` Focus 序列仍待本轮补充验证。
6. 在非 About Focus 点击 `ENTER`：只模拟约 760ms 的路由推进，绝不跳转生产路由；点击“返回星图”或按 Esc 回到原位置。
7. 点击 About：进入唯一的 Home 原地展开态；About 不显示通用 `ENTER` 路由按钮。
8. 在 About 邻近区域操作 companion：总览先读成低音量 Klein Blue 小天体；进入引力范围后再显出豹猫。第一次点击蓄能，第二次点击局部爆开后进入相同 About Focus；关闭后回收重组。
9. 检查三层首屏流星的方向、长度与远近，以及 Canvas 鼠标流星尾的头部辉光、渐变拖尾和碎屑。
10. 在浏览器启用 `prefers-reduced-motion`，或用触控设备访问：导航和 About 必须仍可用；视差、尾迹、流星、连续卫星漂移与爆开均应静止/瞬时降级。

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

Phase 4.2 必须确认五颗 Overview 的视觉身份，并验证 Overview / Focus / Mobile 看起来是同一物理星球；不要求在本阶段完成最终生产分辨率、批量渲染与响应式压缩。只要保持 `visual-parameters.js` 中的集中资产槽，候选图可按相同文件名替换，或只修改资产路径，不需要重写交互逻辑。

## 当前关键数值

- 自然滚动旅行：Orbit `400vh` / Drift `430vh` / Mobile `350vh`。
- Focus 进入 / 退出：`980ms / 720ms`；action preview：`760ms`。
- HAS 伴星周期：active `24s`、stable `32s`；只有末尾 `18% / 12%` 时间执行短弧移动；dormant 静止。
- 豹猫：蓄能 `3800ms`、爆开 `1140ms`、回收 `2750ms`。
- 三层首屏流星：`5–6.6s`、`330–760px`；Cursor Meteor 最多 `45` 个轨迹点。

## 已知且有意的范围

- 当前行星是 Phase 4.2 可替换占位；它们只能验证接入、尺度和空间关系，视觉身份尚未通过。
- `Star Map → Planet Focus → action` 已由 Design 2.1 极小重锁转为正式交互；自然滚动 Focus 序列与直接跳转路径仍需在隔离原型中校准。
- Drift 是主构图方向；About 保持右上远端，Feed 保持最容易接近，Blog / Projects / Learn 分别稳定在左上 / 左下 / 右下语义区域。允许区域内人工微调，不做运行时随机换位。
- 未接入 `activity-signals.json`、Worker、R2、D1、KV 或任何生产数据链路。
- `prototype-verdict.md` 在木下完成目测验收后更新；当前旧 verdict 不再代表 HAS 重锁后的结论。
