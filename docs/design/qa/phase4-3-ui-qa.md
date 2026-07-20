# Phase 4.3 UI QA Report

> 日期：2026-07-20  
> 结论：Phase 4.3 的 canonical CSS、五颗星球资产身份与隔离原型 UI QA 已完成。  
> 边界：本报告不表示 `src/pages` 已实现正式 Home，也不表示真实 HAS 数据链路或 Phase 5 页面功能已完成。

## 1. 验证层级

| 层级 | 结果 | 可证明范围 |
| --- | --- | --- |
| Canonical CSS 静态接口 | Pass | `variables.css`、`components.css`、`typography.css` 已建立 Star Map、Planet、Focus、HAS、豹猫星座与 Cursor Meteor 的样式契约；CSS 可解析，token 引用闭合。 |
| Phase 4.2 隔离原型运行 | Pass | 现有 CDP 回归覆盖滚动、点击、侧边索引、Focus、Learn、About 双路径、HAS mock、触控、reduced-motion、键盘返回与 footer release。 |
| 五颗星球资产 | Pass with limitation | 15 个同源 `Overview / Focus / Mobile` 资产已选择、派生并审计；1254px master 足够设计验证和 1x 使用，不声称满足未来大屏 2x 交付。 |
| 正式生产页面 | Deferred | 按 Phase 4.3 边界未修改 `src/pages/**`，因此不声称生产 Home、路由、真实加载策略或线上性能已经完成。 |

## 2. Canonical CSS 静态接口

- `variables.css`：新增 Space、Star Layer、Star Map、Planet Optical / Material / Overview / Focus、Label / Action、HAS、Leopard Cat、Cursor Meteor 与 interaction / reduced-motion token 家族。
- `components.css`：新增以组件 class 和 `data-*` 状态为主的 selector family；没有复制原型 toolbar、mock selector、readout 或 JavaScript 状态机。
- `typography.css`：只补充 Planet label、Focus copy/action、side index、About 正文和简体中文语言选择器。
- `main.css`：只更新版本、职责和导入顺序说明。
- 运行时继续拥有 journey、Hold / Handoff、Focus 顺序与滚动距离、Canvas seed/密度、轨道相位、豹猫坐标与物理、路由行为。
- 自定义属性审计：361 个可见定义；同一 rule 内无重复声明；27 个未在 token 文件定义的变量均为明确的运行时或组件输入；无未解析引用。

## 3. QA Matrix

### CJK — Pass at prototype and interface level

- 中文字体栈保留系统 CJK 回退；`:lang(zh-CN)` 与 `:lang(zh-Hans)` 使用一致的行高和断行规则。
- Planet label、Focus 标题、正文、About 文本和 action 不旋转中文字符，也不对正文使用过量 `letter-spacing`。
- 390×844 的 About Focus 截图中，中文正文保持在视口内，无水平溢出；中英文 action 分层清楚。
- 限制：正式页面尚未实现，最终真实内容长度、CMS 富文本和浏览器字体差异仍属于 Phase 5 页面 QA。

### Keyboard — Pass in isolated prototype

- 五颗星球与八个侧边索引入口均为 `tabIndex=0`；Learn 星球中心命中正确。
- 键盘进入 Blog Focus 后，焦点进入 `#focus-back`；Esc 关闭后恢复到 Blog 星球。
- Focus action、返回星图、About 直接入口与豹猫按钮均保留 focus-visible 接口。
- `behavior-regression.mjs` 继续覆盖 About charged / timeout / cancel / recover；`learn-focus-regression.mjs` 覆盖星球、侧边索引、自然滚动与 footer release。

### Touch — Pass in isolated prototype

- 390×844 下五颗星球 ready、命中和标签边界均通过；无水平溢出。
- About 直接路径保留；豹猫触控单次触发直接进入 About，未经过桌面 charged 二阶段。
- touch mock 下 HAS 使用静态状态；合成 click 防护仍由原型行为回归覆盖。
- canonical touch 规则使用至少 44px 的交互接口，且不依赖 hover 才显示关键入口。

### Reduced Motion — Pass in isolated prototype

- mixed mock 的四个 HAS 状态仍可见且 `data-static-motion=true`；没有持续公转。
- Cursor Meteor 隐藏；豹猫物理循环不运行；About 可直接进入和退出。
- `unavailable` mock 的四个信标完全隐藏并保留“当前不可用”的无障碍状态，不伪装成 dormant。
- canonical CSS 关闭连续动画和过渡，但保留静态材质、轨道痕迹、焦点和导航可见性。

### Performance — Pass for design-side scope

- 未新增依赖；`package.json` 与 lockfile 未修改；Astro build 成功。
- 四个 canonical CSS 文件从 25,310 bytes 增至 51,524 bytes，未压缩增量 26,214 bytes。主要增量是新组件接口，不包含 JavaScript、粒子坐标或页面结构。
- 大尺度 blur 仅用于低对比深空尘埃；Planet/HAS 的 shadow 受尺寸限制；28 个豹猫节点共用 node-layer filter，没有每节点独立高成本 filter。
- 动态职责保持在 Canvas / Web Animations / runtime；CSS 动画目标主要为 transform、opacity 和小尺寸光学层。
- 15 个 selected assets 合计 2,701,724 bytes：Overview 1,086,274，Focus 1,237,698，Mobile 377,752。移动端已有独立 640px 资产，不需要用 CSS 缩小 1254px master。
- 限制：正式页面尚未实现，无法证明实际 lazy loading、LCP、CLS、资源优先级或 CDN 缓存表现。

