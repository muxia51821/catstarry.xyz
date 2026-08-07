---
category: architecture
triage: ready-for-agent
created: 2026-08-03
---

# Home CSS Reconciliation — Stage 0 Inventory / Audit

> Home implementation governance / contract reconciliation。production-first，不重新设计 Home。
> 分支：`task/home-css-reconciliation`。范围：`src/styles/home.css`、`components.css` Home 区块、`HomeExperience.astro`、`home-runtime.ts`、`home-client.ts`、`Base.astro`、`variables.css`、`frontend-rules.md`、`home-production-regression.mjs`。
> 产物：本文件 = 词汇映射表 + 每阶段 entry/exit criteria。只记录事实，不写实现。

## 0. 裁决基线（本任务的硬约束）

- 生产行为 + 已锁定 DESIGN/ADR 语义优先于未接入生产的 CSS selector。
- production-first reconciliation：以 `HomeExperience.astro + home-runtime.ts + home.css` 为迁移基线。
- 状态机 = Scoped Hybrid：scene-level state 由 Home root 持有；component-local state（Planet/HAS/Cat）由元素自身 `data-*` 持有。body-based 状态不要求本次全量重写，可渐进收窄。
- HAS 是接口 vocabulary 冲突，非业务语义冲突。业务状态仍为 active/stable/dormant/unavailable。
- **HAS 最终 vocabulary：`data-has-state="active|stable|dormant|unavailable"`**（统一，不保留 `data-state` 长期 alias）。
- `data-canvas="home"` 必须显式声明；`:root, [data-canvas="home"]` fallback 在审计前不删除。
- **不允许改变**：Entry→Approach→Overview→Focus 信息架构、Drift 构图与星球身份、Focus choreography、Planet Push、About 双路径、豹猫行为、HAS 产品语义、selected planet assets、已验收视觉结果。
- **本任务不删任何代码**。本文件只读审计，具体修改在后续 Stage 单独执行。

## 1. 文件关系

| 文件 | 角色 | 进入 Home 路径 |
|---|---|---|
| `main.css` | canonical 入口 | `Base.astro` → `main.css` → `variables.css` + `typography.css` + `components.css` |
| `home.css` (1,745) | Home 专用 | `HomeExperience.astro` 顶部 import |
| `HomeExperience.astro` (302) | Home DOM | 生产基线 |
| `home-client.ts` (22) | 挂载 + manifest 读取 | `HomeExperience.astro` script |
| `home-runtime.ts` (2,520) | Phase 4.2 runtime | `home-client.ts` |
| `Base.astro` (32) | 全局骨架 | `body data-variant` |
| `variables.css` (504) | 三层 token | via main.css |
| `components.css` (966) | canonical 组件 + Home 区块 | via main.css |

**结论**：两份 CSS 同时进入 Home（canonical via Base.astro + home.css via HomeExperience.astro），构成双实现并存的物理基础。

## 2. Production vocabulary（迁移基线，home.css + runtime + DOM）

### 2.1 Selector / DOM class

| 领域 | Production class / element | 行号 |
|---|---|---|
| Scene | `.journey` / `.stage` / `.map` / `.star-layer`(far/mid/near) | home.css:125/193/375 |
| Entry | `.entry-copy` / `.discover` / `.entry-meteors` / `.entry-meteor` / `.stage-readout` | home.css:265/303/359 |
| Planet | `.planet` / `.planet-core` / `.planet-label` / `.planet.reverse` | home.css:402+ |
| HAS | `.signal-wrap` / `.signal-layer` / `.signal-orbit` / `.signal-core` / `.signal-band` / `.signal-particle` | home.css:629-891 |
| Cat | `.about-zone` / `.cat` / `.cat-svg` / `.cat-fragment` / `.cat-aura` / `.cat-hint` | home.css:934-1282 |
| Focus | `.planet-focus` / `.focus-shot` / `.focus-planet-wrap` / `.focus-planet-core` / `.focus-copy` / `.focus-proxy` / `.push` | home.css:1303-1459 |
| Nav | `.flight-index` / `[data-anchor]` / `[data-focus]` | home.css:1480 |
| Footer | `.footer` / `.footer-content` / `.footer-contact` | home.css:1539 |
| Meteor | `.meteor-canvas` (id) | home.css:1513 |

### 2.2 State 载体（production）

| 状态 | 载体 | runtime 行 |
|---|---|---|
| HAS state | `signal.dataset.state`（active/stable/dormant；无值 = 隐藏） | 1132/1160 |
| HAS 附加 | `signal.dataset.particles` / `signal.dataset.staticMotion` / `signal.dataset.depth` | 1102/1133/1023 |
| HAS class | `.respond` / `.ambient-pulse` / `.attention`（home.css:855/858/873） | runtime 加 class |
| Focus scene | `body.focus-open` + `body.dataset.focusMode`（scroll/manual/returning） | 1407-1440/1704/2004 |
| Cat scene | `body.cat-residue-visible` / `body.focus-returning` | 1870/1932 |
| Push | `body.pushing` | 2047 |
| Canvas | **无 `data-canvas="home"`**（Base.astro 只有 `data-variant="drift"`） | Base.astro:29 |

