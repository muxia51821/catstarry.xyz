# 更新记录

## 2026-08-30 — Finance Dashboard 界面更新

- Finance Dashboard 完成现代化动效与响应式布局更新，保留各工作区 Tab 的独立配色；总资产曲线、资产配置图、最近交易和页面文案同步优化。

## 2026-08-27 — Learn 图谱交互与本地全站验收

- Learn Knowledge Map 现在支持缩放、拖拽与页面内展开；默认视图增大节点间距、关系角度与标签留白，Programming 目录入口更明确。节点始终直接进入对应文章。
- `npm run preview:local` 统一准备临时的 Home、Blog、Feed、Learn、Projects 与 Finance 代表性状态，便于一次启动完成视觉验收；该环境不执行 Learn Publish，也不代表 production 数据。

## 2026-08-26 — Feed 板块全面梳理 + Finance 表单预填修复（已合并 main；本次发布范围为 Feed Worker、Site Worker、Finance Pages）

- 共享上海时钟模块落地（`shared/shanghai-time.ts`）：feed 侧六处时间实现（浏览去重键、时间线分组、RSS、Blog/Learn 显示格式）统一走单一 Intl 原语；新增 `test:shared:time` 契约锁跨年/日界行为。顺带修正四处隐性口径问题：Feed 管理列表时间显示与按天过滤改用上海时区/上海日界、上传月份前缀、博客 `<time datetime>` 机器属性对齐上海日历日。
- Learn 发布生命周期收敛：新增 `modules/learn-publications.ts` 作为 `learn_publications` 表唯一 D1 出口（读 + 受守卫写入 + `{written, blocked}` 结果解释），`'learn-pending'` 屏障字面量归一为单一常量；Feed 路由不再手写该表 SQL。
- 足迹工厂去重：blog 首发布 / learn 首发布 / learn 修订三处近克隆合并为 `buildSourceFootprintCandidate`，版本串与幂等键形状单点定义。
- ADR-005 公开投影门收敛为「调用方注入 published 集合」单一形态：activity-signal-store 的 learn 子查询改为与 blog 对称的 json_each 绑定，learn 集合读取失败沿用"中止刷新并保留旧投影"语义；动手前先在 feed HTTP 契约补齐 legacy carve-out 信号覆盖测试。
- FeedApp/FeedAdmin 提取共享工具（分页去重、snapshot 摘要解析）；`applyFinanceMigrations` 更名为通用 `applyMigrations`。
- Finance workspace 表单预填时钟修复（`finance-site/app.js`，7 处调用点）：资产快照时间预填此前用 UTC 墙钟而服务端按上海解释（落库时间差 8 小时、日期可错一天）；月度记录月份、交易/现金流/账户事件日期此前分别跟随 UTC 月或访问者设备时区；年度复盘与档案导出的默认年份跟随设备本地年。现全部统一由新增的 `shanghaiWallClockInput()`（Intl 上海墙钟）派生；契约测试双向锁死（必须含 `Asia/Shanghai`，禁止 `getTimezoneOffset` / `toISOString` / 本地年份取值回归）。
- 文档收尾：DEPLOY.md 补记手动浏览器回归工具 `test:feed:ui` 的用途；GLOSSARY canonical naming 增加「上海时钟」词条，指向 `shared/shanghai-time.ts` 为全站唯一时钟原语来源。
- 前端缝隙收敛（PR #65）：Learn 搜索索引内联 JSON 改用 `serializeJsonForInlineScript` 安全序列化，全仓最后一个裸内联 JSON 点清零；finance-site 新增共享助手模块 `finance-shared.js` 收编三处重复的 apiBase/货币/百分比格式化，并补上首个 401 会话过期浏览器回归。
- 发布边界：Finance Worker、D1 migration 与内容同步不在本次变更范围内。

## 2026-08-25 — 架构收敛与测试瘦身（已合并 main，同日已发布生产）

