# catstarry.xyz 开发流程编排方案

> 执行手册。进度追踪见 `docs/DASHBOARD.md`。
> 最后更新：2026-07-16

---

## 流程治理协议

**「流程治理」对话**是项目的中枢。它不执行任何 Phase，只负责：

- 维护 `DASHBOARD.md`（进度）、`workflow-orchestration.md`（本文件）、`CONTEXT.md`（性质标签 + 状态）、`AGENTS.md`（约束 + Rule Precedence）
- 审查流程是否合理
- 协调各 Phase 之间的衔接
- Rule Precedence 见 `AGENTS.md`：AGENTS.md > workflow-orchestration > CONTEXT.md > triage labels > local heuristics

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

## 设计驱动的定向上游回流协议

当 Phase 4.1 的设计确认推翻或改变已完成模块的需求、架构前提时，使用**定向上游回流**；它不是重启项目，也不改变全局 Phase 2、Phase 3 的历史完成状态。

```
Phase 4.1 设计决策确认
      ↓（声明受影响模块、旧契约与回流范围）
定向 Phase 2：PRD → issue/ticket → triage
      ↓
定向 Phase 3：仅复核受影响的领域、数据、模块、API 与 ADR
      ↓
返回 Phase 4.1：重锁 DESIGN.md、SITEMAP、Phase 4 brief 与视觉接口
      ↓
Phase 4.2：原型生成
```

**状态表达规则**：

- 定向回流进行时，主线 Phase 4 标记为“4.1 定向回流中”；Phase 4.2 不得提前启动。
- 返回 Phase 4.1 完成并同步共享文档后，标记为“4.1 已完成”。如流程治理已登记依赖迁移等前置门，须先闭合这些前置门；随后才标记为“4.2 等待流程治理启动”，不能由设计对话自行越级进入原型。
- 定向 Phase 2、3 以独立状态块记录“范围、产物、回归点”，不把全局 Phase 2、3 改回未完成。
- 定向 Phase 3 未完成前，`CONTEXT.md` 中受影响的架构与设计结论必须标为“定向回流中”或“待复核”，不得伪装成已锁定。
- 每次定向回流闭合后，木下回到流程治理对话；流程治理更新 `DASHBOARD.md`、`CONTEXT.md`、`SITEMAP.md` 与对应 Phase brief，再允许进入下游阶段。

---

## 依赖基线迁移协议

当核心框架与官方 integration 出现跨主版本错配，或木下明确要求正式开发采用最新稳定主版本时，使用**定向依赖基线迁移**。它是独立的基础设施任务，不重开需求、架构或已经闭合的设计阶段。

```
当前 Phase 完成并保持闭合
      ↓
流程治理声明迁移范围、目标版本与禁止越界事项
      ↓
独立依赖迁移任务：升级 → 最小兼容修改 → build / content / rendering 验证
      ↓
木下执行 Git 提交
      ↓
返回流程治理确认基线与下游入口
```

**执行规则**：

- 依赖迁移不得夹带视觉重做、功能开发、架构扩张或未使用的 adapter。
- 目标是最新稳定主版本，但升级必须使用 lockfile 固化实际版本，并记录官方 migration guide 中与项目相关的破坏性变化。
- 迁移任务必须验证 build、Content Collections、Markdown、React islands 与现有可运行页面；Cloudflare adapter 仅在项目真正启用对应渲染模式时安装和验证。
- 当前一次性迁移：在 Phase 4.1 闭合后、Phase 4.2 启动前，将 Astro 5.18.2 对齐至 Astro 7.0.9，并修复与 Content Layer API、Markdown、HTML 编译相关的最小兼容问题。Phase 4.1 保持完成，Phase 4.2 在迁移闭合前暂停。
- Phase 5.0 开始前仍需再次核对最新稳定版本，但不得无审计自动升级。

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
- 产出物全部落在 `docs/`、`.scratch/` 或对应 Phase 明确授权的目录中；Git 提交由木下执行
- 木下（非程序员）审核文档层面的产出物；AI agent 负责编码
- **Phase 顺序不可跳**。跳过规格化和架构直接写代码 = 返工。
- **Phase 完成后必须回到「流程治理」对话报告进度**，见上方「流程治理协议」
- Agent 修改前检查 Git 状态与 HEAD；修改后给出按路径限定的提交命令，不自行 commit / push，也不擅自加入未追踪素材。