### 2.3 CSS 触发对照（production 实际生效的触发器）

- `.focus-open .planet-focus` → 显示 Focus（home.css:1310）
- `body[data-focus-mode="scroll"] .map` → 滚动 Focus 模式（home.css:395）
- `.signal-wrap[data-state="active|stable|dormant"]` → HAS 材质（home.css:833-845）

## 3. Canonical vocabulary（components.css Home 区块 127-813 + 配套 814-853/934-965）

### 3.1 Selector 与生产对应

| Canonical | 生产对应 | 状态 |
|---|---|---|
| `.home-space-stage` | `.stage` | ❌ dead |
| `.home-star-layer[data-star-layer]` | `.star-layer` | ❌ dead |
| `.home-star-map[data-phase]` | `.map` | ❌ dead |
| `.home-planet` + BEM `__target/__core/__surface/__atmosphere/__terminator/__rim/__label` | `.planet` | ❌ dead |
| `.home-planet[data-planet-state]` | body scene state | ❌ dead |
| `.has-beacon` + `__orbit/__body` | `.signal-wrap` | ❌ dead |
| `.has-beacon[data-has-state]` | `.signal-wrap[data-state]` | ❌ dead（属性名不同） |
| `.leopard-cat` + BEM 全集 | `.cat` / `.about-zone` | ❌ dead |
| `.leopard-cat[data-cat-state]` | `.about-zone` class（ready/charged/burst/…） | ❌ dead |
| `.planet-focus` + BEM `__visual/__surface/__shadow/__copy/__action/__return` | `.planet-focus` **同名碰撞** | ⚠️ 见 §4 |
| `.planet-focus[data-open="true"]` | `body.focus-open .planet-focus` | ⚠️ 触发机制不同 |
| `.star-map-index` / `__link` | `.flight-index` | ❌ dead |
| `.about-expanded` / `__panel` | `.about-zone` | ❌ dead |
| `.cursor-meteor` | `.meteor-canvas` | ❌ dead |

### 3.2 Canonical state interface 语义（still-valid design requirement）

| Canonical | 语义 | 生产现状 | 归属 |
|---|---|---|---|
| `data-has-state="active|stable|dormant|unavailable"` | HAS 四态 | `data-state` 三态 + 无值隐藏 | **迁移目标**（裁决已定） |
| `data-attention` | HAS 关注 | `.attention` class | 对齐时二选一 |
| `data-orbit-layer` / `data-orbit-depth` | 轨道前后层 | 无（生产用 class `.back`/`.front`） | 需裁决 |
| `data-cat-state="reveal|charged|residue|recovering"` | Cat 状态机 | `.about-zone` class（ready/charged/burst/recovering） | Stage 4 |
| `data-planet-state` | Planet 局部状态 | 无（body 全局 scene state） | Stage 4 |
| `data-canvas="home"` | 画布声明 | 无 | **Stage 1** |

## 4. `.planet-focus` 同名碰撞（⚠️ 需优先排雷）

**物理事实**：两份 CSS 都定义 `.planet-focus` 且都进入 Home。

| 来源 | 基础规则 | 触发 |
|---|---|---|
| components.css:392-405 | `position:absolute; inset:0; z-index:4; visibility:hidden; opacity:0; pointer-events:none; transition` | `[data-open="true"]` |
| home.css:1303-1313 | `position:absolute; z-index:29; inset:0; visibility:hidden; pointer-events:none` | `.focus-open`（body class） |

- **冲突风险**：`z-index`（4 vs 29）、`opacity`（canonical 控制 0→1，home 不设 opacity → 依赖子元素）、`transition`、`pointer-events`。
- DOM 元素是同一个 `#planet-focus`。若 canonical 的 `opacity:0` + `transition` 生效而 home 未显式打开，会压住 home 的显示逻辑。
- **实际渲染影响需在浏览器实测**（regression 已验证当前行为正常，说明现状下 home.css 的级联顺序/特异性可能覆盖 canonical，或 canonical 未命中选择器——`data-open` 不存在时 `[data-open="true"]` 不匹配，`opacity:0` 仍由基础规则生效）。
- **处理**：Stage 6 删除 canonical block 时同步消除；Stage 5 contract test 断言"`.planet-focus` 只允许一份实现"。

## 5. 变量来源分类（home.css 共 60 本地定义 / 87 引用 / 147 runtime 注入）

### 5.1 home.css `:root` 重定义（绕过 canonical Layer 1/2）