- Finance API 域核心模块化（PR #55）：「最新持仓快照 / 最新有效对账」查询与估值引擎分别收敛为 `modules/snapshots.ts`、`modules/valuation-engine.ts`，cron 不再反向依赖路由文件；dashboard 死代码删除。行为等价。
- Feed API 共享缝清理（PR #56）：三处 Bearer 令牌校验统一为 `requireIngestAuth`（漏配令牌路径错误码统一为 `not_configured`）；足迹插入 SQL 收敛为单一构造器；slug 校验正则收进 `shared/slug.ts`。
- 测试基建深化（PR #57）：六份 SqliteD1 测试替身合并为 `scripts/lib/sqlite-d1.mjs`；finance HTTP 契约改跑真实 SQLite migrations（58 分支假 D1 删除）；新增 `scripts/lib/dev-server.mjs` 统一五个 astro dev 套件生命周期原语；CI 反向覆盖守卫上线，孤儿 `test:planets` 接入 validate.yml。
- Finance 微收敛（PR #58）：`lib/dates|money|cursor` 助手落地，上海时钟四种实现归一为 Intl 单实现；现金流水/账户事件的乐观并发+审计协议唯一化为 `lib/audited-write.ts`，audit-atomicity 契约随协议唯一家重定向。
- 瘦身第一轮（PR #59，净 −255 行）：audit-atomicity 字面量计数契约退役（行为仿真段保留）；feed HTTP 契约改跑真实 SQLite（235 行假 D1 删除）；五个 astro dev 浏览器套件共享 `dev-server.mjs`；home/blog 遗留清理（`_vars_backup.css`、退役组件 BlogTaxonomy 及其断言）。
- 瘦身延续与本日收尾（PR #60）：blog-runtime-authority 最后一个 SQL 前缀假 D1 迁移真实 SQLite——全仓库此类测试替身清零；cursor/snapshots 死常量收回内部；docs 清扫：5 个重复字体 zip 删除（工作区 −67MB）、四个零引用历史文档归档至 `docs/_archive/`、Phase 4.2 期一次性补丁脚本目录 `_work/` 删除。
- 以上均为仓库/测试层改动且经全量契约验证；**同日 08:40Z / 08:55Z 已完成 Finance Worker 与 Feed Worker 生产发布**（code-only 上传，绑定/routes/secrets 未触碰，省略 crons 配置未影响远程计划——Finance 部署后首个 `*/15` 行情刻度 08:45Z 已实证存活）；发布证据存于 `.scratch/deployment-feed-finance-refactor/`。

## 2026-08-24 — Finance 修复上线与持仓分类修正

- 最近几天修的 Finance 问题（估值刷新超载、交易记录和总览页显示等）已经全部发布到线上：f.catstarry.xyz 的前端和后端现在都是最新版本。
- 两只 ETF（159841、515880）的持仓分类已从「其他」改为「主动操作仓（A股）」。修改前先做了完整备份，每笔改动都留有审计记录。
- 发布后的检查全部正常：定时任务按新计划运行，网站和登录保护都没有问题。详细核对记录存在 `.scratch/release-finance-99dbdd5/production-release-reconciliation.md`。

## 2026-08-24 — Finance real-use corrections and historical valuation readiness

- Finance Overview 现在隔离 Access Log、Import Review 等辅助读取失败；主资产数据不再因此长期停在加载状态。空的导入异常审阅不再占用账户动态空间，Data Change Log 改为逐审计源读取和全局排序，规避 D1 compound SELECT 上限。
- Portfolio Allocation Map 的成分明细显示标的名称与代码；总资产同时显示累计投入和累计盈亏，且只在 authoritative Total Assets 完整时提供。
- Trade 表恢复语义列对齐；CSI 历史 PE 位置显示各指数自己的分位、窗口、样本数和 P20/P50/P80。科创 50 PE 保持描述性风险观察，不产生综合估值或交易结论。
- 新增可审阅的日线 raw-close collector：腾讯候选价配合同花顺交易日覆盖核验，输出给既有 D1 SQL generator 的 CSV 和报告，不在 Worker 中直连外部行情。

## 2026-08-18 — Post-audit corrective production release and Finance reconciliation closure

