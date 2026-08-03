# 更新记录

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