| home.css 定义 | 值 | canonical 对应 | 一致性 |
|---|---|---|---|
| `--klein-500` | `#002fa7` | `variables.css:137`（→ `--blue-700`） | ⚠️ 修正（§9.1-1）：定义已**恢复**（同值并存），klein 专项裁决待定 |
| `--klein-400` | `#335cff` | `variables.css:138`（→ `--blue-500`） | ⚠️ 修正（§9.1-1）：同上 |
| `--klein-pale` | `#b8c8ff` | canonical 无同名（近似 `--klein-100`/`--blue-400`） | Home 特有，保留 |
| `--warm-0/1/2` | 暖调 | canonical 有 `--warm-50..900` 阶 | ⚠️ 修正（§9.1-3）：已由 §9.5 方案 A 转化（→ `--home-warm-*`），生产零残留 |
| `--void`/`--void-soft`/`--ink`/`--muted` | 自建 | canonical `--home-void`/`--home-text-*` | 并行语义 |
| `--journey`/`--progress`/`--approach`/`--overview`/`--focus-in`/`--focus-out`… | runtime 时序 | **runtime-owned**，留 home.css | 保留 |

### 5.2 home.css 引用、runtime 注入（~87 中的大部分）

- `--meteor-*`（top/left/length/thickness/scale/opacity/duration/delay/travel-x/travel-y/angle）：runtime 注入（runtime:692-705）
- `--signal-*`（band-height/band-tilt/band-top/body-asset/body-*/core-size/orbit-shell-size/…）：runtime 注入
- `--cat-*`（x/y/fragment-*/node-*/dust-*）、`--focus-*`（planet-asset/crop/terminator-opacity/…）、`--shot-*`、`--proxy-*`、`--copy-*`、`--planet-*`（asset/contrast/saturation/…）、`--parallax-*`、`--atmosphere-*`、`--fragment-*`：runtime 注入
- **`--dx`/`--dy`**：keyframes `dust-burst` 引用（home.css:1194-1199），但 **runtime 未见注入**（仅 `--cat-dust-stagger`）。⚠️ 疑点：dust 粒子动画位移量可能缺值（fallback 到无定义 → 按 0 处理或无效）。Stage 3 需实测确认。

### 5.3 关键结论

- home.css 的 `:root` 定义 60 个变量中，`--klein-*`/`--warm-*` 与 canonical 值相同或近似，属于"原型平移重复定义"，可映射回 canonical token（Stage 3）。（⚠️ 修正见 §9.1-1/3：`--klein-500/400` 实际仅消费 canonical、`--warm-0/1/2` 生产零存在；本行结论不再适用）
- home.css 其余 ~50 变量是 runtime-owned（时序/几何/粒子），按裁决"route-specific custom property 可保留"，**不迁入共享 token**。
- canonical 定义的 `--has-*`/`--leopardcat-*`/`--planet-*`/`--space-*`/`--cursor-meteor-*` 等 token 目前**只被 components.css dead block 消费**，无生产消费者。

## 6. 文档失真清单（Stage 7 修）

| 位置 | 现状 | 事实 |
|---|---|---|
| frontend-rules §4:44 | "Base.astro 仍引用 global.css" | Base.astro:3 已 import main.css |
| frontend-rules §6.3:84 | 保留 `data-has-state`/`data-attention` 等 canonical interface | 生产实际是 `data-state` + `.attention` class（Stage 2 对齐后此条才成立） |
| frontend-rules §3:37 | 页面根节点必须使用 `data-canvas` | Home 缺 `data-canvas="home"`（Stage 1 补） |
| DESIGN.md | 若含 selector/attribute 级实现引用 | 裁决：DESIGN 只记语义状态与设计规则，具体 production vocabulary 放 frontend-rules / contract test |

## 7. 分阶段计划（每阶段独立验收）

> 每 Stage 完成必须：`npm run build` 通过 + `home-production-regression.mjs` 相关断言通过 + 无控制台错误。**不通过不进下一 Stage。**

| Stage | 内容 | entry | exit criteria |
|---|---|---|---|
| **0** | 本文件（inventory/audit + mapping） | — | 映射表 + 变量分类落盘；§5.2 `--dx/--dy` 疑点标注 |
| **1** | 显式 `data-canvas="home"` | Home shell 无画布声明 | Home 页面声明 canvas；`variables.css:259` fallback 不动；全画布 build + 现有 regression 绿 |
| **2** | HAS vocabulary 收敛 + 对应 regression | HAS 用 `data-state` 三态 | DOM/runtime/CSS 统一 `data-has-state="active\|stable\|dormant\|unavailable"`；同步更新 regression 断言；行为零变化 |
| **3** | home.css prototype/global residue reconcile（remove/scope/remap） | `:root` 重复 token、全局 reset、`--dx/--dy` 疑点 | `--klein-*`/`--warm-*` 映射回 canonical；重复字体/box-sizing/html/body 背景处理后仍保 Home 首帧/边缘背景；runtime-owned 变量保留；视觉 diff 无回归 |
| **4** | Planet/Cat 局部 contract 收敛 + 对应 regression | Planet/Cat 无局部 `data-*` | `.planet` 获 `data-planet-state`、`.cat`/`.about-zone` 获 `data-cat-state`；body scene state 不动；regression 同步 |
| **5** | Structural contract-test foundation | 无 structural 断言 | 新增断言：`data-canvas="home"` 存在；HAS DOM/runtime/CSS vocabulary 一致；Planet/Cat vocabulary 一致；component-local state 不写回 body |
| **6** | 删除 components.css dead block + no-dual-implementation 断言 | dead block 仍在 | 删除 §3.1 标记 dead 的区块；**此时**加入"禁止两套 Home selector 并存"最终断言；`.planet-focus` 碰撞消除 |
| **7** | 文档同步 | 文档失真（§6） | frontend-rules §4:44/§6.3:84/§3:37 修正；DESIGN.md 语义/实现引用分离 |

