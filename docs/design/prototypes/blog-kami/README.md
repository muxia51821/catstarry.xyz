# Blog Kami reading prototype

这是 catstarry.xyz Blog 的隔离阅读页原型，不属于 Astro 生产路由，也不读取 API、Giscus、D1、KV 或 Worker。

## 运行

直接打开：

```text
D:\catstarry-blog-kami\docs\design\prototypes\blog-kami\index.html
```

也可以在 PowerShell 7 中打开本地文件：

```powershell
Start-Process (Resolve-Path .\docs\design\prototypes\blog-kami\index.html)
```

原型只依赖 HTML、CSS 和同目录 SVG，不需要安装新依赖，也不使用 Python。

## 内容来源

- 正文、标题、日期、分类、标签、描述、图片和表格来自 `src/data/blog/from-zero.md`。
- `digital-space.svg` 是从现有 `public/blog/digital-space.svg` 复制的原型本地资源，未修改生产文件。
- H3、无序列表、有序列表、blockquote 和 inline code 位于“原型补充演示”区域，并明确标记为非正式正文。
- 阅读数使用 `— 次阅读`，避免在静态原型中伪造真实统计。

## 设计决定

### 吸收 Kami 的部分

- 暖纸色阅读背景和暖中性层级；
- 单一、低剂量的 ink-blue / Klein Blue 重点；
- 编辑式版心、细分隔线和长文节奏；
- figure、caption、table、code block、blockquote 使用统一的阅读间距。

### 保留 catstarry 的部分

- `catstarry.xyz` 文本身份和 `返回星图` 入口；
- Content / Cream Gallery 的奶油暖白画布；
- 当前 canonical 字体栈和 CJK 优先排版；
- Blog 文章信息、标签、阅读数位置、返回博客列表、ArticleFooter 与 Giscus 结构；
- 真实 Blog 图片和真实文章正文。

### 明确拒绝的部分

- Kami 完整 Landing Page、Pricing、FAQ、产品 Gallery；
- 外部字体 CDN、未审查字体文件和衬线字体迁移；
- 大面积渐变、玻璃拟态、硬阴影、夸张卡片堆叠；
- 第二套 Blog 运行时、CMS、数据库正文、生产 Giscus 接入；
- 对 `src/styles/`、`src/pages/blog/`、`src/components/` 或任何 Worker 的修改。

## Token 映射

`styles.css` 只消费原型局部别名，别名对应当前 canonical token：

| Prototype alias | Canonical source | Purpose |
| --- | --- | --- |
| `--p-paper` | `--content-gallery` / `--warm-50` | Content canvas |
| `--p-surface` | `--content-surface-soft` / `--warm-200` | soft rule / table rhythm |
| `--p-ink` | `--content-text-primary` / `--warm-900` | headings and primary ink |
| `--p-body` | `--content-text-body` / `--warm-800` | article body |
| `--p-muted` | `--content-text-secondary` / `--warm-700` | metadata and captions |
| `--p-line` | `--content-hairline` / `--warm-200` | hairlines |
| `--p-blue` | `--klein-500` / `--blue-700` | links and focus |

## 范围

本目录是一次性视觉原型。完成验收后，是否把视觉结论回流到生产 Blog，属于后续独立任务；本原型不会自动 commit、push、merge、deploy 或修改 production。