---

## Phase 0：基础设施

**目标**：建立项目和 AI agent 协作的基础环境。

**输入**：空仓库。

**产出物**：`GLOSSARY.md`、`CONTEXT.md`、`AGENTS.md`、`docs/agents/*.md`、`.scratch/`。

| #   | 动作                                             | skill                        |
| --- | ------------------------------------------------ | ---------------------------- |
| 0.1 | 从 handoff 提取术语 → `GLOSSARY.md`              | `ubiquitous-language`        |
| 0.2 | 配置 issue tracker + triage labels + domain docs | `setup-matt-pocock-skills`   |
| 0.3 | 写 `CONTEXT.md`：项目简介、技术栈、约束          | —                            |
| 0.4 | 配置 Git 规范                                    | `git-guardrails-claude-code` |

---

## Phase 1：需求澄清

**目标**：将模糊想法转化为结构化、可验证的需求。

**输入**：handoff 文档 + 木下口述新需求。

**产出物**：每个模块一份需求文档（`docs/final-requirements-*.md`）。

**执行方式**：使用 `grill-me` 或 `grill-with-docs` 加载「需求解剖师」角色定义（`D:/business analyst/AGENTS.md`）和输出 schema（`D:/business analyst/output_schema.json`），按 6 层深挖 + 发散前置的规则执行。对话结束后按 schema 输出结构化 JSON。

| #   | 动作               | 深度     |
| --- | ------------------ | -------- |
| 1.1 | B2 /feed 媒体处理  | 6 层深挖 |
| 1.2 | B3 /feed 内容管理  | 6 层深挖 |
| 1.3 | /learn 内容结构    | 轻量     |
| 1.4 | /projects 页面布局 | 轻量     |
| 1.5 | /finance 技术需求  | 中等     |

**结束条件**：所有 drill 完成，无遗漏分支，每个模块产出符合 `output_schema.json` 的结构化 JSON，木下确认不再修改。

---

## Phase 2：规格化（需求 → 可执行的卡片）

**目标**：将需求文档拆分为结构化 issue，分类评估优先级。产出两份：给 AI 的开发 issue + 给木下的验收清单。

**输入**：Phase 1 产出的结构化 JSON。

**产出物**：

- `.scratch/` 下多个 `issue.md` + triage 标签（给 AI，英文/技术语言，可包含 D1/KV/CORS/schema 等技术细节）
- `docs/acceptance-*.md`（给木下，纯中文业务语言，不含技术细节，按模块列出"这个功能做到了/没做到"）

| #   | 动作                           | skill       | 产出                                                  |
| --- | ------------------------------ | ----------- | ----------------------------------------------------- |
| 2.1 | 已确认讨论 → PRD / spec        | `to-spec`    | 每个模块一份可执行规格                               |
| 2.2 | PRD / spec → tracer tickets    | `to-tickets` | `.scratch/*/issue.md`（含阻塞边）                    |
| 2.3 | ticket 分类评估 + 打标签        | `triage`     | 给每个 issue 打 `needs-triage` / `ready-for-agent` 等 |
| 2.4 | 生成验收清单                   | —           | `docs/acceptance-*.md`（给木下，纯业务语言）          |

**结束条件**：全部模块有开发 issue + triage 标签 + PRD + 验收清单，木下确认验收清单可操作。

## Phase 3：架构设计

**目标**：基于 PRD 确定技术架构细节。

**输入**：PRD + `docs/tech-decisions-20260703.md`。

