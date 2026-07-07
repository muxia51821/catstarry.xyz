---
version: 1.4
name: catstarry.xyz-design-system
description: catstarry.xyz 专属视觉设计系统。以 WCAG 合规的克莱因蓝 5 阶体系为Brand Voltage，Home 以 Meta 科技结构为骨架，融合 Dala 粒子星座与 Monopo 冷调虹彩；Content 采用奶油画廊 (Cream Canvas) 基底，呈现艺术出版物质感；Finance 沿用 Wizard 松石绿 CTA 与 Binance 暗黑交易台。支持 Dark/Light 语义化无缝切换。CJK 优先，锋利几何，WCAG 与 GB/T 44808 双合规。
---

# catstarry.xyz 设计系统

> Phase 4.1 (Design 1.4) 产出。
> 核心修正：落地克莱因蓝 5 阶 WCAG 合规色阶；重构暗底中性色解决发丝线隐形；粒子与氛围色统一冷调消除色相冲突；补充 CJK 排版工程级硬约束；明确三画布风格权重与气质分层。

---

## 1. 视觉主题与氛围

catstarry.xyz 是木下的数字生活流——不是名片，不是产品 landing page，不是博客列表。系统采用三画布架构，以适配完全不同的内容语境的气质表达，全局风格权重统一为：Meta 结构基底 > Monopo/Dala 艺术气质 > Webflow 细节补充。
**Home（Sci-Fi Editorial）** —— 单一克莱因蓝 (`#002FA7`) 是唯一品牌色与 CTA 色，提供极致的艺术Voltage。基底：Meta 式清晰的色彩层级与两栏产品化布局，冷调深黑画布。灵魂：Dala 粒子星座作为签名视觉锚点。细节：大字号排版张力，克制的交互反馈，整体呈现先锋科技感而非纯艺术虚空排版信任巨大字号差，英文标题轻如耳语，中文标题稳重落地。
**Content Pages（Cream Gallery）** —— 奶油暖白画廊底 (`#FAF9F5`) + 暖墨色文字。从 Home 的暗黑虚空反转为温暖的艺术画廊，利用克莱因蓝与奶油底色的互补色张力营造先锋艺术感。排版回归中文阅读舒适区（行高 ≥1.85，标点挤压）。卡片采用深奶油底、锋利的 8px 圆角与暖咖发丝线，依靠色阶而非重阴影建立层级。Dala的艺术基因以“微观残响”形式存在（英文 ultra-light 字重与极低透明度青色粒子点缀）。
**Finance（Cyber Arena）** —— 深黑画布 + 松石绿 CTA (`#5eaf9e`) + 涨绿跌红。数字优先，表格密度，暗黑双态。抛弃传统金融黄，采用 Wizard 的竞技游戏感色彩（Binance/Wizard 基因）。

### 1.1 关键特征

- **三画布系统**：Home 暗黑虚空 / Content 艺术画廊 / Finance 赛博暗面，各画布变量严格隔离
- **克莱因蓝 Voltage**：全站 Home 与 Content 品牌色 `#002FA7`，纯粹的先锋艺术感
- **松石绿竞技场**：Finance 唯一主 CTA 色 `#5eaf9e`，冷酷而充满能量
- **电光蓝微观残响**：`#4F71FF` 在 Home 聚合为粒子星座，在 Content 以极低透明度作为环境点缀
- **锋利几何**：卡片圆角降级为 8px-20px，摒弃 SaaS 感，回归画廊锋利感
- **CJK 优先排版**：中文正文行高 ≥1.85，严格标点挤压，中英文字距分离设定

---

## 2. 色彩系统

### 2.1全站通用：克莱因蓝色阶（WCAG 2.1 AA 合规）

锚定 Meta 钴蓝色阶逻辑，以克莱因蓝为核心扩展 5 阶完整体系，亮底 / 暗底均满足对比度要求。
/_ Klein Blue Scale (WCAG 2.1 AA Compliant) _/
--klein-600: #001F70; /_ 亮底 Hover/Active (深压) _/
--klein-500: #002FA7; /_ 亮底 CTA，重点文字 **品牌色，logo** (绝对艺术蓝) _/
--klein-400: #335CFF; /_ 暗底主 CTA，边框 (对比度 3.5:1 on #0A0A0C) _/
--klein-300: #6685FF; /_ 暗底次级图标，亮底辅助链接 (需配合下划线) _/
--klein-100: #E6ECFF; /_ 亮底选中背景，淡色提示条 _/

### 2.2 Home 画布 —— 暗色虚空

