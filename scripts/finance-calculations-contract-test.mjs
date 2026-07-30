import assert from 'node:assert/strict';

import {
  calculateExcessSplit,
  calculateModifiedDietz,
  cashFlowAdjustedDrawdown,
  circuitBreakerState,
  peTemperature,
  positionDeviation,
} from '../workers/finance-api/src/modules/calculations.ts';

const dietz = calculateModifiedDietz({
  beginningValue: 1_000,
  endingValue: 1_200,
  periodDays: 100,
  cashFlows: [{ amount: 100, day: 50 }],
});
assert.equal(dietz.weightedCapital, 1_050);
assert.ok(Math.abs(dietz.returnRate - (100 / 1_050)) < 1e-12);
assert.throws(() => calculateModifiedDietz({ beginningValue: 0, endingValue: 1, periodDays: 0, cashFlows: [] }));

assert.deepEqual(peTemperature(9.99), { zone: 'freeze', suggestion: 'aggressively_add' });
assert.deepEqual(peTemperature(10), { zone: 'low', suggestion: 'moderately_add' });
assert.deepEqual(peTemperature(12), { zone: 'normal', suggestion: 'normal_dca' });
assert.deepEqual(peTemperature(15.99), { zone: 'normal', suggestion: 'normal_dca' });
assert.deepEqual(peTemperature(16), { zone: 'high', suggestion: 'reduce_investment' });
assert.deepEqual(peTemperature(20), { zone: 'high', suggestion: 'reduce_investment' });
assert.deepEqual(peTemperature(20.01), { zone: 'overheat', suggestion: 'pause_or_reduce' });
assert.deepEqual(peTemperature(11, { freeze: 8, low: 12, normal: 18, high: 24 }), { zone: 'low', suggestion: 'moderately_add' });
assert.throws(() => peTemperature(11, { freeze: 12, low: 10, normal: 18, high: 24 }), /strictly increasing/);

assert.deepEqual(circuitBreakerState({ annualDrawdown: 0.21, monthlyDrawdown: 0, maximumPositionLoss: 0, catiObjection: false }), { level: 'red', action: 'route_dca_to_cash' });
assert.deepEqual(circuitBreakerState({ annualDrawdown: 0, monthlyDrawdown: 0.11, maximumPositionLoss: 0, catiObjection: false }).level, 'yellow');
assert.deepEqual(circuitBreakerState({ annualDrawdown: 0, monthlyDrawdown: 0, maximumPositionLoss: 0, catiObjection: true }).level, 'black');
assert.throws(() => circuitBreakerState({}), /catiObjection/);
assert.throws(() => circuitBreakerState({ annualDrawdown: -0.01, monthlyDrawdown: 0, maximumPositionLoss: 0, catiObjection: false }), /between 0 and 1/);
assert.throws(() => circuitBreakerState({ annualDrawdown: 0, monthlyDrawdown: 2, maximumPositionLoss: 0, catiObjection: false }), /between 0 and 1/);
assert.throws(() => circuitBreakerState({ annualDrawdown: 0, monthlyDrawdown: 0, maximumPositionLoss: 0, catiObjection: 'false' }), /boolean/);

assert.deepEqual(positionDeviation({ current: 0.55, target: 0.4, lower: 0.35, upper: 0.5 }), {
  deviation: 0.15,
  status: 'above_upper',
  suggestedChange: -0.15,
});
assert.deepEqual(positionDeviation({ current: 0.43, target: 0.4, lower: 0.25, upper: 0.55 }), {
  deviation: 0.03,
  status: 'near_target',
  suggestedChange: 0,
});
assert.deepEqual(positionDeviation({ current: 0.48, target: 0.4, lower: 0.25, upper: 0.55 }), {
  deviation: 0.08,
  status: 'rebalance',
  suggestedChange: -0.08,
});
assert.deepEqual(cashFlowAdjustedDrawdown([
  { date: '2026-01-01', total: 100, netCashFlow: 0, weightedCashFlow: 0 },
  { date: '2026-01-08', total: 130, netCashFlow: 20, weightedCashFlow: 10 },
  { date: '2026-01-15', total: 98.1818181818, netCashFlow: 0, weightedCashFlow: 0 },
]), { drawdown: 0.1, high_water_date: '2026-01-08', current_date: '2026-01-15' });
assert.equal(cashFlowAdjustedDrawdown([{ date: '2026-01-01', total: 100, netCashFlow: 0 }]), null);

const split = calculateExcessSplit({
  currentValue: 1_250,
  historicalMaximumValue: 1_100,
  weightedCapital: 1_000,
  portfolioReturn: 0.15,
});
assert.deepEqual(split, {
  highWaterMark: 1_133,
  eligible: true,
  benchmarkRate: 0.03,
  excessReturn: 0.12,
  excessValue: 120,
  managerShareRate: 0.5,
  managerShare: 60,
});
assert.equal(calculateExcessSplit({
  currentValue: 1_120,
  historicalMaximumValue: 1_100,
  weightedCapital: 1_000,
  portfolioReturn: 0.15,
}).managerShare, 0);
assert.equal(calculateExcessSplit({
  currentValue: 1_250,
  historicalMaximumValue: 1_100,
  weightedCapital: 1_000,
  portfolioReturn: 0.15,
  managerBonusCap: 35,
}).managerShare, 35, 'annual manager share must not exceed the manager bonus contribution cap');

console.log('Finance calculation contract passed.');
