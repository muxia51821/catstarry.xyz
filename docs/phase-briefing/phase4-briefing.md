# Phase 4 任务说明 — UI / 原型对话

> 流程治理更新：2026-07-15
> 当前状态：定向 Phase 3 已完成；返回 Phase 4.1 的 `DESIGN.md` v2.0 已锁定，canonical CSS 对齐尚未完成。Phase 4.2 未启动。

---

## 当前职责与边界

Phase 4 的职责是形成并验证 catstarry.xyz 的视觉系统与关键页面原型。

本次不是重启整个 Phase 4：Home / Feed 的产品关系已在定向 Phase 2 重新规格化，定向 Phase 3 已完成领域、数据、模块与 API 复核。返回 Phase 4.1 的 Design 2.0 决策层已经重锁，但 `src/styles/` 仍保留 Design 1.x 与旧 Home 聚合假设；下一步只能先完成 4.1 的 CSS 设计系统对齐。

不得在本对话中重新裁决已锁定架构、实现代码或提前进入 Phase 4.2。

## 定向回流状态

| 环节 | 状态 | 说明 |
| --- | --- | --- |
| Phase 4.1 设计触发 | ✅ | Home 改为宇宙入口与星图；Feed 改为公开足迹 |
| 定向 Phase 2 | ✅ | PRD、HF-01～HF-05、triage、验收清单已完成 |
| 定向 Phase 3 | ✅ | ADR-005 锁定 Public Footprint 分存；ADR-006 退役 `/api/home` 与 blog-metadata KV bridge |
| 返回 Phase 4.1 | 🟡 | `DESIGN.md` v2.0 与共享文档已同步；canonical CSS token、旧 Home 语义与通用工具类待对齐 |
| Phase 4.2 | ⏸ | 未启动；须先完成 Phase 4.1 CSS 对齐并由流程治理确认，不得写生产实现 |

## Phase 4.1 当前剩余工作

- `src/styles/variables.css`：按 Design 2.0 建立 Space、Planet、Signal Satellite、Leopard Cat、Cursor Meteor 与 Feed Public Footprint 的语义 token 契约；数值可标记为待 Phase 4.2 校准。
- `src/styles/components.css`：保留通用卡片与动效工具，退役只服务旧 Home mixed timeline / About Card 的选择器；本阶段不得实现新 Star Map、Planet 或 About Expanded 组件。
- `src/styles/typography.css`：保留已验证的 CJK 基线，只处理版本、命名和与新语义冲突的说明，不重新设计字体系统。
- 核对 `main.css` 的版本说明与入口关系；若无行为冲突，只做版本同步，不扩展组件样式。
- 完成后验证旧 Home / About Card / Timeline 语义不再被 canonical CSS 声明为当前接口，再回到流程治理报告 Phase 4.1 完成。

## Phase 4.2 启动时的必读输入

- `AGENTS.md` — 全局约束与执行优先级
- `docs/workflow-orchestration.md` — 包含定向上游回流协议
- `docs/DASHBOARD.md`、`CONTEXT.md`、`docs/SITEMAP.md`
- `DESIGN.md` v2.0 — 当前全站视觉与交互事实来源；原型只能校准其中明确列出的待验证参数
- `docs/design/reference-design/` — 木下人工选取的视觉参照
- `docs/final-requirements-homepage.json`、`docs/final-requirements-feed.json`
- `docs/acceptance-home.md`、`docs/acceptance-feed.md`
- `.scratch/home-feed-reflow/issue.md` 与 HF-01～HF-05
- `docs/adr/005-public-footprint-separate-storage.md`
- `docs/adr/006-retire-home-aggregation-and-kv-bridge.md`

## 已确认的产品边界

- Home：宇宙入口 → 接近星域 → 自由星图总览 → 页脚；不再有混合时间线或跨模块内容聚合。
- Blog / Feed / Learn / Projects：从星图点击后，经短推进进入各自功能页面。
- About：例外，在 Home 原地展开。
- Feed：公开足迹／来时路；包含碎碎念、剪藏及符合规则的系统事件。
- 系统事件：Blog 仅部署成功后、Learn 仅明确完成小节、Projects 仅显式实质更新；不做历史回填，不记录普通小编辑。

## 返回 Phase 4.1 的已锁定产物与待闭合项

- `DESIGN.md` v2.0：锁定暖性地质星球、三档观看尺度、About 双路径、鼠标流星尾、Feed Public Footprint、token 家族与资源接口。
- `docs/SITEMAP.md`：保持 SSG 静态星图、无 Home 聚合与直接路由关系。
- `CONTEXT.md`、`GLOSSARY.md`、本 brief：同步 Design 2.0 术语与阶段边界。
- 待闭合：`variables.css`、`components.css`、`typography.css` 与 Design 2.0 的 canonical 对齐。

## Phase 4.2 只验证的问题

- 星图是否需要短暂 sticky，以及 2–3 屏滚动距离的具体分配。
- 远、中、近景的视差、缩放、模糊和显影比例。
- Overview 完整球体、Focus 高细节与移动端资源的切换点。
- 豹猫粒子密度、蓄能 / 爆开 / 回收时长，以及触控端彩蛋手势。
- 移动端粒子、尾迹、模糊和大图的降级幅度。

Phase 4.2 不得重新加入 Home Recently、动态更新卫星、跨模块数据读取或星球功能内页。

## 设计约束（仍有效）

- 三画布、Klein Blue 品牌电压、CJK 优先与 `prefers-reduced-motion` 继续作为已有设计系统的基础。
- Home 使用同一片连续星域：远景是星点，接近后必须成为五颗完整、具有真实体积与不同地貌的暖性地质星球。
- 滚动只表达空间纵深；点击负责抵达内容；五颗星球平权。
- About 星球直接展开是主路径，豹猫两次点击是可选彩蛋；鼠标流星尾按 Home 完整、Content 弱化、Finance 关闭。
- Content、Feed、Blog、Learn、Projects 的功能页面不因 Home 星图而被重做成“星球页面”；只在后续阶段轻量借用统一的材质和信号语言。

## 做完后的报告

只有在 canonical CSS 对齐与验证完成后，才能报告返回 Phase 4.1 已完成。届时木下需回到「流程治理」对话报告 `DESIGN.md` v2.0、CSS 设计系统与同步文件；流程治理确认后才可 fork Phase 4.2。
