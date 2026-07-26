import assert from 'node:assert/strict';

import {
  calculateExcessSplit,
  calculateModifiedDietz,
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

console.log('Finance calculation contract passed.');
