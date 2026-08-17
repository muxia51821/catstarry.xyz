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
assert.match(script, /\/api\/trades\?limit=5/);
assert.match(script, /data-account-breakdown/);
assert.match(script, /Broker Cash/);
assert.match(script, /portfolioNumber\.format\(Number\(row\.quantity\)\).*portfolioMoney\.format\(Number\(row\.price\)\)/s);
assert.match(script, /MutationObserver/);
assert.doesNotMatch(script, /window\.fetch\s*=/, 'Portfolio UI must not replace the global fetch function');
assert.doesNotMatch(script, /finance_asset_snapshots|snapshot_at/, 'Portfolio overview must consume account-state instead of rebuilding account truth from snapshots');
assert.match(css, /\.portfolio-account-breakdown/);
assert.match(css, /@media \(max-width: 680px\)/);

console.log('Finance portfolio overview wiring contract passed.');
