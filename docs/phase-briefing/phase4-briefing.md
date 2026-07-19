# Phase 4 任务说明 — UI / 原型对话

> 流程治理更新：2026-07-20
> 当前状态：Phase 4.2 隔离原型已完成木下目测验收；等待进入 Phase 4.3。

---

## 当前职责与边界

Phase 4 的职责是形成并验证 catstarry.xyz 的视觉系统与关键页面原型。

本次不是重启整个 Phase 4：Home / Feed 的产品关系已在定向 Phase 2 重新规格化，定向 Phase 3 已完成领域、数据、模块与 API 复核，返回 Phase 4.1 也已通过 Design 2.0 与 canonical CSS 完成重锁。随后 Home Activity Signal 触发极小定向回流，定向 Phase 2/3 已闭合并由 ADR-007 锁定；HAS 返回 Phase 4.1 已完成三态信号卫星的视觉和 token 接口重锁，2026-07-18 的 Design 2.1 极小重锁又正式确认了 Focus / action、Drift 语义布局与候选资产替换边界。Phase 4.2 隔离原型已完成木下目测验收。

不得在 Phase 4 对话中执行依赖升级、重新裁决已锁定架构、实现生产代码、接入真实投影或提前进入 Phase 4.3。

## 定向回流状态

| 环节 | 状态 | 说明 |
| --- | --- | --- |
| Phase 4.1 设计触发 | ✅ | Home 改为宇宙入口与星图；Feed 改为公开足迹 |
| 定向 Phase 2 | ✅ | PRD、HF-01～HF-05、triage、验收清单已完成 |
| 定向 Phase 3 | ✅ | ADR-005 锁定 Public Footprint 分存；ADR-006 退役 `/api/home` 与 blog-metadata KV bridge |
| Design 2.0 返回 Phase 4.1 | ✅ | `DESIGN.md` v2.0、共享文档与 canonical CSS 已完成对齐 |
| Astro 7 依赖基线迁移 | ✅ | Astro 7.0.9 + `@astrojs/react` 6.0.1 + React 19.2.7 + Vite 8.1.4；build、Content Layer、Markdown、React islands 与 `.astro/` untrack 已验证 |
| Home Activity Signal 定向 Phase 2 | ✅ | PRD、HAS-01～HAS-03、triage 已完成 |
| Home Activity Signal 定向 Phase 3 | ✅ | ADR-007 锁定受控静态投影；不恢复 `/api/home` 或 Home 内容聚合 |
| HAS 返回 Phase 4.1 | ✅ | 三态信号卫星视觉和 token 接口已在 `DESIGN.md` 与 canonical CSS 中重锁；不重新裁决产品或架构 |
| Design 2.1 极小重锁 | ✅ | 正式确认 Star Map → Focus → action、Drift 语义布局与候选资产替换边界；未修改架构或 canonical CSS |
| Phase 4.2 | ✅ | 隔离原型完成并经木下目测验收；只使用 mock activity states，未接入真实投影 |
| Phase 4.3 | 🟡 | 下一步；选定原型落地 + UI 质检，并处理星球资产最终身份与 canonical CSS 落回 |

## Phase 4.1 已完成的 CSS 重锁

- `src/styles/variables.css`：已建立 Space、Planet、Signal Satellite、Leopard Cat、Cursor Meteor 与 Feed Public Footprint 的 Design 2.0 token 契约；待验证数值均标记为 `Phase 4.2 calibration`。
- `src/styles/components.css`：已保留通用卡片与动效工具，退役旧 Home mixed timeline / About Card 选择器；未实现新 Star Map、Planet 或 About Expanded 组件。
- `src/styles/typography.css`：已保留 CJK 基线并校正字体语义、Canvas 绑定与合法的 `text-spacing-trim` 值。
- `src/styles/main.css`：已同步 v2.0 入口说明，导入顺序不变。
- PostCSS 语法解析、token 引用检查与 Astro 构建均已通过。

## Phase 4.3 启动时的必读输入

> 前置条件：Phase 4.2 隔离原型与 `prototype-verdict.md` 已完成，并由木下目测验收。

- `AGENTS.md` — 全局约束与执行优先级
- `docs/workflow-orchestration.md` — 包含定向上游回流协议
- `docs/DASHBOARD.md`、`CONTEXT.md`、`docs/SITEMAP.md`
- `DESIGN.md` v2.1 — 当前全站视觉与交互事实来源；原型只能校准其中明确列出的待验证参数
- `docs/design/reference-design/` — 木下人工选取的视觉参照
- `docs/final-requirements-homepage.json`、`docs/final-requirements-feed.json`
- `docs/acceptance-home.md`、`docs/acceptance-feed.md`
- `.scratch/home-feed-reflow/issue.md` 与 HF-01～HF-05
- `docs/adr/005-public-footprint-separate-storage.md`
- `docs/adr/006-retire-home-aggregation-and-kv-bridge.md`
- `docs/adr/007-home-activity-signal-static-projection.md`
- `.scratch/home-activity-signal/issue.md` 与 HAS-01～HAS-03
- `docs/design/prototypes/phase4-2/planet-asset-prompt-kit-v2.md` — 星球候选资产生成、Overview / Focus / Mobile 连续性和替换接口
- `docs/design/prototypes/phase4-2/prototype-verdict.md` — Phase 4.2 目测验收结论与 Phase 4.3 后置项

