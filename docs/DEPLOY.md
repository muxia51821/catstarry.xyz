# 部署指南

本文只定义可重复的 staging/production 接线，不执行部署。所有资源 ID 和 secret 都必须在 Cloudflare/GitHub 环境中配置，不能写入仓库。

## 拓扑

| 环境 | 站点 | API 路由 | 资源 |
| --- | --- | --- | --- |
| staging | `https://staging.catstarry.xyz` → `catstarry-site-staging` Site Worker | `/api/*`、`/activity-signals.json` → `catstarry-feed-api-staging` | Site `SESSION` KV（Astro 自动 provisioning）+ `FEED_API` Service Binding + staging D1/KV/R2 |
| production | `https://catstarry.xyz` → `catstarry-site-production` Site Worker | `/api/*`、`/activity-signals.json` → production Feed Worker；Site SSR 使用 `FEED_API` Service Binding | Site `SESSION` KV（由 production Worker 名称确定）+ production D1/KV/R2 |

Feed browser API 使用同源 `/api/*` 路由。Production-like Site SSR 调用 Feed Worker 时使用 `FEED_API` Service Binding；Local Preview 的 server-side owner/publication helper 才允许 localhost HTTP fallback。Session Cookie 当前合同保持 host-only；不要为了跨 `workers.dev` 请求设置共享 Domain。

Finance 已迁移至独立私有仓库；本仓库不维护其部署、资源、数据、认证或操作命令。本次 repository separation 不改变任何既有 Cloudflare 运行侧资源。

## Production Worker inventory（只记录合同，不记录 secret）

仓库没有版本化的 production Feed Wrangler 配置；下表记录 repository 可以证明的 production wiring contract，以及仍需从 Cloudflare 账户只读核验的环境事实。不得把 staging config 直接当作 production inventory。

| Worker | Route | 预期 binding / resource | 预期 Cron | 外部 vars / secret 名称 | Repository 可证明的边界 |
| --- | --- | --- | --- | --- | --- |
| Production Site Worker | `catstarry.xyz/*` | generated `SESSION` KV + `FEED_API` → `catstarry-feed-api-production` | — | build/runtime 所需的 Site vars（如有）；仅 Learn publication source release 的 runner 进程另需 `FOOTPRINT_INGEST_TOKEN` | `scripts/deploy-site-production.ps1` 以 `catstarry-site-production` 部署，并在 deploy 前校验 generated `SESSION` + `FEED_API` bindings 与 scoped publication transition guardrails |
| Production Feed Worker | `catstarry.xyz/api/*`、`/activity-signals.json`；Site `FEED_API` Service Binding target | `DB` → `catstarry-db`；`VIEW_KV`、`AUTH_KV`；`MEDIA_BUCKET` → `catstarry-media`；`HOME_PROJECTIONS` → `home-projections` | repository contract 为 `0 * * * *` | `SITE_ORIGIN`、`CLIP_PREVIEW_ALLOWED_HOSTS`、`FOOTPRINT_INGEST_TOKEN` | Site production runner 会把 generated binding target 改为 `catstarry-feed-api-production`；实际 account IDs/routes/secrets 现场核验 |

Versioned staging configs 固定 `2026-07-22` compatibility date、observability 与 binding/cron contract；production 是否完全一致仍需独立 Cloudflare 只读盘点。不要在文档写入 secret 值。

## Repository migration 与 production state 边界

Repository 当前 Feed migration 序列包含 `0004_learn_publications.sql` 与 `0005_publication_release_guards.sql`。`0004` 定义 Learn runtime publication table；`0005` 只增加 publication release guard table，并把 key 限定为 `blog-sync`、`learn-active`、`learn-pending`。**文件存在不等于某个 production D1 已经应用。**

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

GitHub `validate.yml` 负责 PR / main validation；它不是 production deploy workflow。Production Site deploy 由显式 release runner 执行，部署成功后的 Blog/Learn publication sync 才由独立 GitHub Action 接手。

`test:feed:ui` 是手动浏览器回归（需本地站点与管理员账号，用法见脚本头注释），不在 CI 与上述验证门内；Feed 大型改动后建议手动跑一次。

## Staging 资源

部署前在 staging 账号内创建并把实际 ID 写入 Cloudflare 配置层：

- Feed D1：`catstarry-db`
- Feed KV：`VIEW_KV`、`AUTH_KV`
- Feed R2：`catstarry-media`、`home-projections`

主站 Site Worker 的 `SESSION` KV 由 `@astrojs/cloudflare` 自动注入。生成的
`dist/server/wrangler.json` 必须包含 `SESSION` binding 与 `FEED_API` Service Binding；
`SESSION` 不包含手工 `id` 是自动 provisioning 的预期行为。Versioned root `wrangler.jsonc`
定义 staging `FEED_API` target；production deploy runner 会在 generated config 中校验该
binding 并把 target 改为 `catstarry-feed-api-production`。这些 Site bindings 与 Feed
自身的 KV bindings 是不同资源，不得互相替换。

