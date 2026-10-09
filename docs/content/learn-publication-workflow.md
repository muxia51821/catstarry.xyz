# Learn Public Note 发布流程

本流程只处理 Private Learn 中已验证素材到 Public Learn Note 的选择性重写；它不公开 Mission、Lesson 或 Learning Record。

## 1. 选择与重写

1. 在私有 workspace 中只读筛选具备稳定、可复用结论和可信来源的素材；先列候选并取得木下确认。
2. 从最新、干净的 `main` 创建独立 `task/learn-publication-batch-<date>` 分支；私有 workspace 只作为来源，不写入或同步到网站仓库。
3. 以 `src/data/learn/<track>/<slug>.md` 新建 Public Note。可用 `npm run learn:slug -- "标题" "English translation"` 生成候选 slug；`npm run learn:import -- ...` 只可作为 HTML 转 Markdown 的机械起点，最终正文必须经过独立重写。
4. 保留读者需要的概念、边界、示例和参考链接；删除学习者诊断、检索题、课程编号、私有路径与会话记录。格式与 frontmatter 规则见 [ADR-008](../adr/008-learn-markdown-canonical-content-format.md)。
5. 新源文件默认是 Hidden 候选。不要用 `state: published` 或 `publishedAt` 代替 runtime Admin Publish。

系列文章可以用共同的`title`和可选`subtitle`保留篇名，`excerpt`继续承担摘要。独立副标题由正文页展示；列表、搜索、关联提示、发布清单与首次发布足迹使用主／副标题组合，已有无副标题笔记保持原显示。字段定义见`src/content.config.ts`的Learn schema，组合规则见`shared/learn-title.mjs`。

## 2. 关系与验证

1. 只在确有读者关系时加入 `[[wikilink]]`；不要因同 Track 自动建立关系。
2. 每个链接目标都必须是 production 时可公开解析的 Note。普通依赖可先发布目标，再发布引用它的 Note；互相引用的首次发布循环，可在 Owner 管理列表中将尚未公开的相关 Note 一起批量发布。未公开且未选入本批的目标仍会被完整关系校验拒绝。
3. 运行 `npm run test:learn:authoring`、`npm run test:learn:preview`、relation integrity 与 repository Validate / CI，并在 Preview 逐篇检查正文、章节导航和 wikilink。

## 3. PR、生产发布与首次 Publish

1. 创建 PR，待 CI 通过后合并到 `main`。
2. 从 exact、clean、最新的 `main` 核对当前 production SHA 到 `main` 的完整 release diff，再按 [DEPLOY](../DEPLOY.md) 执行 Site production release。
3. 生产部署确认成功后运行 `npm run release:dispatch-sync`；若结果不明或 lifecycle 暂不可用，先运行 `npm run release:status` 核对 exact release，不重复发送或点击 Publish。
4. Sync 全绿后进入 `/learn/admin/`，逐篇打开 Production Preview。首次 Publish 由木下亲自执行：普通依赖按顺序逐篇发布；互引循环则勾选全部相关未公开 Note 后使用“批量首次发布”。系统先校验当前公开 Note 与所选集合的完整关系，全部通过后才创建各篇 runtime publication 与首次 Learn Footprint。

## 4. 异常边界

- `409`：所提公开集合的 wikilink integrity 不成立，或批量选择包含已发布条目。确认所有目标已经公开或已纳入本批后再试；不要绕过校验。
- `503`：pending release 还未被 exact sync 激活。先检查 `npm run release:status`，不要重复点击 Publish。