### Visual Consistency — Pass for selected assets and prototype contract

- Home Deep Space、Content Cream Gallery、Finance Dark Console 的职责没有混合；本轮未改 Content 或 Finance 页面。
- 五颗星球统一上左主光、暖性地质主体、冷阴影与受控 Klein Blue rim，同时保持各自主地貌。
- HAS 使用同一信标母版的 active / stable / dormant 能量层级；unavailable 隐藏；不展示 unread 或内容信息。
- 豹猫保持 About 的低音量可选签名，不恢复 companion body，不成为 Home 主角。
- Drift 仍是主方案；Orbit 只作为历史回归证据。

## 4. Viewport Evidence

| Viewport | 原型结果 | 资产结果 |
| --- | --- | --- |
| 1366×768 | Overview 五颗星球、标签与侧边索引均在视口内；Feed Focus copy/action 可见；无水平溢出。 | 五颗 selected Overview 在 `#0A0A0C` 上轮廓、主地貌、色温和 Klein rim 清楚。 |
| 390×844 | Overview 五颗星球均 ready；Projects 反向标签已改为向右展开；About Focus 只有“返回星图”；125% 页面缩放无水平溢出。 | 五颗 Mobile 资产主轮廓和主地貌可辨；四角 alpha 为 0。 |

原型截图：

- `evidence/phase4-3-prototype-overview-1366x768.png`
- `evidence/phase4-3-prototype-feed-focus-1366x768.png`
- `evidence/phase4-3-prototype-overview-390x844.png`
- `evidence/phase4-3-prototype-about-focus-390x844.png`

资产合成证据：

- `evidence/phase4-3-planet-series-1366x768.png`
- `evidence/phase4-3-planet-series-390x844.png`

原型截图仍使用 Phase 4.2 历史占位资产；资产合成图只验证 Phase 4.3 selected assets。两者都不是生产 Home 截图。

## 5. Planet Asset Gate

资产 Gate 已闭合。详细选择、尺寸、字节数、十四项矩阵、连续性和淘汰原因见：

- `docs/design/assets/planets/planet-asset-manifest.md`

五颗 Focus 和 Mobile 均从各自 Overview master 派生，不使用二次生成的“相似星球”替换。Focus 裁切暴露有效地貌；Mobile 保留主轮廓并降低资源成本。当前已知限制只有未来大屏 2x master 与正式加载策略，留到生产接入时验证。

## 6. Commands and Results

| Command | Exit | Result |
| --- | ---: | --- |
| `node --check docs/design/prototypes/phase4-2/visual-parameters.js` | 0 | Syntax pass |
| `node --check docs/design/prototypes/phase4-2/behavior-regression.mjs` | 0 | Syntax pass |
| `node --check docs/design/prototypes/phase4-2/learn-focus-regression.mjs` | 0 | Syntax pass |
| `node --check docs/design/qa/phase4-3-viewport-check.mjs` | 0 | Syntax pass |
| `node docs/design/prototypes/phase4-2/behavior-regression.mjs` | 0 | HAS mocks、About 双路径、28 nodes、burst/residue/recover、touch、reduced-motion、footer/reverse pass；console errors empty |
| `node docs/design/prototypes/phase4-2/learn-focus-regression.mjs` | 0 | Learn direct/side/natural focus、return、footer release pass；console errors empty |
| `node docs/design/qa/phase4-3-viewport-check.mjs` | 0 | 1366×768、390×844、keyboard return、125% zoom、reduced-motion pass；console errors empty |
| `python docs/design/assets/planets/audit-assets.py` | 0 | 15 files dimension/alpha audit and two evidence composites pass |
| PostCSS parse for four canonical CSS files | 0 | All four files parse |
| Custom-property duplicate/reference audit | 0 | No duplicate declaration within a rule; no unresolved reference |
| `$env:ASTRO_TELEMETRY_DISABLED='1'; npm run build` | 0 | Astro 7.0.9 built 6 pages |
| `git diff --check` | 0 | No whitespace error; Git emitted only existing LF/CRLF conversion warnings |

本地原型通过已有 CDP `9227` 和临时静态服务器运行；未引入测试框架。所有浏览器脚本报告的 `errors` 数组为空。

## 7. Deferred Production Checks

- 正式 Home DOM、路由和状态机实现。
- selected assets 的真实加载时序、preload/lazy 策略、LCP/CLS 和 CDN/R2 行为。
- 真实 `activity-signals.json` 投影与错误恢复。
- 大屏 2x master 是否需要重渲染。
- CMS 长文、真实中文内容和设备字体矩阵。

以上均属于后续生产实现或真实数据阶段，不影响 Phase 4.3 的设计系统、资产身份和隔离原型 QA 结论。
