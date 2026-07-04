from pathlib import Path
c=Path("docs/phase3-briefing.md").read_text(encoding="utf-8")
c=c.replace("| 3.1 | 领域建模（术语表 → D1 schema、API 数据结构）    | domain-modeling                     |","| 3.1 | 领域建模（术语表 → D1 schema、API 数据结构） → `architecture/data-model.md` | domain-modeling |")
c=c.replace("| 3.2 | 代码库架构（目录结构、模块边界、依赖）          | codebase-design                     |","| 3.2 | 代码库架构（目录结构、模块边界、依赖） → `architecture.md` + `architecture/modules.md` | codebase-design |")
c=c.replace("| 3.3 | 数据流设计（Workers 路由、D1/KV/R2 读写、Cron） | cloudflare + workers-best-practices |","| 3.3 | 数据流设计（Workers 路由、D1/KV/R2 读写、Cron） → `architecture/modules.md` | cloudflare + workers-best-practices |")
c=c.replace("| 3.4 | 鉴权方案（/feed + f.catstarry.xyz 的具体实现）  | cloudflare-one                      |","| 3.4 | 鉴权方案（/feed + f.catstarry.xyz 的具体实现） → `architecture/auth.md` | cloudflare-one |")
c=c.replace("| 3.5 | 架构决策记录 → `docs/adr/`                        | —                                   |","| 3.5 | 架构决策记录（每个重大决策一条：为什么选 A 不选 B） → `docs/adr/*.md` | — |")
old_out="- docs/architecture.md — 整体架构文档
- docs/adr/*.md — 每条重要决策一份 ADR（Architecture Decision Record）
- docs/SITEMAP.md — 更新路径状态（🔴 未开发）"
new_out="- docs/architecture.md — 架构总览（模块关系图 + 数据流向 + 技术栈映射）
- docs/architecture/data-model.md — D1 schema + API 类型定义
- docs/architecture/auth.md — /feed + finance 鉴权方案
- docs/architecture/modules.md — 目录结构 + Workers 路由 + 依赖规则
- docs/adr/*.md — 每个重大决策一条（为什么选 A 不选 B）
- docs/SITEMAP.md — 更新路径状态"
c=c.replace(old_out,new_out)
Path("docs/phase3-briefing.md").write_text(c,encoding="utf-8")
print("OK",len(c))