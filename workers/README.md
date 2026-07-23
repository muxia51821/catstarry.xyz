# Worker 配置合同

`workers/*/wrangler.jsonc` 是 Phase 5 可追踪的唯一配置事实来源。被忽略的
`workers/feed-api/wrangler.toml` 是本地遗留文件：仓库脚本不会读取它，也不得
用它部署。

## Binding 对照

| Worker | binding 变量名 | Cloudflare resource name | 账户专属 ID |
| --- | --- | --- | --- |
| `catstarry-feed-api-staging` | `DB` | `catstarry-db` D1 | `REPLACE_WITH_CATSTARRY_DB_ID` |
| `catstarry-feed-api-staging` | `VIEW_KV` | 部署前必须在账户中核实 | `REPLACE_WITH_VIEW_KV_NAMESPACE_ID` |
| `catstarry-feed-api-staging` | `AUTH_KV` | 部署前必须在账户中核实 | `REPLACE_WITH_AUTH_KV_NAMESPACE_ID` |
| `catstarry-feed-api-staging` | `MEDIA_BUCKET` | `catstarry-media` R2 | R2 按 bucket name 绑定 |
| `catstarry-feed-api-staging` | `HOME_PROJECTIONS` | `home-projections` R2 | R2 按 bucket name 绑定 |
| `finance-api` | `DB` | `finance-db` D1 | `REPLACE_WITH_FINANCE_DB_ID` |
| `finance-api` | `FINANCE_AUTH_KV` | 部署前必须在账户中核实 | `REPLACE_WITH_FINANCE_AUTH_KV_NAMESPACE_ID` |

占位符是有意保留的：本地类型生成、本地 D1 验证和 dry-run 打包都可使用它；
只有核实对应账户资源后才能替换为真实 ID。`account_id` 由已认证的 Wrangler 或
CI context 提供，不提交到仓库。

## Secret 与环境

这些配置不得包含 secret 或受版本控制的 `vars`。本地开发使用已忽略的
`.dev.vars`，已部署的 Worker 使用 `wrangler secret put`。不得把 secret、API
token、password 或账户凭据写入仓库。

`npm run worker:migrate:local` 始终使用 `--local`，并在各 Worker 下写入已
忽略的 Miniflare state。仓库脚本始终传入 `--config`，因此不会回退到遗留 TOML。
生产部署、资源创建、远程 migration 和 CI 凭据仍属于 Phase 7。

## 遗留生产 `feed-api`

截至 Phase 5 基础设施 F，Cloudflare 账户仍有名为 `feed-api` 的生产 Worker，
其 binding 为：

- `DB` → D1 `feed-db`
- `VIEW_KV` → KV namespace `VIEW_KV`

遗留 D1 当前仅有：

- `blog_views`
  - `from-zero`: 2 views

现有前端仍调用：

`https://feed-api.catstarry.workers.dev/api`

调用位置是 `src/lib/useViewCount.ts`。

新 skeleton 必须保持 `catstarry-feed-api-staging`，不得覆盖现有生产
`feed-api`。只有 Blog views API 已恢复并验证，或前端阅读量功能已明确退役，且
数据切换已完成并通过独立 Review，才可把 Worker 名称改回 `feed-api`。

目标生产数据库仍为 `catstarry-db`。任何切换前必须决定是否迁移既有的
`blog_views` 记录，再替换遗留 binding。
