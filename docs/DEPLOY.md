# 部署指南

本文只定义可重复的 staging/production 接线，不执行部署。所有资源 ID 和 secret 都必须在 Cloudflare/GitHub 环境中配置，不能写入仓库。

## 拓扑

| 环境 | 站点 | API 路由 | 资源 |
| --- | --- | --- | --- |
| staging | `https://staging.catstarry.xyz` → `catstarry-site-staging` Site Worker | `/api/*`、`/activity-signals.json` → `catstarry-feed-api-staging` | Site `SESSION` KV（Astro 自动 provisioning）+ `FEED_API` Service Binding + staging D1/KV/R2 |
| finance staging | `https://f-staging.catstarry.xyz` → `catstarry-finance-staging` Pages | `/api/*` → `catstarry-finance-api-staging` | 独立 Finance D1/KV |
| production | `https://catstarry.xyz` → `catstarry-site-production` Site Worker | `/api/*`、`/activity-signals.json` → production Feed Worker；Site SSR 使用 `FEED_API` Service Binding | Site `SESSION` KV（由 production Worker 名称确定）+ production D1/KV/R2 |
| finance production | `https://f.catstarry.xyz` | `/api/*` → production Finance Worker | 独立 Finance D1/KV |

Feed 与 Finance browser API 均使用同源 `/api/*` 路由。Production-like Site SSR 调用 Feed Worker 时使用 `FEED_API` Service Binding；Local Preview 的 server-side owner/publication helper 才允许 localhost HTTP fallback。Session Cookie 保持 host-only；不得为了跨 `workers.dev` 请求设置 `.catstarry.xyz` Domain。

## Production Worker inventory（只记录合同，不记录 secret）

仓库没有版本化的 production Feed/Finance Wrangler 配置；下表记录当前已知的
production 合同和必须从 Cloudflare 账户只读核验的事实。`待账户核验` 不能视为
已通过 production release gate。

| Worker | Route | 预期 binding / resource | 预期 Cron | 外部 vars / secret 名称 | 当前状态 |
| --- | --- | --- | --- | --- | --- |
| Production Site Worker | `catstarry.xyz/*` | generated `SESSION` KV + `FEED_API` → `catstarry-feed-api-production` | — | Site public/runtime vars as required by build | `scripts/deploy-site-production.ps1` 以 `catstarry-site-production` 部署并在 deploy 前校验两个 binding |
| Production Feed Worker | `catstarry.xyz/api/*`、`/activity-signals.json`；Site `FEED_API` Service Binding target | `DB` → `catstarry-db`；`VIEW_KV`、`AUTH_KV`；`MEDIA_BUCKET` → `catstarry-media`；`HOME_PROJECTIONS` → `home-projections` | 当前 Feed 合同为 `0 * * * *` | `SITE_ORIGIN`、`CLIP_PREVIEW_ALLOWED_HOSTS`、`FOOTPRINT_INGEST_TOKEN` | Site production deploy runner 将 generated binding target 重写为 `catstarry-feed-api-production`；部署前须 dry-run 核对 |
| Production Finance Worker | `f.catstarry.xyz/api/*` | `DB` → `finance-db`；`FINANCE_AUTH_KV` | 当前 Finance 合同为 `*/15 * * * *`、`30 7 * * 1-5` | `FINANCE_SITE_ORIGIN`、可选 `MARKET_PROVIDER_URL`、`MARKET_PROVIDER_TOKEN` | Worker 名称、实际 IDs、Cron、observability 和 routes 待账户核验 |

Staging 的 versioned compatibility date、observability 开关和上述 binding 集合是当前 repository 合同；production 是否一致仍需独立的 Cloudflare 只读盘点确认。不得把 staging 配置直接当作 production inventory，也不得在本表写入 secret 值。

## Repository migration 与 production state 边界

Repository 当前 Feed migration 序列包含 `0004_learn_publications.sql`，它定义 Learn runtime publication table。**文件存在不等于某个 production D1 已经应用。**

本文件不长期记录“production 当前应用到哪个 migration / 当前部署哪个 SHA / 某次 sync created 几条”这类易过期状态。需要发布或排障时，通过 migration list、deployment evidence 和 production verification 现场核验；历史成功 release 记录写入 `CHANGELOG.md`。