| Token                 | 色值                      | 核心用途                                      |
| --------------------- | ------------------------- | --------------------------------------------- |
| --home-void           | #0A0A0C                   | 页面底色（极暗冷灰，严禁使用 #000000 防光晕） |
| --home-surface-soft   | #121722                   | 导航/次级表面                                 |
| --home-surface-card   | #1A2030                   | 卡片底色                                      |
| --home-border-hover   | rgba(255, 255, 255, 0.16) | 卡片 Hover 态边框（提升至 16% 满足 WCAG 3:1） |
| --home-text-primary   | #E5E7EB                   | 主文本/标题 (控制对比度在 16.5:1 左右)        |
| --home-text-secondary | #9CA3AF                   | 次级文本                                      |
| --home-text-muted     | #6B7280                   | 辅助/说明文字                                 |

> **注意**：暗底主 CTA 专用色 `--klein-400`（#335CFF）在 2.1 节定义，需用于 `btn-primary-home` 等交互元素以确保 WCAG 非文本对比度 ≥ 3:1。 粒子星座专用色 `--particle-core` (#4F71FF) 在 2.6 节定义。

### 2.3 Content 画布 —— 奶油画廊 (Cream Gallery)

| Token                    | 色值    | 核心用途                             |
| ------------------------ | ------- | ------------------------------------ |
| --content-gallery        | #FAF9F5 | 页面底色，奶油暖白，消除数码感       |
| --content-surface-soft   | #F5F0E8 | 极浅区块底色                         |
| --content-surface-card   | #EFE9DE | 卡片底色，深奶油色，靠色阶托起层级   |
| --content-hairline       | #E6DFD8 | 卡片发丝线边框，暖咖色               |
| --content-text-primary   | #141413 | 主文字，暖墨黑，避免冷黑在暖底上突兀 |
| --content-text-body      | #3D3D3A | 正文色，暖灰黑                       |
| --content-text-secondary | #6C6A64 | 次级文字，暖灰                       |

> **注**：Content 页面 CTA 与激活态全站统一复用 Home 的 `--klein-500`\_

### 2.4 Finance 画布 —— 赛博暗面 (Cyber Arena)

| Token                      | 色值    | 核心用途                                  |
| -------------------------- | ------- | ----------------------------------------- |
| --finance-dark             | #0b0e11 | 页面底色 (Binance 基因)                   |
| --finance-surface          | #1e2329 | 卡片底色                                  |
| --finance-surface-elevated | #2b3139 | 嵌套卡片，hover 态                        |
| --finance-cta-green        | #5eaf9e | 主 CTA ，松石绿 (Wizard 基因，必须配黑字) |
| --finance-up               | #f6465d | 上涨/正值                                 |
| --finance-down             | #0ecb81 | 下跌/负值                                 |
| --finance-text-primary     | #eaecef | 主文本                                    |
| --finance-text-secondary   | #848e9c | 次级文本/表头                             |

### 2.5 类别标记色（Home + Feed 共用）

| Token                  | 色值      | 内容类型 |
| ---------------------- | --------- | -------- |
| `--color-cat-blog`     | `#7a3dff` | 博客     |
| `--color-cat-feed`     | `#3b89ff` | 碎碎念   |
| `--color-cat-bookmark` | `#00d722` | 剪藏     |
| `--color-cat-project`  | `#ff6b00` | 项目     |
| `--color-cat-learn`    | `#ed52cb` | 学习笔记 |

### 2.6 /_ Dala & Monopo Signature _/

--color-particle-core: #4F71FF； /_ 粒子核心色 (电光蓝，保持冷色调) _/
--color-particle-glow: #00E5FF; /_ 粒子边缘光晕 (青色，Sci-Fi 经典对比) _/
--gradient-iris-cold: linear-gradient(135deg, rgba(79, 113, 255, 0.4), rgba(0, 229, 255, 0.1), rgba(255, 184, 41, 0.05)); /_ 冷调虹彩，去除暖色脏感 _/

---

## 3. 排版系统

### 3.1 字体栈 (Font Stack)

本系统采用“四轨制”字体架构，严格区分品牌展示、UI 交互、数据呈现与 CJK 兜底场景。所有字体均通过 CSS 变量进行全局管控。

