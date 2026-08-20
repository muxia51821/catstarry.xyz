import assert from 'node:assert/strict';

import { projectPortfolioRoles } from '../workers/finance-api/src/routes/account-state.ts';

function project({ holdings = [], cash = 0, otherAssets = 0, otherStatus = 'clear', totalAssets = null, totalStatus = 'incomplete', positionLimits = [] } = {}) {
  return projectPortfolioRoles({
    holdings: { items: holdings },
    cash: { value: cash },
    other_assets: { value: otherAssets, status: otherStatus },
    total_assets: totalAssets,
    total_status: totalStatus,
  }, positionLimits);
}

const securitiesOnly = project({
  holdings: [{ ticker: '510300', position_category: 'A股宽基指数底仓', market_value: 500 }],
  totalAssets: 500,
  totalStatus: 'reconciled',
});
assert.deepEqual(securitiesOnly.roles, [{
  role: 'A股宽基指数底仓', value: 500, percentage: 1, sources: ['security_holding'],
}]);
assert.equal(securitiesOnly.percentage_available, true);
assert.deepEqual(securitiesOnly.composition, [{
  role: 'A股宽基指数', value: 500, percentage: 1, sources: ['security_holding'], raw_roles: ['A股宽基指数底仓'],
  target_ratio: null, lower_ratio: null, upper_ratio: null, deviation: null,
}]);

const withCash = project({
  holdings: [{ ticker: '510300', position_category: 'A股宽基指数底仓', market_value: 500 }],
  cash: 100,
  totalAssets: 600,
  totalStatus: 'reconciled',
});
assert.deepEqual(withCash.roles, [
  { role: 'A股宽基指数底仓', value: 500, percentage: 5 / 6, sources: ['security_holding'] },
  { role: '机动仓', value: 100, percentage: 1 / 6, sources: ['broker_cash'] },
]);

const withOpenRepo = project({
  holdings: [{ ticker: '510300', position_category: 'A股宽基指数底仓', market_value: 500 }],
  cash: 100,
  otherAssets: 50,
  otherStatus: 'open_repo',
  totalAssets: 650,
  totalStatus: 'reconciled',
});
assert.deepEqual(withOpenRepo.roles[1], {
  role: '机动仓', value: 150, percentage: 3 / 13, sources: ['broker_cash', 'open_reverse_repo'],
});
const withPolicy = project({
  holdings: [{ ticker: '510300', position_category: 'A股宽基指数底仓', market_value: 500 }],
  cash: 100,
  otherAssets: 50,
  otherStatus: 'open_repo',
  totalAssets: 650,
  totalStatus: 'reconciled',
  positionLimits: [
    { position_category: 'A股宽基指数', target_ratio: .15, lower_ratio: .1, upper_ratio: .2 },
    { position_category: '机动仓', target_ratio: .15, lower_ratio: .1, upper_ratio: .2 },
    { position_category: '黄金ETF', target_ratio: .1, lower_ratio: .05, upper_ratio: .15 },
    { position_category: 'A股总敞口（主动+宽基）', target_ratio: .55, lower_ratio: .35, upper_ratio: .65 },
  ],
});
assert.deepEqual(withPolicy.composition, [
  { role: 'A股宽基指数', value: 500, percentage: 10 / 13, sources: ['security_holding'], raw_roles: ['A股宽基指数底仓'], target_ratio: .15, lower_ratio: .1, upper_ratio: .2, deviation: 10 / 13 - .15 },
  { role: '机动仓', value: 150, percentage: 3 / 13, sources: ['broker_cash', 'open_reverse_repo'], raw_roles: [], target_ratio: .15, lower_ratio: .1, upper_ratio: .2, deviation: 3 / 13 - .15 },
  { role: '黄金ETF', value: 0, percentage: 0, sources: [], raw_roles: [], target_ratio: .1, lower_ratio: .05, upper_ratio: .15, deviation: -.1 },
]);
assert.equal(withPolicy.composition.some((row) => row.role === 'A股总敞口（主动+宽基）'), false);

const zeroCash = project({
  holdings: [{ ticker: '510300', position_category: 'A股宽基指数底仓', market_value: 500 }],
  cash: 0,
  totalAssets: 500,
  totalStatus: 'reconciled',
});
assert.equal(zeroCash.roles.some((role) => role.role === '机动仓'), false);

const zeroOtherAssets = project({
  holdings: [{ ticker: '510300', position_category: 'A股宽基指数底仓', market_value: 500 }],
  otherAssets: 0,
  otherStatus: 'clear',
  totalAssets: 500,
  totalStatus: 'reconciled',
});
assert.equal(zeroOtherAssets.roles.some((role) => role.sources.includes('open_reverse_repo')), false);

const unsupportedOtherAssets = project({
  holdings: [{ ticker: '510300', position_category: 'A股宽基指数底仓', market_value: 500 }],
  otherAssets: 50,
  otherStatus: 'clear',
  totalAssets: 550,
  totalStatus: 'reconciled',
});
assert.equal(unsupportedOtherAssets.roles.some((role) => role.sources.includes('open_reverse_repo')), false);

const incompleteTotal = project({
  holdings: [{ ticker: '510300', position_category: 'A股宽基指数底仓', market_value: 500 }],
  cash: 100,
  totalAssets: null,
  totalStatus: 'incomplete',
});
assert.equal(incompleteTotal.percentage_available, false);
assert.ok(incompleteTotal.roles.every((role) => role.percentage === null));
assert.ok(incompleteTotal.composition.every((role) => role.percentage === null && role.deviation === null));

const unknownClassification = project({
  holdings: [{ ticker: 'UNKNOWN', position_category: ' ', market_value: 99 }],
  totalAssets: 100,
  totalStatus: 'reconciled',
});
assert.deepEqual(unknownClassification.roles, []);
assert.deepEqual(unknownClassification.unclassified, [{ source: 'security_holding', ticker: 'UNKNOWN', value: 99 }]);
assert.deepEqual(unknownClassification.composition, [{
  role: 'unclassified', value: 99, percentage: .99, sources: ['security_holding'], raw_roles: [],
  target_ratio: null, lower_ratio: null, upper_ratio: null, deviation: null,
}]);

console.log('Finance Portfolio Role authority and allocation contract passed.');
