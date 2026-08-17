import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [html, script, css] = await Promise.all([
  readFile('finance-site/index.html', 'utf8'),
  readFile('finance-site/portfolio-ui.js', 'utf8'),
  readFile('finance-site/portfolio.css', 'utf8'),
]);

assert.match(html, /<link rel="stylesheet" href="\/portfolio\.css">/);
assert.match(html, /<script src="\/portfolio-ui\.js" defer><\/script>/);
assert.match(html, /<span>总资产<\/span><strong data-total-value>/);
assert.match(html, /canonical raw close/);
assert.match(script, /\/api\/account-state/);
assert.match(script, /\/api\/holdings/);
assert.match(script, /\/api\/securities/);
assert.match(script, /\/api\/trades\?limit=50/);
assert.match(script, /data-account-breakdown/);
assert.match(script, /Broker Cash/);
assert.match(script, /portfolioNumber\.format\(Number\(row\.quantity\)\).*portfolioMoney\.format\(Number\(row\.price\)\)/s);
assert.match(script, /PORTFOLIO_ROLES/);
assert.match(script, /position_category/);
assert.match(script, /security_attribute/);
assert.match(script, /portfolio-security-attribute/);
assert.match(script, /data-security-attribute-column|securityAttributeColumn/);
assert.match(script, /MutationObserver/);
assert.doesNotMatch(script, /window\.fetch\s*=/, 'Portfolio UI must not replace the global fetch function');
assert.doesNotMatch(script, /finance_asset_snapshots|snapshot_at/, 'Portfolio overview must consume account-state instead of rebuilding account truth from snapshots');
assert.match(css, /\.portfolio-account-breakdown/);
assert.match(css, /\.portfolio-role-badge/);
assert.match(css, /\.portfolio-security-attribute/);
assert.match(css, /--portfolio-role-color/);
assert.doesNotMatch(css, /portfolio-security-attribute[^}]*--portfolio-role-color/s, 'Security Attribute must remain neutral instead of getting a second classification color system');
assert.match(css, /@media \(max-width: 680px\)/);

console.log('Finance portfolio overview and classification wiring contract passed.');