## 本地/CI 验证

```powershell
npm ci
npm run test:contracts
npm run worker:config
npm run worker:types:check
npm run worker:typecheck
npm run build
npm run test:site-output
npm run test:browser:ci
npm run test:feed:worker
npm run worker:migrate:local:repeat
npm run worker:dry-run
git diff --check
```

## Staging 资源

部署前在 staging 账号内创建并把实际 ID 写入 Cloudflare 配置层：

- Feed D1：`catstarry-db`
- Feed KV：`VIEW_KV`、`AUTH_KV`
- Feed R2：`catstarry-media`、`home-projections`
- Finance D1：`finance-db`
- Finance KV：`FINANCE_AUTH_KV`

主站 Site Worker 的 `SESSION` KV 由 `@astrojs/cloudflare` 自动注入。生成的
`dist/server/wrangler.json` 必须包含 `SESSION` binding 与 `FEED_API` Service Binding；
`SESSION` 不包含手工 `id` 是自动 provisioning 的预期行为。Versioned `wrangler.jsonc`
定义 staging `FEED_API` target；production deploy runner 会在 generated config 中校验该
binding 并把 target 改为 `catstarry-feed-api-production`。这些 Site bindings 与 Feed / Finance
自身的 KV bindings 是不同资源，不得互相替换。

版本化 Worker `wrangler.jsonc` 中的 `REPLACE_WITH_*` 是明确的资源插槽，不是可部署值。替换位置分别是对应 `database_id` 或 namespace `id`；值来自 `wrangler d1 list` / `wrangler kv namespace list`。

## Staging 非 secret 环境变量

主站 Worker：

```text
FEED_API_URL=https://staging.catstarry.xyz
PUBLIC_FEED_API_URL=
PUBLIC_ACTIVITY_SIGNALS_URL=/activity-signals.json
```

Feed Worker：

```text
SITE_ORIGIN=https://staging.catstarry.xyz
CLIP_PREVIEW_ALLOWED_HOSTS=github.com,developer.mozilla.org
```

Finance Worker：

```text
FINANCE_SITE_ORIGIN=https://f-staging.catstarry.xyz
MARKET_PROVIDER_URL=<approved HTTPS adapter endpoint; omit until selected>
```

`PUBLIC_FEED_API_URL` 应保持未设置/空值，使浏览器使用同源 `/api/*`。`FEED_API_URL` 仍可作为页面侧 API base 配置；server-side owner/publication transport 在非 localhost runtime 不依赖它绕公网调用，而使用 `FEED_API` Service Binding。`PUBLIC_ACTIVITY_SIGNALS_URL` 是只读 R2 静态对象出口；它不查询 D1，超过三小时未刷新时返回 `503`，Home 隐藏信号而不把过期状态误报为 `dormant`。`MARKET_PROVIDER_URL` 未选定时应完全省略，系统继续保留最后有效行情。

## Secrets 与用户记录

- Feed Worker secret：`FOOTPRINT_INGEST_TOKEN`
- 可选 Finance 行情：`MARKET_PROVIDER_TOKEN`
- GitHub production environment secret：`FOOTPRINT_INGEST_TOKEN`
- GitHub production environment variable：`FEED_API_URL=https://catstarry.xyz`

生成用户记录：

```powershell
$env:FEED_PASSWORD = '<enter interactively; do not save>'
npm run feed:user -- muxia

$env:FINANCE_PASSWORD = '<enter interactively; do not save>'
npm run finance:user -- muxia admin
npm run finance:user -- cati viewer
```

把命令输出的 `key` / `value` 写入相应 staging KV；不要把输出提交到 Git。

## 迁移与部署顺序

Production Feed D1 migration 的正式入口是 `scripts/apply-feed-production-migrations.ps1`。
它从进程环境变量 `CATSTARRY_PRODUCTION_D1_ID` 读取 production database ID，在 `.scratch`
中生成临时 Wrangler 配置，并依次执行 `d1 migrations list --remote` 和
`d1 migrations apply --remote`。不要把 production ID 写入仓库，也不要用 staging
`workers/feed-api/wrangler.jsonc` 直接执行 production migration。

