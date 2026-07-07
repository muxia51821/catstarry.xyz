# Phase 4 任务说明 — 给 UI/原型对话

> 流程治理产出，2026-07-07

---

## 你的职责

Phase 4：UI/原型。基于 Phase 3 锁定的架构，产出 catstarry.xyz 专属视觉设计系统（DESIGN.md）+ 关键页面原型。

## 输入（必读）

- docs/workflow-orchestration.md — 执行手册，Phase 4 详细步骤
- AGENTS.md — 全局约束 + Karpathy 行为原则
- docs/SITEMAP.md — 站点结构
- CONTEXT.md 设计基调节 — Phase 0 原型约定（暖色系、artistic warm、B 型首页），Phase 4 有权推翻或保留
- docs/architecture.md — 架构总览（模块关系 + 数据流向）
- docs/architecture/modules.md — 目录结构 + 组件清单（了解各模块功能和交互需求）
- docs/acceptance-\*.md — 6 份验收清单（含 UI 行为描述：导航栏风格、about 卡片交互、时间线布局等）
- .scratch/\*/issue.md — 开发 issue（含 UI 相关条目）

## 设计参照（必读）

- docs/design/reference-design/ — 木下人工选取的视觉锚点
- awesome-design-md 格式：9 节标准结构（Visual Theme → Agent Prompt Guide）

## 关键约束

- Phase 3 架构已锁定，目录结构、数据模型、API 路由不可改
- CONTEXT.md 设计基调 [原型约定 | Phase 4 重新裁决] — 你有权推翻暖色系/B 型首页等原型约定，重新定调
- 中文排版：行高 ≥1.85，不调整字间距，标点挤压单独处理。
- 设计哲学：不极简，偏艺术、有温度（artistic warm），由你读了参考设计后自己定义颜色/字体/间距——文档里不预写死。
- 需区分 Home（科幻风格）与其他页面（统一风格）
- about 卡片为首屏核心元素：3D 粒子风格 + 点击展开
- 首页为混合时间线（博客/碎碎念/剪藏/项目/学习笔记），不是功能列表
- 代码标识符/文件名用英文 ASCII，文档和对话用中文
- 文件写入：python pathlib.write_text(content, encoding='utf-8')。禁止 Set-Content。禁止 python -c 三重引号。

## 执行顺序

4.0 reference-design 已由木下提前完成，直接使用
4.1 Design Read + DESIGN.md：读 reference-design + 暖色基调 → 声明 Design Read → 生成根目录 DESIGN.md（awesome-design-md 9 节格式）
4.2 原型生成：taste-skill(minimalist+soft) 作为 Policy Engine → 生成关键页面 HTML 原型
4.3 原型落地 + 质检：web-design-engineer 落地 HTML/CSS → taste-skill pre-flight check → 产出质检通过的代码

- moodboard（图片或 HTML）— 视觉方向定调
- 可交互 HTML 原型 — 至少覆盖 Home、/blog 列表、/feed 时间线、finance 面板
- docs/SITEMAP.md — 更新各路径设计状态

## taste-skill 使用方式

taste-skill 已安装在 C:/Users/a3593/.cc-switch/skills/

**Phase 4.2（原型生成）**：

- 作为 Policy Engine，读取 taste-skill/SKILL.md（主入口）+ minimalist-skill/SKILL.md + soft-skill/SKILL.md
- 执行 Brief Inference → 声明 Design Read → 设置旋钮
- brutalist-skill（与 artistic warm 冲突）
- 强制约束：非 landing 页、Home 拒绝 Hero+3 Card 模板、CJK 排版规则

**Phase 4.3（质检）**：

- 作为 Quality Gate，执行 pre-flight check
- 排查：模板布局、平庸间距、CJK 标点挤压
- output-skill 确保代码完整输出

## 关键约束

- Phase 3 架构已锁定，目录结构、数据模型、API 路由不可改
- CONTEXT.md 设计基调 [原型约定 | Phase 4 重新裁决] — 你有权推翻暖色系/B 型首页等原型约定，重新定调
- 中文排版：行高 ≥1.85，不调整字间距，标点挤压单独处理。
- 设计哲学：不极简，偏艺术、有温度（artistic warm），由你读了参考设计后自己定义颜色/字体/间距——文档里不预写死。
- 需区分 Home（科幻风格）与其他页面（统一风格）
- about 卡片为首屏核心元素：3D 粒子风格 + 点击展开
- 首页为混合时间线（博客/碎碎念/剪藏/项目/学习笔记），不是功能列表
- 代码标识符/文件名用英文 ASCII，文档和对话用中文
- 文件写入：python pathlib.write_text(content, encoding='utf-8')。禁止 Set-Content。禁止 python -c 三重引号。

## 可参考（只读）

- GLOSSARY.md — 术语定义
- AGENTS.md — 全局约束 + Rule Precedence
- docs/architecture/data-model.md — 数据结构（影响卡片信息展示）
- docs/architecture/auth.md — 鉴权方案（影响 finance 登录流程）

## 产出物

DESIGN.md — 根目录，catstarry 专属设计系统（9 节）
docs/design/ — 更新（如有新笔记）
docs/SITEMAP.md — 如有 UI 层面的路径调整
CONTEXT.md — 设计基调段 [原型约定] → [已锁定]

## 做完后

提醒木下回到「流程治理」对话报告：Phase 4 已完成，产出物路径。