### Source / accepted corrective implementation

- 本轮 production release 以 `main@b7833e05cbb0a7760366b506af16638098c0990d` 为 exact deployed source；该 SHA 合并 PR #40 `fix(publication): guard production release convergence`，并包含本轮此前已经进入 main 的 Finance 与 Blog corrective chain。
- Finance 主体实现来自 PR #31 `feat(finance): reconcile operation history and portfolio workspace`，完成 Operation History、Data Change Log、Current Account State、Historical Asset Valuation、Security Reference、Portfolio 权威边界与相关 D1 schema；随后 PR #37 收紧 current asset / market freshness 与 failure isolation，PR #38 关闭 Total Assets UI authority seam，移除 legacy `app.js` 对 Total Assets 与 freshness surface 的竞争写入。
- Blog corrective PR #39 将 `blog:lifecycle-manifest:v1` 固定为 Blog runtime publication authority；legacy `blog:published-manifest` 只保留 rollback compatibility mirror。Present-empty lifecycle 仍然是权威状态，只有 lifecycle key 真正缺失时才允许 legacy bootstrap；malformed/unreadable lifecycle fail closed。
- Publication corrective PR #40 引入最小 release identity `{sha, generation}` 与窄 release guard：Blog 使用 monotonic sync fence；Learn 使用 `learn-pending` / `learn-active` barrier；relation manifest 带 active release identity；official production publication workflow 使用固定 concurrency group 串行化 writer。没有引入 generic release state machine、release history、Blog pending lifecycle 或 Projects publication lifecycle。

### Finance production D1 migrations `0008` → `0012`

- Production Finance D1 `finance-db` 已完成 `0008_operation_history.sql`、`0009_historical_valuation.sql`、`0010_security_reference.sql`、`0011_asset_reconciliation_other_assets.sql`、`0012_final_acceptance_invariants.sql`。
- `0008_operation_history.sql` 首次通过普通 `wrangler d1 migrations apply` 时因 compound SQLite trigger 被 Wrangler SQL splitting 误拆，返回 `incomplete input: SQLITE_ERROR`。该失败被判定为 migration runner parsing 问题，而不是 schema 设计失败；没有通过 mock acceptance 或删减 trigger 绕过。
- 对 `0008` 使用 canonical SQL 文件执行 remote direct import，随后精确核对 5 tables、8 indexes、10 triggers、`PRAGMA quick_check` 与目标 schema；再以受控的 temporary no-op ledger alignment 让 Wrangler migration ledger 记录同名 `0008_operation_history.sql`，避免重复执行已经成功导入的 DDL。
- `0009`–`0012` 均通过标准 migration path 成功执行。`0011` 重建 `finance_asset_snapshots` 并加入 `other_assets_value DEFAULT 0` 后，最新人工 / 券商快照保持原值：holdings `109,698.7`、cash `20,725.5`、other assets `0`、total `130,424.2`；未发生 snapshot authority 漂移。
- `0012` 建立 partial unique index `idx_finance_memos_one_active_per_trade`，数据库层保证每个 Trade 至多一个未删除的 active Investment Memo；迁移前后 duplicate-active query 均为 0。
- 最终 remote migration ledger readback 明确显示 id `8`–`12` 连续存在，最新项为 `0012_final_acceptance_invariants.sql`，且只读核对 `rows_written=0` / `changed_db=false`。

### Feed D1 publication release guard

- Production Feed D1 `catstarry-db` 在本轮 release 前只有 `0001`–`0004`；本轮应用 `0005_publication_release_guards.sql`，新增一个严格限定 key 的 `publication_release_guards` table：`blog-sync`、`learn-active`、`learn-pending`。
- 执行前取得 D1 Time Travel bookmark `00000265-00000000-000050cb-267875ba6f3f699614006dfbf20dfdd2` 作为恢复锚点；之后通过 repository canonical runner `scripts/apply-feed-production-migrations.ps1` 执行 migration，Wrangler 返回 `0005_publication_release_guards.sql ✅`。
- 最终 Feed migration ledger readback 显示 id `5` = `0005_publication_release_guards.sql`，其后没有新的 pending migration。

