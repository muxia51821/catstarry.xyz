# Phase 4 任务说明 — 给 UI/原型对话

> 流程治理产出，2026-07-05

---

## 你的职责

Phase 4：UI/原型。基于 Phase 3 锁定的架构，产出视觉方向和关键页面原型。

## 输入

- docs/SITEMAP.md — 站点结构（7 个路径）
- CONTEXT.md 设计基调节 — Phase 0 原型约定（暖色系、artistic warm、B 型首页），Phase 4 有权推翻或保留
- docs/architecture.md — 架构总览（模块关系 + 数据流向）
- docs/architecture/modules.md — 目录结构 + 组件清单
- docs/acceptance-\*.md — 6 份验收清单（含 UI 行为描述：导航栏风格、about 卡片交互、时间线布局等）
- .scratch/\*/issue.md — 开发 issue（含 UI 相关条目）

## 执行顺序

| #   | 动作                                         | skill               |
| --- | -------------------------------------------- | ------------------- |
| 4.1 | 视觉方向探索（moodboard + 变体）             | design-an-interface |
| 4.2 | 关键页面原型（Home、/blog、/feed、/finance） | prototype           |
| 4.3 | 原型落地 HTML/CSS                            | web-design-engineer |

## 产出物

- moodboard（图片或 HTML）— 视觉方向定调
- 可交互 HTML 原型 — 至少覆盖 Home、/blog 列表、/feed 时间线、finance 面板
- docs/SITEMAP.md — 更新各路径设计状态

## 关键约束

- Phase 3 架构已锁定，目录结构、数据模型、API 路由不可改
- CONTEXT.md 设计基调 [原型约定 | Phase 4 重新裁决] — 你有权推翻暖色系/B 型首页等原型约定，重新定调
- 设计哲学：不极简，偏艺术、有温度（artistic warm）
- 导航栏需区分 Home（科幻风格）与其他页面（统一风格）
- about 卡片为首屏核心元素：3D 粒子风格 + 点击展开
- 首页为混合时间线（博客/碎碎念/剪藏/项目/学习笔记），不是功能列表
- 代码标识符/文件名用英文 ASCII，文档和对话用中文

## 可参考（只读）

- GLOSSARY.md — 术语定义
- AGENTS.md — 全局约束 + Rule Precedence
- docs/workflow-orchestration.md — Phase 4 详细步骤
- docs/architecture/data-model.md — 数据结构（影响卡片信息展示）
- docs/architecture/auth.md — 鉴权方案（影响 finance 登录流程）

## 做完后

提醒木下回到「流程治理」对话更新进度。
