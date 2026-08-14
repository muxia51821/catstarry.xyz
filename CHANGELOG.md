# 更新记录

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
