# Phase 4.2 — Star Map / Focus / HAS calibration verdict

> 状态：等待木下目测验收。  
> 日期：2026-07-18  
> 范围：隔离 HTML 原型；不代表生产实现或最终星球资产。

## 已完成的结构性验证

| 项目 | 状态 | 说明 |
| --- | --- | --- |
| 生产边界 | 通过 | 原型只位于本目录；不 import canonical CSS，不读 API，不跳转生产路由。 |
| HAS mock | 通过 | `mock-activity-states.js` 提供 `mixed`、`quiet`、`rotation`、`unavailable`；About 不在数据模型中。 |
| HAS 缺失投影 | 通过 | `unavailable` 场景隐藏全部四颗活动卫星，而不是显示 dormant。 |
| 行星资产接入 | 结构通过 / 视觉未通过 | 五颗透明 WebP 已接入集中资产槽，并可连续用于 Overview 与 Focus；木下判断当前五颗基本不合格，只能保留为可替换占位。 |
| 语义布局 | 方向已锁 / 待校准 | Drift 已选为主构图，About 右上远端、Feed 最易接近、Blog 左上、Projects 左下、Learn 右下；当前具体坐标与尺度仍未完全达到该关系。Orbit 只作对照。 |
| 信号卫星语义 | 待目测 | 伴星具有明暗面、局部轨道、稀疏尘埃、指针视差和一次响应；active / stable 长静止后短弧移动，dormant 静止。 |
| About companion | 待目测 | Klein Blue 伴星与豹猫合并为同一个个人 companion；位置由 About 星球实际尺寸与相对半径参数计算。 |
| 单星 Focus | 部分结构通过 | 点击可从 Star Map 进入任一 Focus，并显示近景、标题和 action；自然滚动的 `About → Feed → Blog → Projects → Learn` Focus 序列尚未实现。 |
| 路由推进 | 通过结构检查 | 非 About Focus 的 action 只模拟短 Planet Push，不建立真实路由或内容页。 |
| About 双路径 | 待目测 | 直接点击与豹猫两次点击均进入同一 About 展开路径；About 不泛化为功能星球路由。自然滚动进入 About Focus 后的明确 action 仍待校准。 |
| 流星系统 | 待目测 | 首屏为三层长轨迹；光标尾迹移植旧 About Canvas 的跟随、辉光、渐变拖尾与碎屑机制，并改为 Klein Blue。 |
| 参数集中化 | 通过结构检查 | 相机、流星、卫星、星球尺度和转场时长集中在 `visual-parameters.js`。 |
| reduced-motion | 通过结构检查 | 流星、尾迹、视差、连续卫星漂移与爆开均降级；导航与 About 保留。 |

## 待木下校准的参数

| 参数 | 当前原型值 | 需要判断 |
| --- | ---: | --- |
| 自然滚动旅行 | Orbit `400vh` / Drift `430vh` | 远景是否足够安静；总览是否仍在约 2–3 个视口内到达。 |
| 远 / 中 / 近视差 | `.012 / .032 / .06` | 是否存在空间感而不晕动。 |
| Focus 进入 / 退出 | `980ms / 720ms` | 近景建立是否有尺度感，返回是否拖沓。 |
| Focus action / Planet Push | `760ms` | 是否够短、清楚且不被认为页面卡住。 |
| 信号卫星低频周期 | active `24s` / stable `32s` | 长静止 + 短弧移动是否像伴星，不像未读点或显眼循环。 |
| 豹猫蓄能 | `3800ms` | 第一次点击是否有足够的发现感和空间感。 |
| 豹猫爆开到展开 | `1140ms` | 扩大的局部尘埃是否像彩蛋、但不遮挡 About。 |
| 豹猫关闭回收 | `2750ms` | 慢速回收是否连贯而不拖沓。 |
| 三层首屏流星 | `5–6.6s / 330–760px` | 方向、远近、尺度和 Klein Blue 长尾是否成立。 |
| Canvas Cursor Meteor | `45` 个轨迹点 | 是否保留成熟的流星感且不遮挡标签。 |

## 尚未通过、也不应伪装为已通过的事

- 五颗原型行星资产是否已达到可用于继续校准的真实度；它们仍不是最终生产资产。
- 自然滚动是否能按默认顺序稳定进入五个 Focus，同时保留点击、键盘和航行索引的直接跳转。
- Drift 当前坐标、尺度与 companion 偏移是否真正实现 About 右上远端、Feed 最易接近的空间关系。
- 触控设备上的豹猫彩蛋是否保留双击，或退化为仅 About 直接展开。
- 真正的生产路由切换、真实 HAS 静态投影、Worker/R2/D1/KV 数据链路。
- Phase 4.3 的 canonical CSS 或生产组件落地。

## 木下验收后需要给出的结论

1. 校准 Drift 的具体坐标、深度尺度、标签位置与 companion 相对偏移；Orbit 只提供对照证据。
2. 补齐并验收默认滚动 Focus 序列，以及点击、键盘和航行索引的直接跳转与返回。
3. 使用 `planet-asset-prompt-kit-v2.md` 重做并确认五颗 Overview 身份，再验证 Overview / Focus / Mobile 连续性；最终生产导出可后置。
4. 确认 / 调整 Focus、Planet Push、豹猫和流星的时长。
5. 专项梳理四颗 HAS 信号卫星与 About 豹猫 companion：先在 Phase 4.2 验证视觉身份、状态和交互，Phase 4.3 只负责把已通过方案组件化。
6. 确认移动端要保留或移除豹猫双击彩蛋。

只有上述结论明确后，才可由流程治理决定是否进入 Phase 4.3。