### Feed Worker, release token and Site deployment

- 先从 Cloudflare production Worker 实际 settings 读取并复用 Feed D1、`AUTH_KV`、`VIEW_KV`、`MEDIA_BUCKET`、`HOME_PROJECTIONS` 与 cron contract，生成一次性 `.scratch` production config；没有把 production resource ID 写入 repository，也没有复用 staging placeholder config。
- Feed Worker production deploy 完成后，`/api/feed?limit=1`、`/api/blog/publications`、`/api/learn/publications`、`/activity-signals.json` 与 auth boundary smoke 均正常。
- PR #40 之后 Site production runner 新增 `FOOTPRINT_INGEST_TOKEN` release-barrier requirement。原有 Cloudflare Feed Worker secret 无法读取明文，因此本轮执行一次受控 token rotation：同一新 token 写入 GitHub `production` environment secret、Cloudflare `catstarry-feed-api-production` Worker secret，并保留在当前 release PowerShell process environment 中供 Site runner 使用。
- Cloudflare 第一次 `wrangler secret put` 返回 upstream `502 Bad Gateway`。没有把该 timeout/error 当成成功，也没有立即继续 Site deploy；使用无副作用的 `/api/learn/internal/release/prepare` + invalid body 探针验证新 token，当时返回 `401 unauthorized`，证明 Cloudflare secret 尚未切换。随后仅重试 Cloudflare secret write 一次并成功；同一探针变为 `400 invalid_release`，证明 bearer authentication 已通过且没有创建 pending release。
- `scripts/deploy-site-production.ps1` 随后完整通过 build / scoped validation、Wrangler dry-run、Blog source-survival preflight、Learn exact pending prepare、Learn transition preflight、真实 Site deploy 与 HTTP smoke。
- Production Site Worker 本轮 deployment version 为 `2ccb57fe-ae75-42cd-a479-778167e6e6f1`；runner 明确报告 `Deployed commit SHA: b7833e05cbb0a7760366b506af16638098c0990d`，并确认 `/`、`/activity-signals.json`、`/api/feed?limit=1` 均为 HTTP 200。

### Exact-SHA Blog / Learn publication convergence

- Site 确认成功后，发送 `repository_dispatch` event `catstarry-production-deployment-succeeded`，payload 固定 `environment=production`、`status=success`、exact SHA `b7833e05cbb0a7760366b506af16638098c0990d`；没有使用“当前 main”替代 deployed SHA。
- GitHub Actions publication sync run `32097175402` 完整成功：`Verify deployed commit`、`Sync Blog publications`、`Sync Learn publications`、`Require both publication syncs` 全部 `success`。
- Final D1 release-guard readback：
  - `blog-sync` → SHA `b7833e05cbb0a7760366b506af16638098c0990d`, generation `407`；
  - `learn-active` → 同一 SHA、同一 generation `407`；
  - `learn-pending` 不存在。
- 因此 Blog runtime projection、Learn relation metadata 与 active Site release 已收敛到同一个 exact release；Learn lifecycle pending barrier 已正常解除。Content Production Release 在该 readback 后可判定 CLOSED。

### Finance Worker and Pages production deployment

