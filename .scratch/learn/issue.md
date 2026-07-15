**Category**: enhancement
**Triage**: ready-for-agent
**Triage Date**: 2026-07-04

# /learn 板块 — Product Requirement Document

> **状态**：ready-for-agent
> **创建日期**：2026-07-04
> **来源**：to-prd skill → 基于 Phase 1 结构化 JSON 合成
> **阶段**：Phase 2（规格化）

---

## Problem Statement

木下通过 teach-skill 学习编程、英语、打字、艺术、金融。学习过程中会产生大量笔记，但目前没有公开的知识整理空间——学完就散落在本地，无法沉淀、无法回顾、无法分享。需要一个结构化的学习笔记系统，把 teach-skill 产出的 lesson/reference/learning-records 转化为可浏览、可检索、可关联的知识网络。

## Solution

在 catstarry.xyz 上建造 /learn 板块：Track-first 混合组织模式（Track 为主结构 + 跨 Track wikilink 关联）。首页包含知识图谱 banner、最近更新列表、track 入口卡片和搜索框。Track 内部通过 tab 切换子分类+无限嵌套内容节点。笔记详情页支持 wikilink 侧边预览卡片+侧边栏目录树。笔记通过 teach-skill HTML 提取为 MDX 后发布。草稿仅自己可见，手动发布后公开。

## Home / Feed 定向回流覆盖规则（2026-07-15）

- Home 不再聚合 Learn 内容；下方所有“首页时间线混排／最后修改时间排序／发布后进入 Home”的旧描述均已失效。
- 发布只让笔记在 /learn 与 RSS 公开；不自动创建 Feed 足迹。
- 仅木下明确完成一个已发布小节时，使用稳定 `completionId` 创建一次 Feed Public Footprint；保存、普通编辑、草稿及重复完成不得创建第二条。
- 草稿不进入 Feed、RSS、搜索或 sitemap；系统足迹可从 Feed 隐藏但不影响源笔记。
- 权威架构来源：`docs/final-requirements-feed.json`、ADR-005、`docs/architecture/data-model.md`。

## Hard Constraints (from Phase 1 JSON)

- 所有文档和用户对话用中文
- 代码标识符、文件名、Git commit 用英文 ASCII
- 非程序员用户（Vibe Coding），AI agent 负责编码
- 流程约束：遵循 docs/workflow-orchestration.md 的 Phase 顺序，Phase 不可跳
- CONTEXT.md [已锁定] 标记的内容不可改
- /learn 内容来源：teach-skill 产出的 lessons/reference/learning-records
- /learn 筛选标准：值得公开分享的笔记，不是每课都发
- /learn 更新频率：不强制定期，有值得发的才发
- 草稿笔记仅自己可见
- 空 track 不展示在首页
- 空子分类不展示 tab
- URL 扁平化 /learn/notes/{slug}
- slug 为英文 ASCII，AI 自动生成
- 代码标识符/文件名/Git commit用英文ASCII
- 非程序员用户（Vibe Coding），AI agent负责编码
- 草稿笔记不出现在 Feed、RSS 或其他公开索引
- /learn 笔记仅手动发布后进入 /learn 和 RSS；只有明确完成小节后才产生 Feed 公开足迹
- 碎碎念不进入RSS feed

## Soft Constraints

- 搜索实现方式（前端静态 vs 后端 API）后期裁决
- 知识图谱的力导向图渲染库选型后期裁决
- 首页设计感板块的具体视觉设计后期裁决
- /learn笔记更新频率低暂可接受，内容增长后自然改善
- 已完成小节的公开足迹稀疏或暂时缺失可接受；不以普通笔记更新补足时间流
- RSS统一标题+摘要+链接策略可在二期调整

## User Stories