**产出物**：`docs/architecture.md`（总览）、`docs/architecture/data-model.md`（D1 schema + API 类型）、`docs/architecture/auth.md`（鉴权）、`docs/architecture/modules.md`（目录结构 + Workers 路由）、`docs/adr/*.md`。

| #   | 动作                                                                                   | skill                                   |
| --- | -------------------------------------------------------------------------------------- | --------------------------------------- |
| 3.1 | 领域建模（术语表 → D1 schema、API 数据结构） → `architecture/data-model.md`            | `domain-modeling`                       |
| 3.2 | 代码库架构（目录结构、模块边界、依赖） → `architecture.md` + `architecture/modules.md` | `codebase-design`                       |
| 3.3 | 数据流设计（Workers 路由、D1/KV/R2 读写、Cron） → `architecture/modules.md`            | `cloudflare` + `workers-best-practices` |
| 3.4 | 鉴权方案（/feed + f.catstarry.xyz 的具体实现） → `architecture/auth.md`                | `cloudflare-one`                        |
| 3.5 | 架构决策记录（每个重大决策一条：为什么选 A 不选 B） → `docs/adr/*.md`                  | —                                       |

---

## Phase 4：UI/原型

**目标**：产出 catstarry.xyz 专属视觉设计系统 + 关键页面原型。DESIGN.md 为全站视觉约束，原型验证可行性。

**输入**：SITEMAP + `docs/architecture.md` + `docs/design/reference-design/`（木下人工选取的设计参照）。

**产出物**：根目录 `DESIGN.md`（以文档内目录与当前版本为准）+ canonical CSS 设计系统契约（`src/styles/variables.css`、`typography.css`、`components.css`）+ `docs/design/reference-design/`（木下人工选取的参照）+ 可交互 HTML 原型。

**skill 边界**：Phase 4.2 默认只使用 `prototype`。当前安装的 `gpt-taste` 强制 AIDA、随机设计与 GSAP ScrollTrigger，与 Design 2.0 冲突，不得作为 Policy Engine 或 Quality Gate。其他视觉 skill 只有在先通过 DESIGN.md 兼容性审查后才能使用。

**设计基调**：由 4.0 木下挑选的 reference-design 决定。不做预设（不预设色系、不预设风格）。

**CJK 约束**：以 `DESIGN.md` 与 `src/styles/typography.css` 的 canonical 规则为准，不依赖外部 taste skill。

| #   | 动作                                                                                              | skill                                                                          | 产出                            |
| --- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------- |
| 4.0 | 木下人工选参照：浏览 getdesign.md 挑选 2-3 个视觉锚点，笔记提取至 `docs/design/reference-design/` | —（人工）                                                                      | `docs/design/reference-design/` |
| 4.1 | Design Read + Design System Re-lock：AI 读 `reference-design/` → 声明 Design Read → 维护根目录 DESIGN.md 的设计目录、决策与视觉接口 → 对齐 canonical CSS token、CJK 基线与通用工具类，退役已失效的旧页面语义 | — | `DESIGN.md` + canonical CSS 设计系统契约 |
| 4.2 | 隔离原型与参数校准：以 DESIGN.md 驱动一次性 HTML/CSS/JS 原型，只验证明确标记为 calibration 的参数 | `prototype` | `docs/design/prototypes/phase4-2/` 下的独立原型 + verdict |
| 4.3 | 选定原型落地 + UI 质检：把获选组件样式落回 canonical CSS，执行 CJK、keyboard、touch、reduced-motion、性能与视觉一致性检查 | `web-design-engineer` | 更新后的 canonical CSS + UI 质检报告 |

> Phase 4.1 的 CSS 工作只维护 token 契约、排版基线、通用工具类和过时语义清理，不实现新页面组件。Phase 4.2 的一次性实验 CSS 不直接写入 canonical styles；选定原型的组件样式在 Phase 4.3 才落回 `components.css`，经验证的数值再固化至 `variables.css`。