- Finance D1 已在 Worker deploy 前确认到 `0012`，因此本阶段没有重复 migration、rollback 或数据清理。
- Finance Worker 使用 live account bindings 生成一次性 production config，保留 production `finance-db`、`FINANCE_AUTH_KV`、现有 dashboard vars/secrets 与 accepted crons `*/15 * * * *`、`30 7 * * 1-5`；dry-run 通过后部署 `catstarry-finance-api-production`。
- 本轮 Finance Worker production deployment id 为 `c63cd60a-7323-42a2-8fcc-3c074ef854c7`。部署后 `/api/account-state`、`/api/holdings`、`/api/trades` 未登录边界均稳定返回 `401 Authentication required`；不存在的 Finance route 返回 `404 Finance route not found`，证明 account-state route 已进入 production runtime。
- Worker 刚部署后的第一次 `/api/account-state` probe 曾短暂返回 404；没有据此 rollback。随后 readback 显示新的 deployment 已存在，重复 probe 稳定为预期 401，而真实不存在 route 保持 404，因此将该现象记录为 deploy/route propagation window，而非 current-code route 缺失。
- Finance static site 通过 `wrangler pages deploy finance-site --project-name catstarry-finance-production --branch main --commit-hash b7833e05...` 发布。Cloudflare Pages deployment id 为 `29409a76-9960-4107-b290-321ab02548e8`，Environment = Production，Branch = `main`，Source = `b7833e0`；`https://f.catstarry.xyz/` 最终 HTTP 200。
- Pages CLI 当时检测到前序 Site build 遗留的 `dist/server/wrangler.json` redirect configuration，并提示其缺少 `pages_build_output_dir`；Wrangler 明确忽略该 config 的 Pages build-output contract，仍按显式 `finance-site` directory 与 `catstarry-finance-production` project 完成部署。后续 deployment list 和 custom-domain 200 readback 证明 deployment target 正确。该 redirect warning 仅作为后续 deployment-tooling cleanup 记录，不作为本次 release blocker。

### Finance correctness boundary carried into production

- `/api/account-state` 现在是 current account-state authority；Total Assets 只在 holdings、Broker Cash、Other Account Assets 均可被可靠计算时形成 exact value。
- Portfolio UI 是 current Total Assets surface 的 sole owner；legacy `app.js` 不再把 securities-only `holdings.total_market_value` 写入 Total Assets DOM，也不再竞争 account-state freshness surface。
- Current-account holdings 在 accepted A-share trading window 内受 persisted quote freshness SLA 约束；stale intraday quote 会让 exact Total Assets unavailable，而非展示过期精确值。休市 / 收盘后的 accepted quote 不做机械 30-minute expiry。
- Operation History / Data Change Log、Historical Asset Valuation、Security Reference、Reconciliation sealed-history、same-day Trade ordering、reverse-repo principal 与 cash-effect separation、one-active-Memo invariant 均随 PR #31 / #37 / #38 进入本次 production code + schema baseline。

### Final production acceptance

- Owner 已在 production `f.catstarry.xyz` 完成真实使用验收，确认 Total Assets、Portfolio / 持仓、交易 / 操作记录与基本交互正常；未登录 HTTP probe 不再承担最终产品验收职责。
- Content / Publication 与 Finance 的 deployment、migration、release guard、publication sync、Pages/Worker runtime 和 owner real-use acceptance 均已闭环；本轮未使用 rollback。
- **Post-Audit Corrective Production Release & Acceptance = CLOSED.**

### Deployment tooling follow-up

- PR #41 `fix(deploy): clean generated Wrangler redirect after Site release` 关闭了本轮 Finance Pages 发布时暴露出的本地 Wrangler config 泄漏：Site production runner 现在只在真实 Site deploy 与三个 production HTTP 200 smoke 全部成功后删除 `.wrangler/deploy/config.json`，避免后续独立的 `wrangler pages deploy` 继承上一轮 Site build 的 redirected `dist/server/wrangler.json` context。
- Cleanup 为 best-effort：本地 redirect 删除失败只记录 warning，不会把已经成功的 production deploy 伪装成失败；真实 deploy 或任何 production smoke 失败时，执行会在 cleanup 之前终止，因此 redirect 与 `dist/server/wrangler.json` 都保留用于诊断 / exact-build reuse。
- PR #41 exact head `012f3a74daa9b33a57fd3eb8d6979187300757ec` 的 GitHub Validate #271 全部通过，包括 contracts、Worker config/types/typecheck、Site typecheck/build/output、Learn/Blog preview、local-preview lifecycle、browser CI、Feed Worker、双 D1 migration repeat、Worker dry-run 与 `git diff --check`。该 follow-up 没有重新部署 production。

### Operational observations / deferred cleanup

