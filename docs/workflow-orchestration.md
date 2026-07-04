# catstarry.xyz 开发流程编排方案

> 本文档定义从「需求」到「上线维护」的完整 pipeline，明确每个阶段用哪个 skill、在哪个对话线程执行、产出物是什么。
> 最后更新：2026-07-04

---

## 流程总览

```
Phase 0: 基础设施 ──→ Phase 1: 需求澄清 ──→ Phase 2: 规格化
      ↓                                             ↓
Phase 3: 架构设计 ──→ Phase 4: UI/原型
      ↓
Phase 5: 开发实现 ──→ Phase 6: 测试/QA
      ↓
Phase 7: 部署上线 ──→ Phase 8: 运营维护 ──→ (循环回 Phase 1)
```

**核心原则**：
- 每个 Phase 独立一个 Codex 对话线程，fork 自上一个 Phase，继承上下文
- 产出物全部落在 `docs/` 或 `.scratch/` 中，Git 提交
- 木下（非程序员）审核文档层面的产出物；AI agent 负责编码

---

## Phase 0：基础设施（一次性）

| 属性 | 内容 |
|------|------|
| **目标** | 建立项目和 AI agent 协作的基础环境 |
| **输入** | 空仓库 |
| **产出物** | `GLOSSARY.md`、`CONTEXT.md`、`AGENTS.md`、`docs/agents/*.md`、`.scratch/` |
| **负责对话** | 基础设施线程（一次性执行） |

### 步骤序列

| # | 动作 | 用到的 skill | 说明 |
|---|------|-------------|------|
| 0.1 | `ubiquitous-language` | 从 handoff 提取领域术语 → `GLOSSARY.md` | 所有后续对话对齐口径 |
| 0.2 | `setup-matt-pocock-skills` | 配置 issue tracker + triage labels + domain docs | 已完成 ✅ |
| 0.3 | 写 `CONTEXT.md`（手动/AI） | 项目一句话简介、技术栈、关键约束 | 供 `improve-codebase-architecture`、`diagnosing-bugs` 读取 |
| 0.4 | `git-guardrails-claude-code` | 配置 Git 规范（commit message 格式、分支策略） | 开发阶段前必须到位 |

---

## Phase 1：需求澄清

| 属性 | 内容 |
|------|------|
| **目标** | 将模糊想法转化为结构化、可验证的需求 |
| **输入** | handoff 文档 + 木下口述新需求 |
| **产出物** | B2/B3 完成、`/learn` `/projects` `/finance` drill 完成、需求确认文档 |
| **负责对话** | 需求分析线程（独立线程，非 fork） |

### 步骤序列

| # | 动作 | 用到的 skill | 说明 |
|---|------|-------------|------|
| 1.1 | 继续 B2 — /feed 媒体处理 | `grill-me` | 7 层 drill：媒体来源 → 存储方案 → 上传 UX → 格式转换 → 大小限制 → 删除/替换 → 成本预估 |
| 1.2 | B3 — /feed 内容管理 | `grill-me` | 7 层 drill：草稿管理 → 批量操作 → 搜索/筛选 → 归档 → 数据导出 |
| 1.3 | `/learn` 内容结构 | `grill-me` | 轻量 drill：笔记格式、页面布局、与 teach skill 的输出格式衔接 |
| 1.4 | `/projects` 页面布局 | `grill-me` | 轻量 drill：卡片信息字段、排序逻辑、与 poker 的链接方式 |
| 1.5 | `/finance` 技术需求 | `grill-me` | 中等 drill：数据格式映射 Excel→D1、cati 鉴权 UX、实时数据刷新策略 |

### 结束条件

- 所有 drill 完成，无遗漏分支
- 木下确认需求不再修改
- 产出：`docs/final-requirements-*.md`（每个模块一份）

---

## Phase 2：规格化（需求 → 可执行的卡片）

| 属性 | 内容 |
|------|------|
| **目标** | 将需求文档拆分为结构化 issue，分类评估优先级 |
| **输入** | `docs/final-requirements-*.md` |
| **产出物** | `.scratch/` 下多个 issue.md + triage 标签 |
| **负责对话** | fork 自需求分析线程 |

### 步骤序列

| # | 动作 | 用到的 skill | 说明 |
|---|------|-------------|------|
| 2.1 | 全量需求 → issue | `to-issues` | 每个模块（blog/feed/learn/projects/finance）生成一组 issue |
| 2.2 | issue 分类评估 | `triage` | 给每个 issue 打标签：`needs-triage` → 评估后 → `ready-for-agent` / `ready-for-human` / `needs-info` / `wontfix` |
| 2.3 | 关键 issue → PRD | `to-prd` | 对复杂度高的 issue（如 /feed 媒体处理、财务数据同步）展开成含验收标准的完整 PRD |

