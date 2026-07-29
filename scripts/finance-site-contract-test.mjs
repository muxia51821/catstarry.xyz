import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [html, css, script, headers, worker] = await Promise.all([
  readFile('finance-site/index.html', 'utf8'),
  readFile('finance-site/styles.css', 'utf8'),
  readFile('finance-site/app.js', 'utf8'),
  readFile('finance-site/_headers', 'utf8'),
  readFile('workers/finance-api/src/index.ts', 'utf8'),
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
assert.doesNotMatch(script, /innerHTML|insertAdjacentHTML|scrollIntoView/);
assert.doesNotMatch(`${html}\n${script}\n${worker}`, /password\s*[:=]\s*["'][^"']+["']/i);
assert.doesNotMatch(`${html}\n${script}`, /feed-api\.catstarry\.workers\.dev/);
assert.doesNotMatch(`${html}\n${script}`, /data-open-account|data-account-list|\/api\/accounts/);
assert.match(html, /data-tab="entry"/);
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
assert.match(html, /货币基金\/现金/);
assert.match(html, /PE 与温度由行情接入写入/);
assert.doesNotMatch(html, /name="sse300_pe"|name="sse500_pe"|name="sse1000_pe"|name="blue_chip_temp"/);
assert.match(css, /\.trade-total strong\[data-placeholder\]/);
assert.match(script, /setStatus\(\$\('\[data-dashboard-status\]'\), ''\)/);

console.log('Finance site contract passed.');