**后置（deferred，不纳入本任务）**：body scene state → Home root 迁移。Stage 0 评估：收益需权衡改动面（body class 触发点 ~30 处），本任务不执行；inventory 若证明迁移收益不高，保持独立 deferred item。

## 8. 已知疑点（后续 Stage 实测）

1. `.planet-focus` 同名碰撞的实际级联/特异性结果（§4）。
2. `--dx/--dy` 无 runtime 注入 → dust-burst 位移是否失效（§5.2）。
3. `data-attention` vs `.attention` class、`data-orbit-layer` 前后层 vs class `.back`/`.front` 的收敛选择。
4. `--warm-0/1/2` vs canonical `--warm-50..900` 的值映射表。

## 9. Stage 3 验证结论（2026-08-04）

> 依据 §7 计划，Stage 3 调整为「纯验证 + 文档化」（裁决：本阶段不删任何代码；契约断言推迟至 Stage 5，见 §9.3）。本节约为全量只读核验结果，并修正 §5.1 两处不准确记录。

### 9.1 已验证事实（源码核验）

| # | 事实 | 证据 | 结论 |
|---|---|---|---|
| 1 | `--klein-500`/`--klein-400`：canonical 定义（variables.css:137-138 → `--blue-700`/`--blue-500` = `#002fa7`/`#335cff`）；home.css `:root` 同值重复定义（原型平移），Stage 1-2 diff 曾删除、2026-08-04 review 后**恢复**（等专项裁决，见 §9.4）。当前 home.css 消费 canonical 定义（12 处：287/323/810/975/986/993/1000/1062/1169/1278/1441/1442） | 源码核验 | **home.css 依赖 canonical token**；Stage 6 删 canonical block 时此定义必须保留，否则 Home 断色 |
| 2 | `--klein-pale` = `#b8c8ff`，home.css:5 定义，canonical 无同名，Home 内部消费 20+ 处 | grep 全库 | Home 特有，保留 |
| 3 | `--warm-0/1/2`：定义源 = Phase 4.2 原型（`docs/design/prototypes/phase4-2/index.html:17-19`，随 `8dc447e` 平移入 home.css），生产与原型均零引用；颜色值被硬编码使用于背景"暖性星尘"（home.css:152 `rgb(217 184 132)` = `--warm-1` 值）与暖地质底色（home.css:157 `rgb(126 98 71)` ≈ `--warm-2`）。canonical `--warm-50..900` 为另一套暖灰 UI 色阶，语义不同、名字撞车。**专项裁决（方案 A）已执行（2026-08-04）：转化/落位见 §9.5** | grep 全库 + git 溯源（8dc447e/9dd66bb） | 生产残留清零，原型资产保留原样 |
| 4 | `--void`/`--void-soft`/`--ink`/`--muted`：home.css:3-7 定义，canonical 无同名，Home 内部消费 | grep 全库 | Home 特有，保留 |
| 5 | 字体：home.css:51-58 `:root { font-family: Inter, ... }` vs canonical variables.css:73 `--font-sans-body: "Geist", ...` | 源码比对 | **有意不同**（Home 首帧字体设计），保留 |
| 6 | home.css 共引用 168 个不同 var()，其中 **5 个**为 canonical 定义：`--klein-400`/`--klein-500`（唯一 canonical 定义）+ `--planet-ready-rim-opacity`/`--planet-hover-halo-opacity`/`--planet-hover-halo-blur`（**双实现**：variables.css:371/374/375 与 home.css:48/51/52 同值 0.3/0.24/56px） | 正则提取 + 比对 | 双实现的 3 个 token 值相同，无实际风险（§5.1「绕过 Layer 1」实例即此） |
| 7 | `.planet-focus` 碰撞良性：runtime inline style 覆盖 canonical（`transition:"none"` @317、`opacity="1"` @1442/1707、removeProperty @1410） | runtime 源码 | inline 特异性胜出，canonical opacity:0 不压制 Home |
| 8 | `global.css` 死文件：src/scripts 零引用（仅 docs/workflow-orchestration.md 文档提及） | grep 全库 | 保留零风险 |

