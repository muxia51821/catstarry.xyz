# catstarry.xyz 技术选型决策记录

> 2026-07-03 | 主 agent + Curie 共同决策 | 待木下审查

---

## 决策总览

| # | 决策项 | 结论 | 置信度 |
|---|--------|------|--------|
| 1 | 数据存储 | D1（结构化）+ KV（缓存/配置） | High |
| 2 | Workers 拆分 | feed-api + finance-api 两个独立 Worker | High |
| 3 | 渲染模式 | Astro hybrid（SSG 优先，按需 SSR） | High |
| 4 | 前端交互框架 | React + shadcn/ui | High |
| 5 | 项目结构 | Monorepo | High |
| 6 | 行情 API | a-stock-data skill（simonlin1212/a-stock-data） | Medium |
| 7 | CI/CD | wrangler + GitHub Actions | High |

---

## 决策 1：数据存储 — D1 + KV

**结论**：D1 存结构化数据，KV 存缓存和配置。

| 存储 | 用途 |
|------|------|
| **D1** | 交易记录、持仓快照、cati 访问日志、年度复盘文本、/feed 帖子数据 |
| **KV** | 行情缓存、当前持仓市值快照、密码哈希、/feed 帖子缓存 |
| **R2** | /feed 媒体文件（图片/视频） |

**理由**：
- 交易记录需要多条件查询（按标的、按日期、按仓位），KV 是 key-value 不支持 SQL 式查询
- D1 免费 tier：5GB 存储、50 亿行读/月，木下五年交易记录不过几百条，完全够用
- 年度导出需求：SELECT 一个 SQL 搞定，KV 组合 key 容易遗漏
- /feed 帖子同样受益于 D1 的结构化查询（管理后台筛选、按类型/状态/日期查）

---

## 决策 2：Workers 拆分 — 两个独立

**结论**：feed-api 和 finance-api 各自独立 Worker，鉴权逻辑共享。

**理由**：
- 财务 Worker 需要 Cron Triggers（定时拉行情、PE 更新、月度提醒），feed Worker 不需要
- cron 触发时冷启动不影响 feed 响应速度
- 部署、调试、故障隔离各自独立
- 鉴权逻辑提取为 shared/auth.ts，各自引用

---

## 决策 3：渲染模式 — Astro Hybrid

**结论**：Astro output: hybrid，SSG 优先，按需 SSR。

| 模块 | 模式 | 原因 |
|------|------|------|
| /blog | SSG | 纯 Markdown，构建时生成 |
| /projects | SSG | 静态卡片 |
| /learn | SSG | 笔记目录（未来可改 SSR） |
| /feed | SSR | 鉴权 + 动态时间线 + 隐藏帖子筛选 |
| / | SSR | 聚合首页需拉取最新数据 |
| f.catstarry.xyz | 独立部署 | 独立子域名，但同样 SSR |

---

## 决策 4：前端交互框架 — React + shadcn/ui

**结论**：React 通过 @astrojs/react 嵌入 Astro，搭配 shadcn/ui 组件库。

**理由**：
- React 在 AI 训练数据中占比最大，AI 生成的代码质量最高
- 财务面板交互（交易录入浮窗、表格、PE 温度计色块）用 shadcn/ui 直接覆盖
- @astrojs/react 是 Astro 官方维护，集成最成熟
- 木下是 Vibe Coding，React + shadcn/ui 的 AI 辅助体验最好

---

## 决策 5：项目结构 — Monorepo

**结论**：单一仓库管理全部代码。

```
catstarry.xyz/
├── src/
│   ├── pages/          # Astro 页面（所有路由）
│   ├── components/     # React island 组件
│   ├── content/        # Markdown 内容（blog、learn）
│   └── lib/            # 共享工具函数
├── workers/
│   ├── feed-api/       # /feed Worker
│   └── finance-api/    # 财务面板 Worker
├── shared/
│   ├── auth.ts         # 鉴权逻辑
│   └── types.ts        # 共享类型定义
├── public/             # 静态资源
├── astro.config.mjs
├── wrangler.toml
└── package.json
```

**理由**：
- 代码量不大，multi-repo 增加管理开销
- 共享模块天然复用
- AI 在单一代码上下文里推理比跨 repo 准确（Vibe Coding 核心考量）

---

## 决策 6：行情 API — a-stock-data skill（simonlin1212/a-stock-data）

**结论**：a-stock-data skill，Workers 内 fetch 调用。

**需求**：A股实时行情（15分钟延迟可接受）+ 沪深300/中证500/中证1000 PE-TTM，全部免费。

**理由**：
- 覆盖全部需求（A股 + ETF + 三大指数 PE）
- HTTP 接口，Workers 原生 fetch 调用
- 稳定运营多年
- 新浪财经可作 backup

**方案**：安装 simonlin1212/a-stock-data skill，13个数据源、40个端点、零第三方依赖、直连HTTP、内置防封限流。行情/PE/资金流全部封装。

---

## 决策 7：CI/CD — wrangler + GitHub Actions

**结论**：wrangler CLI 部署，GitHub Actions 做 CI。

**理由**：
- Astro 构建 -> dist/ -> wrangler 部署到 CF Pages
- Workers：wrangler deploy 各自部署
- Monorepo 按变更路径决定部署范围
- Git push 触发部署符合木下说的博客发布流程

---

## 待定事项

| 事项 | blocker | 下一步 |
|------|---------|--------|
| 东方财富 API 实际可用性验证 | medium | Workers 环境发送测试请求 |
| shadcn/ui 与 Astro React island 兼容性确认 | low | 项目初始化时验证 |

---

## 需要木下确认

1. D1 作为数据库 — 引入 CF 新服务，是否接受？
2. Monorepo 项目结构 — 所有代码一个仓库？
3. 行情 API 用东方财富 — 数据来源可靠性的接受度？
4. /feed 帖子也放 D1 — 用 D1 统一管理？

