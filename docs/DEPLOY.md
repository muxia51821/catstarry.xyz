# 部署指南

本文只定义可重复的 staging/production 接线，不执行部署。所有资源 ID 和 secret 都必须在 Cloudflare/GitHub 环境中配置，不能写入仓库。

## 拓扑

| 环境 | 站点 | API 路由 | 资源 |
| --- | --- | --- | --- |
| staging | `https://staging.catstarry.xyz` → `catstarry-site-staging` | `/api/*`、`/activity-signals.json` → `catstarry-feed-api-staging` | staging D1/KV/R2 |
| finance staging | `https://f-staging.catstarry.xyz` → `catstarry-finance-staging` Pages | `/api/*` → `catstarry-finance-api-staging` | 独立 Finance D1/KV |
| production | `https://catstarry.xyz` | `/api/*`、`/activity-signals.json` → production Feed Worker | production D1/KV/R2 |
| finance production | `https://f.catstarry.xyz` | `/api/*` → production Finance Worker | 独立 Finance D1/KV |

Feed 与 Finance API 均使用同源 `/api/*` 路由。Session Cookie 保持 host-only；不得为了跨 `workers.dev` 请求设置 `.catstarry.xyz` Domain。

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

版本化 `wrangler.jsonc` 中的 `REPLACE_WITH_*` 是明确的资源插槽，不是可部署值。替换位置分别是对应 `database_id` 或 namespace `id`；值来自 `wrangler d1 list` / `wrangler kv namespace list`。

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

`PUBLIC_FEED_API_URL` 应保持未设置/空值，使浏览器使用同源 `/api/*`。`PUBLIC_ACTIVITY_SIGNALS_URL` 是只读 R2 静态对象出口；它不查询 D1，超过三小时未刷新时返回 `503`，Home 隐藏信号而不把过期状态误报为 `dormant`。`MARKET_PROVIDER_URL` 未选定时应完全省略，系统继续保留最后有效行情。

## Secrets 与用户记录

- Feed Worker secret：`FOOTPRINT_INGEST_TOKEN`
- 可选 Learn 发布 webhook：`LEARN_PUBLISH_WEBHOOK_URL`（非 secret）、`LEARN_PUBLISH_WEBHOOK_TOKEN`（secret）
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

其余路径分别指向主站 Worker 和 Finance Pages。

## 生产首发足迹 hook

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

`.github/workflows/sync-production-publications.yml` 会 checkout 精确 SHA，并同步 Blog/Learn manifest。Blog 第一次同步只建立基线，不回填历史；之后只为新 slug 写一次 `first-production-v1` 足迹。失败/preview 部署不得发送该事件。

该 SHA 必须是 40 位 commit ID 且属于 `origin/main` 历史；workflow 使用 `npm ci --ignore-scripts`，publication scripts 只允许把 bearer token 发送到精确的 `https://catstarry.xyz`。不满足任一条件时任务必须失败。

## 回滚

1. Worker：在 Cloudflare Versions 选中上一验证版本并回滚；不要回退 D1 migration。
2. Finance Pages：回滚到上一 deployment。
3. 若新 API 不可用：先移除对应 `/api/*` route，使静态站继续可读；Feed/Blog 计数会展示可理解的不可用/回退状态。
4. R2/KV/D1 staging 资源仅在确认不再使用后删除；先导出 D1 并记录资源 ID。