- Wrangler/Worker 命令的非零退出、502 或 timeout 不再自动解释为业务失败或成功；本轮 secret rotation 通过独立 authenticated probe 明确判定第一次写入未生效，再进行单次精确 retry。
- Production deployment 时保留 failure-domain separation：Content / Publication 完成并收敛后才进入 Finance；没有把已经成功的 migration/Worker/Pages mutation 回滚来追求“版本看起来整齐”。
- Deferred、非本轮 blocker：Finance legacy dashboard 大 `Promise.all` decomposition；account-state early scheduling；generic release coordinator / release history；Blog pending lifecycle；Projects publication lifecycle；删除 legacy Blog published mirror。

## 2026-08-16 — Governance documentation reality reconciliation

### Governance / Documentation

- 完成 current-facing Product、Design、Architecture、Frontend、Acceptance 与 onboarding 文档的 reality reconciliation：保留仍有效的机制与接口合同，移除已 superseded 的 current-looking 结论，并将旧 Design 2.1 原样归档为历史参考。
- 对齐 Home Activity Signal、Blog / Learn publication、Public Timeline、Finance scheduled market、Design → CSS token、Projects release / Footprint 和 ADR-005 source-projection 边界；明确 implementation、acceptance、merge、deployment 与 production evidence 彼此独立。
- 完成 cold-start reading path 收敛：新 Agent / Session 从 `AGENTS.md` → `CONTEXT.md` 进入，再按任务读取 Product、Architecture、Design/Frontend、Routes 或 Deployment current source。
- 本轮是 repository documentation reconciliation，不代表 production 重新部署。

### 补记（2026-08-24 添加）

- 同日还有一次漏记的 Finance 上线：两个历史数据修复（历史快照的时间规范化、历史数据验收加固）当天已发布到 f.catstarry.xyz 的后端。
- 另补记 8 月 18 日合并的 Blog 修复（PR #42）：已发布文章的源文件如果暂时缺失，会保留它的发布身份，但不会对访客显示，也不会出现在可操作列表里；源文件恢复后自动接回。注意：主站最后一次部署停在 8 月 18 日上午，这个修复还没随主站上线。

## 2026-08-15 — Learn runtime publication and Content interaction follow-up

### Learn

- 将 Public Learn 的普通发布可见性转为 production runtime 管理：Owner Admin 支持 Publish / Hide / Show，公开 Learn 页面、Feed 投影、RSS 与 sitemap 按运行时 publication state 读取；本地 Preview 保持只读生命周期管理。
- 增加 Learn 公开关系校验与部署后 revision / relation metadata 同步；首次正式发布与后续 revision 使用不同写入边界，历史 `learn_section_completed` 保持只读兼容。

### Content Family

- 为 Cream Gallery 增加独立的 Content Paw Trail，并保留与其分离的 click feedback；Home Cursor Meteor 与 Finance 交互边界保持独立，fine-pointer / reduced-motion 降级继续生效。

### Governance

- 将 Phase 8 工作流与 Agent governance 调整为 current-first、按职责读取和 bounded Touch-on-Conflict；移除 Dashboard / mandatory cold-start 作为正常维护入口的依赖，并同步共享术语边界。

## 2026-08-14 — Content Family lifecycle and validation hardening

### Learn

- 完成 Learn 公共 corpus transition 与 empty corpus 兼容：撤回历史公开 Note 时保留直接路由和历史关系，公开清单可以安全表示空 corpus。
- 增加本地私有预览中的 Learn 草稿发布 gate、owner 导航和生命周期校验，明确本地 authoring 与 production publication 的边界。

### Content Family

- 完成 Blog、Feed、Learn、Projects 的 owner lifecycle 约束与统一认证边界：支持受保护的 Blog preview、发布／撤回／恢复流程，并保持 Feed 为 session authority。
- 为 Content 页面加入仅限细指针设备的 click-only meteor flash 与原生 CJK autospace；Home runtime 保持隔离，reduced-motion 和无障碍边界继续生效。

### Validation / Operations

