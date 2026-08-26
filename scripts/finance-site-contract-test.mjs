import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [html, css, script, headers, worker, portfolioUi, portfolioCss, operationsUi, operationsCss, accountStateRoute, activityRoute, operationsRoute, legacyReviewRoute, operationMigration, snapshotsModule] = await Promise.all([
  readFile('finance-site/index.html', 'utf8'),
  readFile('finance-site/styles.css', 'utf8'),
  readFile('finance-site/app.js', 'utf8'),
  readFile('finance-site/_headers', 'utf8'),
  readFile('workers/finance-api/src/index.ts', 'utf8'),
  readFile('finance-site/portfolio-ui.js', 'utf8'),
  readFile('finance-site/portfolio.css', 'utf8'),
  readFile('finance-site/operations-ui.js', 'utf8'),
  readFile('finance-site/operations.css', 'utf8'),
  readFile('workers/finance-api/src/routes/account-state.ts', 'utf8'),
  readFile('workers/finance-api/src/routes/activity.ts', 'utf8'),
  readFile('workers/finance-api/src/routes/operations.ts', 'utf8'),
  readFile('workers/finance-api/src/routes/legacy-import-review.ts', 'utf8'),
  readFile('workers/finance-api/migrations/0008_operation_history.sql', 'utf8'),
  readFile('workers/finance-api/src/modules/snapshots.ts', 'utf8'),
]);

