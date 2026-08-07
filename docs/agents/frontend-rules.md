# Phase 5 前端施工规则

> 状态：**原型已验证，Phase 5 仅可微调非核心参数。**
>
> 用途：所有 Phase 5 前端开发线程在写页面、组件、样式或交互前必须阅读本文件。它把已锁定的设计契约转为施工约束；不替代 PRD、ADR、验收清单或架构文档。

## 1. 权威来源与适用范围

执行时按职责区分事实来源：

1. `AGENTS.md`：全局权限、行为和 Git 规则；
2. `docs/workflow-orchestration.md`：Phase 顺序、执行调度和 F 先行；
3. 产品事实：对应模块的 final requirements、验收清单与 triage 后 issue；
4. 架构事实：对应 ADR 与 `docs/architecture*.md`；
5. 设计事实：`DESIGN.md`；
6. 已落地视觉接口：`src/styles/variables.css`、`typography.css`、`components.css`、`main.css`；
7. 本文件：将上述已锁定事实提炼为 Phase 5 前端施工检查项，不得反向覆盖任何上游事实来源。

不同维度的文件发生冲突时，不得用本文件自行裁决；应指出冲突，并按产品、架构或设计所属维度返回对应事实来源复核。

## 2. 不可重新裁决的总原则

- 三画布、Home 的空间叙事、Star Map → Focus → action、About 双路径、HAS 边界、豹猫身份、selected planet assets 与 Phase 4.3 的 CJK/无障碍结论均已锁定。
- Phase 5 可以实现它们，但不得把它们改造成新的产品或视觉方向。不能把 Home 恢复为内容首页、时间线、卡片集合、`Recently` 或跨模块聚合入口。
- Blog、Feed、Learn、Projects 的真实内容只属于各自功能页；Home Focus 只承担观察、短说明和明确 action，不加载板块内容。
- 前端只消费已锁定的公共契约；不得窥探或呈现 Public Footprint、D1、KV、R2、Worker bindings 等底层物理结构。
- 遇到需要改变用户路径、数据语义、资产身份、画布分工或核心视觉状态的需求，必须回到对应 PRD / ADR / 流程治理，不能在组件内“顺手优化”。

## 3. 三画布必须分离

| 画布                    | 页面                                    | 必须保持                                                                | 明确禁止                                                |
| ----------------------- | --------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------- |
| Home / Deep Space       | `/`                                     | 深空星域、暖性地质星球、克制 Klein Blue 交互、空间导航与 About 原地展开 | 内容卡片墙、混合时间线、自动巡航、把所有页面铺成宇宙页  |
| Content / Cream Gallery | `/blog`、`/feed`、`/learn`、`/projects` | 奶油画廊、内容可读性、暖墨正文、细线和克制材质残响                      | 复制 Home 的大面积星空、星球详情页、重粒子背景          |
| Finance / Cyber Arena   | `f.catstarry.xyz`                       | 深色数据面、数字优先、JetBrains Mono、涨跌与精确操作                    | Entry Display、星球标签、鼠标流星尾或干扰读数的装饰动效 |

- 页面根节点必须使用既有 `data-canvas="home"`、`data-canvas="content"` 或 `data-canvas="finance"` 语义，以消费对应 canvas token。
- 鼠标流星尾：Home 完整但克制，Content 弱化，Finance 关闭；首屏一次性 DISCOVER MORE 流星不是 cursor meteor。
- 类别颜色只是冗余提示，不能成为内容类型、状态或操作结果的唯一编码。

## 4. Canonical CSS 与 token 施工规则