1. 作为木下，我完成 teach-skill 的一节课后，想把 lesson HTML 提取为 MDX 并一键发布到 /learn，这个过程应该自动化。
2. 作为木下，我想在 /learn 首页（track 集合页）看到 5 个 track 入口卡片（编程、英语、打字、艺术、金融），每个卡片有设计感（非简单网格），空 track 隐藏。
3. 作为木下，我想在 /learn 首页看到知识图谱 banner（参考 aichainmap.com 的力导向图风格），展示笔记间的 wikilink 关联网络，hover 显示标题+摘要，点击跳转笔记详情。
4. 作为木下，我想在 /learn 首页看到「最近更新」列表（按最后更新时间倒序），快速了解最近修订了哪些笔记。
5. 作为木下，进入某个 track（如「编程」）后，看到顶部 tab 切换子分类 + 下方笔记列表，空子分类不显示 tab。
6. 作为木下，笔记详情页参考 learnbuffett.com：wikilink 点击后在侧边弹出预览卡片（含目标笔记摘要），不离开当前页面；左侧有侧边栏目录树显示当前 track 的层级结构。
7. 作为木下，笔记层级支持无限嵌套——节点下可以有子节点，侧边栏目录树随当前笔记位置自动展开相应层级。
8. 作为木下，笔记可以跨 track 关联——在笔记 A（编程/track）中写 wikilink 指向笔记 B（金融/track），链接能正确解析和预览。
9. 作为木下，笔记以 MDX 格式存储，支持代码高亮、表格、图片等丰富内容语法。
10. 作为木下，URL 结构为 /learn/notes/{english-slug}，slug 由 AI 从中文标题自动生成英文 ASCII。
11. 作为木下，笔记发布前为「草稿」状态，仅自己在管理后台可见；手动点击「发布」后公开可见并进入 RSS。只有在我明确标记一个已发布小节“完成”后，才产生一条 Feed 公开足迹。
12. 作为木下，我想在管理后台按 track/状态（草稿/已发布）筛选笔记，管理发布流程。
13. 作为木下，搜索功能支持标题+标签搜索，提供即时建议和自动补全（具体实现方式后期裁决）。
14. 作为木下，未来可能有新 track 增加（动态增长），track 列表应支持扩展而非硬编码。
15. 作为访客，我想在 /learn 看到木下的学习笔记，按 track 浏览，看到知识图谱，点击笔记阅读详情。
16. 作为访客，笔记详情页看到 wikilink 时，hover/点击可以看到预览卡片，不需要跳来跳去。
17. 作为访客，笔记中有代码块、表格、图片时能正确渲染，阅读体验好。
18. 作为访客，在手机和平板上浏览 /learn 时，侧边栏折叠为抽屉式（hamburger 触发），知识图谱 banner 缩小或隐藏。

## Implementation Decisions

### 架构决策

- **渲染模式**：SSR。管理后台+即时发布需要动态能力，Phase 3 裁决（当前 JSON 与技术选型有 SSG 冲突，需统一为 SSR 或 SSG+Webhook）。
- **内容存储**：笔记以 MDX 文件存储在 src/content/learn/ 或通过 Worker 从 D1 动态拉取（Phase 3 决定）。
- **数据模型**：每篇笔记 = frontmatter（title, slug, track, tags, status, created_at, updated_at）+ MDX 正文 + wikilink 引用列表。
- **Wikilink 解析**：构建时或运行时解析 [[note-slug]] 语法，生成关联图数据。
- **知识图谱**：力导向图渲染，<200 节点时纯前端（D3.js/vis.js），后续按需加后端聚类。
- **搜索**：实现方式留待 Phase 3/5 裁决（前端静态搜索 vs Worker FTS API）。

### Track 结构

5 个初始 track（动态可扩展）：

| Track | Slug | 说明 |
|-------|------|------|
| 编程 | programming | 编程语言、框架、工具 |
| 英语 | english | 英语学习方法、资源 |
| 打字 | typing | 打字练习、速度提升 |
| 艺术 | art | 艺术鉴赏、创作 |
| 金融 | finance | 投资、理财知识 |

每个 track 下可有任意数量的子分类（通过 tab 切换），子分类下可有嵌套内容节点。

### /learn 首页布局

