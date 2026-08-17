import assert from 'node:assert/strict';

import { projectCash, projectRepoAssets } from '../workers/finance-api/src/routes/account-state.ts';

const cash = projectCash(20_725.50, [
  { fact_key: 'trade:1', business_date: '2026-08-17', business_time: '10:00', kind: 'trade', subtype: 'buy', amount: -1_000.20, repo_key: null },
  { fact_key: 'cash-flow:1', business_date: '2026-08-17', business_time: null, kind: 'cash_flow', subtype: 'monthly_investment', amount: 5_000, repo_key: null },
  { fact_key: 'account-event:1', business_date: '2026-08-17', business_time: null, kind: 'account_event', subtype: 'dividend', amount: 50, repo_key: '300750' },
  { fact_key: 'account-event:2', business_date: '2026-08-17', business_time: '14:00', kind: 'account_event', subtype: 'repo_start', amount: -2_000.01, repo_key: 'R-001' },
  { fact_key: 'account-event:3', business_date: '2026-08-17', business_time: null, kind: 'account_event', subtype: 'split', amount: null, repo_key: '515880' },
]);
assert.deepEqual(cash, {
  value: 22_775.29,
  known_value: 22_775.29,
  status: 'projected',
  projected_delta: 2_049.79,
  replayed_facts: 4,
  problems: [],
});

const missing = projectCash(100, [
  { fact_key: 'trade:missing', business_date: '2026-08-18', business_time: null, kind: 'trade', subtype: 'buy', amount: null, repo_key: null },
]);
assert.equal(missing.value, null);
assert.equal(missing.known_value, 100);
assert.equal(missing.status, 'incomplete');
assert.match(missing.problems[0], /缺少明确现金影响/);

const ambiguous = projectCash(100, [
  { fact_key: 'account-event:other', business_date: '2026-08-18', business_time: null, kind: 'account_event', subtype: 'other', amount: 12.3, repo_key: null },
]);
assert.equal(ambiguous.value, null);
assert.match(ambiguous.problems[0], /未分类账户事件/);

const closedRepo = projectRepoAssets([
  { id: 1, event_date: '2026-06-01', event_time: '14:32', event_type: 'repo_start', repo_key: 'R-001', amount: -8_000.01 },
  { id: 2, event_date: '2026-06-02', event_time: null, event_type: 'repo_maturity', repo_key: 'R-001', amount: 8_000.30 },
]);
assert.deepEqual(closedRepo, { value: 0, known_value: 0, status: 'clear', open_repo_count: 0, problems: [] });

const openRepo = projectRepoAssets([
  { id: 3, event_date: '2026-07-29', event_time: '14:37', event_type: 'repo_start', repo_key: 'R-001', amount: -36_000.04 },
]);
assert.deepEqual(openRepo, { value: 36_000.04, known_value: 36_000.04, status: 'open_repo', open_repo_count: 1, problems: [] });

const maturedRepo = projectRepoAssets([
  { id: 3, event_date: '2026-07-29', event_time: '14:37', event_type: 'repo_start', repo_key: 'R-001', amount: -36_000.04 },
  { id: 4, event_date: '2026-07-30', event_time: null, event_type: 'repo_maturity', repo_key: 'R-001', amount: 36_001.39 },
]);
assert.deepEqual(maturedRepo, { value: 0, known_value: 0, status: 'clear', open_repo_count: 0, problems: [] });

const brokenRepo = projectRepoAssets([
  { id: 5, event_date: '2026-07-30', event_time: null, event_type: 'repo_maturity', repo_key: 'R-001', amount: 36_001.39 },
]);
assert.equal(brokenRepo.value, null);
assert.equal(brokenRepo.status, 'incomplete');
assert.match(brokenRepo.problems[0], /找不到对应/);

console.log('Finance current cash and repo-asset projection contract passed.');