**结束条件**：

- **4.1**：`DESIGN.md` 与 canonical token、CJK、通用工具类完成重锁；CSS 解析、token 引用和 Astro build 通过；未实现新页面组件；流程治理确认闭合。
- **4.2**：隔离原型与 `prototype-verdict.md` 完成，木下确认关键参数；未修改 canonical CSS、生产路由或架构；返回流程治理报告。
- **4.3**：获选组件样式与参数落回 canonical CSS，并通过 CJK、keyboard、touch、reduced-motion、性能和视觉一致性质检；返回流程治理确认 Phase 4 完成。

> Phase 3 对话结束后，木下回到流程治理报告完成状态，流程治理确认后 fork Phase 4。避免原型先行导致设计绑架架构。

---

## Phase 5：开发实现

**目标**：逐模块实现功能代码。

**输入**：PRD + ADR + UI 原型 + DESIGN.md + triage 后的 issue + `docs/agents/frontend-rules.md`。

| #   | 动作 | skill | 产出 |
| --- | --- | --- | --- |
| 5.0A | 依赖基线复核：核对 Astro、官方 integrations、React、Cloudflare adapter 与 Node 的最新稳定版本；仅在审计通过后升级 | — | 依赖兼容矩阵 + 升级／保持决定（必要时 ADR） |
| 5.0B | 前端规则固化：将 DESIGN.md 核心规则、canonical CJK 质检清单与三画布规则固化至 `docs/agents/frontend-rules.md`。标记为“原型已验证、Phase 5 仅可微调非核心参数”，各模块开发线程必须引用 | — | `docs/agents/frontend-rules.md` |

**策略**：分两波执行。

### 第一波：共享基础设施（开发-F，**必须先行**）

D1 schema、类型定义、鉴权逻辑、CI/CD 配置必须先完成，其他线程才可独立开发。

……（后面不动）

| 线程 | 负责模块     | skills                                |
| ---- | ------------ | ------------------------------------- |
| F    | 共享基础设施 | `implement`、`workers-best-practices` |

### 第二波：业务模块（开发-F 完成后 fork 并行）

| 线程 | 负责模块                                     | skills                                                              |
| ---- | -------------------------------------------- | ------------------------------------------------------------------- |
| A    | /blog（列表 + 详情 + 分类 + 标签 + RSS）     | `tdd`、`implement`、`code-review`                                   |
| B    | /feed（时间线 + 发布面板 + 媒体上传 + 鉴权） | `tdd`、`implement`、`code-review`、`cloudflare`、`wrangler`         |
| C    | /projects + /learn                           | `implement`、`scaffold-exercises`                                   |
| D    | `/` Home                                     | `tdd`、`implement`                                                  |
| E    | f.catstarry.xyz                              | `tdd`、`implement`、`code-review`、`a-stock-data`、`cloudflare-one` |

**每个模块的 micro loop**：

```
tdd → implement → code-review → 木下按 acceptance 验收 → 通过/回退
```

---

## Phase 6：测试/QA

**目标**：全站集成测试 + 性能验证。

| #   | 动作                              | skill      |
| --- | --------------------------------- | ---------- |
| 6.1 | 全站按 PRD 验收                   | `qa`       |
| 6.2 | Core Web Vitals                   | `web-perf` |
| 6.3 | Excel 迁移正确性 + 实时行情准确性 | `qa`       |

---

## Phase 7：部署上线

**目标**：推送到生产环境。

| #   | 动作                                    | skill                     |
| --- | --------------------------------------- | ------------------------- |
| 7.1 | D1 schema、KV namespace、R2 bucket 创建 | `wrangler`                |
| 7.2 | CF Pages + Workers 部署                 | `wrangler`                |
| 7.3 | 域名 DNS + 环境变量/密钥                | `cloudflare` + `wrangler` |

---

## Phase 8：运营维护（持续）

**目标**：保持可用，持续改进。

