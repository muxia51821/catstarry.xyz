# catstarry.xyz

木下 的个人网站 —— 建造一个有意思、有温度的数字空间。

---

## 网站结构

| 路径 | 内容 | 可见性 |
|------|------|--------|
| `/` | 聚合首页（艺术风格，数据来自 /blog/feed/projects，含 about） | 公开 |
| `/blog` | 技术/生活/观点混合博客，Markdown + Git push → CF Pages | 公开 |
| `/feed` | 统一时间线：碎碎念 + 剪藏，两种卡片类型 | 公开 |
| `/learn` | 编程学习笔记/知识蒸馏（基于 teach skill） | 公开 |
| `/projects` | 成品项目展示 | 公开 |
| `poker.catstarry.xyz` | Poker PWA | 公开（已上线） |
| `f.catstarry.xyz` | 双人协作财务面板（密码鉴权） | 私密 |

---

## 技术栈

| 层 | 选型 |
|----|------|
| 框架 | Astro hybrid（SSG 优先，按需 SSR） |
| 交互 | React + shadcn/ui（@astrojs/react） |
| 后端 | Cloudflare Workers（feed-api + finance-api 独立部署） |
| 数据库 | Cloudflare D1（结构化数据）+ KV（缓存/配置） |
| 存储 | Cloudflare R2（媒体文件） |
| 部署 | Cloudflare Pages + wrangler + GitHub Actions |

---

## 项目结构

```
catstarry.xyz/
├── src/pages/          # Astro 页面（所有路由）
├── src/components/     # React island 组件
├── workers/
│   ├── feed-api/       # /feed Worker
│   └── finance-api/    # 财务面板 Worker
├── shared/             # 鉴权 + 类型定义
├── content/            # Markdown 内容（blog/ + learn/）
├── teach/              # Teach skill workspace
├── docs/               # 需求分析 & 技术文档
└── public/             # 静态资源
```

---

## 文档

- [需求分析 Handoff](docs/handoff-20260702.md)
- [财务面板需求](docs/finance-requirements-20260703.json)
- [技术选型决策](docs/tech-decisions-20260703.md)
- [项目术语表](GLOSSARY.md)

---

## 本地启动

```bash
npm install
npm run dev        # Astro dev server
```

## 部署

```bash
git push           # GitHub Actions → CF Pages + Workers 自动部署
```
