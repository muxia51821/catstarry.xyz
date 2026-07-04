# catstarry.xyz 开发流程编排方案

> 执行手册。进度追踪见 `docs/DASHBOARD.md`。
> 最后更新：2026-07-04

---

## 流程治理协议

**「流程治理」对话**是项目的中枢。它不执行任何 Phase，只负责：

- 维护 `DASHBOARD.md`（进度）、`workflow-orchestration.md`（本文件）、`CONTEXT.md`（性质标签 + 状态）、`AGENTS.md`（约束）
- 审查流程是否合理
- 协调各 Phase 之间的衔接

**触发机制**（手动，非自动）：

```
木下在某 Phase 对话中完成全部工作
      ↓
木下回到「流程治理」对话，报告：Phase X 已完成，产物是 xxx
      ↓
流程治理更新 DASHBOARD.md、CONTEXT.md 状态
      ↓
流程治理确认下一步：fork 哪个 Phase、带什么文档
```

**为什么是手动的**：Codex 目前不支持跨对话自动感知。木下是唯一的信使。

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
- **Phase 顺序不可跳**。跳过规格化和架构直接写代码 = 返工。
- **Phase 完成后必须回到「流程治理」对话报告进度**，见上方「流程治理协议」

---

## Phase 0：基础设施

**目标**：建立项目和 AI agent 协作的基础环境。

**输入**：空仓库。

**产出物**：`GLOSSARY.md`、`CONTEXT.md`、`AGENTS.md`、`docs/agents/*.md`、`.scratch/`。

| # | 动作 | skill |
|---|------|-------|
| 0.1 | 从 handoff 提取术语 → `GLOSSARY.md` | `ubiquitous-language` |
| 0.2 | 配置 issue tracker + triage labels + domain docs | `setup-matt-pocock-skills` |
| 0.3 | 写 `CONTEXT.md`：项目简介、技术栈、约束 | — |
| 0.4 | 配置 Git 规范 | `git-guardrails-claude-code` |

---

## Phase 1：需求澄清

**目标**：将模糊想法转化为结构化、可验证的需求。

**输入**：handoff 文档 + 木下口述新需求。

**产出物**：每个模块一份需求文档（`docs/final-requirements-*.md`）。

**执行方式**：使用 `grill-me` 或 `grill-with-docs` 加载「需求解剖师」角色定义（`D:/business analyst/AGENTS.md`）和输出 schema（`D:/business analyst/output_schema.json`），按 6 层深挖 + 发散前置的规则执行。对话结束后按 schema 输出结构化 JSON。

| # | 动作 | 深度 |
|---|------|------|
| 1.1 | B2 /feed 媒体处理 | 6 层深挖 |
| 1.2 | B3 /feed 内容管理 | 6 层深挖 |
| 1.3 | /learn 内容结构 | 轻量 |
| 1.4 | /projects 页面布局 | 轻量 |
| 1.5 | /finance 技术需求 | 中等 |

**结束条件**：所有 drill 完成，无遗漏分支，每个模块产出符合 `output_schema.json` 的结构化 JSON，木下确认不再修改。

---

## Phase 2：规格化（需求 → 可执行的卡片）

**目标**：将需求文档拆分为结构化 issue，分类评估优先级。

**输入**：Phase 1 产出的结构化 JSON。

**产出物**：`.scratch/` 下多个 `issue.md` + triage 标签。

| # | 动作 | skill |
|---|------|-------|
| 2.1 | 全量需求 → issue | `to-issues` |
| 2.2 | issue 分类评估 + 打标签 | `triage` |
| 2.3 | 复杂 issue → PRD（含验收标准） | `to-prd` |

---

## Phase 3：架构设计

**目标**：基于 PRD 确定技术架构细节。

**输入**：PRD + `docs/tech-decisions-20260703.md`。

**产出物**：`docs/architecture.md`、`docs/adr/*.md`。

| # | 动作 | skill |
|---|------|-------|
| 3.1 | 领域建模（术语表 → D1 schema、API 数据结构） | `domain-modeling` |
| 3.2 | 代码库架构（目录结构、模块边界、依赖） | `codebase-design` |
| 3.3 | 数据流设计（Workers 路由、D1/KV/R2 读写、Cron） | `cloudflare` + `workers-best-practices` |
| 3.4 | 鉴权方案（/feed + f.catstarry.xyz 的具体实现） | `cloudflare-one` |
| 3.5 | 架构决策记录 → `docs/adr/` | — |

---

## Phase 4：UI/原型

**目标**：产出视觉方向 + 关键页面原型。

**输入**：SITEMAP + 设计定调（artistic warm）。

**产出物**：moodboard + 可交互 HTML 原型。

| # | 动作 | skill |
|---|------|-------|
| 4.1 | 视觉方向探索 | `design-an-interface` |
| 4.2 | 关键页面原型（/blog、/feed、/finance） | `prototype` |
| 4.3 | 原型落地 HTML/CSS | `web-design-engineer` |

