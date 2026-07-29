# 项目上下文 (CONTEXT)

> catstarry.xyz 项目的领域上下文、术语和架构决策。
> 供 `improve-codebase-architecture`、`diagnosing-bugs`、`tdd` 等 skill 读取。

## 约定性质说明

本文档中的每节标注了性质标签：

| 标签         | 含义                     |
| ------------ | ------------------------ | ----------------------------------------------------------------------------- |
| `[已锁定]`   | Phase 0 确定的，尽量不改 |
| `[原型约定   | Phase X 重新裁决]`       | blog 原型阶段的临时约定，进入标注的 Phase 时必须重新审查，有权推翻            |
| `[定向回流中 | Phase X]`                | 已确认的上游变更正在复核受影响契约；在标注 Phase 闭合前，不得作为最终实现依据 |
| `[快照       | Phase X 更新]`           | 随项目推进需同步更新                                                          |

---

## 项目简介 [已锁定]

catstarry.xyz 是木下的个人网站，用 AI 驱动搭建。非程序员用户（Vibe Coding），AI agent 负责编码。

---

## 领域术语 [已锁定]

核心术语：

- **木下**：网站所有者，非程序员，AI 架构师
- **cati**：木下的伴侣，财务面板只读用户
- **碎碎念**：短内容发布（文字 + 图/视频），备忘录感
- **剪藏**：网页收藏（链接 + 自动摘要 + 用户点评）
- **星图**：Home 中用于板块导航的自由分布空间；不承担内容聚合
- **公开足迹**：Feed 面向访客的统一事件流／来时路；原生内容与符合规则的系统事件共同构成

  完整术语见 `GLOSSARY.md`

---

## 技术架构 [已锁定]

| 层     | 选型                                  | 部署            |
| ------ | ------------------------------------- | --------------- |
| 前端   | Astro hybrid + React (shadcn/ui)      | CF Pages        |
| 后端   | CF Workers (feed-api + finance-api)   | wrangler deploy |
| 数据库 | D1 (结构化) + KV (缓存/配置)          | CF              |
| 存储   | R2 (媒体文件)                         | CF              |
| CI/CD  | Git push → CF Pages / wrangler deploy | GitHub          |

---

## 设计基调 [已锁定 | Phase 4.3 设计侧闭合]

> `DESIGN.md` v2.1 是当前全站视觉与交互事实来源。Home Activity Signal 已完成定向 Phase 2/3 与返回 Phase 4.1 视觉重锁；2026-07-18 又完成一次极小交互重锁，正式确认 `Star Map → Focus → action`。ADR-007 继续锁定 Home 可消费无内容的三态静态投影。Phase 4.2 隔离原型已完成木下目测验收；Phase 4.3 已完成 canonical CSS、五颗星球三槽 selected assets 与 UI QA 的设计侧落地。

### 三画布系统

- **Home (Deep Space)**：冷调深黑画布 `#0A0A0C`，Klein Blue 为 Brand Voltage。Home 是 SSG 宇宙入口 → 2–3 屏接近同一星域 → 五颗完整暖性地质星球的自由总览 → 页脚；远景可为星点，接近后必须成为具有真实体积、光照和各自地貌的星球。
- **Content (Cream Gallery)**：奶油暖白画布 `#FAF9F5`，暖墨色文字，回归中文阅读舒适区。Blog、Feed、Learn、Projects 保留各自功能布局，只低剂量借用对应星球的地质纹理、切面和光学残响。
- **Finance (Cyber Arena)**：深黑画布 `#0B0E11`，松石绿 CTA `#5EAF9E`，纯数字与色块构建，无图片

### Home 签名与交互

- 五颗星球平权；大小、远近和出现顺序只表达空间纵深，不表达栏目重要性。
- Drift 是当前主构图方向：About 右上远端、Feed 近景易达、Blog 左上、Projects 左下、Learn 右下；Phase 4.2 已完成默认 Focus 序列、直接跳转、返回与 footer release 的原型验收，不运行时随机换位。
- Star Map 后存在可停留的 Planet Focus；自然滚动默认按 About → Feed → Blog → Projects → Learn 浏览，点击或键盘可直接跳到任一 Focus。
- Blog、Feed、Learn、Projects 只在 Focus action 后执行 Planet Push 并进入功能页；Focus 不加载真实板块内容。
- About 可直接点击星球原地展开；豹猫星座的两次点击蓄能 / 爆开是通往同一展开态的可选彩蛋，不是访问 About 的前置条件。
- 鼠标流星尾在 Home 完整但克制，在 Content 弱化，在 Finance 关闭；首屏 DISCOVER MORE 流星是另一种一次性引导。
- Home 不展示最近内容、Public Timeline、标题、摘要、列表或卡片；信号卫星只依据 ADR-007 的最小静态投影表达 `active` / `stable` / `dormant` 三态，视觉和 token 接口已由 Phase 4.1 重锁。
- Feed 使用单列 Public Timeline；原生 note / clip 与系统足迹可辨认但不暴露物理分存差异。

### CJK 优先

- 中文正文字号 ≥16px，行高 ≥1.85
- 标点挤压 `text-spacing-trim` + `hanging-punctuation`
- 中英混排 1/4em 间距（Phase 5 JS 实现）

### 动效

- 三条缓动曲线（ease-monopo / ease-scroll-in / ease-hover）
- CSS-only 动画工具类：.anim-fade-up / .anim-stagger / .parallax-container
- prefers-reduced-motion 降级

## 目录结构 [已锁定]

> Phase 3 裁决锁定。完整版见 `docs/architecture/modules.md`。