for (const marker of ['data-login-form', 'data-open-trade', 'data-holdings-body', 'data-position-list', 'data-pe-list', 'data-objection', 'data-open-review', 'data-export-archive', 'data-access-list', 'data-open-rules']) {
  assert.match(html, new RegExp(marker));
}
assert.match(html, /name="robots" content="noindex,nofollow,noarchive"/);
assert.match(headers, /Content-Security-Policy:/);
assert.match(headers, /frame-ancestors 'none'/);
assert.match(css, /@media \(max-width: 680px\)/);
assert.match(css, /min-height: 44px/);
assert.match(css, /prefers-reduced-motion/);
assert.match(script, /\.inert = true/);
assert.match(script, /state\.notifications\?\.monthly_confirmation\?\.period/);
assert.doesNotMatch(script, /setMonth\(/, 'confirmation periods must come from the Shanghai-time server contract');
assert.match(script, /timeZone: 'Asia\/Shanghai'/, 'form prefills must derive from the Shanghai wall clock');
assert.doesNotMatch(script, /getTimezoneOffset|toLocaleDateString|getFullYear\(|toISOString/, 'date inputs must not depend on UTC or the visitor-local timezone');
assert.doesNotMatch(`${script}\n${operationsUi}`, /innerHTML|insertAdjacentHTML|scrollIntoView/);
assert.doesNotMatch(`${html}\n${script}\n${worker}`, /password\s*[:=]\s*["'][^"']+["']/i);
assert.doesNotMatch(`${html}\n${script}`, /feed-api\.catstarry\.workers\.dev/);
assert.doesNotMatch(`${html}\n${script}\n${operationsUi}\n${accountStateRoute}`, /data-open-account(?!-event)|data-account-list|\/api\/accounts/, 'Finance must not reintroduce a generic account-management product');
assert.match(html, /data-tab="entry"/);
assert.match(html, /data-tab="overview"/);
assert.match(html, /data-tab="holdings"/);
assert.match(html, /data-tab="review"/);
assert.match(html, /data-tab="planning"/);
assert.match(html, /data-tab="records"/);
assert.doesNotMatch(`${html}\n${script}`, /workbook-review/);
assert.match(script, /\/api\/review\/confirm/);
assert.match(script, /\/api\/rebalances\//);
assert.match(html, /name="freeze"/);
assert.match(html, /name="high"/);
assert.doesNotMatch(html, /name="cashFlows"/);
assert.doesNotMatch(html, /name="beginningValue"/);
assert.match(script, /rule_key: 'temperature'/);
assert.match(script, /year: Number\(data\.get\('year'\)\), summary: data\.get\('summary'\)/);
assert.match(html, /<select name="position_category" required>/);
assert.match(html, /主动操作仓（A股）/);
assert.match(html, /机动仓（货币ETF）/);
assert.match(html, /风险与自评/);
assert.match(html, /年终奖金额仅用于基准情景预测/);
assert.match(html, /data-holdings-summary/);
assert.match(html, /PE 与温度由行情接入写入/);
assert.match(html, /data-cash-flows-body/);
assert.match(html, /data-asset-snapshots-body/);
assert.match(html, /data-risk-signals-list/);
assert.match(html, /data-portfolio-allocation/);
assert.match(html, /data-portfolio-allocation-plot/);
assert.match(html, /data-portfolio-allocation-detail/);
assert.match(html, /data-portfolio-role-composition-body/);
assert.match(script, /\/api\/cash-flows/);
assert.match(script, /\/api\/account-events/);
assert.match(script, /\/api\/assets\/snapshots/);
assert.match(script, /\/api\/risk\/signals/);
assert.match(html, /风险信号暂时无法读取/);
assert.doesNotMatch(html, /TODAY'S FLOW|从一笔真实交易开始|data-open-trade-secondary/);
assert.doesNotMatch(html, /<textarea name="reason" maxlength="2000"/);
assert.match(html, /name="trade_id" required data-memo-trade-select/);
assert.match(html, /data-memo-dialog-title/);
assert.match(html, /data-memo-trade-total/);
assert.match(html, /data-cancel-memo/);
assert.match(html, /HOLDINGS \/ P&L/);
assert.match(html, /<th>成本<\/th>/);
assert.match(html, /class="trade-table"/);
assert.match(html, /trade-cell--date/);
assert.match(html, /trade-cell--number/);
assert.match(html, /trade-cell--action/);
assert.match(html, /access-log__header/);
assert.match(css, /\.trade-cell--date/);
assert.match(css, /\.trade-cell--security/);
assert.match(css, /\.trade-cell--reason/);
assert.match(css, /\.trade-cell--number/);
assert.match(css, /\.trade-cell--action/);
assert.match(css, /\.access-log__row/);
assert.match(script, /state\.assetSeries\?\.series/);
assert.doesNotMatch(script, /state\.assetSeries\?\.records/);
assert.match(script, /历史估值位置暂不可用/);
assert.doesNotMatch(script, /hasPe \? '暂无 PE 数据/);
assert.match(script, /pnl_ratio/);
assert.match(html, /rules-disclosure[\s\S]*?<summary><span><span class="eyebrow">REBALANCING \/ RULES<\/span><strong>仓位规则与再平衡记录<\/strong><\/span><\/summary>/);
assert.match(html, /<details class="panel panel--span-3 access-disclosure" data-pane="records" data-access-panel hidden>/, 'security access log must remain an admin-only collapsed disclosure');
assert.match(css, /\.category-select-control/);
assert.match(css, /\.rules-disclosure summary/);
assert.match(css, /--market-up/);
assert.match(css, /--market-down/);
assert.match(css, /--trade-buy/);
assert.match(css, /--trade-sell/);
assert.match(css, /\.finance-tab\[data-tab="overview"\]\.is-active/);
assert.match(css, /\.metric:hover, \.panel:hover/);
assert.doesNotMatch(css, /@font-face/);
assert.doesNotMatch(css, /url\(["']?\/fonts\//);
assert.match(css, /"HarmonyOS Sans SC", "PingFang SC", "Microsoft YaHei"/);
assert.doesNotMatch(html, /name="sse300_pe"|name="sse500_pe"|name="sse1000_pe"|name="blue_chip_temp"/);
assert.match(css, /\.trade-total strong\[data-placeholder\]/);
assert.match(script, /setStatus\(\$\('\[data-dashboard-status\]'\), ''\)/);
assert.match(portfolioUi, /portfolio_roles/);
assert.match(portfolioUi, /percentage_available/);
assert.match(portfolioUi, /renderPortfolioRoleComposition/);
assert.match(portfolioUi, /allocationTreemapLayout/);
assert.match(portfolioUi, /未投影账户资产/);
assert.match(portfolioCss, /\.portfolio-allocation__plot/);
assert.match(portfolioCss, /\.portfolio-allocation__cell\.is-selected/);
assert.match(portfolioCss, /\.portfolio-legacy-position/);

assert.match(html, /<link rel="stylesheet" href="\/operations\.css">/);
assert.match(html, /<script src="\/operations-ui\.js" defer><\/script>/);
assert.match(operationsUi, /recordsTab\.textContent = '账户动态'/);
assert.match(operationsUi, /账户动态/);
assert.match(operationsUi, /\/api\/activity/);
assert.match(operationsUi, /数据变更记录/);
assert.match(operationsUi, /\/api\/change-log/);
assert.match(operationsUi, /\/api\/workbook-review/);
assert.match(operationsUi, /activityCursor/);
assert.match(operationsUi, /nextCursor/);
assert.match(operationsUi, /Asia\/Shanghai/);
assert.match(operationsUi, /operation-history-ready/);
assert.match(operationsUi, /operation-workbook-review-ready/);
assert.match(operationsUi, /resetSessionSurfaces/);
assert.match(operationsUi, /sessionEpoch/);
assert.doesNotMatch(operationsUi, /\/api\/account-state|data-account-total|account-state-panel|marketMetricLabel/, 'Operation History must not duplicate or relabel the Portfolio current-account owner');
assert.doesNotMatch(operationsUi, /window\.fetch\s*=/, 'records extension must not monkey-patch global fetch');
assert.doesNotMatch(operationsUi, /\boffset\b/i, 'Activity and change log must use cursor pagination');
assert.doesNotMatch(operationsUi, /audit_strength|provenance/i, 'internal evidence taxonomy must not be exposed by the records UI');
assert.doesNotMatch(operationsCss, /\.account-state-/, 'Operation History stylesheet must not retain a second account-state surface');
assert.doesNotMatch(operationsCss, /\.operation-history-ready \[data-access-panel\]/, 'data change log must not hide the auxiliary security access log');
assert.match(operationsCss, /\.operation-workbook-review-ready \[data-import-review-panel\]/);
assert.doesNotMatch(operationsCss, /^\[data-access-panel\][\s,]/m, 'security access log must not be hidden by records extension CSS');
assert.match(operationsCss, /\.activity-row/);
assert.match(operationsCss, /\.operation-panel-summary/);

assert.match(worker, /handleAccountState/);
assert.match(worker, /pathname === '\/api\/account-state'/);
assert.match(worker, /handleActivity/);
assert.match(worker, /pathname === '\/api\/activity'/);
assert.match(worker, /handleChangeLog/);
assert.match(worker, /pathname === '\/api\/change-log'/);
assert.doesNotMatch(worker, /pathname === '\/api\/operations'/);
assert.match(worker, /handleLegacyImportReviewWrite/);
assert.match(worker, /\/api\\\/import-review\\\/\\d\+\$\/\.test\(pathname\) && request\.method === 'PATCH'/);
assert.match(legacyReviewRoute, /requireFinanceRole\(request, env, \['admin'\]\)/);
assert.match(legacyReviewRoute, /env\.DB\.batch\(/);
assert.match(legacyReviewRoute, /INSERT INTO finance_legacy_import_review_actor_context/);
assert.match(legacyReviewRoute, /DELETE FROM finance_legacy_import_review_actor_context/);
assert.match(legacyReviewRoute, /SET status = 'resolved', resolution_note = \?, resolved_at = \?/);
assert.doesNotMatch(legacyReviewRoute, /auditEnvelope|__finance_operation_history_v1/);

assert.match(accountStateRoute, /export async function handleAccountState/);
assert.match(accountStateRoute, /requireFinanceRole\(request, env\)/);
assert.match(accountStateRoute, /latestReconciliation/);
assert.match(snapshotsModule, /historical_backfill/);
assert.match(snapshotsModule, /history_import/);
assert.match(accountStateRoute, /cashFactsOnOrAfter/);
assert.match(accountStateRoute, /selectCashFactsAfterReconciliation/);
assert.match(accountStateRoute, /timing_status\?: 'after' \| 'ambiguous'/);
assert.match(accountStateRoute, /projectCash/);
assert.match(accountStateRoute, /projectRepoAssets/);
assert.match(accountStateRoute, /net_cash_amount/);
assert.match(accountStateRoute, /finance_cash_flows/);
assert.match(accountStateRoute, /finance_account_events/);
assert.match(accountStateRoute, /t\.trade_date >= \?/);
assert.match(accountStateRoute, /f\.occurred_on >= \?/);
assert.match(accountStateRoute, /e\.event_date >= \?/);
assert.match(accountStateRoute, /同一财务日/);
assert.match(accountStateRoute, /未分类账户事件/);
assert.doesNotMatch(accountStateRoute, /finance_.*_audit|finance_access_log/, 'current cash must project from financial facts rather than audit/security history');
assert.doesNotMatch(accountStateRoute, /quantity\s*\*\s*price|Math\.floor\(Math\.abs/, 'repo carrying value must not guess principal from a broker quantity/unit convention');

assert.match(activityRoute, /export async function handleActivity/);
assert.match(activityRoute, /requireFinanceRole\(request, env\)/);
assert.match(activityRoute, /FROM trades t WHERE t\.deleted_at IS NULL/);
assert.match(activityRoute, /FROM finance_cash_flows f WHERE f\.deleted_at IS NULL/);
assert.match(activityRoute, /FROM finance_account_events e WHERE e\.deleted_at IS NULL/);
assert.match(activityRoute, /FROM finance_asset_snapshots s/);
assert.match(activityRoute, /s\.is_complete = 1/);
assert.match(activityRoute, /historical_backfill/);
assert.match(activityRoute, /history_import/);
assert.match(activityRoute, /export function humanizeActivity/);
assert.match(activityRoute, /份额数量已调整/);
assert.doesNotMatch(activityRoute, /finance_.*_audit|finance_access_log|circuit_breaker_log|monthly_confirmations|finance_rebalance_records/, 'Activity must be built from business facts only');
assert.doesNotMatch(activityRoute, /\bOFFSET\b/i);

assert.match(operationsRoute, /business_date/);
assert.match(operationsRoute, /occurred_at/);
assert.match(operationsRoute, /change_key/);
assert.match(operationsRoute, /export function humanizeChange/);
assert.match(operationsRoute, /encodeChangeLogCursor/);
assert.match(operationsRoute, /buildChangeLogQuery/);
assert.match(operationsRoute, /finance_trade_audit/);
assert.match(operationsRoute, /finance_memo_audit/);
assert.match(operationsRoute, /finance_monthly_record_audit/);
assert.match(operationsRoute, /finance_review_audit/);
assert.match(operationsRoute, /finance_workbook_review_audit/);
assert.match(operationsRoute, /finance_legacy_import_review_audit/);
assert.match(operationsRoute, /主动仓单标的上限/);
assert.doesNotMatch(operationsRoute, /\bOFFSET\b/i);
assert.doesNotMatch(operationsRoute, /finance_access_log/);
assert.doesNotMatch(operationsRoute, /audit_strength|provenance/i);
assert.doesNotMatch(operationsRoute, /finance_rebalance_records|monthly_confirmations|circuit_breaker_log|finance_circuit_resolution_confirmations|finance_asset_snapshots|finance_workbook_imports/, 'business activity must not be modeled as data-change audit');
assert.doesNotMatch(operationsRoute, /annual_reviews ar WHERE ar\.confirmed_at/, 'annual review confirmation history must come from append-only audit, not current row state');
assert.doesNotMatch(operationsRoute, /\|\| '-01'/, 'reporting periods must not be converted into fabricated business dates');
assert.doesNotMatch(operationsRoute, /CAST\(a\.review_year AS TEXT\) \|\| '-12-31'/, 'annual review year must not be converted into a fabricated business date');

assert.match(operationMigration, /CREATE TABLE IF NOT EXISTS finance_memo_audit/);
assert.match(operationMigration, /CREATE TABLE IF NOT EXISTS finance_monthly_record_audit/);
assert.match(operationMigration, /CREATE TABLE IF NOT EXISTS finance_review_audit/);
assert.match(operationMigration, /CREATE TABLE IF NOT EXISTS finance_legacy_import_review_audit/);
assert.match(operationMigration, /CREATE TABLE IF NOT EXISTS finance_legacy_import_review_actor_context/);
assert.match(operationMigration, /Existing Memo \/ Monthly \/ Annual Review rows are deliberately not backfilled/);
assert.match(operationMigration, /trg_finance_memo_audit_updated/);
assert.match(operationMigration, /trg_finance_monthly_record_audit_updated/);
assert.match(operationMigration, /trg_finance_review_audit_confirmed/);
assert.match(operationMigration, /trg_finance_legacy_import_review_audit_resolved/);
assert.match(operationMigration, /unknown:legacy-import-review/);
assert.match(operationMigration, /SELECT actor FROM finance_legacy_import_review_actor_context/);
assert.doesNotMatch(operationMigration, /__finance_operation_history_v1|json_extract\(NEW\.resolution_note, '\$\.actor'\)/);
assert.match(operationMigration, /action IN \('created', 'updated', 'confirmed'\)/);
assert.match(operationMigration, /NEW\.created_by NOT LIKE 'historical-import:%'/);
assert.match(operationMigration, /system:annual-review/);

await import('./finance-operation-history-migration-contract.mjs');
console.log('Finance site contract passed.');