### 结束条件

- `.scratch/` 下每个模块有完整的 `issue.md`
- 每个 issue 有 triage 标签
- 复杂 issue 有对应 PRD

---

## Phase 3：架构设计

| 属性 | 内容 |
|------|------|
| **目标** | 基于 PRD 确定技术架构细节，补充 tech-decisions 中未覆盖的部分 |
| **输入** | PRD docs + `docs/tech-decisions-20260703.md` |
| **产出物** | `docs/architecture.md`、`docs/adr/*.md` |
| **负责对话** | fork 自规格化线程 |

### 步骤序列

| # | 动作 | 用到的 skill | 说明 |
|---|------|-------------|------|
| 3.1 | 领域建模 | `domain-modeling` | 将术语表转化为 D1 schema、API 数据结构 |
| 3.2 | 代码库架构设计 | `codebase-design` | 确定 monorepo 的目录结构、模块边界、依赖关系 |
| 3.3 | 数据流设计 | `cloudflare` + `workers-best-practices` | Workers 路由、D1/KV/R2 读写模式、Cron Triggers 设计 |
| 3.4 | 鉴权方案设计 | `cloudflare-one` | /feed 发布鉴权、f.catstarry.xyz 密码鉴权的具体实现方案 |
| 3.5 | 架构决策记录 | — | 写入 `docs/adr/`，每条决策一个 ADR |

---

## Phase 4：UI / 原型

| 属性 | 内容 |
|------|------|
| **目标** | 产出视觉设计方向和关键页面原型 |
| **输入** | 站点地图 + 设计风格定调（artistic warm） |
| **产出物** | Figma 链接 / AI 工具产出 + 关键页面 HTML 原型 |
| **负责对话** | 独立线程（可与 Phase 3 并行） |

### 步骤序列

| # | 动作 | 用到的 skill | 说明 |
|---|------|-------------|------|
| 4.1 | 视觉方向探索 | `design-an-interface` | 用 styles.refero.design / designmd.me / neuform.ai / getdesign.md 产出 moodboard |
| 4.2 | 关键页面原型 | `prototype` | /blog 列表页、/feed 时间线、/finance 面板的交互原型 |
| 4.3 | Web 视觉实现 | `web-design-engineer` | 将原型落地为 HTML/CSS，产出 `share_page.html` 式的可交互页面 |

---

## Phase 5：开发实现

| 属性 | 内容 |
|------|------|
| **目标** | 逐模块实现功能代码 |
| **输入** | PRD + ADR + UI 原型 + triage 后的 issue |
| **产出物** | 可运行的功能代码 |
| **负责对话** | 多个并行线程（按模块拆分） |

### 执行策略：fork + subagent

开发阶段是**唯一适合大量使用 subagent 和并行对话的阶段**。

**主控线程**（本对话）负责：
- 协调模块间接口
- 集成 subagent 产出
- 处理跨模块问题

**并行子线程**（各 fork 独立对话或 subagent）：

| 线程 | 负责模块 | skills |
|------|---------|--------|
| 开发-A | `/blog`（列表 + 详情 + 分类 + 标签 + RSS） | `implement`、`tdd`、`code-review` |
| 开发-B | `/feed`（时间线 + 发布面板 + 媒体上传 + 鉴权） | `implement`、`tdd`、`code-review`、`cloudflare`、`wrangler` |
| 开发-C | `/projects` + `/learn`（静态卡片页面） | `implement`、`scaffold-exercises` |
| 开发-D | `/` 聚合首页 | `implement`、`tdd` |
| 开发-E | `f.catstarry.xyz` 财务面板 | `implement`、`tdd`、`code-review`、`a-stock-data`、`cloudflare-one` |
| 开发-F | 共享基础设施（鉴权、类型、D1 schema、CI/CD） | `implement`、`workers-best-practices` |

### 每个模块的开发流程（微型 loop）

```
  tdd ──→ implement ──→ code-review ──→ (修改) ──→ 通过
    ↑                                              ↓
    └──────────── qa（不通过）←───────────────────
```

- **tdd**：先写测试用例（白纸黑字的预期行为）→ 木下审核 → AI 写代码
- **implement**：基于测试用例实现功能
- **code-review**：自动审查 → 人确认 → 合并
- **qa**：对照 PRD 验收标准跑一遍 → 通过 / 回退

---

## Phase 6：测试 / QA

| 属性 | 内容 |
|------|------|
| **目标** | 全站集成测试 + 性能验证 |
| **输入** | 全部模块代码 |
| **产出物** | QA 报告 |
| **负责对话** | 独立线程（依赖 Phase 5 全部完成） |