### 木下的日常操作（上线后）

| 操作     | 路径            | 方式                                                             |
| -------- | --------------- | ---------------------------------------------------------------- |
| 发博客   | /blog           | 本地写 Markdown → Git push → CF Pages 自动部署                   |
| 发碎碎念 | /feed           | 网站右下角 + 按钮 → 登录 → 发布面板                              |
| 剪藏     | /feed           | 发布面板切换到剪藏 tab → 粘贴链接 → 自动拉取摘要 → 补评论 → 发布 |
| 录交易   | f.catstarry.xyz | 登录财务面板 → 录入交易                                          |
| 看持仓   | f.catstarry.xyz | 打开面板即可查看（cati 登录后只读）                              |
| 年度导出 | f.catstarry.xyz | D1 → Excel 导出 → 存档签署                                       |

### AI 维护（按需触发）

| 触发     | 动作                    | skills                                        |
| -------- | ----------------------- | --------------------------------------------- |
| 线上 bug | 诊断 → 修 → 部署        | `diagnosing-bugs` → `tdd` → `implement`       |
| 性能退化 | 定位 → 优化             | `web-perf` → `improve-codebase-architecture`  |
| 技术债   | 分析 → 重构方案 → issue | `improve-codebase-architecture` → `to-tickets` |
| 新功能   | 回到 Phase 1            | `grill-me` → …                                |

**周期维护**：每季度 D1 备份（`wrangler d1 backup`）。

---

## 木下的角色

| Phase | 你做什么                                                 |
| ----- | -------------------------------------------------------- |
| 0-1   | 需求讨论、决策确认（产品经理）                           |
| 2-3   | 审核 issue 优先级、确认架构方向                          |
| 4     | 从 reference-design 挑参照 + 审系统定调 + 确认 DESIGN.md |
| 5     | 审核 tdd 测试用例、确认 code review 关键点               |
| 6     | 手动验收关键功能                                         |
| 7     | 配置域名/DNS（AI 指导操作）                              |
| 8     | 日常操作（发博客、发碎碎念、录交易）+ 提新需求           |

---

## 产出物清单

```
catstarry.xyz/
├── README.md                        (Phase 0)
├── AGENTS.md                        (Phase 0)
├── GLOSSARY.md                      (Phase 0)
├── CONTEXT.md                       (Phase 0)
├── DESIGN.md                        (Phase 4.1)
├── docs/
│   ├── workflow-orchestration.md    ← 本文件
│   ├── DASHBOARD.md
│   ├── SITEMAP.md
│   ├── cold-start-governance.md
│   ├── tech-decisions-20260703.md
│   ├── phase2-briefing.md
│   ├── phase3-briefing.md
│   ├── phase-briefing/
│   │   └── phase4-briefing.md       (Phase 4 启动前与回流后同步)
│   ├── handoff-20260702.md
│   ├── architecture.md              (Phase 3)
│   ├── architecture/                (Phase 3)
│   │   ├── data-model.md
│   │   ├── auth.md
│   │   └── modules.md
│   ├── adr/                         (Phase 3)
│   ├── design/                      (Phase 4)
│   │   └── reference-design/        (木下人工选取的参照)
│   ├── final-requirements-.json    (Phase 1)
│   ├── acceptance-.md              (Phase 2)
│   └── agents/
│       ├── issue-tracker.md
│       ├── triage-labels.md
│       ├── domain.md
│       └── frontend-rules.md        (Phase 5.0)
├── .scratch/
     ├── blog/                        (Phase 2)
     ├── feed/                        (Phase 2)
     ├── learn/                       (Phase 2)
     ├── projects/                    (Phase 2)
     ├── finance/                     (Phase 2)
     ├── home/                        (Phase 2)
├── src/                             (Phase 5)
├── workers/                         (Phase 5)
├── shared/                          (Phase 5)
├── public/                          (Phase 5)
└── teach/                           (teach skill workspace)
```