| 角色             | 字体家族 (Font Family)                  | 气质定位                     | CSS 变量定义     | 说明                                                                                              |
| :--------------- | :-------------------------------------- | :--------------------------- | :--------------- | ------------------------------------------------------------------------------------------------- |
| **Display**      | `IBM Plex Sans` ， `HarmonyOS Sans`     | 工业画廊、理性金融、品牌骨架 | `--font-display` | Monopo 基因，信任字号不信任字重。IBM Plex Sans 为 94px 标题首选，HarmonyOS Sans 作为 300 字重后备 |
| **UI / Body**    | `Geist` ， `HarmonyOS Sans`             | 极致可读、现代界面、信息传递 | `--font-body`    | Dark Mode 下的推荐值，创造 Dala 漂浮感，Geist 为 UI 和正文首选，HarmonyOS Sans 为字符后备         |
| **Data / Mono**  | `JetBrains Mono`                        | 极客赛博、精准数据、代码终端 | `--font-mono`    | 等宽字体，用于 Finance 价格、成交量等表格数字                                                     |
| **CJK Fallback** | `HarmonyOS Sans SC` , `Microsoft YaHei` | 优雅现代、中文兜底           | `--font-cjk`     | CJK 优先，屏幕阅读优化 ，全站中文专用，与英文栈严格隔离                                           |

> **CSS 变量映射 (定义在 `variables.css` 的 `:root` 中)：**

### 3.2 Home 字号层级 (Sci-Fi Editorial)

> _注：中文视觉密度高于英文，Display 级别字号强制按 0.9x 缩放。行高列为英文基准，若包含 CJK 字符必须使用「CJK 强制行高」列。_

| 角色           | EN 字号 | CN 字号 | EN 字重/字距   | CN 字重/字距 | EN 行高 | CJK 强制行高 | 说明        |
| :------------- | :------ | :------ | :------------- | :----------- | :------ | :----------- | :---------- |
| **Display**    | 94px    | 84px    | 300 / -0.04em  | 400 / 0      | 0.90    | **1.25**     | Hero 大标题 |
| **Heading LG** | 78px    | 70px    | 300 / -0.04em  | 400 / 0      | 1.00    | **1.30**     | 区块标题    |
| **Heading**    | 54px    | 48px    | 400 / -0.03em  | 400 / 0      | 1.10    | **1.35**     | 次级标题    |
| **Subheading** | 39px    | 35px    | 400 / -0.02em  | 400 / 0      | 1.20    | **1.40**     | 卡片标题    |
| **Body LG**    | 18px    | 16px    | 200 / 0        | 400 / 0      | 1.60    | **1.85**     | 导读文本    |
| **Body**       | 16px    | 16px    | 400 / 0        | 400 / 0      | 1.60    | **1.85**     | 正文起步    |
| **Nav**        | 14px    | 14px    | 600 / +0.025em | 500 / 0      | 1.20    | 1.20         | 导航        |
| **Caption**    | 12px    | 12px    | 400 / 0        | 400 / 0      | 1.50    | 1.50         | 注释        |

- **3.2.1 响应式缩放与深浅模式微调 (Fluid & Theme Adaptation)**
- **流式缩放 (Fluid Typography)**：所有 Display 至 Heading 层级必须使用 `clamp()` 函数，断点对齐全局响应式断点 (640px / 1024px)。例如：`font-size: clamp(48px, 8vw, 94px);`。
- **深浅模式字重差异**：
- **Dark Mode (默认)**：Display 英文使用 `font-weight: 300`，字距 `-0.04em`（Monopo 低语感）。
- **Light Mode (Cream Canvas)**：由于亮底“光渗效应 (Optical Bleed)”，Display 英文必须加粗至 `font-weight: 400`，字距放松至 `-0.02em`，防止细笔画在暖白底上断裂。
- **CJK 隔离**：无论深浅模式，中文 Display 始终锁定 `font-weight: 400`，字距 `0`。

### 3.3 CJK 排版规则（核心规范）

由于文档以中文语境居多，所有涉及中文的排版必须严格遵守以下规则：

1. **行高**：正文 `>=1.85`，标题 `>=1.35`，说明文字 `>=1.65`。中文汉字视觉密度大，绝不能使用英文的 1.2-1.5 行高。
2. **字重**：中文不使用 `bold (700+)`，标题与正文统一使用 `400`。
3. **字间距（关键修正）**：
   - **纯英文/数字标题**：必须使用负字距（如 -0.04em），这是 Monopo 基因的精髓。
   - **CJK 标题与正文**：**绝对禁止负字距**，强制设为 `0` 或 `normal`。中文字框自带留白，负字距会导致笔画重叠。
4. **标点挤压**：
   - 使用 CSS `text-spacing-trim: trim-start` 或等价 JS 方案。
   - 行首禁止出现的标点：`，。、；：）」』】`
   - 行尾禁止出现的标点：`（「『【`
   - 连续标点之间挤压全角为半角。
5. **中英混排**：
   - 中文与英文/数字之间自动插入 `1/4 em` 间距（不可手动敲空格）。
   - 英文/数字不使用 CJK 字体，自动 fallback 到 `Geist`。