### 9.2 §8 疑点消解

| §8 疑点 | 结论 |
|---|---|
| 1. `.planet-focus` 碰撞 | **良性**（§9.1-7），无需处理，Stage 6 删 canonical block 时自然消除 |
| 2. `--dx`/`--dy` 无注入 | **确认缺值**：home-runtime.ts 对 `--dx`/`--dy` 零注入（仅 `--cat-dust-stagger` @424）；`@keyframes dust-burst`（home.css:1188-1204）48%/100% 帧 `translate: var(--dx) var(--dy)` 因未定义而 invalid at computed-value time → 回退 initial `none` → **dust 粒子位移静默失效**（实际动画仅 opacity + scale）。为已存在的生产行为，production-first，本任务不修，记录在案 |
| 3. `data-attention`/`data-orbit-layer` 收敛 | Stage 4 裁决项，不在 Stage 3 |
| 4. `--warm-0/1/2` 映射表 | **已由 §9.5 方案 A 闭环**（§9.1-3）：转化 `--home-warm-*`，canonical `--warm-50..900` 无同名冲突 |

### 9.3 契约断言（评审后推迟）

- 原计划 Stage 3 新建 contract-test（token 等值 / font 独立 / 焦点可见 3 条断言），经评审裁减：
  - 「焦点可见」断言与 `home-production-regression.mjs` `isVisible()`（:80-96）**重复** → 砍除；
  - 静态事实断言**推迟至 Stage 5**（structural contract-test foundation）与 vocabulary 一致性、no-dual-implementation 断言合并建设。
- 理由：时机更对（Stage 4 迁移完成后固化契约）、避免迁移期断言频繁失效、减少测试维护负担。
- 落点为 Stage 5 断言候选：`--klein-*` 依赖 canonical 定义（§9.1-1）、planet-* 三件套双实现等值（§9.1-6）、font Inter 独立性（§9.1-5）。

### 9.4 双轴 code review 裁定（2026-08-04）

对 Stage 1-2 diff 做 Standards + Spec 双轴 review 后裁定：

1. **token 删除恢复**：Stage 1-2 diff 曾删除 home.css `:root` 的 `--klein-500/400`、`--warm-0/1/2`（5 行），超出 Stage 1-2 范围。裁定：**恢复原定义**（值同 canonical 或零引用，无渲染影响）。后续处理：warm 由 **§9.5 方案 A 转化闭环**（→ `--home-warm-*`）；klein 重复定义**专项裁决待定**（木下负责），不在本任务 Stage 内处理。
2. **unavailable guard**：Stage 2 将"无 `data-state` = 隐藏"改为显式 `data-has-state="unavailable"` 后，`respond()`/`updateSignalAttention()` 原 `!hasState` early-return 失效（hasState 恒有值），隐藏信号会产生不可见的 class churn/动画调度；parallax（runtime:2434）写入 `--satellite-px/py: 0` 因 home.css:635 有 `0` fallback 无实际影响。裁定：新增 `isInertSignal()` helper（dormant/unavailable 一律不参与 respond/attention/orbit tween），与 dormant 同等对待，恢复「行为零变化」（unavailable 可见性修复保留——改动前 core opacity=1 可见属 bug）。parallax 不改（零影响）。
3. **frontend-rules.md 小红书角标例外行**：不在 §6 文档项清单内，裁定**保留**（品牌角标合理例外，与已验收视觉一致），授权记录。
4. **编码修复**：移除 `home-runtime.ts`/`home-production-regression.mjs` 首行 BOM（违反 AGENTS.md UTF-8 无 BOM），修复 `home-runtime.ts:13` em-dash 损坏（U+9225+`?` → `—`）。

### 9.5 warm-0/1/2 融合：方案 A 已执行（2026-08-04，专项裁决闭环）

- **裁决**：不合并进 canonical `--warm-50..900`（语义不同源：canonical 为暖灰 UI 中性色阶，Home 为暖金/地质氛围色），采用独立命名 `--home-warm-*`（对齐 canonical `--home-void`/`--home-text-*` 先例）。
- **执行内容**（视觉零变化，值逐一对应）：
  - `--warm-1`（暖金星尘 `#d9b884`）+ 硬编码 `rgb(217 184 132)` → **`--home-warm-dust-rgb: 217 184 132`**（home.css :root 定义，152 行消费点改 `rgb(var(--home-warm-dust-rgb) / var(--home-warm-dust-opacity))`）
  - `--warm-2`（深棕，无精确消费）→ 不落位；硬编码 `rgb(126 98 71)`（暖地质底色）→ **`--home-warm-terrain-rgb: 126 98 71`**（157 行消费点改为 var 引用）
  - `--warm-0`（暖白 `#fbf4e8`，零引用）→ **不落位、删除**（无消费者不留死 token）
  - `--warm-dust`（透明度 0.11）→ **`--home-warm-dust-opacity`**（home.css :root 默认值 + runtime:353 注入名同步）
