import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [html, css, script, headers, worker, operationsUi, operationsCss, operationsRoute, operationMigration] = await Promise.all([
  readFile('finance-site/index.html', 'utf8'),
  readFile('finance-site/styles.css', 'utf8'),
  readFile('finance-site/app.js', 'utf8'),
  readFile('finance-site/_headers', 'utf8'),
  readFile('workers/finance-api/src/index.ts', 'utf8'),
  readFile('finance-site/operations-ui.js', 'utf8'),
  readFile('finance-site/operations.css', 'utf8'),
  readFile('workers/finance-api/src/routes/operations.ts', 'utf8'),
  readFile('workers/finance-api/migrations/0008_operation_history.sql', 'utf8'),
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
assert.doesNotMatch(`${script}\n${operationsUi}`, /innerHTML|insertAdjacentHTML|scrollIntoView/);
assert.doesNotMatch(`${html}\n${script}\n${worker}`, /password\s*[:=]\s*["'][^"']+["']/i);
assert.doesNotMatch(`${html}\n${script}`, /feed-api\.catstarry\.workers\.dev/);
assert.doesNotMatch(`${html}\n${script}`, /data-open-account(?!-event)|data-account-list|\/api\/accounts/);
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
assert.match(html, /rules-disclosure[\s\S]*?<summary><span><span class="eyebrow">REBALANCING \/ RULES<\/span><strong>仓位规则与再平衡记录<\/strong><\/span><\/summary>/);
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

assert.match(html, /<link rel="stylesheet" href="\/operations\.css">/);
assert.match(html, /<script src="\/operations-ui\.js" defer><\/script>/);
assert.match(operationsUi, /变更记录/);
assert.match(operationsUi, /\/api\/operations/);
assert.match(operationsUi, /\/api\/workbook-review/);
assert.match(operationsUi, /data-import-review-panel/);
assert.match(operationsCss, /\[data-access-panel\]/);
assert.match(operationsCss, /\[data-import-review-panel\]/);
assert.match(worker, /handleOperations/);
assert.match(worker, /pathname === '\/api\/operations'/);
assert.match(operationsRoute, /business_date/);
assert.match(operationsRoute, /occurred_at/);
assert.match(operationsRoute, /finance_trade_audit/);
assert.match(operationsRoute, /finance_memo_audit/);
assert.match(operationsRoute, /finance_monthly_record_audit/);
assert.match(operationsRoute, /finance_review_audit/);
assert.match(operationsRoute, /finance_workbook_review_audit/);
assert.match(operationsRoute, /annual_reviews ar WHERE ar\.confirmed_at/);
assert.match(operationsRoute, /monthly_confirmations mc/);
assert.doesNotMatch(operationsRoute, /finance_access_log/);
assert.match(operationMigration, /CREATE TABLE IF NOT EXISTS finance_memo_audit/);
assert.match(operationMigration, /CREATE TABLE IF NOT EXISTS finance_monthly_record_audit/);
assert.match(operationMigration, /CREATE TABLE IF NOT EXISTS finance_review_audit/);
assert.match(operationMigration, /Existing Memo \/ Monthly \/ Annual Review rows are deliberately not backfilled/);
assert.match(operationMigration, /trg_finance_memo_audit_updated/);
assert.match(operationMigration, /trg_finance_monthly_record_audit_updated/);
assert.match(operationMigration, /system:annual-review/);

await import('./finance-operation-history-migration-contract.mjs');
console.log('Finance site contract passed.');
