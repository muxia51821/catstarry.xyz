# Phase 4.2 — Star Map / Focus / HAS calibration verdict

> 状态：木下目测验收完成；Phase 4.2 可关闭。
> 日期：2026-07-20
> 范围：隔离 HTML 原型；不代表生产实现或最终星球资产。

## 已完成的结构性验证

| 项目 | 状态 | 说明 |
| --- | --- | --- |
| 生产边界 | 通过 | 原型只位于本目录；不 import canonical CSS，不读 API，不跳转生产路由。 |
| HAS mock | 通过 | `mock-activity-states.js` 提供 `mixed`、`quiet`、`rotation`、`unavailable`；About 不在数据模型中。 |
| HAS 缺失投影 | 通过 | `unavailable` 场景隐藏全部四颗活动卫星，而不是显示 dormant。 |
| 行星资产接入 | 占位通过 / 最终资产后置 | 五颗透明 WebP 已接入集中资产槽，并可连续用于 Overview 与 Focus；当前五颗继续作为可替换占位，不作为最终视觉资产。 |
| 语义布局 | 通过 | Drift 默认打开；About 右上远端并降低有效尺度，Feed 位于中右近景且有效尺度最高，Blog 左上、Projects 左下、Learn 右下。Orbit 只作对照。 |
| 五星原地显现 | 通过 | 五颗星从 Entry 起就在各自最终语义区域内作为远端目标星出现，并依次经历光晕、微小天体和完整球体；没有共同中心散开。 |
| 深空星域 | 通过 | 三层 Canvas 星域使用固定 seed、非均匀星团与暗区；只响应滚动视差，不持续自动运动，移动端降低密度。 |
| 信号卫星语义 | 通过 | `active / stable / dormant` 与 `unavailable` mock 的状态、隐藏、触控静止、reduced-motion 和屏幕阅读器描述已接入；椭圆公转、前后遮挡、hover 减速与低频 pulse 已验证。 |
| About 豹猫星座 | 通过 | 豹猫仅在 About 自身可交互后启用；Rest / Reveal / Charged 使用同一 28 节点、六段轮廓与采样粒子。两阶段路径、触控单击、节点爆开、Focus 残粒与回收已验收。 |
| 单星 Focus | 通过 | 自然滚动按 `About → Feed → Blog → Projects → Learn` 进入五个独立构图 Focus；星图点击和侧边索引可直接跳转。每个 Focus 仅显示近景空间窗口、标题、1–3 条原型事实与 action。 |
| Focus Hold / Handoff | 通过 | 每个 Focus 步长前 `72%` 保持稳定，后 `28%` 与下一镜头共享交接；两个永久槽位直接由滚动位置驱动，不创建临时克隆、监听器或持续 RAF 追赶。桌面单段已校准到 `144vh`；Overview → About 与 Learn → Footer 单独处理。 |
| 路由推进 | 通过结构检查 | 非 About Focus 的 action 只模拟短 Planet Push，不建立真实路由或内容页。 |
| About 双路径 | 结构通过 / 回归通过 | 总览直接点击 About、自然滚动进入 About Focus、桌面豹猫两次独立点击、触控豹猫单击爆开后都进入同一个 Home 原地内容态；不使用浏览器 `dblclick`，也不再存在 `OPEN ABOUT` 二级状态。About 内只保留“返回星图”，之后仍可继续原生滚动到 Feed；Esc、reduced-motion 与豹猫回收路径均纳入回归。 |
| 流星系统 | 通过 | 首屏为三层长轨迹；光标尾迹移植旧 About Canvas 的跟随、辉光、渐变拖尾与碎屑机制，并改为 Klein Blue。 |
| 参数集中化 | 通过结构检查 | 相机、流星、卫星、星球尺度和转场时长集中在 `visual-parameters.js`。 |
| reduced-motion | 行为通过 / 回归通过 | 直接呈现完整可读的静态星图；流星、尾迹、视差、HAS 持续漂移与豹猫过程动画均降级，导航与 About 保留。 |

## 木下目测验收覆盖的参数

| 参数 | 当前原型值 | 需要判断 |
| --- | ---: | --- |
| 入口到星图旅行 | Orbit `400vh` / Drift `430vh` / Mobile `350vh` | 远景是否足够安静；总览是否仍在约 2–3 个视口内到达。 |
| Focus 滚动段 | overview hold `45vh` / overview handoff `54vh` / desktop step `144vh` / mobile step `126vh` / release `35vh` | 每颗 Focus 是否能稳定停留，切换是否过快，总流程是否过长。 |
| Focus 共享交接 | hold ratio `.72` / handoff `.28` | 前景退出和下一镜头进入是否同场自然发生；快速与反向滚动是否仍确定且无残影。 |
| 远 / 中 / 近视差 | `.012 / .032 / .06` | 是否存在空间感而不晕动。 |
| Focus 进入 / 退出 | `1100ms / 800ms` | 近景建立是否有尺度感，返回是否拖沓。 |
| Focus action / Planet Push | `600ms` | 是否够短、清楚且不被认为页面卡住。 |
| 信号卫星低频周期 | active `24s` / stable `32s` | 椭圆公转、前后遮挡、低频 pulse 和 hover 减速是否像伴星，不像未读点或显眼循环。 |
| 豹猫蓄能 | `3800ms` | 第一次点击是否有足够的发现感和空间感。 |
| 豹猫爆开到展开 | `1140ms` | 扩大的局部尘埃是否像彩蛋、但不遮挡 About。 |
| 豹猫关闭回收 | `2750ms` | 慢速回收是否连贯而不拖沓。 |
| 三层首屏流星 | `5–6.6s / 330–760px` | 方向、远近、尺度和 Klein Blue 长尾是否成立。 |
| Canvas Cursor Meteor | `45` 个轨迹点 | 是否保留成熟的流星感且不遮挡标签。 |

## 明确后置到 Phase 4.3 的事

- 五颗星球资产的统一调整、Overview / Focus / Mobile 身份确认；当前五张图继续作为可替换占位。
- 选定原型组件样式、校准参数与最终资产接口落回 canonical CSS。
- CJK、keyboard、touch、reduced-motion、性能与视觉一致性质检。
- 真正的生产路由切换、真实 HAS 静态投影、Worker/R2/D1/KV 数据链路。
- Phase 5 的生产组件、路由与数据实现。

## 木下验收结论

1. Drift Star Map、Entry / Approach / Overview、Star Map → Focus → action 通过。
2. 默认 Focus 序列、点击与侧边索引跳转、返回与 footer release 通过。
3. HAS 四种 mock、椭圆公转、遮挡、hover 响应、触控与 reduced-motion 通过。
4. About 直接路径与豹猫星座两阶段路径、触控单击、节点爆开、Focus 残粒与回收通过。
5. Orbit 对照、1366×768、390×844、回归脚本与控制台检查通过。
6. 五颗星球当前资产继续作为可替换占位；星球资产统一调整与 Overview / Focus / Mobile 身份确认后置 Phase 4.3。

本 verdict 支持流程治理登记 Phase 4.2 完成，并启动 Phase 4.3。