- **残留检查**：生产代码（src/scripts）对 `--warm-0/1/2`/`--warm-dust` 零残留；canonical `--warm-100..250` 阶不受影响（另一套）。
- **原型资产** `docs/design/prototypes/phase4-2/index.html` 保持原样（历史设计快照，自包含，不改）。
- **验收**：build 绿；regression 全绿（EXIT 0 / errors 0）。

## 10. Stage 4 迁移结论（2026-08-04）

> 方法 B 直接迁移：`data-*` 替换 class 作为唯一状态载体。裁定（木下）：① `revealed`→改名对齐 `reveal`；② 扩展设计系统词汇加 `burst` 档；③ `ready` 贴近生产。

### 10.1 最终词汇表

| 载体 | 值域 | 备注 |
|---|---|---|
| `data-cat-state`（`.about-zone`） | `reveal \| charged \| burst \| recovering` | canonical 四态 + burst 扩展；residue 由 canonical 保留（生产以 `body.cat-residue-visible` + 节点 `is-residue` 表达爆后残粒，不在 component-local 状态机内） |
| `data-planet-state`（`.planet`） | `ready` | canonical 值域含 ready 档（components.css:268），生产仅用此档 |
| `.about-zone.ready` class | 保留 | 裁定 3：canonical cat 词汇无 ready，交互开关非状态机状态 |

### 10.2 实施内容

- **home.css**：20 处选择器改名（`.planet.ready`×2、`.about-zone.{revealed,charged,burst,recovering}`×18 → `[data-*]`，其中 reveal×5/charged×7/burst×5/recovering×1）；`.about-zone.ready`（962 行）保留。
- **home-runtime.ts**：
  - `planet.dataset.planetState = "ready"` / delete（原 classList.toggle，1617-1621）；`canEnter` 读 `dataset.planetState === "ready"`（1636）。
  - 新增 `syncCatState()`：以 `catState` 内部状态机（rest/charged/burst/recover）为主态真相，经 `CAT_STATE_ATTR` 翻译表投影 `data-cat-state`；`catRevealActive`（hover/focus 显现）作为主态缺失时的兜底 `reveal`——解决单值属性无法并存叠加态的难点。
  - **行为差异（2026-08-04 review 后确认，裁定主态优先）**：旧生产 `.revealed` 无条件叠加于主态（hover 蓄能中猫的颜色/光晕/link 亮度与主态并存）；单值 `data-cat-state` 主态优先，hover 显现效果在主态激活时让位（场景：指针在 about 星球上、猫区外，且猫处于主态）。与 DESIGN §2.7「主态优先、不得与主态规则冲突」契约一致，接受差异，不再追求旧版叠加视觉。
  - 新增 `setCatReveal(active)`：about 星球 mouseenter/leave/focus/blur → 投影兜底。
  - 5 处主态操作点改为 `syncCatState()`（reset/recover 完成/enterAboutFromCat/activateCat/recover 开始）。
  - `catZone.classList.toggle("ready")` 保留（裁定 3，3 处读写点 1639/1911/2135 不动）。
- **home-production-regression.mjs**：新增 `catVocabulary` 断言（Stage 4 exit 要求）——5 星球至少一个 `data-planet-state="ready"`；hover-enter → `reveal`、hover-leave → 无值、click → `charged`、再次 click → `burst`。
- **DESIGN.md §2.7**：追加 `data-cat-state` 值域契约（reveal/charged/burst/residue/recovering 五态语义 + 互斥/兜底规则），扩展设计系统词汇。

### 10.3 验收

- build 绿；regression 全绿（含新增 `catVocabulary` 断言）；无 console errors。
- 浏览器实测 cat 交互四条路径（hover 显现/蓄能/爆开/恢复）与生产行为等价。

## 11. Stage 5 结论（structural contract-test foundation）

> Stage 5 产物：`scripts/home-css-contract-test.mjs`（15 条静态断言）+ `package.json` `test:home-css`。纯读文件断言，无浏览器依赖，对齐 `home-copy-contract-test.mjs` 风格。

### 11.1 断言清单