## 已确认的产品边界

- Home：宇宙入口 → 接近星域 → 自由星图总览 → 页脚；不再有混合时间线或跨模块内容聚合。
- Blog / Feed / Learn / Projects：先进入对应 Planet Focus，只在 Focus action 后经 Planet Push 进入各自功能页面。
- 自然滚动默认按 About → Feed → Blog → Projects → Learn 浏览 Focus；点击、键盘或航行索引可直接跳到任一 Focus，不强制通关。
- About：例外；总览直接点击可轻推近后连续原地展开，自然滚动进入 About Focus 时也有明确 action，豹猫双击进入同一展开态。
- Feed：公开足迹／来时路；包含碎碎念、剪藏及符合规则的系统事件。
- 系统事件：Blog 仅部署成功后、Learn 仅明确完成小节、Projects 仅显式实质更新；不做历史回填，不记录普通小编辑。

## 返回 Phase 4.1 的已完成产物

- `DESIGN.md` v2.0：锁定暖性地质星球、三档观看尺度、About 双路径、鼠标流星尾、Feed Public Footprint、token 家族与资源接口。
- `DESIGN.md` v2.1：在不修改架构和 canonical CSS 的前提下，补锁 `Star Map → Focus → action`、Drift 语义布局与星球候选资产 Gate。
- `docs/SITEMAP.md`：保持 SSG 静态星图、无 Home 聚合与直接路由关系。
- `CONTEXT.md`、`GLOSSARY.md`、本 brief：同步 Design 2.0 术语与阶段边界。
- `variables.css`、`components.css`、`typography.css`、`main.css`：完成 Design 2.0 canonical 对齐。

## Phase 4.2 已验证的问题

- Drift Star Map、Entry / Approach / Overview、Star Map → Focus → action。
- 默认 Focus 序列、点击与侧边索引跳转、返回与 footer release。
- HAS 四种 mock、椭圆公转、遮挡、hover 响应、触控与 reduced-motion。
- About 直接路径与豹猫星座两阶段路径、触控单击、节点爆开、Focus 残粒与回收。
- Orbit 对照、1366×768、390×844、回归脚本与控制台检查。

Phase 4.2 不得重新加入 Home Recently、跨模块内容读取或星球功能内页；三态信号卫星只能使用模拟状态校准视觉，不得在原型中接入真实投影。

Phase 4.2 可模拟 `active` / `stable` / `dormant` 三态来校准信号卫星视觉，但不得接入真实 `activity-signals.json`、Worker、R2 或任何生产数据链路。

## Phase 4.3 后置项

- 五颗星球当前资产继续作为可替换占位。
- 星球资产的统一调整、Overview / Focus / Mobile 身份确认后置到 Phase 4.3。
- Phase 4.3 负责将获选组件样式、校准参数与最终资产接口落回 canonical CSS，并执行 UI 质检。

## Phase 4.2 skill、文件与 Git 边界

- Phase 4.2 已完成；后续 skill 边界以 `docs/workflow-orchestration.md` 为准，不得让任何视觉 skill 推翻已锁定产品、架构或 Phase 4.2 目测验收结论。
- 不强制 GSAP，不随机重做已锁定的字体、架构、Hero 或组件体系。
- 一次性原型只写入 `docs/design/prototypes/phase4-2/`；不得写入 `src/pages/` 或生产组件。
- 实验 CSS 不得直接写入 `src/styles/variables.css`、`components.css` 或 `typography.css`；获选结果到 Phase 4.3 才落回 canonical styles。
- Agent 修改前只读检查 Git 状态与 HEAD；所有 commit / push 由木下执行。
- `.codex/` 与 `docs/design/reference-design/深水/` 默认忽略，不得加入提交。

## 设计约束（仍有效）

- 三画布、Klein Blue 品牌电压、CJK 优先与 `prefers-reduced-motion` 继续作为已有设计系统的基础。
- Home 使用同一片连续星域：远景是星点，接近后必须成为五颗完整、具有真实体积与不同地貌的暖性地质星球。
- 滚动负责空间纵深和默认 Focus 浏览；点击、键盘与航行索引负责直接抵达 Focus；Focus action 才负责进入内容。五颗星球平权。
- About 星球直接展开是主路径，豹猫两次点击是可选彩蛋；鼠标流星尾按 Home 完整、Content 弱化、Finance 关闭。
- Content、Feed、Blog、Learn、Projects 的功能页面不因 Home 星图而被重做成“星球页面”；只在后续阶段轻量借用统一的材质和信号语言。

## 做完后的报告

Phase 4.2 隔离原型已经完成木下目测验收。下一步 fork Phase 4.3：选定原型落地 + UI 质检；完成后回到「流程治理」报告，由流程治理判断 Phase 4 是否闭合并能否进入 Phase 5。