> Phase 3 架构设计确认后，再启动 Phase 4。避免原型先行导致设计绑架架构。

---

## Phase 5：开发实现

**目标**：逐模块实现功能代码。

**输入**：PRD + ADR + UI 原型 + triage 后的 issue。

**策略**：分两波执行。

### 第一波：共享基础设施（开发-F，**必须先行**）

D1 schema、类型定义、鉴权逻辑、CI/CD 配置必须先完成，其他线程才可独立开发。

| 线程 | 负责模块 | skills |
|------|---------|--------|
| F | 共享基础设施 | `implement`、`workers-best-practices` |

### 第二波：业务模块（开发-F 完成后 fork 并行）

| 线程 | 负责模块 | skills |
|------|---------|--------|
| A | /blog（列表 + 详情 + 分类 + 标签 + RSS） | `tdd`、`implement`、`code-review` |
| B | /feed（时间线 + 发布面板 + 媒体上传 + 鉴权） | `tdd`、`implement`、`code-review`、`cloudflare`、`wrangler` |
| C | /projects + /learn | `implement`、`scaffold-exercises` |
| D | `/` Home | `tdd`、`implement` |
| E | f.catstarry.xyz | `tdd`、`implement`、`code-review`、`a-stock-data`、`cloudflare-one` |

**每个模块的 micro loop**：

```
tdd（先写测试 → 木下审核）→ implement → code-review → qa → 通过/回退
```

---

## Phase 6：测试/QA

**目标**：全站集成测试 + 性能验证。

| # | 动作 | skill |
|---|------|-------|
| 6.1 | 全站按 PRD 验收 | `qa` |
| 6.2 | Core Web Vitals | `web-perf` |
| 6.3 | Excel 迁移正确性 + 实时行情准确性 | `qa` |

---

## Phase 7：部署上线

**目标**：推送到生产环境。

| # | 动作 | skill |
|---|------|-------|
| 7.1 | D1 schema、KV namespace、R2 bucket 创建 | `wrangler` |
| 7.2 | CF Pages + Workers 部署 | `wrangler` |
| 7.3 | 域名 DNS + 环境变量/密钥 | `cloudflare` + `wrangler` |

---

## Phase 8：运营维护（持续）

**目标**：保持可用，持续改进。

### 木下的日常操作（上线后）

| 操作 | 路径 | 方式 |
|------|------|------|
| 发博客 | /blog | 本地写 Markdown → Git push → CF Pages 自动部署 |
| 发碎碎念 | /feed | 网站右下角 + 按钮 → 登录 → 发布面板 |
| 剪藏 | /feed | 发布面板切换到剪藏 tab → 粘贴链接 → 自动拉取摘要 → 补评论 → 发布 |
| 录交易 | f.catstarry.xyz | 登录财务面板 → 录入交易 |
  | 看持仓 | f.catstarry.xyz | 打开面板即可查看（cati 登录后只读） |
| 年度导出 | f.catstarry.xyz | D1 → Excel 导出 → 存档签署 |

### AI 维护（按需触发）

| 触发 | 动作 | skills |
|------|------|--------|
| 线上 bug | 诊断 → 修 → 部署 | `diagnosing-bugs` → `tdd` → `implement` |
| 性能退化 | 定位 → 优化 | `web-perf` → `improve-codebase-architecture` |
| 技术债 | 分析 → 重构方案 → issue | `improve-codebase-architecture` → `to-issues` |
| 新功能 | 回到 Phase 1 | `grill-me` → … |

**周期维护**：每季度 D1 备份（`wrangler d1 backup`）。

---

## 木下的角色

| Phase | 你做什么 |
|-------|---------|
| 0-1 | 需求讨论、决策确认（产品经理） |
| 2-3 | 审核 issue 优先级、确认架构方向 |
| 4 | 审美判断、选设计方向 |
| 5 | 审核 tdd 测试用例、确认 code review 关键点 |
| 6 | 手动验收关键功能 |
| 7 | 配置域名/DNS（AI 指导操作） |
| 8 | 日常操作（发博客、发碎碎念、录交易）+ 提新需求 |

---

## 产出物清单

```
docs/
├── workflow-orchestration.md    ← 本文件
├── DASHBOARD.md
├── SITEMAP.md
├── tech-decisions-20260703.md
├── architecture.md              (Phase 3)
├── adr/                         (Phase 3)
├── final-requirements-*.md      (Phase 1)
└── agents/
    ├── issue-tracker.md
    ├── triage-labels.md
    └── domain.md

.scratch/
├── blog/
├── feed/                        (Phase 2)
├── learn/                       (Phase 2)
├── projects/                    (Phase 2)
└── finance/                     (Phase 2)
```