6. **绝对行间距底线**：任何多行 CJK 标题的绝对行间距（Line-gap）不得小于 `16px`。若计算值小于 16px，必须强制放大 `line-height` 倍数。
7. **中英缩放比例**：Display 级别字号，中文像素值强制为英文的 `0.9` 倍（如 EN 80px / CN 72px）。
8. **字重限制**：中文最高字重锁定为 `500` (Medium)，严禁使用 `700` (Bold) 导致笔画糊死。

### 3.4 Finance 字号层级

| 角色         | 字号 | 字重 | 行高 | 强制字体                       |
| :----------- | :--- | :--- | :--- | :----------------------------- |
| **数字展示** | 40px | 700  | 1.10 | `--font-mono` (JetBrains Mono) |
| **标题**     | 24px | 600  | 1.30 | `--font-body` (HarmonyOS Sans) |
| **正文**     | 14px | 400  | 1.50 | `--font-body` (HarmonyOS Sans) |
| **说明**     | 12px | 500  | 1.40 | `--font-body` (HarmonyOS Sans) |

---

## 4. 组件样式

### 4.1 按钮

| 变体                  | 背景                              | 文字                                        | 圆角                               | 内边距                         | 场景                                                                                               |
| --------------------- | --------------------------------- | ------------------------------------------- | ---------------------------------- | ------------------------------ | -------------------------------------------------------------------------------------------------- |
| btn-primary-home      | --klein-400 (#335CFF)             | #ffffff                                     | 100px (pill)                       | 14px 30px                      | Home 暗底主 CTA。**修复**：禁用 --klein-500，使用 --klein-400 确保暗底对比度 ≥ 3:1 (WCAG 1.4.11)。 |
| _交互状态规范_        | _Hover_: `--klein-300` + 微光投影 | _Active_: `--klein-500` + `translateY(1px)` | _Focus-visible_: 2px 白/蓝 Outline | _Disabled_: `opacity: 0.4`     | 所有状态切换必须使用 `transition: all 0.2s var(--ease-monopo)`，禁用 `all` 以外的长时间过渡。      |
| `btn-secondary-home`  | `transparent`                     | `#ffffff`                                   | 100px (pill)                       | 12px 28px, `2px solid #E5E7EB` | Home 次 CTA (Meta 基因)                                                                            |
| `btn-primary-content` | `--klein-500`                     | `#ffffff`                                   | 8px                                | 12px 24px                      | Content 页面 CTA，复用克莱因蓝，方角                                                               |
| `btn-primary-finance` | `--color-cta-cyber-green`         | `#0b0e11`                                   | 8px                                | 12px 24px                      | Finance 主 CTA，松石绿底黑字 (Wizard 基因)                                                         |

### 4.2 卡片（降级圆角，恢复锋利感）

| 变体                    | 圆角   | 投影                        | 内边距  | 场景与基因                                                          |
| ----------------------- | ------ | --------------------------- | ------- | ------------------------------------------------------------------- |
| `card-home`             | 20px   | `none`                      | 32px    | Home 时间线卡片，无边框，全出血照片，保留现代感                     |
| `card-about`            | 20px   | `none`                      | 32px    | Home About 卡片，电光蓝粒子背景                                     |
| `card-content-normal`   | 8px    | `none`                      | 24px    | Blog/feed 普通卡片，`1px solid --color-hairline-cold`，致敬画廊画框 |
| `card-content-featured` | 8px    | `--shadow-webflow-featured` | 24px    | 置顶文章/推荐内容，无边框，Webflow 层次阴影                         |
| `card-finance`          | 8-12px | `none`                      | 16-24px | 数据卡片，紧凑，表面靠色块对比分层 (Wizard/Binance)                 |

### 4.3 粒子星座组件（Home About 专属）

基于 Dala 设计基因的严格视觉规范：

- **形状**：粒子有 triangle 和 circle 两种形状（描边，`1-2px stroke`），绝不使用方形。
- **颜色**：全色谱 vivid colors（以 `#4F71FF` 电光为主，辅以琥珀、青绿、品红、蓝）。
- **组织**：粒子汇聚形成一个有机的"大脑/神经网络"形状，作为品牌签名手势。
- **环境粒子**：主形态周围散布低密度环境粒子，营造漂浮感。
- **Content 残响**：在 Content 页面的文章 Header 或 About 卡片中，允许出现极低透明度 (opacity: 0.1) 的电光粒子作为暗黑 Home 的视觉回响。
- **交互**：默认态展示头像与简介；点击展开为全出血卡片，粒子随展开动画流动。

### 4.4 时间线卡片（Home 混合时间线）

- 左边缘类别色条（五色，仅做边缘标记，不填充满卡）
- 内容类型标签上置
- 照片/视频全出血到卡片边缘
- 零 elevation，大间距分割（46px+）

---

## 5. 布局与间距

### 5.1 Home 网格

| 属性               | 值         | 说明                  |
| ------------------ | ---------- | --------------------- |
| 最大宽度           | 1078px     | Monopo 基因           |
| 内容列宽           | 680px 居中 | 阅读舒适区            |
| 段落间距           | 60-120px   | Dala 基因，大呼吸空间 |
| 卡片间距           | 46px       | Monopo 基因           |
| 元素间距           | 14px       |                       |
| 导航高度           | 64px       |                       |
| About 卡片最小高度 | 480px      |                       |

### 5.2 Content 页面网格

| 属性       | 值                  |
| ---------- | ------------------- |
| 阅读宽度   | 680px               |
| 侧栏宽度   | 260px               |
| 页面内边距 | 32px（移动端 16px） |
| 段落间距   | 48px                |

### 5.3 间距标尺

基础单位：4px（Monopo 基因）
`4, 8, 12, 16, 20, 24, 28, 32, 40, 48, 64, 80, 96, 120`

### 5.4 动效曲线（Monopo 基因）

全站过渡动效使用 Monopo 的"耐心滑行"曲线，严禁弹跳效果。
**宏观转场 (页面切换、卡片展开、粒子流动)**：
`transition-duration: 0.8s - 1.25s;`
**微观交互 (按钮 Hover、边框显现、输入框 Focus)**：
`transition-duration: 0.2s - 0.3s;` (过长的微观交互会导致页面“不跟手”)
**统一曲线**：`transition-timing-function: cubic-bezier(0.19, 1, 0.22, 1);`

---

## 6. 层级与导航

### 6.1 导航栏策略

| 页面                            | 风格                              | 背景                | 激活色                |
| ------------------------------- | --------------------------------- | ------------------- | --------------------- |
| Home                            | Sci-Fi，玻璃质感细条，白字        | 透明 → 滚动后模糊   | `--klein-500`         |
| /blog, /feed, /learn, /projects | Cream Gallery，奶油暖白，暖墨黑字 | `--content-gallery` | `--klein-500`         |
| /finance                        | Cyber Arena，深色实底，松石绿强调 | `--finance-dark`    | `--finance-cta-green` |

### 6.2 导航项

- Home / Blog / Feed / Projects / Learn
- About —— 打开 about 卡片（Home 原地展开粒子星座，其他页面导航栏入口）
- 登录/登出 —— 右对齐

---

## 7. 该做与不该做

### 7.1 该做

- 全站 Home 与 Content 品牌色统一使用克莱因蓝色系 `--klein-500` (`#002FA7`) 承载 CTA，暗底 CTA 使用 --klein-400。
- Finance 主 CTA 必须使用 `--color-cta-cyber-green` (`#5eaf9e`)，严禁出现黄色。Finance 页面数据下跌必须用 #0ecb81（绿色），上涨用 #f6465d（红色）。
- Content 页面必须保持奶油画廊底 (`#FAF9F5`)，利用克莱因蓝与暖底的互补张力营造艺术感。
- 卡片圆角降级：Home 使用 20px，Content 使用 8px，恢复锋利编辑感。
- Home 英文标题用 weight 300 与负字距创造低语感，中文标题用 400 与 0 字距稳重落地。
- 严格实施 CJK 标点挤压与中英混排 `1/4 em` 间距。
- Content Featured 卡片使用 Webflow 5-stop layered shadow 提升层次。
- Finance 数字必须使用--font-mono（JetBrains Mono）等宽字体。
- 全站动效使用 `cubic-bezier(0.19, 1, 0.22, 1)` 曲线。

### 7.2 不该做

- 不在 Finance 页面使用币安黄 `#fcd535`——已被松石绿取代。
- 不在 Home UI 控件（按钮、边框）上使用电光蓝-电光蓝仅属于粒子星座。
- 不对 CJK 中文使用 bold（700+）或负字距。
- 不给 Home 卡片加任何投影——间距 + 20px 圆角 = 层级。
- 不在 Content 页面按钮上用 rounded-full (pill)——那是 Home 专属。
- 不套用 AI 默认模板：居中 Hero + 3 卡片行、紫色渐变、满屏玻璃效果。
- 不在 Finance 页面将松石绿 `#5eaf9e` 用于文本高亮、图标或折线图——它仅属于 CTA 按钮背景。
- 不在松石绿 `#5eaf9e` 按钮上使用白色文字——必须使用深黑 `#0b0e11`。
- 不在 Home 暗色背景上直接使用无阴影的 `--klein-500 (#002FA7)` 细边框——会隐形，需改用 `--klein-400 (#335CFF)` 或增加发光投影。
- 不使用 `#000000` 作为大面积背景，不在使用 `#FFFFFF` 作为暗色模式下的主文本（违反色彩工效学，引发 Halation 光晕效应）。
- 不在暗色背景上使用未经明度提升的 `#002FA7` 作为 UI 组件（如按钮、边框），其对比度 1.8:1 不满足 WCAG 1.4.11 (Non-text Contrast ≥ 3:1) 的最低要求。

### 7.3 Finance 画布无障碍与工效学强制规范 (WCAG & GB/T 44808)

1. **涨跌双重编码 (Dual-Coding)**：严禁仅使用红/绿颜色传达涨跌信息。所有数值必须强制带有 `+`/`-` 符号或 `↑`/`↓` 图标 (WCAG 1.4.1 Use of Color)。
2. **CTA 形状冗余**：松石绿 CTA 按钮 (`#5eaf9e`) 必须具有明确的几何边界（如 6px 圆角 + 内部 16px padding），确保在强光环境或晶状体老化导致色彩辨识度下降时，用户仍能通过形状识别其为可点击控件。
3. **灰度测试**：Finance 页面的所有数据图表和涨跌列表，必须在 CSS `@media (prefers-contrast: more)` 或灰度滤镜下保持信息可读（依赖明度差 L 差异）。

---

## 8. 响应式行为

### 8.1 断点

| 名称    | 宽度       | 变化                                                                                        |
| ------- | ---------- | ------------------------------------------------------------------------------------------- |
| Mobile  | < 640px    | 单列。Home display 降至 42px。卡片全宽。About 卡片 min-height 360px，粒子数减少。导航折叠。 |
| Tablet  | 640-1023px | 两列 feed 网格。导航恢复。About 卡片 min-height 420px。                                     |
| Desktop | >= 1024px  | 完整布局。About 卡片 min-height 480px。                                                     |

### 8.2 移动端特别处理

- 时间线卡片单列排列，圆角保留 20px/8px。
- Feed 发布面板：底部弹出，占屏幕 2/3。
- 触控区 >= 44px。
- 汉堡菜单：右侧滑入，暗色遮罩。

---

## 9. Agent 使用指南

### 9.1 页面 -> 画布映射

| 页面                      | 画布                    | 品牌色/CTA         | 字号层级      | 艺术元素                                |
| ------------------------- | ----------------------- | ------------------ | ------------- | --------------------------------------- |
| Home (/)                  | Dark void `#0A0A0C`     | `#002FA7` 克莱因蓝 | Home scale    | 电光蓝粒子星座 + Monopo 虹彩微光        |
| Blog (/blog/\*)           | Cream Gallery `#FAF9F5` | `#002FA7` 克莱因蓝 | CJK scale     | Webflow featured shadow + Dala 残响粒子 |
| Feed (/feed/\*)           | Cream Gallery           | `#002FA7`          | CJK scale     | Dala 环境粒子                           |
| Projects (/projects)      | Cream Gallery           | `#002FA7`          | CJK scale     | Webflow featured shadow                 |
| Learn (/learn)            | Cream Gallery           | `#002FA7`          | CJK scale     | —                                       |
| Finance (f.catstarry.xyz) | Cyber dark `#0b0e11`    | `#5eaf9e` 松石绿   | Finance scale | —                                       |

### 9.2 Pre-Flight 质检清单

生成任何 UI 前，确认：

- [ ] Home / Content 品牌色为 `#002FA7`（克莱因蓝）
- [ ] Finance 主 CTA 为 `#5eaf9e`（松石绿），无币安黄
- [ ] 电光蓝 `#4F71FF` 仅用于粒子星座和 about 卡片视觉
- [ ] 无 `#8b5cf6` 渐变（AI 默认紫）
- [ ] Home 卡片圆角为 20px，Content 卡片为 8px
- [ ] Content 画布为奶油暖白 `#FAF9F5`，卡片底色为 `#EFE9DE`
- [ ] 组件必须且只能引用 Layer 2 语义 Token (如 --bg-base, --bg-surface, --text-primary, --border-default)，严禁跨层直接引用 Layer 1 原始 Token (如 --home-void, --content-gallery)。
- [ ] 确保 CJK 正文正确 Fallback 至 HarmonyOS Sans SC (通过 --font-body 变量)
- [ ] CJK 正文：行高 >= 1.85，字号 >= 16px，字重 400
- [ ] CJK 标题字距为 0，纯英文标题才用负字距
- [ ] CJK 标点挤压与中英混排间距已实施
- [ ] Home 卡片无投影；Content featured 卡片使用 Webflow layered shadow
- [ ] Home 不是居中 Hero + 3 等大卡片
- [ ] 类别色仅用于边缘标记
- [ ] Content 页面无 rounded-full 按钮
- [ ] Finance 数字使用 --font-mono（JetBrains Mono） 字体栈
- [ ] 代码和标题中无 emoji

### 9.3 Quick Start CSS

> **工程化提示**：以下代码仅包含设计令牌（Design Tokens），用于快速预览或 AI Agent 读取。
> 完整的生产级 CSS（包含 `:lang()` 中英分离、`clamp()` 响应式缩放、组件类）已拆分至工程目录：
>
> - `src/styles/variables.css` (Tokens)
> - `src/styles/typography.css` (排版类)
> - `src/styles/components.css` (组件类)

#### Layer 2 语义 Token 映射表

> **规则**：组件必须且只能引用语义 Token（`--bg-base`、`--text-primary`、`--border-default` 等），**严禁**跨层直接引用 Layer 1 原始 Token（`--home-void`、`--content-gallery` 等）。系统会根据 `data-theme` 和 `data-canvas` 自动切换赋值。

| 语义 Token               | Dark (Home)             | Light (Content)            | Finance                      |
| ------------------------ | ----------------------- | -------------------------- | ---------------------------- |
| `--bg-base`              | `--home-void`           | `--content-gallery`        | `--finance-dark`             |
| `--bg-surface-soft`      | `--home-surface-soft`   | `--content-surface-soft`   | `--finance-surface`          |
| `--bg-surface-card`      | `--home-surface-card`   | `--content-surface-card`   | `--finance-surface-elevated` |
| `--text-primary`         | `--home-text-primary`   | `--content-text-primary`   | `--finance-text-primary`     |
| `--text-secondary`       | `--home-text-secondary` | `--content-text-secondary` | `--finance-text-secondary`   |
| `--text-muted`           | `--home-text-muted`     | `--content-text-secondary` | `--finance-text-secondary`   |
| `--border-default`       | `--home-border-hover`   | `--content-hairline`       | `rgba(255,255,255,0.08)`     |
| `--btn-primary-bg`       | `--klein-400`           | `--klein-500`              | `--finance-cta-green`        |
| `--btn-primary-bg-hover` | `--klein-300`           | `--klein-600`              | `#73c9b6`                    |

```css
/* =========================================
   catstarry.xyz Design System v1.4
   LAYER 1: PRIMITIVES & LAYER 2: SEMANTIC DEFAULTS
   ========================================= */
:root {
  /* --- 1. Brand: Klein Blue Scale (WCAG 2.1 AA) --- */
  --klein-600: #001f70;
  --klein-500: #002fa7; /* Primary on Light */
  --klein-400: #335cff; /* Primary on Dark (Contrast 3.5:1 on void) */
  --klein-300: #6685ff;
  --klein-100: #e6ecff;

  /* --- 2. Canvas: Home (Sci-Fi Dark) --- */
  --home-void: #0a0a0c;
  --home-surface-soft: #121722;
  --home-surface-card: #1a2030;
  --home-border-hover: rgba(255, 255, 255, 0.16);
  --home-text-primary: #e5e7eb;
  --home-text-secondary: #9ca3af;
  --home-text-muted: #6b7280;

  /* --- 3. Canvas: Content (Cream Gallery) --- */
  --content-gallery: #faf9f5;
  --content-surface-soft: #f5f0e8;
  --content-surface-card: #efe9de;
  --content-hairline: #e6dfd8;
  --content-text-primary: #141413;
  --content-text-body: #3d3d3a;
  --content-text-secondary: #6c6a64;

  /* --- 4. Canvas: Finance (Cyber Arena) --- */
  --finance-dark: #0b0e11;
  --finance-surface: #1e2329;
  --finance-surface-elevated: #2b3139;
  --finance-cta-green: #5eaf9e;
  --finance-down: #0ecb81;
  --finance-up: #f6465d;
  --finance-text-primary: #eaecef;
  --finance-text-secondary: #848e9c;

  /* --- 5. Signature: Dala & Monopo --- */
  --particle-core: #4f71ff;
  --particle-glow: #00e5ff;
  --gradient-iris: linear-gradient(
    135deg,
    rgba(79, 113, 255, 0.4),
    rgba(0, 229, 255, 0.1),
    rgba(255, 184, 41, 0.05)
  );
  --saffron-spark: #ffb829;

  /* --- 6. Category Accents --- */
  --cat-blog: #7a3dff;
  --cat-feed: #3b89ff;
  --cat-bookmark: #00d722;
  --cat-project: #ff6b00;
  --cat-learn: #ed52cb;

  /* --- 7. Typography --- */
  --font-display: "IBM Plex Sans", var(--font-cjk), sans-serif;
  --font-body: "Geist", var(--font-cjk), system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;
  --font-cjk: "HarmonyOS Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif;

  /* --- 8. Geometry & Motion --- */
  --radius-home: 20px;
  --radius-content: 8px;
  --radius-btn-home: 100px;
  --radius-btn-content: 8px;
  --radius-btn-finance: 8px;
  --ease-monopo: cubic-bezier(0.19, 1, 0.22, 1);

  /* --- 9. Spacing --- */
  --space-unit: 4px;
  --card-gap: 46px;
  --section-gap: 80px;

  /* --- 10. Webflow Featured Shadow --- */
  --shadow-webflow-featured:
    0 84px 24px rgba(0, 0, 0, 0), 0 54px 22px rgba(0, 0, 0, 0.01),
    0 30px 18px rgba(0, 0, 0, 0.04), 0 13px 13px rgba(0, 0, 0, 0.08),
    0 3px 7px rgba(0, 0, 0, 0.09);

  /* =========================================
     LAYER 2: SEMANTIC TOKENS (DEFAULT: DARK/HOME)
     合并入 :root，避免重复定义
     ========================================= */
  color-scheme: dark;
  --bg-base: var(--home-void);
  --bg-surface-soft: var(--home-surface-soft);
  --bg-surface-card: var(--home-surface-card);
  --text-primary: var(--home-text-primary);
  --text-secondary: var(--home-text-secondary);
  --text-muted: var(--home-text-muted);
  --border-default: var(--home-border-hover);
  --btn-primary-bg: var(--klein-400);
  --btn-primary-bg-hover: var(--klein-300);
}

/* =========================================
   THEME OVERRIDES (深浅模式切换)
   逻辑：系统偏好 + 手动 data-theme 覆盖
   ========================================= */

/* 1. 跟随系统浅色偏好 (Content Cream Gallery) */
@media (prefers-color-scheme: light) {
  :root:not([data-theme="dark"]) {
    color-scheme: light;
    --bg-base: var(--content-gallery);
    --bg-surface-soft: var(--content-surface-soft);
    --bg-surface-card: var(--content-surface-card);
    --text-primary: var(--content-text-primary);
    --text-secondary: var(--content-text-secondary);
    --text-muted: var(--content-text-secondary);
    --border-default: var(--content-hairline);
    --btn-primary-bg: var(--klein-500);
    --btn-primary-bg-hover: var(--klein-600);
  }
}

/* 2. 手动强制深色 (JS 注入 data-theme="dark") */
[data-theme="dark"] {
  color-scheme: dark;
  --bg-base: var(--home-void);
  --bg-surface-soft: var(--home-surface-soft);
  --bg-surface-card: var(--home-surface-card);
  --text-primary: var(--home-text-primary);
  --text-secondary: var(--home-text-secondary);
  --text-muted: var(--home-text-muted);
  --border-default: var(--home-border-hover);
  --btn-primary-bg: var(--klein-400);
  --btn-primary-bg-hover: var(--klein-300);
}

/* 3. 手动强制浅色 (JS 注入 data-theme="light") */
[data-theme="light"] {
  color-scheme: light;
  --bg-base: var(--content-gallery);
  --bg-surface-soft: var(--content-surface-soft);
  --bg-surface-card: var(--content-surface-card);
  --text-primary: var(--content-text-primary);
  --text-secondary: var(--content-text-secondary);
  --text-muted: var(--content-text-secondary);
  --border-default: var(--content-hairline);
  --btn-primary-bg: var(--klein-500);
  --btn-primary-bg-hover: var(--klein-600);
  --font-weight-display: 400;
  --letter-spacing-display: -0.02em;
}

/* 4. Finance 画布专属语义覆盖 (强制深色赛博风格) */
[data-canvas="finance"] {
  color-scheme: dark;
  --bg-base: var(--finance-dark);
  --bg-surface-soft: var(--finance-surface);
  --bg-surface-card: var(--finance-surface-elevated);
  --text-primary: var(--finance-text-primary);
  --text-secondary: var(--finance-text-secondary);
  --text-muted: var(--finance-text-secondary);
  --border-default: rgba(255, 255, 255, 0.08);
  --btn-primary-bg: var(--finance-cta-green);
  --btn-primary-bg-hover: #73c9b6;
}
```
