# catstarry.xyz

`catstarry.xyz` 是木下的个人网站，记录文章、足迹、学习内容及项目。

## 主要模块

- Home：星图式站点入口
- Blog：文章与阅读体验
- Feed：公开时间线、碎碎念与剪藏
- Learn：公开学习笔记
- Projects：项目展示

Finance 是独立的内部工作区，不属于公开 Content Family。

## 技术基线

- 主站：Astro hybrid + React，运行于 Cloudflare Site Worker
- 主站 API：Cloudflare Feed Worker
- Finance：独立 Cloudflare Pages + Finance Worker
- 数据与存储：D1 + KV + R2

具体版本、binding、route 和部署方式以当前 `package.json`、Wrangler 配置、代码及架构文档为准。

- 网站：<https://catstarry.xyz>

## 项目文档

- [CONTEXT.md](CONTEXT.md)：快速项目定向与少量长期事实
- [AGENTS.md](AGENTS.md)：Agent 行为、Git 权限与 production safety
- [docs/workflow-orchestration.md](docs/workflow-orchestration.md)：当前 Phase 8 维护工作流
- [docs/content/README.md](docs/content/README.md)：Content Family 产品治理入口
- [docs/architecture.md](docs/architecture.md)：当前技术架构入口
- [docs/SITEMAP.md](docs/SITEMAP.md)：路由、页面职责与公开／非公开范围
- [CHANGELOG.md](CHANGELOG.md)：重要 repository / release history
