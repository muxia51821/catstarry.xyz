import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [html, css, script, headers, worker] = await Promise.all([
  readFile('finance-site/index.html', 'utf8'),
  readFile('finance-site/styles.css', 'utf8'),
  readFile('finance-site/app.js', 'utf8'),
  readFile('finance-site/_headers', 'utf8'),
  readFile('workers/finance-api/src/index.ts', 'utf8'),
]);

for (const marker of ['data-login-form', 'data-open-trade', 'data-holdings-body', 'data-position-list', 'data-pe-list', 'data-objection', 'data-open-review', 'data-export-archive', 'data-access-list']) {
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

console.log('Finance site contract passed.');