| # | 断言 | 依据 |
|---|---|---|
| 1 | astro `<main data-canvas="home">` + variables.css `[data-canvas="home"]` 块 | canvas 身份声明/fallback |
| 2 | home.css HAS 四值齐全（active/stable/dormant/unavailable） | §7 Stage 2 |
| 3 | 生产四文件（astro/runtime/client/home.css）无旧词汇 `data-state`（含 review 加固：runtime 正向断言 `dataset.hasState`） | §1「不保留 data-state alias」 |
| 4 | 生产四文件无 canonical class（`.home-planet`/`.has-beacon`/`.leopard-cat` 选择器层） | no-dual-implementation 雏形，范围限生产文件（canonical 未删前） |
| 5 | home.css `.planet[data-planet-state="ready"]` 存在 | §10.1 |
| 6 | runtime `planetState` 读写 + home.css 无 `.planet.ready` class | §10.2 |
| 7 | home.css data-cat-state 四值齐全（reveal/charged/burst/recovering） | §10.1 |
| 8 | home.css 无 `.about-zone.{revealed,charged,burst,recovering}`；`.about-zone.ready` 保留 | §10.2 |
| 9 | runtime `CAT_STATE_ATTR`/`syncCatState`/`setCatReveal`/`catZone.dataset.catState` | §10.2 |
| 10 | runtime 不写回 `body.dataset.{catState,hasState,planetState,state}` | §7 Stage 4「body scene state 不动」 |
| 11 | `--klein-400/500` canonical 定义存在 + home.css 消费 | §9.1-1 |
| 12 | planet-* 三件套双实现等值（0.3/0.24/56px） | §9.1-6 |
| 13 | font Inter 独立性（home.css 有、variables.css 无） | §9.1-5 |
| 14 | `--home-warm-*` 三件套落位 + 无 `--warm-0/1/2/--warm-dust` 残留 + runtime 注入名 | §9.5 |
| 15 | `.planet-focus` 生产实现自足（home.css 基础块 + astro `#planet-focus` + runtime 消费） | §4/§9.1-7；canonical 副本随 Stage 6 删除，届时升级为全局单源断言 |

### 11.2 新发现（Stage 6 范围外，记录待裁决）

- **typography.css:116-202 Phase 4.3 Home 排版区块**：生产样式文件内的 canonical 词汇残留整块（`.home-planet__label`/`.star-map-index__link`/`.planet-focus__copy`/`__action`/`__return`/`.about-expanded__body` + 全部 `:lang(zh)` 规则），DOM 与 home.css 零命中（Stage 5 review 曾判断部分活跃，复核有误——生产 focus 按钮为 `.focus-enter`、copy 为 `.focus-copy`，`:is()` 内四选择器全死）。**已并入 Stage 6 一并删除**（见 §12）。

### 11.3 验收

- `npm run test:home-css` 绿（15 条断言通过）。
- build 绿；regression 全绿（EXIT 0 / errors 0；`catVocabulary`：planetStates 含 `ready`，cat 四步 hover→reveal / leave→null / click→charged / 再 click→burst）。

## 12. Stage 6 结论（删除 canonical dead block + no-dual-implementation）

> 2026-08-06 执行。裁定：typography.css 残留整块删除（方案 A：DESIGN.md §3 补记规范参数）；token 选择性保留（A 类有消费者不动、B 类 109 个设计契约 token 保留 + 标注）；test:home-css 不接入 test:contracts（与 home 系独立约定一致，CI 接线待基建）。

### 12.1 删除清单（共 846 行）

| 文件 | 区块 | 行数 | 内容 |
|---|---|---|---|
| components.css | 127-853 | 727 | Home Space / Star Map canonical interface 全块（.home-space-stage/.home-star-layer/.home-star-map/.home-planet/.planet-focus BEM/.has-beacon/.leopard-cat/.star-map-index/.about-expanded/.cursor-meteor） |
| components.css | 934-965 | 32 | reduced-motion 块中 canonical 选择器（.home-star-layer/.home-star-map/.home-planet/.planet-focus/.has-beacon__*/.leopard-cat__*/.cursor-meteor）；921-932 通用动效降级保留 |
| typography.css | 116-202 | 87 | Phase 4.3 Home 排版区块（含全部 :lang(zh) 规则） |

**保留**：components.css 1-126（通用组件）、855-919（anim-fade-up/anim-stagger/parallax utilities）、920-932（通用 reduced-motion）；variables.css 全部 token。

### 12.2 Token 处置

- **A 类（有消费者，不动）**：--klein-400/500、planet-* 三件套（双实现，home.css 自持）、--stagger-*/--scroll-offset/--parallax-*/--reveal-offset（utilities 消费）、--interaction-*（--interaction-hit-size 被 components.css 保留区块 :59 与 blog.css/feed.css 消费）、全站通用 token。
- **B 类（109 个，零消费者，保留 + 标注为设计契约参考）**：--star-map-*/--interaction-* 其余（§3.4）、--planet-* 光学家族（§3.5，含 --planet-focus-*）、--has-*（§3.6）、--leopardcat-*（§3.7）、--cursor-meteor-*（§3.8 + §3.9 后覆盖块）。标注：variables.css 区块注释保留 + DESIGN.md §3.2 后新增标注段（"canonical Home 视觉契约 token 保留为设计契约参考，生产实现参数以 home.css 为准，双实现 token 已核验等值"）。
- `--cursor-meteor-*` 消费方核实：唯一消费者是 components.css `.cursor-meteor`（已删），variables.css:492-503 覆盖块同样零消费——均归 B 类保留。

### 12.3 contract-test 升级（no-dual-implementation 最终断言）