```powershell
$env:CATSTARRY_PRODUCTION_D1_ID = '<production Feed D1 UUID>'
pwsh -NoLogo -NoProfile -File .\scripts\apply-feed-production-migrations.ps1
```

完成 production backup 并确认可恢复后，才执行该 runner；它只处理 Feed D1 migrations，
不处理 Worker deploy、KV、R2、routes、Cron 或 secrets。执行前后应查看 remote migration list，
确认包括当前任务需要的 pending migration；不要因为 repository 已有 `0004` 就假设 remote 已应用。

Staging migration/deployment 顺序仍使用以下命令：

```powershell
npx wrangler d1 migrations apply catstarry-db --remote --config workers/feed-api/wrangler.jsonc
npx wrangler d1 migrations apply finance-db --remote --config workers/finance-api/wrangler.jsonc
npx wrangler deploy --config workers/feed-api/wrangler.jsonc
npx wrangler deploy --config workers/finance-api/wrangler.jsonc
npx wrangler pages deploy finance-site --project-name catstarry-finance-staging
npm run build
npx wrangler deploy --config dist/server/wrangler.json
```

随后在 Cloudflare Routes 中把：

- `staging.catstarry.xyz/api/*` 指向 `catstarry-feed-api-staging`
- `staging.catstarry.xyz/activity-signals.json` 指向 `catstarry-feed-api-staging`
- `f-staging.catstarry.xyz/api/*` 指向 `catstarry-finance-api-staging`

其余路径分别指向主站 Site Worker 和 Finance Pages。

Production Site 的正式 runner 是 `scripts/deploy-site-production.ps1`。它要求 clean tracked worktree、`HEAD == origin/main`，完成 build / scoped validation 后检查 generated `SESSION` + `FEED_API` bindings，把 Feed target 切到 production Worker，再以 `catstarry-site-production` 部署并执行 production smoke。

## Production deployment 后 publication sync

只有生产部署系统确认成功后，才发送 GitHub `repository_dispatch`：

```json
{
  "event_type": "catstarry-production-deployment-succeeded",
  "client_payload": {
    "environment": "production",
    "status": "success",
    "sha": "<exact deployed commit SHA>"
  }
}
```

`.github/workflows/sync-production-publications.yml` 会验证并 checkout 精确 deployed SHA，然后依次执行 Blog 与 Learn publication sync：

- **Blog**：第一次 lifecycle manifest 初始化只建立 baseline、不回填历史；之后 deploy sync 保留已有 owner state，并可为 never-published、首次处于 `published` 的新 source 创建幂等 `first-production-v1` footprint。Owner lifecycle PATCH 也可能完成同一首次 publication。
- **Learn**：发送 schema v3 manifest。它**不执行首次 Publish，不创建新的 `learn_publications` record，也不回填首次发布**；只为已经存在的 runtime publication 同步 revision metadata，public revision 可创建 `learn_note_revised` footprint，hidden revision 只更新 metadata，同时刷新 `learn:relation-manifest`。

Learn 的首次正式 Publish 发生在 Production Admin 的 owner lifecycle mutation：创建 D1 `learn_publications` public record，并与 `learn_note_published` first footprint 在同一 D1 batch 中写入。Hide / Show 保留首次 `published_at`，不产生 duplicate first-publication footprint。

失败/preview 部署不得发送 production-success dispatch。该 SHA 必须是 40 位 commit ID 且属于 `origin/main` 历史；workflow 使用 `npm ci --ignore-scripts`，publication scripts 只允许把 bearer token 发送到精确的 `https://catstarry.xyz`。不满足任一条件时任务必须失败。

## 回滚

1. Worker：在 Cloudflare Versions 选中上一验证版本并回滚；不要回退 D1 migration。
2. Finance Pages：回滚到上一 deployment。
3. 若新 API 不可用：先移除对应 `/api/*` route，使未依赖该 runtime API 的静态页面继续可读；依赖 runtime publication/auth 的 SSR 页面应保持明确 503/不可用边界，而不是把不可用状态误当作 public。
4. R2/KV/D1 staging 资源仅在确认不再使用后删除；先导出 D1 并记录资源 ID。
