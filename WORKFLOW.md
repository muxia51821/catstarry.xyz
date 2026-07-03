# catstarry.xyz 项目看板

> 最后更新：2026-07-03

## 整体进度

- [x] 需求分析：主框架已锁定（7条路径全完成）
- [x] 需求分析：B2 /feed媒体处理 + B3 /feed内容管理
- [x] 需求分析：/learn、/projects、聚合首页
- [x] 需求分析：f.catstarry.xyz 财务面板（Curie 完成）
- [x] 技术选型（Astro + React + shadcn/ui + CF Workers + D1 + KV + R2）
- [ ] 项目初始化（Astro scaffold、Workers 骨架、目录搭建）
- [ ] UI/UX 设计
- [ ] 开发实现
- [ ] 测试部署

## 网站结构（已锁定）

| 路径 | 内容 | 需求 | 技术 |
|------|------|------|------|
| / | 聚合首页 | ✅ | SSR (Astro hybrid) |
| /blog | 文章（Markdown + CF Pages部署） | ✅ | SSG |
| /feed | 统一时间线（碎碎念 + 剪藏） | ✅ B1+B2+B3 | SSR + feed-api Worker |
| /learn | 编程学习笔记（teach skill） | ✅ | SSG |
| /projects | 成品项目展示 | ✅ | SSG |
| f.catstarry.xyz | 双人财务面板 | ✅ | SSR + finance-api Worker |
| poker.catstarry.xyz | Poker PWA | 已上线 | — |

## 技术栈（已锁定）

| 层 | 选型 |
|----|------|
| 框架 | Astro hybrid |
| 交互 | React + shadcn/ui |
| 后端 | CF Workers（feed-api + finance-api） |
| 数据库 | D1 + KV |
| 存储 | R2 |
| 部署 | CF Pages + wrangler + GitHub Actions |
| 行情数据 | a-stock-data skill |
| 学习系统 | teach skill |

## 文档索引

| 文档 | 路径 |
|------|------|
| 需求 Handoff | `docs/handoff-20260702.md` |
| 财务面板需求 | `docs/finance-requirements-20260703.json` |
| 技术选型决策 | `docs/tech-decisions-20260703.md` |
| 项目术语表 | `GLOSSARY.md` |

## 待办

1. 项目初始化：`npm create astro@latest` + 配置 Workers
2. 初始化 teach workspace
3. 安装 a-stock-data skill
4. 设计阶段（styles.refero.design 等 AI 工具）
5. 搭建 /blog Markdown 内容体系

## Matt Pocock Skills 配置

- [x] Issue tracker: Local markdown (`docs/agents/issue-tracker.md`)
- [x] Triage labels: 5 canonical labels (`docs/agents/triage-labels.md`)
- [x] Domain docs: Single-context (`docs/agents/domain.md`)
- [x] AGENTS.md: Agent instructions block 已写入