- `src/styles/main.css` 是 Phase 5 正式前端的 canonical 全局入口，导入顺序固定为 `variables.css` → `typography.css` → `components.css`。
- `src/layouts/Base.astro` 已切换到 `src/styles/main.css` 入口（2026-08-06 核验）；旧 `src/styles/global.css` 为历史遗留死文件（生产零引用），不得被新页面或新组件重新引用。
- `global.css` 保留为死文件（零引用零风险），不做清理；任何新模块不得引用。
- 组件只消费 Layer 2（语义）或 Layer 3（组件）token；不得在页面或组件中直接绑定 Layer 1 原始色值、尺寸或动效值。
- 新增样式优先复用现有 token 和 selector/state interface。确有新视觉角色时，先补齐语义 token，再由组件 token 映射；不能用一批局部 CSS custom properties 绕过三层结构。
- 不把滚动阶段、Focus 顺序、星图随机 seed、星团坐标、轨道相位、豹猫粒子物理、鼠标采样或路由状态塞入 CSS token。它们是 runtime-owned。
- CSS 只负责已定义的视觉、响应式和 `data-*` 状态表现；运行时负责几何、时序、随机性、状态机与导航触发。
- 不复制 Phase 4.2 原型 toolbar、mock selector、readout 或实验 JavaScript 到生产页面。已落入 canonical CSS 的接口可复用，但原型不是生产组件实现。
- 修改 canonical CSS 后至少验证：PostCSS 可解析、custom-property 无未解析引用、相关页面 build 通过，并检查 reduced-motion 分支。

## 5. 排版与 CJK 是硬性验收

- 中文正文至少 16px，行高至少 1.85；中文标题至少 1.35，说明文字至少 1.65。
- 中文使用 `HarmonyOS Sans SC` 等既有 CJK fallback；常用字重不高于 500，不用 700+ 伪造“粗黑科技感”。
- 中文字距保持 `0` 或 `normal`；负字距只允许纯英文或数字标题。中文 Display / Heading 继续使用已有 `:lang(zh*)` 规则，不自行覆盖为英文排版参数。
- 唯一例外：品牌角标（如 `.xiaohongshu-mark` 中的“小红书”）可突破字重 ≤500 与负字距限制，仅限用于品牌身份标识，不得推广到普通中文标题或正文。
- 保留 `text-spacing-trim`、`hanging-punctuation` 与 `:lang(zh)` / `:lang(zh-Hans)` / `:lang(zh-CN)` 的渐进增强。
- 中英、中文与数字之间约 1/4em 的自动间距属于 Phase 5 的浏览器侧实现项；实现时不得以破坏复制、搜索、读屏或断行的手工空格替代。
- 星球标签默认可低声量，但 hover / keyboard focus 后必须达到正文可读对比度；中文标签和 action 不使用英文式全大写或大字距。

## 6. Home 实现合同

### 6.1 叙事与导航

- Home 依次为 Entry → Approach → Overview → Focus → footer release；Overview 和后续 Focus 是同一片星图，不建立第二张地图。
- Overview 固定五颗完整星球：About、Blog、Feed、Learn、Projects。语义区域固定为 About 右上远端、Blog 左上、Feed 中右近景、Projects 左下、Learn 右下；深度不表达栏目优先级。
- 默认自然滚动 Focus 顺序为 About → Feed → Blog → Projects → Learn，但点击星球、键盘和侧边航行索引必须可直接抵达任一 Focus，不能要求“通关”。
- 星球标签常驻且可发现；所有星球还必须有普通文字导航入口。不得把导航变成只有 hover 才能理解的艺术海报。
- Star Map 不自动旋转、自动巡航或持续改变焦点。Drift 是唯一主构图；只可在既定语义区域内基于证据微调，不得每次加载随机换位。

### 6.2 Focus、action 与 About

- Blog、Feed、Learn、Projects 的 Focus 只显示近景、名称、极短说明和明确 action；action 后才执行短、可中断、不锁滚动的 Planet Push 并进入功能页。
- About 有两条通往同一展开态的路径：总览直接点击 / Focus action 的可访问主路径，以及豹猫星座彩蛋路径。主路径不得要求发现豹猫。
- 豹猫仅是 About 附近的低音量 Klein Blue companion：桌面两次独立点击（不是浏览器 `dblclick`），触控单次激活，reduced motion 直接进入；只有豹猫粒子爆开，About 星球绝不爆炸。
- About 展开后保留低音量、不可交互的残余签名；关闭、返回或离开后回收到 rest。不得恢复独立蓝色 companion body，也不得把豹猫变成 Home 主角。

### 6.3 HAS 与 selected assets

