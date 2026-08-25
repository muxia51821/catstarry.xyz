# Finance staging 接线

## 拓扑

- `finance-site/`：独立 Cloudflare Pages 项目，生产自定义域名为 `f.catstarry.xyz`。
- `workers/finance-api/`：独立 Worker，仅接管同一域名的 `/api/*` 路由。
- `finance-db` 与 `FINANCE_AUTH_KV`：只属于 Finance，不与主站 Feed 数据混用。
- 主站 Home、Sitemap 与导航不得链接 Finance。

## 必需的 staging 配置

1. 在 `workers/finance-api/wrangler.jsonc` 中替换 staging D1/KV 标识；不写入生产标识。
2. 以 Worker secret 配置可选的 `MARKET_PROVIDER_TOKEN`；`MARKET_PROVIDER_URL` 必须为经过验收的 HTTPS provider adapter。未配置时 Cron 保留最后有效快照并记录警告。
3. 使用 `FINANCE_PASSWORD` 环境变量运行 `npm run finance:user -- <username> <admin|viewer>`，将输出分别写入 staging KV 的 `user:<username>`。仓库中不保存明文或默认凭证。
4. 设置 `FINANCE_SITE_ORIGIN` 为 staging Pages Origin；生产时改为 `https://f.catstarry.xyz`。

## 数据迁移

真实工作簿不得直接进入仓库。先在 Excel 中将交易明细导出为 UTF-8 CSV，列名必须为：

`trade_date,ticker,ticker_name,direction,quantity,price,position_category,reason`

运行：

```powershell
npm run finance:import -- <trade-export.csv> <trade-migration.sql>
npm run finance:import:snapshots -- <snapshot-export.csv> <snapshot-migration.sql>
```

两个脚本都使用确定性 batch ID、拒绝覆盖已有 SQL、逐行校验并生成 sourceRows/accepted/review/totals 报告。公式错误与脏数据进入 `finance_import_review`；管理员在面板“导入异常审阅”中查看原始行，先通过正式录入流程修正，再填写结案说明。真实工作簿未提供前，只能验证导入器合同，不能声称历史数据迁移完成。

## 行情与年度归档

- `MARKET_PROVIDER_URL` 必须是已批准的 HTTPS adapter，返回有界 `records`；失败重试不会覆盖最后有效快照。
- 未配置 provider 时，行情/市值明确显示不可用，不以零值替代。
- 管理员可导出 `finance-archive-YYYY.xlsx`；内容包括交易、持仓快照、月度汇总、年度复盘与确认记录。
- viewer 不能写入、评估回撤、结案导入异常或导出。

## 发布前检查

- Finance Pages 与 Worker 使用独立 staging 名称和资源。
- `viewer` 对交易写入返回 403，`admin` 可写；两者均可读完整计算过程。
- CSP、noindex、同源 cookie 与 CORS 均通过浏览器检查。
- 行情 provider 的许可、速率、字段、错误恢复和延迟标记已经人工确认。