| # | 动作 | 用到的 skill | 说明 |
|---|------|-------------|------|
| 6.1 | 全站 QA | `qa` | 按 PRD 逐条验收 |
| 6.2 | Web 性能 | `web-perf` | Lighthouse / Core Web Vitals |
| 6.3 | 财务面板 QA | `qa` | Excel 数据迁移正确性、实时行情准确性 |

---

## Phase 7：部署上线

| 属性 | 内容 |
|------|------|
| **目标** | 推送到生产环境 |
| **输入** | QA 通过的代码 |
| **产出物** | live 网站 |
| **负责对话** | 主控线程 |

| # | 动作 | 用到的 skill | 说明 |
|---|------|-------------|------|
| 7.1 | D1 schema 初始化 | `wrangler` | `wrangler d1 execute` 创建表 |
| 7.2 | KV namespace 创建 | `wrangler` | 创建缓存/配置 namespace |
| 7.3 | R2 bucket 创建 | `wrangler` | 创建媒体存储 bucket |
| 7.4 | CF Pages 部署 | `wrangler` | `wrangler pages deploy` |
| 7.5 | Workers 部署 | `wrangler` | feed-api + finance-api 各自部署 |
| 7.6 | 域名 DNS 配置 | `cloudflare` | 子域名 CNAME/Worker Route 配置 |
| 7.7 | 环境变量/密钥配置 | `wrangler` | `wrangler secret put` |

---

## Phase 8：运营维护（持续循环）

| 属性 | 内容 |
|------|------|
| **目标** | 保持网站可用，持续改进 |
| **输入** | 线上反馈、木下新需求 |
| **负责对话** | 按需新建 |

### 常规维护

| 触发 | 动作 | 用到的 skill |
|------|------|-------------|
| 线上 bug | 诊断 → 修 → 部署 | `diagnosing-bugs` → `tdd` → `implement` |
| 性能退化 | 定位 → 优化 | `web-perf` → `improve-codebase-architecture` |
| 技术债积累 | 分析 → 重构方案 → issue | `improve-codebase-architecture` → `to-issues` |
| 新功能 | 回到 Phase 1 | `grill-me` → `to-issues` → `triage` → … |

### 数据维护

| 周期 | 动作 | 说明 |
|------|------|------|
| 每月 | 博客发布 | Git push Markdown → CF Pages 自动部署 |
| 每季度 | D1 备份 | `wrangler d1 backup` |
| 每年 | 财务年度导出 | D1 → Excel（存档 + 签署） |

---

## 当前进度

| Phase | 状态 | 备注 |
|-------|------|------|
| 0 — 基础设施 | ✅ 完成 | AGENTS.md、issue tracker、triage labels、domain docs 已配置 |
| 1 — 需求澄清 | 🔶 进行中 | B1 完成，B2/B3 待 drill；/learn、/projects、/finance 待 drill |
| 2 — 规格化 | ⬜ 待开始 | 依赖 Phase 1 |
| 3 — 架构设计 | ⬜ 待开始 | 依赖 Phase 2 |
| 4 — UI/原型 | ⬜ 待开始 | 可与 Phase 3 部分并行 |
| 5 — 开发实现 | ⬜ 待开始 | 依赖 Phase 2-4 |
| 6 — 测试/QA | ⬜ 待开始 | 依赖 Phase 5 |
| 7 — 部署上线 | ⬜ 待开始 | 依赖 Phase 6 |
| 8 — 运营维护 | ⬜ 未触发 | 持续 |

---

## 木下的角色

| Phase | 木下做什么 |
|-------|-----------|
| 0-1 | 需求讨论、决策确认（你是产品经理） |
| 2-3 | 审核 issue 优先级、确认架构方向 |
| 4 | 审美判断、选设计方向 |
| 5 | 审核 tdd 测试用例、确认 code review 关键点 |
| 6 | 手动验收关键功能 |
| 7 | 配置域名、DNS（AI 指导你操作） |
| 8 | 写博客、提新需求 |

---

## 文件产出目录

```
docs/
├── workflow-orchestration.md    ← 本文件
├── SITEMAP.md                   ✅
├── tech-decisions-20260703.md   ✅
├── handoff-20260702.md          ✅
├── DEPLOY.md                    ✅
├── final-requirements-feed.md   ⬜ (Phase 1 产出)
├── final-requirements-learn.md  ⬜
├── final-requirements-projects.md ⬜
├── final-requirements-finance.md  ⬜
├── architecture.md              ⬜ (Phase 3 产出)
├── adr/                         ⬜
│   ├── 001-d1-schema.md
│   ├── 002-auth-design.md
│   └── ...
└── agents/
    ├── issue-tracker.md         ✅
    ├── triage-labels.md         ✅
    └── domain.md                ✅

.scratch/
├── blog/                        ✅ (Phase 2 现有)
├── feed/                        ⬜
├── learn/                       ⬜
├── projects/                    ⬜
└── finance/                     ⬜
```
