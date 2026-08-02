# 更新记录

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
