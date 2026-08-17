import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [refreshTask, priceImporter, rebuildRoute] = await Promise.all([
  readFile('workers/finance-api/src/tasks/refresh-market-data.ts', 'utf8'),
  readFile('scripts/finance-import-raw-prices.py', 'utf8'),
  readFile('workers/finance-api/src/routes/asset-valuation-rebuild.ts', 'utf8'),
]);

assert.match(refreshTask, /INSERT INTO market_data/, 'scheduled/live quote refresh owns only the current market read model');
assert.doesNotMatch(refreshTask, /finance_security_prices|finance_asset_valuations/, 'live or 15-minute quotes must never be promoted directly into historical authority');
assert.match(priceImporter, /finance_security_prices/, 'canonical daily raw closes enter through the reviewed operator import boundary');
assert.match(priceImporter, /price_status/);
assert.match(priceImporter, /carried_forward/);
assert.match(rebuildRoute, /finance_security_prices/);
assert.match(rebuildRoute, /finance_asset_valuations/);
assert.match(rebuildRoute, /beyond_reconciliation/, 'derived history must not extend beyond the latest reconciliation anchor');

console.log('Finance live-market vs historical-price authority contract passed.');
