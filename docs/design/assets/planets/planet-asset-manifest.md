# Phase 4.3 Planet Asset Manifest

> 状态：五颗星球的 `Overview / Focus / Mobile` 同源资产槽已闭合；当前生产母版位于 `source/`，三档 WebP 由同一母版可复现导出。
>
> 边界：这是 Phase 4.3 设计资产选择，不代表 `src/pages` 已接入，也不代表 Phase 5 的最终 2x / CDN 交付规格已经完成。

## 1. 选择结论

五颗星球采用同一次系列生成与统一后处理得到的母版。共同规则为：上左主光、暖性地质主体、冷阴影、低饱和蓝灰水体，以及只出现在阴影侧边缘的克制 Klein Blue 光学 rim。每颗星球的 Focus 与 Mobile 均从其已选 Overview 母版派生，因此不存在重新生成导致的换球问题。

| Planet | Overview 身份 | Focus 有效细节 | Mobile 保留项 | 结论 |
| --- | --- | --- | --- | --- |
| About | 安静浅色岩原、封闭蓝灰盆地、低修辞环状沉积 | 盆地边缘、柔和侵蚀面与细颗粒矿物层 | 浅岩轮廓和三处主要盆地 | Pass |
| Blog | 大尺度风化层状岩、沉积台地与盆地出口 | 清楚的层理、侵蚀断面和沉积流向 | 波状层理与主盆地 | Pass |
| Feed | 方向明确的低洼河谷、分汊沉积流 | 多级河道、冲刷边缘和时间流向 | 中央分汊河谷 | Pass |
| Learn | 深切地质断层、逐层显露的矿脉关系 | 断层壁、交错切面和深层材料 | 主断层的 S 型走向 | Pass |
| Projects | 自然地表上的人工切割台地与嵌入线 | 中央台地、切割边界和少量几何构造 | 中央环形台地和三条结构线 | Pass |

## 2. Selected Slots

统一格式为带 alpha 的 WebP、sRGB 工作流。Overview 保留母版尺寸；Focus 从同一母版裁切，不上采样；Mobile 使用 Lanczos 缩小并降低有损质量以控制成本。

| Planet | Role | Source | Selected file | Dimensions | Bytes |
| --- | --- | --- | --- | ---: | ---: |
| About | Overview | `source/about-overview.png` | `selected/planet-about-overview.webp` | 1254×1254 | 389,518 |
| About | Focus | About Overview master crop | `selected/planet-about-focus.webp` | 1120×840 | 354,312 |
| About | Mobile | About Overview master resize | `selected/planet-about-mobile.webp` | 640×640 | 104,614 |
| Blog | Overview | `source/blog-overview.png` | `selected/planet-blog-overview.webp` | 1254×1254 | 405,690 |
| Blog | Focus | Blog Overview master crop | `selected/planet-blog-focus.webp` | 1120×840 | 344,894 |
| Blog | Mobile | Blog Overview master resize | `selected/planet-blog-mobile.webp` | 640×640 | 108,006 |
| Feed | Overview | `source/feed-overview.png` | `selected/planet-feed-overview.webp` | 1254×1254 | 270,350 |
| Feed | Focus | Feed Overview master crop | `selected/planet-feed-focus.webp` | 1120×840 | 235,054 |
| Feed | Mobile | Feed Overview master resize | `selected/planet-feed-mobile.webp` | 640×640 | 75,890 |
| Learn | Overview | `source/learn-overview.png` | `selected/planet-learn-overview.webp` | 1254×1254 | 421,768 |
| Learn | Focus | Learn Overview master crop | `selected/planet-learn-focus.webp` | 1120×840 | 373,052 |
| Learn | Mobile | Learn Overview master resize | `selected/planet-learn-mobile.webp` | 640×640 | 109,956 |
| Projects | Overview | `source/projects-overview.png` | `selected/planet-projects-overview.webp` | 1254×1254 | 375,382 |
| Projects | Focus | Projects Overview master crop | `selected/planet-projects-focus.webp` | 1120×840 | 340,166 |
| Projects | Mobile | Projects Overview master resize | `selected/planet-projects-mobile.webp` | 640×640 | 104,030 |