- 稳定 hosted browser regression 与 local preview lifecycle：改用语义化 hover 验证、可靠的预览端口 reservation 和进程组清理，减少 CI runner 与本地服务时序造成的误报。
- 补充 Content owner、Blog preview、Learn preview/publication、Feed HTTP、Site browser 和输出契约覆盖，便于后续 release 前验证真实行为。

## 2026-08-13 — Content Family production release closure

### Content Family

- 完成 Blog、Feed、Learn、Projects 的 Content Family production release；Final Content Integration = PASS。
- Production Release = COMPLETE；Production Acceptance = PASS WITH NON-BLOCKING OBSERVATION；Content Family 当前回到 Phase 8 maintenance。
- Feed × Learn integration = CLOSED；Shared Footer = PARKED；Projects → Feed canonical destination 为 `/projects/`。

### Operations / Architecture

- Feed production 已应用 `0003_learn_note_events.sql`；Learn manifest v2 已初始化且 `created=0`，Blog sync `created=0`。
- Learn Note event 与 legacy Learn section event compatibility 已进入当前 production architecture reality。

## 2026-08-11 — Blog and Projects content surface reconciliation

### Blog

- 新增文章《趁这些想法还没有流走》：从死亡、选择与意义出发，记录做个人网站过程中逐渐形成的工程实践、判断和自我理解。
- 重整博客归档、分类和标签页的阅读索引：文章按日期、标题、摘要和分类形成更清晰的连续列表，分页改为“较新的文章／更早的文章”，减少重复入口和界面噪音。
- 改进文章阅读路径：文章页增加返回博客、标签和上一篇／下一篇导航，正文、元信息和分享区域重新组织，在桌面和移动端保持连贯的阅读宽度。
- 调整浏览统计边界：匿名访问继续记录阅读，但阅读数只对已认证的站点所有者显示，避免在公开归档中批量暴露统计数据。

### Projects

- Projects 索引改为展示全部公开项目，不再固定截取最近两项；更新项目介绍文字，使页面更像持续维护的项目记录，而不是一次性的部署清单。
- 简化无截图项目的占位表现，并补充 hover、键盘 focus 和 reduced-motion 下的卡片反馈。

### Added

- 新增 Blog reconciliation contract 和浏览器回归覆盖，验证归档交互、文章阅读、浏览统计边界、响应式布局与项目索引契约。

## 2026-08-09 — Home and Finance workspace hardening

### Finance

- 重整 Finance 工作区的导航层级与标签命名，区分总览、交易记录、资金与计划、管理记录等入口，并为各工作区补充明确的 active 状态色彩。
- 改进 Finance 加载状态、ARIA tab 状态、移动端触控尺寸、中文排版和 reduced-motion 行为；单个可选数据接口异常时继续保留其他面板内容。

### Site / Home

- 收敛 Home 的 canvas、HAS、Planet、Cat 状态契约，移除未接入生产的平行 CSS 实现，降低样式覆盖和 design/production contract 漂移风险；视觉表现保持不变。

### Operations / Architecture

- 加强 Feed 与 Finance Worker 的请求认证比较、结构化错误日志和行情异常诊断，并收紧 Worker 配置与 Site SESSION binding 的部署前校验。
- 同步架构、前端规则和 Phase 8 工作流文档，使其与当前生产模块边界保持一致。

### Added

- 新增 Home CSS structural contract regression 和 Finance UI regression 覆盖，保护关键状态接口、工作区交互和响应式行为。

## 2026-08-06 — Finance workspace and architecture follow-up

### Finance

- 财务面板新增真实现金流记录、资产快照和自动风险信号，分别展示资金投入与取出、资产完整性以及回撤和风险提示。
- 改进现金流编辑与删除、资产快照保存后的数据刷新，并在单个风险接口不可用时保留其他面板内容。
- 补充 Finance preview mock 场景和 UI 回归覆盖，方便验证管理员与只读用户看到的不同状态。

### Operations

- 新增 `preview:stop`，可按预览端口精确停止当前本地预览，释放三项服务端口并清理临时状态。
- 增强本地预览对旧格式状态目录和遗留进程的恢复能力，并补充对应生命周期验证。

