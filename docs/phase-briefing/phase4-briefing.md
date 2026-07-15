# Phase 4 任务说明 — UI / 原型对话

> 流程治理更新：2026-07-15
> 当前状态：定向 Phase 3 已完成；Phase 4.1 正在以锁定架构回归重锁，Phase 4.2 尚未启动。

---

## 当前职责与边界

Phase 4 的职责是形成并验证 catstarry.xyz 的视觉系统与关键页面原型。

本次不是重启整个 Phase 4：Home / Feed 的产品关系已在定向 Phase 2 重新规格化，定向 Phase 3 已完成领域、数据、模块与 API 复核；现在回到 Phase 4.1，重锁相关设计，再进入 4.2 原型。

不得在本对话中重新裁决已锁定架构、实现代码或提前进入 Phase 4.2。

## 定向回流状态

| 环节 | 状态 | 说明 |
| --- | --- | --- |
| Phase 4.1 设计触发 | ✅ | Home 改为宇宙入口与星图；Feed 改为公开足迹 |
| 定向 Phase 2 | ✅ | PRD、HF-01～HF-05、triage、验收清单已完成 |
| 定向 Phase 3 | ✅ | ADR-005 锁定 Public Footprint 分存；ADR-006 退役 `/api/home` 与 blog-metadata KV bridge |
| 返回 Phase 4.1 | 🔶 | 当前：以 ADR-005、ADR-006 重锁 DESIGN.md、SITEMAP 与本 brief |
| Phase 4.2 | ⏸ | 不得提前开始 |

## 返回 Phase 4.1 时的必读输入

- `AGENTS.md` — 全局约束与执行优先级
- `docs/workflow-orchestration.md` — 包含定向上游回流协议
- `docs/DASHBOARD.md`、`CONTEXT.md`、`docs/SITEMAP.md`
- `DESIGN.md` — 当前设计系统；应保留已确认设计原子，复核受 Home / Feed 影响部分
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

## 返回 Phase 4.1 的预期产物

- 更新 `DESIGN.md` 中 Home、About、Feed 边界、星图视觉与动效接口；章节数量以 `DESIGN.md` 自身目录为准，不使用固定“9 节”要求。
- 更新 `docs/SITEMAP.md` 的视觉/路由表达，使其与定向 Phase 3 架构一致。
- 更新本 brief 与 `CONTEXT.md` 的性质标签，确认 4.1 重锁完成。
- 之后才可启动 Phase 4.2：以 `prototype` 验证关键视觉与交互问题；不把原型直接当生产实现。

## 设计约束（仍有效）

- 三画布、Klein Blue 品牌电压、CJK 优先与 `prefers-reduced-motion` 继续作为已有设计系统的基础。
- Home 的新视觉应服务于星图导航，不以传统 Hero、混合时间线或 About 中心卡片替代。
- Content、Feed、Blog、Learn、Projects 的功能页面不因 Home 星图而被重做成“星球页面”；只在后续阶段轻量借用统一的材质和信号语言。

## 做完后的报告

定向 Phase 3 与返回 Phase 4.1 各自完成后，木下需回到「流程治理」对话报告产物路径；流程治理确认状态后再允许进入下一环节。