合计 15 个 selected assets，4,012,682 bytes：Overview 1,862,708 bytes、Focus 1,647,478 bytes、Mobile 502,496 bytes。移动端不需要加载 1254px Overview 或 Focus。

## 3. 十四项验收矩阵

`P` = pass；`L` = pass with known limitation。矩阵编号与 Phase 4.3 任务的十四项资产标准一致。

| Planet | 1 身份 | 2 宇宙 | 3 主光 | 4 冷影 | 5 Klein | 6 小尺寸 | 7 Desktop | 8 Mobile | 9 连续性 | 10 Focus | 11 Alpha | 12 CSS 光学 | 13 格式成本 | 14 伪影 | Score |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | ---: |
| About | P | P | P | P | P | P | P | P | P | P | P | P | L | P | 14/14 |
| Blog | P | P | P | P | P | P | P | P | P | P | P | P | L | P | 14/14 |
| Feed | P | P | P | P | P | P | P | P | P | P | P | P | L | P | 14/14 |
| Learn | P | P | P | P | P | P | P | P | P | P | P | P | L | P | 14/14 |
| Projects | P | P | P | P | P | P | P | P | P | P | P | P | L | P | 14/14 |

已知限制仅位于第 13 项：当前 1254px Overview 母版足以完成 Phase 4.3 身份、裁切和 1x 视觉验证，但不应被误写为未来大屏 2x 最终交付源。Phase 5 正式接入时需依据实际 CSS 显示上限决定是否重渲染 2x master；这不重新打开五颗星球的身份设计。

## 4. 连续性与边缘证据

- Overview：全部为 1254×1254 完整球体；四角 alpha 均为 0。
- Focus：全部从对应 Overview 以固定 1120×840 裁切派生，保留同一光向、地貌和边缘；没有二次生成或相似星球替换。
- Mobile：全部从对应 Overview 缩小为 640×640，保留主地貌，降低高频纹理与文件体积。
- 深空合成：在 `#0A0A0C` 上检查 1366×768 和 390×844 的轮廓、主地貌与色温，未见背景色 fringe、压缩 halo 或四角残留。
- 可复现脚本：`derive-variants.py` 负责同源裁切和移动端派生，`audit-assets.py` 负责尺寸、alpha 边界和两档资产合成证据。
- 合成证据：`docs/design/qa/evidence/phase4-3-planet-series-1366x768.png` 与 `phase4-3-planet-series-390x844.png`。两张图仅验证资产，不是生产 Home 截图。

## 5. 淘汰候选

Phase 4.2 的 `docs/design/prototypes/phase4-2/assets/planets/*.webp` 保留为原型历史证据，不进入 selected slot：

| Candidate | 淘汰原因 |
| --- | --- |
| `about.webp` | 表面存在多处放射状生成痕迹，安静浅岩身份不稳定；大尺寸边缘偏白。 |
| `blog.webp` | 层理可读，但整体偏单色砂黄，与其余候选的材质层级和冷影不够统一。 |
| `feed.webp` | 流向存在但水系与地貌的层级不足，亮面偏黄白，Focus 放大后有效细节有限。 |
| `learn.webp` | 断层语义偏弱，主要读成普通裂纹岩球；小尺寸辨识度不足。 |
| `projects.webp` | 人工切割存在，但蓝灰补片和金色缝线更像装饰修补，容易滑向游戏道具。 |

## 6. 来源与处理

- 视觉规范：`docs/design/prototypes/phase4-2/planet-asset-prompt-kit-v2.md`。
- 当前母版：`source/*.png`；以完整 RGBA 画布保留用户提供的构图和 alpha。
- 资产导出：`scripts/export-planet-webp.mjs` 使用 Sharp，将母版受控放大至 1254px，再以既定裁切框派生 Focus、以 Lanczos 缩小派生 Mobile。
- 资产派生：Focus / Mobile 均从对应的新 Overview 母版导出，不从 `docs/design/reference-design/` 复制未确认素材。
- 接入边界：selected assets 位于设计资产目录，不写入 `src/assets/`；正式页面与加载策略属于 Phase 5。