### Architecture / Governance

- 重新对齐架构文档与当前实现，细化 Workers、Finance Pages、路由、鉴权、D1/KV 存储和公开／私有页面边界，减少历史阶段描述与现行系统之间的歧义。
- 统一项目术语和模块职责，联动更新 `CONTEXT.md`、`GLOSSARY.md`、`docs/SITEMAP.md`、架构文档、相关 ADR 与工作流治理说明。

## 2026-08-04 — Finance market reliability

### Finance

- 提升行情刷新连续性：Tencent 个别报价缺失时尝试 Sina 补价；Sina 无有效价格时保留 Tencent 原报价。
- TradingView 行情失败时不再阻断 Tencent 行情更新。
- 优化行情新鲜度判断，减少休市、停牌等场景下的误报。
- 修复 `920xxx` 指数代码映射，确保北京交易所行情可正常读取。

## 2026-08-03 — Learn authoring follow-up

### Learn

- 统一 Learn 内容导入、校验和发布清单的规范格式，后续 authoring 以 Markdown 文件为准。
- 新增《域名、DNS 与 HTTP：浏览器如何找到 catstarry.xyz》学习草稿，并支持从 Learn 管理页打开认证后的私有预览。
- 为私有预览补充未认证、认证服务不可用和不存在笔记时的安全处理，避免草稿进入公开 Learn 页面或搜索索引。

### Site

- 修复首页星球纹理逐步出现时仍残留目标点的问题，让星球显现过程更干净。

### Operations

- 修复本地预览生命周期测试对全局临时目录的脆弱断言，改为按当前进程的 owner marker 验证 graceful stop 和 forced stop 后的状态回收。
- 补充本地预览子进程异常和提前退出的诊断信息，减少生命周期测试被误报为超时的情况。

### Governance

- 更新 `AGENTS.md` 的 Git 约束：代码、功能和 Bug 任务默认使用独立任务分支；任务分支单机独占；同步远端 `main` 使用 `git pull --ff-only`；`main` 不作为日常开发工作区。
- 在 `docs/DASHBOARD.md` 记录同一套 Git 约束基线，明确治理文档与执行规则保持一致。

## 2026-08-02 — Phase 8 follow-up

### Site

- 集中维护首页文案，调整星图导航和内容页之间的返回路径。
- 为首页补充联系方式入口，并统一 Blog、Feed、Learn、Projects 的页面导航体验。

### Blog

- 优化文章列表和阅读页的返回导航、排版与阅读层次。

### Feed

- 修复公开时间线初次进入时可能显示为空的问题，改为在浏览器中加载并明确显示加载状态。
- 增强剪藏链接预览的输入校验，避免无效链接触发预览请求。

### Finance

- 改进行情刷新在边缘运行环境中的兼容性，提升市场数据更新可靠性。
- 将月度查阅提示调整为查看持仓后再出现，减少登录后的打扰。

## 2026-08-02 — Phase 8

### Site

- 重新整理首页文案和星球交互，改善首屏稳定性与浏览体验。

### Blog

- 改进文章详情页的阅读布局、字体和视觉层次。
- 新增文章《我准备开始写作》，并补充配图。

### Finance

- 扩展行情适配与资产数据流程，支持更完整的市场和现金流快照。
- 优化持仓、交易、记录和风险复核相关的面板交互。

## 2026-07-29 — Phase 7 首次 coordinated production release

- Source SHA：`665fbb3c3f01eb7fa84fb55997def210f47fe1a3`
- 组件：Site Worker、Feed Worker、Finance Worker、Finance Pages，以及 Blog / Learn publication sync。
- Production verification：[GitHub Actions run 30451197533](https://github.com/muxia51821/catstarry.xyz/actions/runs/30451197533) 的 attempt 3 成功；production manual smoke passed。
- Publication verification：Blog 建立 production baseline，`synced: 1`；Learn 同步 five slugs。
- Migration verification：Feed migrations `2/2`、Finance migrations `5/5` 在 production import 后完成核验。