Versioned Feed Worker `wrangler.jsonc` 中的 `REPLACE_WITH_*` 是明确的资源插槽，不是可部署值。替换位置分别是对应 `database_id` 或 namespace `id`；值来自账户侧资源盘点。

## Staging / Local Preview 非 secret 配置

当前同源 staging Site baseline **不要求**设置 `FEED_API_URL`：production-like Site SSR 使用 `FEED_API` Service Binding；浏览器 API 默认同源，Home activity projection 默认读取 `/activity-signals.json`。

可选 Site public overrides：

```text
PUBLIC_FEED_API_URL=          # 默认空值；浏览器使用同源 /api/*
PUBLIC_ACTIVITY_SIGNALS_URL=/activity-signals.json  # 已有同值默认，可省略
```

`FEED_API_URL` 当前主要用于 **Local Preview 的 server-side localhost transport override**。`scripts/local-preview.mjs` 会把它和 `PUBLIC_FEED_API_URL` 注入为本地 Feed Worker origin；不要把这个本地机制误写成 staging/production Site SSR 的公网调用方式。

`npm run preview:local` 是唯一的本地视觉验收入口。它启动主站与 Feed Worker，并在临时 D1 / R2 中准备固定的 Blog、Feed、Learn、Home 代表性状态，同时保留 Projects 静态数据；停止后删除临时状态。该 fixture 不调用 Learn lifecycle，也不代表 production 数据或发布结果。

Feed Worker 环境配置：

```text
SITE_ORIGIN=https://staging.catstarry.xyz
CLIP_PREVIEW_ALLOWED_HOSTS=github.com,developer.mozilla.org
```

## Secrets 与用户记录

- Feed Worker secret：`FOOTPRINT_INGEST_TOKEN`
- Learn publication source release 的 Site runner 进程：`FOOTPRINT_INGEST_TOKEN`（仅用于 authenticated publication release prepare / abort；不是 Site Worker binding）
- GitHub production environment secret：`FOOTPRINT_INGEST_TOKEN`
- GitHub production environment variable：`FEED_API_URL=https://catstarry.xyz`

这里最后一项是 **deployment-success publication sync scripts 的目标 URL**，不是 Site Worker server-side transport。Blog/Learn publication scripts 会拒绝把 bearer token 发送到非精确 `https://catstarry.xyz` 的 URL。

生成用户记录：

```powershell
$env:FEED_PASSWORD = '<enter interactively; do not save>'
npm run feed:user -- muxia

```

把命令输出的 `key` / `value` 写入相应环境的 KV；不要把输出提交到 Git。

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
确认包括当前任务需要的 pending migration；publication release guardrails 上线前必须先确认
`0005_publication_release_guards.sql` 已进入 production Feed D1，再部署依赖该表的新 Feed Worker。

Staging migration/deployment 的 repository-level 命令路径：

```powershell
npx wrangler d1 migrations apply catstarry-db --remote --config workers/feed-api/wrangler.jsonc
npx wrangler deploy --config workers/feed-api/wrangler.jsonc
npm run build
npx wrangler deploy --config dist/server/wrangler.json
```

域名 routes / custom domains 属于 Cloudflare 环境 wiring；执行 staging release 时应现场核验 `staging.catstarry.xyz` 与对应 Site/API deployment 的实际映射，不把本文件当作账户 inventory。

Production Site 的正式 runner 是 `scripts/deploy-site-production.ps1`。它要求 clean tracked worktree 与 `HEAD == origin/main`，并从最新成功的 publication sync 到 exact deploy SHA 的完整 diff 计算 release scope。所有 Site release 都完成 build / scoped validation、generated `SESSION` + `FEED_API` binding 检查和 Wrangler dry-run；只有 Blog source scope 才执行 Blog published-source survival preflight，只有 Learn source scope 才要求进程环境中的 `FOOTPRINT_INGEST_TOKEN`、建立 exact Learn pending release，并在 lifecycle 已冻结时执行 Learn production transition preflight。没有 publication source scope 的 Site release 不建立 Learn barrier。若 Learn preflight 在真实 deploy 开始前失败，runner 可以精确 abort 自己刚建立的 pending release；若真实 Wrangler deploy 返回失败或结果不明确，不得自动 abort，必须先确认 production Site 是否已经切换到该 SHA。

## Production deployment 后 publication sync

只有 release scope 含 Blog 或 Learn publication source，且生产部署系统确认成功后，才发送 GitHub `repository_dispatch`。Canonical 发送方式是：

```powershell
npm run release:dispatch-sync
```

该脚本先计算与 runner 相同的 release scope。若没有 Blog/Learn source 变化，它明确报告 no-op，不做冒烟或 dispatch；若需要 sync，才要求 clean tracked worktree 与 `HEAD == origin/main`（untracked 仅允许 `.scratch/`），对生产入口执行 HTTP 200 冒烟，然后打印完整 payload 并经交互确认后才通过已认证的 `gh` CLI 发送。冒烟是只读 GET：仅网络层失败（连接/超时）会做有限次自动重试，收到 HTTP 非 200 则立即失败；dispatch 发送本身绝不自动重试——发送结果不确定时先用 `npm run release:status` 核验，再决定是否重发。非交互环境必须显式传 `--yes`。

