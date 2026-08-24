import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [refreshTask, automaticValuationTask, priceImporter, rebuildRoute, workerIndex, wranglerConfig] = await Promise.all([
  readFile('workers/finance-api/src/tasks/refresh-market-data.ts', 'utf8'),
  readFile('workers/finance-api/src/tasks/refresh-asset-valuations.ts', 'utf8'),
  readFile('scripts/finance-import-raw-prices.py', 'utf8'),
  readFile('workers/finance-api/src/routes/asset-valuation-rebuild.ts', 'utf8'),
  readFile('workers/finance-api/src/index.ts', 'utf8'),
  readFile('workers/finance-api/wrangler.jsonc', 'utf8'),
]);

assert.match(refreshTask, /INSERT INTO market_data/, 'scheduled/live quote refresh owns only the current market read model');
assert.doesNotMatch(refreshTask, /finance_security_prices|finance_asset_valuations/, 'live or 15-minute quotes must never be promoted directly into historical authority');
assert.match(priceImporter, /finance_security_prices/, 'canonical daily raw closes enter through the reviewed operator import boundary');
assert.match(priceImporter, /price_status/);
assert.match(priceImporter, /carried_forward/);
assert.match(rebuildRoute, /finance_security_prices/);
assert.match(rebuildRoute, /finance_asset_valuations/);
assert.match(rebuildRoute, /beyond_reconciliation/, 'derived history must not extend beyond the latest reconciliation anchor');
assert.match(automaticValuationTask, /finance_security_prices/);
assert.match(automaticValuationTask, /finance_asset_valuations/);
assert.match(automaticValuationTask, /MAX_CATCH_UP_DAYS = 20/);
assert.match(automaticValuationTask, /tencent-finance\+ths-coverage/);

assert.match(workerIndex, /const MARKET_REFRESH_CRONS = new Set\(\['\*\/15 \* \* \* \*', '30 7 \* \* 1-5'\]\)/, 'Finance Worker must keep market refresh scoped to the intended cron triggers');
assert.match(workerIndex, /if \(MARKET_REFRESH_CRONS\.has\(controller\.cron\)\)/, 'only declared market crons may refresh current market data');
assert.match(workerIndex, /controller\.cron in ASSET_VALUATION_REFRESH_CRONS/, 'only declared valuation crons may write historical authority');
assert.match(wranglerConfig, /"\*\/15 \* \* \* \*"/);
assert.match(wranglerConfig, /"30 7 \* \* 1-5"/);
assert.match(wranglerConfig, /"20 8 \* \* 1-5"/);
assert.match(wranglerConfig, /"0 9 \* \* 1-5"/);
assert.match(wranglerConfig, /"0 12 \* \* 1-5"/);

console.log('Finance live-market, historical-price, and scheduled-refresh authority contract passed.');