从上到下：
1. **知识图谱 banner** — 力导向图（参考 aichainmap.com），展示笔记关联网络，hover 显示标题+摘要，点击跳转笔记
2. **最近更新列表** — 按 updated_at 倒序，显示最近 10 条修订笔记
3. **Track 入口卡片** — 设计感板块展示 5 个 track（非简单卡片网格）
4. **搜索框** — 标题+标签搜索，即时建议

### 笔记详情页

- **左侧侧边栏**：目录树，显示当前 track 的层级结构，自动展开到当前笔记所在位置。移动端抽屉式（hamburger 触发）。
- **中间正文区**：MDX 渲染，支持代码高亮（Shiki）、表格、图片。
- **Wikilink 交互**：点击 → 侧边弹出预览卡片（显示目标笔记标题+摘要），不离开当前页面。
- **URL**：/learn/notes/{english-slug}

### 发布流程

1. teach-skill 完成一课 → 产出 lesson HTML + reference + learning-records
2. AI agent 将 HTML 提取为 MDX（包含代码块、表格等）
3. 以「草稿」状态存入 /learn
4. 木下在管理后台预览 → 手动点击「发布」
5. 发布后：公开可见、进入全站 RSS；不自动创建 Feed 足迹
6. 木下明确完成一个已发布小节后：生成稳定完成标记，创建一条 Feed 公开足迹；普通保存、编辑和重复完成操作不再创建第二条

### 草稿管理

- 草稿仅在管理后台可见（需认证）
- 认证方式：与 /feed 管理后台共享（Phase 3 确定 shared/auth.ts）
- 管理后台：按 track/状态筛选，发布/撤回操作


### 设计基调

- 继承全站「艺术温暖」视觉风格（暖米白底、暖棕文字、暖橘强调）。
- 知识图谱 banner：深色背景 + 彩色节点和连线，科技感中保留温度。
- Track 入口卡片：设计感板块，每个 track 有独特的视觉标识，不简单网格排列。
- 笔记详情页参考 learnbuffett.com 的干净结构。
- 移动端：侧边栏折叠为抽屉，知识图谱缩小或隐藏。

## Testing Decisions

- **最高接缝**：astro build 构建产物。验证所有页面正确生成、路由可访问、MDX 渲染正确。
- **Wikilink 接缝**：验证 [[slug]] 语法正确解析为链接，预览卡片内容正确。
- **知识图谱接缝**：验证图谱节点数=笔记数，连线数=wikilink 引用数，点击跳转正确。
- **发布与完成接缝**：草稿→发布后在 /learn/RSS 可发现；明确完成小节后在 Feed 可发现一次，重复操作被抑制。
- **先验参考**：项目中 /blog 板块的静态分析验收模式。
- **测试哲学**：只测外部可观测行为。

## Out of Scope

- 笔记的评论/点赞功能——不做。learn 是知识库，非社交平台。
- 学习进度追踪/打卡——不做。learn 定位为知识展示，非学习管理系统。
- 多语言 i18n——一期全中文。
- 定时发布/排期——不做。
- 全文检索——标题+标签搜索已覆盖一期需求。
- 笔记导出为 PDF/EPUB——不做。
- 协作编辑/多人维护——不做。木下唯一作者。
- 视频/音频笔记——一期仅支持文本+代码+图片 MDX。


## Further Notes

- /learn 是 Phase 3+ 的核心模块，依赖 teach-skill 启动后才能有内容。
- 与 /blog 的关系：两者独立但共享全局视觉基调和 RSS；Home 不再混排内容，Feed 承担公开足迹。
- 认证体系应与 /feed 管理后台统一（shared/auth.ts 或 Cloudflare Access）。
- 知识图谱的力导向图渲染建议选 D3.js force simulation，社区成熟，可定制性强。
- MDX 的 wikilink 解析可在 Astro 构建时通过 remark/rehype 插件实现，降低运行时开销。
- 移动端适配需要重点关注：侧边栏折叠策略、知识图谱是否显示。

---

> **Triage**: `ready-for-agent` — 定向回流的公开足迹边界已由 ADR-005 与数据模型复核；其余 /learn 渲染与认证事项继续按既有 Phase 3 输入处理。