- #4 全局化：新增对 components.css/typography.css 的断言——无 `.home-space-stage`/`.home-star-layer`/`.home-star-map`/`.home-planet`/`.has-beacon`/`.leopard-cat`/`.star-map-index`/`.about-expanded`/`.cursor-meteor`/`.planet-focus` 任何选择器。
- 新增 `.planet-focus` 单源断言（canonical 侧零出现，§4 碰撞物理消除）。
- 新增 B 类 token 保留断言（--has-/--leopardcat-/--star-map-/--interaction-/--cursor-meteor-/--planet-focus- 前缀在 variables.css 存在），锁定选择性保留决策。

### 12.4 DESIGN.md 补记（方案 A）

- §3.2 后新增 "Home Focus 面板排版" 表：focus 标题 EN/CN clamp 字号、正文、操作按钮、星球标签、CN 切换、移动端降级（源自 typography.css 116-202 规范值）。
- 同段标注 canonical token 保留原则（见 12.2）。

### 12.5 验收

- `npm run test:home-css` 绿（含全局化断言 + B 类保留断言）。
- build 绿；regression 全绿（EXIT 0 / errors 0；visibleSignals/layerOpacities 与删除前一致，证明零视觉变化；catVocabulary 五态齐全；7 viewport 无溢出；reducedMotion.cursorMeteorHidden=true——生产流星为 .entry-meteor/#meteor-canvas，与 canonical .cursor-meteor 无关）。
- 内容清点记录：删除前全局 grep 确认 canonical 选择器在 src/components（ts/astro）与 home.css 零命中（仅 has-beacon-body-v1.png 资源文件名，非选择器）。

## 13. Stage 7 结论（文档同步）

> 2026-08-06 执行。修正 §6 清单 3 项；workflow-orchestration 按裁决不动（远端已改写，merge 自动跟随）；global.css 保留不动。

### 13.1 文档修正

| 位置 | 修正 |
|---|---|
| frontend-rules §4:44-45 | "Base.astro 仍引用 global.css / 待迁移" → "已切换 main.css 入口（2026-08-06 核验）；global.css 为历史遗留死文件（生产零引用），不得重新引用；保留为死文件零风险" |
| frontend-rules §6.3:84 | "保留 canonical state interface" → 生产词汇表（data-has-state 四态 / data-planet-state=ready / data-cat-state 四值 / .about-zone.ready 交互开关）+ 未收敛待裁决项（data-attention vs .attention、轨道前后层 canonical data-orbit-layer/depth vs 生产 .back/.front）+ "运行时控制"保留 |
| DESIGN.md §2.7:271 | "canonical 保留值" → "设计系统保留值（canonical 组件实现已于 2026-08-06 清理，token 保留）" |
| §3:37 | 无需改（规则已被 Stage 1 满足，文本无失真） |

### 13.2 远端核查（2026-08-06，GitHub API + git diff --no-index 字节级验证）

- **frontend-rules.md**：远端 main 与基线 7ab35ad 字节级一致（git diff --no-index 零差异）；本地 = 基线 +1/-0（Stage 3"小红书角标例外"行）→ 修正无冲突。
- **DESIGN.md**：远端 main 与基线 7ab35ad 字节级一致；本地 = 基线 +24/-0（§2.7 词汇契约 +10、§3.2 补记 +14，git diff --numstat 核验），零删除 → 修正无冲突。
- **package.json**：远端独有 3 行（test:learn:preview / preview:stop / jsonc-parser）与本地独有 1 行（test:home-css）不同区域 → merge 自动合并或简单手工合并。
- **workflow-orchestration.md**：远端 `1fdafc5`（docs: clarify Phase 8 workflow）已把 F deferred 明细（含"Base.astro/global.css 入口迁移留到首个正式前端模块"）改写为"其余 deferred 记录仅作历史参考，不构成 Phase 8 当前任务规则"；本地未动该行 → merge 时 git 自动采用远端新版（单方修改无冲突）。**不动即最优**。
- 其余远端提交（Finance 代码、worker 配置、治理文档）与本任务文件正交。

### 13.3 新发现（记录待裁决，不属本任务）

- **global.css `.astro-code`（8 行，Shiki 代码块宿主样式）**：global.css 370 行中唯一在现行体系（variables/typography/components/blog.css）无替代的规则。global.css 其余内容（token/reset/typography/post-card/article 等）已被现行体系完全覆盖（`--space-*`/`--text-*` 还与 variables.css 同名不同值，引入反而冲突）。global.css 保留不动；`.astro-code` 是否迁移至 blog.css 另行裁决。

### 13.4 验收

- 纯文档改动（3 文件 + 本 inventory），无 build 需求；修正前事实核验：Base.astro:3 已 import main.css、DESIGN.md:271 原文、frontend-rules 44/45/84 原文。
- 双轴 review 前置核查：与远端无冲突（§13.2）。

## 边界

- 本文件只做审计，不改任何代码。
- 所有 git commit / push 由木下执行。
- 本任务与 Finance / DSV4 独立，无交集。
