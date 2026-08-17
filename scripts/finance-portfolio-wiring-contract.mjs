import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [html, script, css, reconciliationRoute] = await Promise.all([
  readFile('finance-site/index.html', 'utf8'),
  readFile('finance-site/portfolio-ui.js', 'utf8'),
  readFile('finance-site/portfolio.css', 'utf8'),
  readFile('workers/finance-api/src/routes/asset-reconciliations.ts', 'utf8'),
]);

assert.match(html, /<link rel="stylesheet" href="\/portfolio\.css">/);
assert.match(html, /<script src="\/portfolio-ui\.js" defer><\/script>/);
assert.match(html, /<span>总资产<\/span><strong data-total-value>/);
assert.match(html, /canonical raw close/);
assert.match(script, /\/api\/account-state/);
assert.match(script, /\/api\/holdings/);
assert.match(script, /\/api\/securities/);
assert.match(script, /\/api\/trades\?limit=50/);
assert.match(script, /\/api\/assets\/snapshots/);
assert.match(script, /data-account-breakdown/);
assert.match(script, /Broker Cash/);
assert.match(script, /portfolioNumber\.format\(Number\(row\.quantity\)\).*portfolioMoney\.format\(Number\(row\.price\)\)/s);
assert.match(script, /PORTFOLIO_ROLES/);
assert.match(script, /position_category/);
assert.match(script, /security_attribute/);
assert.match(script, /portfolio-security-attribute/);
assert.match(script, /data-security-attribute-column|securityAttributeColumn/);
assert.match(script, /投资备忘录是独立的判断记录/);
assert.match(script, /ASSET RECONCILIATION/);
assert.match(script, /other_assets_value/);
assert.match(script, /财务生效日/);
assert.match(script, /分拆时＝拆分前持仓/);
assert.match(script, /canonical raw close 派生/);
assert.match(script, /MutationObserver/);
assert.doesNotMatch(script, /window\.fetch\s*=/, 'Portfolio UI must not replace the global fetch function');
assert.doesNotMatch(script, /finance_asset_snapshots/, 'Browser composition must not query Finance storage tables directly');

assert.match(reconciliationRoute, /other_assets_value/);
assert.match(reconciliationRoute, /holdings_value \+ input\.cash_value \+ input\.other_assets_value/);
assert.match(reconciliationRoute, /reconciliations: rows\.results/);

assert.match(css, /\.portfolio-account-breakdown/);
assert.match(css, /\.portfolio-role-badge/);
assert.match(css, /\.portfolio-security-attribute/);
assert.match(css, /--portfolio-role-color/);
assert.doesNotMatch(css, /portfolio-security-attribute[^}]*--portfolio-role-color/s, 'Security Attribute must remain neutral instead of getting a second classification color system');
assert.match(css, /aria-labelledby="memo-title"[^}]*grid-column: 1 \/ -1/s, 'Investment Memo must be a full-width independent Review workspace');
assert.match(css, /aria-labelledby="cash-flows-title"[\s\S]*aria-labelledby="account-events-title"[\s\S]*aria-labelledby="asset-snapshots-title"[\s\S]*grid-column: 1 \/ -1/s, 'Planning tables must use explicit full-width placement');
assert.match(css, /@media \(max-width: 680px\)/);

console.log('Finance portfolio overview, classification, reconciliation and workspace IA wiring contract passed.');