```text
event_type:     catstarry-production-deployment-succeeded
client_payload:
  environment: production
  status:      success
  sha:         <exact deployed commit SHA>
  blog_sync:   true | false
  learn_sync:  true | false
```

`.github/workflows/sync-production-publications.yml` 会验证并 checkout 精确 deployed SHA，并使用完整 Git history 计算同一 release 的 `{sha, generation}` identity。该 workflow 使用固定 concurrency group 串行化 production publication writers；D1 monotonic guard 继续负责拒绝已落后的 release，不能用 workflow 执行先后代替 release identity。它只执行 payload 请求的 Blog 或 Learn sync；被请求的任一步失败都会让 workflow 保持失败状态。

- **Blog**：第一次 lifecycle manifest 初始化只建立 baseline、不回填历史；之后 deploy sync 保留已有 owner state，并可为 never-published、首次处于 `published` 的新 source 创建幂等 `first-production-v1` footprint。Owner lifecycle PATCH 也可能完成同一首次 publication。每次 production sync 携带 exact release identity；旧 generation 或同 generation不同 SHA 会在 lifecycle mutation 前被拒绝。Site deploy preflight 另外保证当前 runtime-published slug 仍存在于 candidate source；source frontmatter state 不替代 runtime lifecycle authority。
- **Learn**：发送 schema v3 manifest 与 exact release identity。它**不执行首次 Publish，不创建新的 `learn_publications` record，也不回填首次发布**；只为已经存在的 runtime publication 同步 revision metadata，public revision 可创建 `learn_note_revised` footprint，hidden revision 只更新 metadata。relation manifest 同步后带 active release identity；exact pending release 激活后 Owner lifecycle mutation 才重新开放。旧、冲突或未经 prepare 的 release sync 在 revision/relation mutation 前被拒绝。

当 release scope 含 Blog publication source 时，从 Blog preflight 开始到其请求的 publication sync workflow 成功结束前，不执行 Owner Blog Publish / Withdraw / Restore。Blog 没有额外的 pending runtime state；这是单操作者的 release serialization 规则，用来避免 preflight 与 post-deploy sync 之间改变 runtime published set。不要为了这一操作边界给 Blog 增加新的 lifecycle state。

Learn 的首次正式 Publish 由 Owner Admin lifecycle mutation 完成：production runtime 是正式 publication authority；创建 D1 `learn_publications` public record，并与 `learn_note_published` first footprint 在同一 D1 batch 中写入。Hide / Show 保留首次 `published_at`，不产生 duplicate first-publication footprint。Local Preview 明确禁止 lifecycle mutation。Production Site release pending 时，这些 lifecycle mutations fail closed 为暂时不可用，而 public reading 保持现有 runtime projection。

如果 Site 已成功切换但 publication sync 失败，不要立即 rollback Site 或手工修改 KV/D1。Blog source scope 的 preflight 保证部署前已经公开的 source 仍存在于 candidate Site；只有 Learn source scope 建立的 pending barrier 才会持续锁定 lifecycle mutation，直到 exact release sync 成功激活。Blog-only scope 不创建 Learn barrier。修复失败原因后重试同一 exact release 的 publication sync。若 Site deploy 结果本身不明确，先核验实际 production Site release identity，再决定是否对 exact pending release 执行 abort。

失败/preview 部署不得发送 production-success dispatch。该 SHA 必须是 40 位 commit ID 且属于 `origin/main` 历史；workflow 使用 `npm ci --ignore-scripts`，publication scripts 只允许把 bearer token 发送到精确的 `https://catstarry.xyz`。不满足任一条件时任务必须失败。

## Production Worker 发布（code-only）

生产 Worker 无入库配置，staging 骨架不可用于生产。每次发布遵守以下不变式，具体命令以当次 wrangler 版本实测为准：

1. **code-only**：上传只含代码与既定绑定；`routes`、`triggers.crons`、vars/secrets 不出现在配置中
2. **资源身份现查**：绑定用的 D1/KV/R2 标识在上传前经只读命令从账户取得，禁止沿用 staging 占位符或历史文档数值
3. **上传后复核**：deployments 状态确认新版本 100% 流量、绑定无意外，并在首个计划刻度后实证相关 scheduled lifecycle 存活
4. **冒烟最小面**：只覆盖本次变更路径

### D1 导出备份

Time Travel 是恢复锚点，不替代导出备份。主站 D1 migration 前的手动备份规则维持不变。

## 回滚

1. Worker：在 Cloudflare Versions 选中上一验证版本并回滚；不要回退 D1 migration。
2. 若新 API 不可用：先移除对应 `/api/*` route，使未依赖该 runtime API 的静态页面继续可读；依赖 runtime publication/auth 的 SSR 页面应保持明确 503/不可用边界，而不是把不可用状态误当作 public。
3. R2/KV/D1 staging 资源仅在确认不再使用后删除；先导出 D1 并记录资源 ID。