catstarry.xyz/
├── src/pages/ # 路由页面（blog/feed/learn/projects/home）
├── src/components/ # React islands，按模块分子目录
├── src/content/ # Astro Content Collections（blog + learn）
├── src/layouts/ # 页面布局（Base/Blog/Feed）
├── src/lib/ # 纯前端工具函数
├── src/styles/ # 暖色系 CSS 变量
├── shared/ # 前后端共享（types.ts + auth.ts + cors.ts）
├── workers/feed-api/ # 主站 API Worker（/api/_）
├── workers/finance-api/# 财务 API Worker（/api/_ + Cron）
├── public/ # 静态资源
├── docs/ # 项目文档
├── .scratch/ # 开发 issue
└── teach/ # Teach skill workspace

---

## 前端约定 [实现约定 | Phase 7 production release 已完成]

> 以下为 Phase 5/6/7 已采用并通过生产发布的前端实现约定。上线后如发现偏差，应以实际代码、测试与验收结果为准再更新本文档。

- 所有页面使用 `Base` layout（`src/layouts/Base.astro`）
- 颜色使用 CSS 变量（`var(--color-xxx)`），不硬编码
- 分类中文映射：`tech→技术`、`life→生活`、`opinion→观点`
- React island 以 `client:load` 嵌入 Astro 页面
- draft 文章不输出（`getCollection` 过滤 `draft: true`）

---

## 后端约定 [实现约定 | Phase 7 production release 已完成]

> 以下为 Phase 5/6/7 已采用并通过生产发布的后端实现约定。上线后如发现偏差，应以实际代码、测试与验收结果为准再更新本文档。

- Workers 响应必须包含 CORS 头
- 鉴权方案见 `docs/architecture/auth.md`：统一 `/login` 入口 + bcrypt + KV session + TTL 24h
- 阅读量去重：IP + slug + 日期，KV key TTL 24h
- D1 表命名：snake_case
- API 路由：`/api/views` → 扩展为 `/api/feed`、`/api/auth`、`/api/learn`（见 `docs/architecture/modules.md`）。`/api/home` 及其聚合职责已由 ADR-006 退役；blog-metadata KV bridge 同时退役。

---

## 部署 [快照 | Phase 7 production release complete]

> Phase 7 production release 已完成。当前进入 Phase 8 运营维护。

- **Phase 7 staging gate**：complete
- **Phase 7 production release**：complete
- **Production release SHA**：`665fbb3c3f01eb7fa84fb55997def210f47fe1a3`
- **Production manual smoke**：passed
- **Phase 8 operations and maintenance**：started
- **说明**：release 过程、staging 证据与 smoke 细节不在 `CONTEXT.md` 重复记录；执行调度见 `.scratch/phase5/dispatch.md`。
- **上线后迭代 / 后续业务验收**：星球 selected assets 后续替换与视觉微调；Finance 历史真实数据迁移、真实行情 provider、双角色完整业务体验及年度流程；其他真实数据驱动的业务差异。

---

## 开发状态 [快照 | Phase 8 operations started]

> Phase 5 implementation、Phase 6 QA、Phase 7 staging gate 与 Phase 7 production release 均已完成。当前进入 Phase 8 运营维护。新问题按 bug、维护、体验微调或新需求分类处理。

- /blog：✅ production release complete
- /：✅ production release complete
- /feed：✅ production release complete
- /learn、/projects：✅ production release complete
- f.catstarry.xyz：✅ production release complete
- poker.catstarry.xyz：✅ 已上线（独立部署）
- 设计系统 CSS：✅ `variables.css` / `components.css` / `typography.css` / `main.css` 已完成 Phase 4.3 canonical 对齐；Star Map、Planet、Focus、HAS、豹猫星座、About Expanded 与 Cursor Meteor 的样式接口已建立；运行时状态机、生产路由和真实数据链路仍属 Phase 5。
- 依赖基线：✅ RC1 当前基线为 Astro 7.1.3 + `@astrojs/react` 6.0.1 + `@astrojs/cloudflare` 14.1.4 + React 19.2.7 + Wrangler 4.113.0；staging gate 不静默升级依赖。
- 前端施工规则：✅ Phase 5.0B 完成，`docs/agents/frontend-rules.md` 已创建；Phase 5 前端开发线程必须引用。
- Home Activity Signal：✅ 定向 Phase 2/3、返回 Phase 4.1 视觉重锁、Phase 4.2 mock 原型验收与 Phase 4.3 canonical 视觉接口落地均已完成；ADR-007 锁定受控静态投影，真实投影接入仍不得在 Phase 5 之前越权实现。
- 共享基础设施 F：✅ 提交 `2ab3d83`、`51cd489` 已完成；独立 Code Review 已完成，P0/P1 已修复并增量复审通过。不得据此宣布任何业务模块已实现。
- Phase 7：✅ staging gate complete；production release complete；Production manual smoke passed；Release SHA `665fbb3c3f01eb7fa84fb55997def210f47fe1a3`。
- Phase 5 协作：✅ 流程减重已生效。保留三个常驻角色：流程治理、Phase 5 主执行 / 集成线程、网页端桥梁。普通模块可并行启动，但每个模块内部必须单 Owner；临时 Codex Agent 只读取模块任务包和直接相关真源，完成并合并后结束 session。
- 共享文件 Owner：package 与全局配置、Base layout、shared contracts、migrations、auth / CORS、CI/CD 与生产部署只能由 Phase 5 主执行 / 集成线程修改。
- 流程治理介入点：模块启动、模块关闭、跨模块冲突、定向回流、依赖 / 架构 Gate 与 Phase 切换。普通修复不重复登记。
- Phase 8：🟡 运营维护已启动。