- HAS 只服务 Blog、Feed、Learn、Projects 四颗功能星球；About 与豹猫永不参与。它只表达 `active`、`stable`、`dormant`，不是未读提醒、内容预览或第二套导航。
- 缺少有效静态投影时，四颗信标必须全部隐藏；不得把数据不可用伪装成 `dormant`。状态须通过材质、轨道残留、受限运动和可访问文字共同表达，不能只靠颜色。
- Home 生产 state vocabulary（2026-08-06 核验）：`data-has-state="active|stable|dormant|unavailable"`、`data-planet-state="ready"`、`data-cat-state="reveal|charged|burst|recovering"`、`.about-zone.ready`（交互开关，非状态机）；`data-attention` 与 `.attention` class、轨道前后层（canonical `data-orbit-layer/depth` vs 生产 `.back`/`.front`）为未收敛待裁决项；轨道路径、相位、周期和 pulse scheduler 仍由运行时控制。
- 星球必须使用 `docs/design/assets/planets/selected/` 中已选的同源 Overview / Focus / Mobile 身份，不重新生成、替换为相似星球或混用 Phase 4.2 历史候选。
- Overview 是完整球体，Focus 使用同一母版的细节裁切，Mobile 保留同一主地貌。是否需要大屏 2x 母版、资源优先级、preload / lazy 与 CDN/R2 策略，须在生产接入时以实际性能证据裁决，不得假定已完成。

## 7. 交互、响应式与性能底线

- 所有可操作目标使用原生语义元素或等价语义；星球、侧边索引、Focus action、返回和豹猫入口必须有可见 `:focus-visible`、键盘操作和合理焦点恢复。
- 触控不得依赖 hover；关键入口的命中尺寸至少使用 `--interaction-hit-size`（现有 coarse-pointer 规则）。
- 必须检查 1366×768 与 390×844；移动端包含安全区、可读标签、Focus copy、返回路径和无水平溢出。390×844 下还须检查 125% 缩放。
- `prefers-reduced-motion: reduce` 是正式功能分支：停止连续动画与粒子物理，HAS 退化为静态材质，豹猫跳过爆开，cursor meteor 隐藏，导航和内容仍可完整使用。
- 动效优先 `transform` / `opacity`，避免高成本大面积 blur、逐节点独立 filter、无限循环或与阅读和数据操作竞争的特效。
- 每个模块在交付前按自身范围验证：CJK、键盘、触控、reduced motion、两个视口、无横向溢出、控制台无错误，以及相关 build。生产页面还必须补做真实内容长度、资源加载、LCP、CLS 与设备字体矩阵检查。

## 8. 允许的微调与必须升级处理

仅在不改变语义、状态、画布、资产身份或用户路径的前提下，允许根据实际页面证据微调：间距、断点内布局、文本最大宽度、selected asset 的同源裁切对齐、低成本光学强度和资源加载阈值。

以下情况不是“微调”，必须停止并回到对应真源处理：

- 改变三画布分工、Home 信息架构、Focus / action 关系、About 双路径或豹猫行为；
- 改变 HAS 数据来源、状态集合、Home 聚合边界或 `unavailable` 降级语义；
- 替换 selected 星球身份、重生成资产、把 Planet Focus 变成内容详情页；
- 新增或改变尚未被现有 PRD、ADR、架构文档或当前任务明确授权的 API、Worker 调用、数据 schema、鉴权逻辑、Cloudflare adapter 或依赖；按已锁定公共契约实现和消费已有接口，不属于升级处理。
- 用页面局部样式绕过 canonical token、CJK 或 reduced-motion 契约。

## 9. 明确不纳入本文件

- 不实现任何 Home、Blog、Feed、Learn、Projects 或 Finance 业务代码；
- 不定义 Worker、D1、KV、R2、CI/CD、鉴权、API、绑定或部署细节；这些由共享基础设施 F 和对应架构/ADR 负责；
- 不裁决 PRD、Public Footprint 业务规则、HAS 计算规则、内容模型、CMS 行为或验收标准；
- 不指定正式生产资源加载策略、CDN/R2 配置、2x 星球母版结论或真实数据故障恢复；
- 不修改 `DESIGN.md` 的视觉方向，不重新执行或替代 Phase 4.2 / 4.3 原型验收。

## 10. 开发线程交接清单

开始前确认：已阅读本文件、相关 PRD / ADR / issue、`DESIGN.md` 对应章节和 canonical CSS。

提交前确认：仅在授权范围内改动；未修改设计方向；CJK、键盘、触控、reduced-motion 和目标视口通过；未把 `.codex/` 或参考素材加入暂存；按路径限定提交文件。
