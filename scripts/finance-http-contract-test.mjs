import assert from 'node:assert/strict';
import { hash } from 'bcryptjs';

import worker from '../workers/finance-api/src/index.ts';

class MemoryKv {
  values = new Map();
  async get(key, type) {
    const value = this.values.get(key);
    if (value === undefined) return null;
    if (type === 'json') return typeof value === 'string' ? JSON.parse(value) : value;
    return typeof value === 'string' ? value : JSON.stringify(value);
  }
  async put(key, value) { this.values.set(key, value); }
  async delete(key) { this.values.delete(key); }
  async list({ prefix = '' } = {}) { return { keys: [...this.values.keys()].filter((name) => name.startsWith(prefix)).map((name) => ({ name })), list_complete: true }; }
}

class MemoryD1 {
  trades = [];
  holdings = new Map();
  accessLog = [];
  importReview = [{
    id: 1,
    batch_id: 'fixture-batch',
    row_number: 3,
    record_kind: 'trade',
    raw_json: '{"ticker":"BAD"}',
    status: 'pending',
    resolution_note: null,
    resolved_at: null,
  }];
  monthlyConfirmations = new Set();
  monthlyRecords = [];
  annualReviews = [];
  activeBlackCircuit = false;
  ruleAudits = [];
  plan = { id: 1, initial_capital: 0, monthly_invest: 0, months_year1: 7, months_year2plus: 12, rate_low: .03, rate_base: .06, rate_high: .1, bonus1: 50000, bonus2to4: 35000, start_year: 2026, end_year: 2030 };
  rules = new Map([['contributions', JSON.stringify({ muxia_monthly_invest: 2500, cati_monthly_invest: 2500, muxia_bonus_year1: 50000, muxia_bonus_later: 65000, cati_bonus_year1: 50000, cati_bonus_later: 65000 })]]);
  accounts = [];
  prepare(sql) { return new MemoryStatement(this, sql); }
  async batch(statements) {
    const results = [];
    for (const statement of statements) results.push(await statement.run());
    return results;
  }
}

class MemoryStatement {
  constructor(database, sql) { this.database = database; this.sql = sql.replace(/\s+/g, ' ').trim(); this.values = []; }
  bind(...values) { this.values = values; return this; }
  async run() {
    if (this.sql.startsWith('INSERT INTO finance_access_log')) {
      const [username, action, occurred_at] = this.values;
      this.database.accessLog.push({ id: this.database.accessLog.length + 1, username, action, occurred_at });
      return { meta: { changes: 1, last_row_id: this.database.accessLog.length } };
    }
    if (this.sql.startsWith('WITH input')) {
      const [snapshot_date, ticker, direction, quantity, price, position_category] = this.values;
      const previous = this.database.holdings.get(ticker) ?? { quantity: 0, avg_cost: 0 };
      const nextQuantity = previous.quantity + (direction === 'buy' ? quantity : -quantity);
      if (nextQuantity < 0) throw new Error('holding_quantity_cannot_be_negative');
      const avg_cost = direction === 'buy'
        ? ((previous.quantity * previous.avg_cost) + (quantity * price)) / nextQuantity
        : nextQuantity === 0 ? 0 : previous.avg_cost;
      this.database.holdings.set(ticker, { snapshot_date, ticker, quantity: nextQuantity, avg_cost, position_category });
      return { meta: { changes: 1 } };
    }
    if (this.sql.startsWith('INSERT INTO trades')) {
      const [trade_date, ticker, ticker_name, direction, quantity, price, position_category, reason, , created_at, created_by] = this.values;
      const trade = { id: this.database.trades.length + 1, trade_date, ticker, ticker_name, direction, quantity, price, position_category, reason, needs_review: 0, created_at, created_by, deleted_at: null };
      this.database.trades.push(trade);
      return { meta: { changes: 1, last_row_id: trade.id } };
    }
    if (this.sql.startsWith('INSERT INTO finance_trade_audit')) return { meta: { changes: 1 } };
    if (this.sql.startsWith('UPDATE trades SET ticker_name')) {
      const [ticker_name, direction, quantity, price, position_category, reason, updated_at, updated_by, id] = this.values;
      const row = this.database.trades.find((trade) => trade.id === id && !trade.deleted_at);
      if (!row) return { meta: { changes: 0 } };
      Object.assign(row, { ticker_name, direction, quantity, price, position_category, reason, updated_at, updated_by });
      return { meta: { changes: 1 } };
    }
    if (this.sql.startsWith('UPDATE trades SET deleted_at')) {
      const [deleted_at, deleted_by, id] = this.values;
      const row = this.database.trades.find((trade) => trade.id === id && !trade.deleted_at);
      if (!row) return { meta: { changes: 0 } };
      Object.assign(row, { deleted_at, deleted_by });
      return { meta: { changes: 1 } };
    }
    if (this.sql.startsWith('UPDATE holdings_snapshots SET quantity')) {
      const [quantity, avg_cost, position_category, ticker] = this.values;
      const holding = this.database.holdings.get(ticker);
      if (holding) Object.assign(holding, { quantity, avg_cost, position_category });
      return { meta: { changes: holding ? 1 : 0 } };
    }
    if (this.sql.startsWith('INSERT INTO monthly_records')) {
      const [year_month, muxia_invest, cati_invest, end_total, sse300_pe, sse500_pe, sse1000_pe, blue_chip_temp, summary, remark, created_at, created_by, updated_at, updated_by] = this.values;
      const existing = this.database.monthlyRecords.find((record) => record.year_month === year_month);
      const record = { id: existing?.id ?? this.database.monthlyRecords.length + 1, year_month, muxia_invest, cati_invest, end_total, sse300_pe, sse500_pe, sse1000_pe, blue_chip_temp, summary, remark, created_at, created_by, updated_at, updated_by, deleted_at: null };
      if (existing) Object.assign(existing, record); else this.database.monthlyRecords.push(record);
      return { meta: { changes: 1 } };
    }
    if (this.sql.startsWith('INSERT INTO plan_params')) {
      const values = this.values;
      Object.assign(this.database.plan, Object.fromEntries(['initial_capital', 'monthly_invest', 'months_year1', 'months_year2plus', 'rate_low', 'rate_base', 'rate_high', 'bonus1', 'bonus2to4', 'start_year', 'end_year'].map((key, index) => [key, values[index]])), { updated_at: values.at(-2), updated_by: values.at(-1) });
      return { meta: { changes: 1 } };
    }
    if (this.sql.startsWith('INSERT INTO finance_plan_audit')) return { meta: { changes: 1 } };
    if (this.sql.startsWith('INSERT INTO finance_investment_rules')) {
      this.database.rules.set(this.values[0], this.values[1]);
      return { meta: { changes: 1 } };
    }
    if (this.sql.startsWith('INSERT INTO finance_rule_audit')) {
      this.database.ruleAudits.push({ rule_key: this.values[0], actor: this.values[1], before_json: this.values[3], after_json: this.values[4] });
      return { meta: { changes: 1 } };
    }
    if (this.sql.startsWith('INSERT INTO annual_reviews')) {
      const [year, calculation_json, summary, calculated_at] = this.values;
      const existing = this.database.annualReviews.find((review) => review.year === year);
      const review = { year, calculation_json, summary, calculated_at, confirmed_by: null, confirmed_at: null };
      if (existing) Object.assign(existing, review); else this.database.annualReviews.push(review);
      return { meta: { changes: 1 } };
    }
    if (this.sql.startsWith('INSERT INTO finance_accounts')) {
      const [name, account_type, owner, note, created_at, created_by, updated_at, updated_by] = this.values;
      const account = { id: this.database.accounts.length + 1, name, account_type, owner, note, created_at, created_by, updated_at, updated_by, archived_at: null };
      this.database.accounts.push(account);
      return { meta: { changes: 1, last_row_id: account.id } };
    }
    if (this.sql.startsWith('UPDATE finance_import_review')) {
      const [resolution_note, resolved_at, id] = this.values;
      const row = this.database.importReview.find((item) => item.id === id && item.status === 'pending');
      if (!row) return { meta: { changes: 0 } };
      Object.assign(row, { status: 'resolved', resolution_note, resolved_at });
      return { meta: { changes: 1 } };
    }
    if (this.sql.startsWith('INSERT OR IGNORE INTO monthly_confirmations')) {
      const [period, username] = this.values;
      const key = `${period}:${username}`;
      if (this.database.monthlyConfirmations.has(key)) return { meta: { changes: 0 } };
      this.database.monthlyConfirmations.add(key);
      return { meta: { changes: 1 } };
    }
    throw new Error(`Unhandled D1 run: ${this.sql}`);
  }
  async first() {
    if (this.sql.startsWith('SELECT id FROM trades WHERE ticker = ? AND trade_date')) return this.database.trades.find((trade) => trade.ticker === this.values[0] && trade.trade_date === this.values[1] && !trade.deleted_at) ?? null;
    if (this.sql.startsWith('SELECT * FROM trades WHERE id')) return this.database.trades.find((trade) => trade.id === this.values[0] && !trade.deleted_at) ?? null;
    if (this.sql.startsWith('SELECT id FROM trades WHERE ticker = ?')) return [...this.database.trades].filter((trade) => trade.ticker === this.values[0] && !trade.deleted_at).sort((a, b) => b.trade_date.localeCompare(a.trade_date) || b.id - a.id)[0] ?? null;
    if (this.sql.startsWith('SELECT COUNT(*) AS count FROM trades')) return { count: this.database.trades.filter((trade) => trade.ticker === this.values[0] && trade.trade_date === this.values[1] && !trade.deleted_at).length };
    if (this.sql.startsWith('SELECT * FROM monthly_records')) return this.database.monthlyRecords.find((record) => record.year_month === this.values[0]) ?? null;
    if (this.sql.startsWith('SELECT end_total FROM monthly_records')) return this.database.monthlyRecords.find((record) => record.year_month === this.values[0] && record.end_total !== null && !record.deleted_at) ?? null;
    if (this.sql.startsWith('SELECT start_year, initial_capital FROM plan_params') || this.sql.startsWith('SELECT * FROM plan_params')) return this.database.plan;
    if (this.sql.startsWith('SELECT value_json FROM finance_investment_rules')) return { value_json: this.database.rules.get(this.values[0] ?? 'contributions') };
    if (this.sql.startsWith('SELECT * FROM finance_accounts WHERE id')) return this.database.accounts.find((account) => account.id === this.values[0]) ?? null;
    if (this.sql.includes('FROM holdings_snapshots') && this.sql.includes('snapshot_date < ?')) {
      const holding = this.database.holdings.get(this.values[0]);
      return holding && holding.snapshot_date < this.values[1] ? holding : null;
    }
    if (this.sql.includes('FROM holdings_snapshots') && this.sql.includes('WHERE ticker = ?')) return this.database.holdings.get(this.values[0]) ?? null;
    if (this.sql.includes('FROM circuit_breaker_log')) return this.database.activeBlackCircuit ? { id: 99, level: 'black' } : null;
    if (this.sql.includes('FROM monthly_confirmations')) return null;
    throw new Error(`Unhandled D1 first: ${this.sql}`);
  }
  async all() {
    if (this.sql.startsWith('SELECT year_month, muxia_invest, cati_invest, end_total FROM monthly_records')) {
      return { results: this.database.monthlyRecords.filter((record) => record.year_month >= this.values[0] && record.year_month < this.values[1] && !record.deleted_at) };
    }
    if (this.sql.startsWith('SELECT calculation_json FROM annual_reviews')) return { results: this.database.annualReviews.filter((review) => review.year < this.values[0]) };
    if (this.sql.startsWith('SELECT * FROM annual_reviews')) return { results: [...this.database.annualReviews].reverse() };
    if (this.sql.startsWith('SELECT * FROM trades')) return { results: [...this.database.trades].filter((trade) => !trade.deleted_at).reverse() };
    if (this.sql.startsWith('SELECT * FROM monthly_records')) return { results: [...this.database.monthlyRecords].filter((record) => !record.deleted_at).reverse() };
    if (this.sql.startsWith('SELECT * FROM finance_accounts')) return { results: [...this.database.accounts].filter((account) => !account.archived_at) };
    if (this.sql.startsWith('SELECT username, action, occurred_at FROM finance_access_log')) return { results: [...this.database.accessLog].reverse() };
    if (this.sql.startsWith('SELECT username FROM monthly_confirmations')) return { results: [] };
    if (this.sql.startsWith('SELECT trade_date, ticker, ticker_name')) return { results: [...this.database.trades] };
    if (this.sql.startsWith('SELECT snapshot_date, ticker')) return { results: [...this.database.holdings.values()] };
    if (this.sql.includes('AS buy_value') || this.sql.startsWith('SELECT year, calculation_json') || this.sql.startsWith('SELECT period, username, confirmed_at')) return { results: [] };
    if (this.sql.startsWith('SELECT id, batch_id, row_number, record_kind, raw_json')) {
      const status = this.values.length === 2 ? this.values[0] : null;
      return { results: this.database.importReview.filter((row) => !status || row.status === status) };
    }
    throw new Error(`Unhandled D1 all: ${this.sql}`);
  }
}

const env = { FINANCE_AUTH_KV: new MemoryKv(), DB: new MemoryD1() };
const password = `isolated-${crypto.randomUUID()}`;
env.FINANCE_AUTH_KV.values.set('user:admin', { password_hash: await hash(password, 4), role: 'admin' });
env.FINANCE_AUTH_KV.values.set('user:viewer', { password_hash: await hash(password, 4), role: 'viewer' });

const fetchWorker = (pathname, init = {}) => worker.fetch(new Request(`https://finance.test${pathname}`, init), env, {});
const trusted = { Origin: 'https://f.catstarry.xyz', 'Content-Type': 'application/json' };

env.FINANCE_SITE_ORIGIN = 'https://f-staging.catstarry.xyz';
assert.equal((await fetchWorker('/api/auth/login', {
  method: 'POST',
  headers: trusted,
  body: '{}',
})).status, 403, 'configured Finance staging Worker must reject the production Origin');
assert.equal((await fetchWorker('/api/auth/login', {
  method: 'POST',
  headers: { Origin: env.FINANCE_SITE_ORIGIN, 'Content-Type': 'application/json' },
  body: '{}',
})).status, 400, 'configured Finance staging Origin must reach request validation');
delete env.FINANCE_SITE_ORIGIN;

assert.equal((await fetchWorker('/api/auth/login', { method: 'POST', body: '{}' })).status, 403);
assert.equal((await fetchWorker('/api/auth/login', { method: 'POST', headers: trusted, body: JSON.stringify({ username: 'admin', password: 'wrong-password-value' }) })).status, 401);
assert.deepEqual(await fetchWorker('/api/auth/session', { headers: { Cookie: 'token=%GG' } }).then((response) => response.json()), { authenticated: false, username: null });
assert.equal((await fetchWorker('/api/auth/login', { method: 'POST', headers: trusted, body: JSON.stringify({ username: 'admin', password: 'x'.repeat(5_000) }) })).status, 413);
for (const invalidBody of ['null', '[]', '"credentials"']) {
  assert.equal((await fetchWorker('/api/auth/login', {
    method: 'POST',
    headers: trusted,
    body: invalidBody,
  })).status, 400, 'non-object Finance JSON must be rejected as a client error');
}

async function login(username) {
  const response = await fetchWorker('/api/auth/login', { method: 'POST', headers: trusted, body: JSON.stringify({ username, password }) });
  assert.equal(response.status, 200);
  assert.match(response.headers.get('set-cookie') ?? '', /HttpOnly; Secure; SameSite=Strict/);
  return (response.headers.get('set-cookie') ?? '').split(';')[0];
}

const viewerCookie = await login('viewer');
assert.equal((await fetchWorker('/api/trades', { headers: { Cookie: viewerCookie } })).status, 200);
assert.equal((await fetchWorker('/api/trades', { method: 'POST', headers: { ...trusted, Cookie: viewerCookie }, body: '{}' })).status, 403);
assert.equal((await fetchWorker('/api/archive?year=2026', { headers: { Cookie: viewerCookie } })).status, 403);
assert.equal((await fetchWorker('/api/access-log', { headers: { Cookie: viewerCookie } })).status, 403);
assert.equal((await fetchWorker('/api/import-review', { headers: { Cookie: viewerCookie } })).status, 403);
assert.equal((await fetchWorker('/api/notifications', { headers: { Cookie: viewerCookie } })).status, 200);
assert.equal((await fetchWorker('/api/confirmations/monthly', {
  method: 'POST',
  headers: { ...trusted, Cookie: viewerCookie },
  body: JSON.stringify({ period: '2026-13' }),
})).status, 400);
assert.equal((await fetchWorker('/api/confirmations/monthly', {
  method: 'POST',
  headers: { ...trusted, Cookie: viewerCookie },
  body: JSON.stringify({ period: '2000-01' }),
})).status, 409);
const confirmablePeriod = (await fetchWorker('/api/notifications', {
  headers: { Cookie: viewerCookie },
}).then((response) => response.json())).monthly_confirmation.period;
assert.equal((await fetchWorker('/api/confirmations/monthly', {
  method: 'POST',
  headers: { ...trusted, Cookie: viewerCookie },
  body: JSON.stringify({ period: confirmablePeriod }),
})).status, 200);

const adminCookie = await login('admin');
assert.equal((await fetchWorker('/api/trades', { method: 'POST', headers: { ...trusted, Cookie: adminCookie }, body: '{}' })).status, 400);
assert.equal((await fetchWorker('/api/circuit/evaluate', {
  method: 'POST',
  headers: { ...trusted, Cookie: adminCookie },
  body: '{}',
})).status, 400, 'incomplete circuit metrics must not be accepted');
assert.equal((await fetchWorker('/api/circuit/999999999999999999999/confirm-resolve', {
  method: 'PATCH',
  headers: { ...trusted, Cookie: adminCookie },
  body: '{}',
})).status, 404, 'direct circuit resolution is retired in favour of two-role confirmation');
assert.equal((await fetchWorker('/api/import-review/999999999999999999999', {
  method: 'PATCH',
  headers: { ...trusted, Cookie: adminCookie },
  body: JSON.stringify({ resolution_note: 'bounded' }),
})).status, 400);
const created = await fetchWorker('/api/trades', {
  method: 'POST',
  headers: { ...trusted, Cookie: adminCookie },
  body: JSON.stringify({
    trade_date: '2026-07-25',
    ticker: '510300',
    ticker_name: '沪深300ETF',
    direction: 'buy',
    quantity: 100,
    price: 4.25,
    position_category: 'broad-index',
    reason: 'contract',
  }),
});
assert.equal(created.status, 201, await created.text());
env.DB.activeBlackCircuit = true;
for (const [method, pathname, body] of [
  ['POST', '/api/trades', { trade_date: '2026-07-26', ticker: '510500', direction: 'buy', quantity: 1, price: 5, position_category: 'broad-index' }],
  ['PATCH', '/api/trades/1', { trade_date: '2026-07-25', ticker: '510300', direction: 'buy', quantity: 120, price: 4.3, position_category: 'broad-index' }],
  ['DELETE', '/api/trades/1', {}],
]) {
  const response = await fetchWorker(pathname, { method, headers: { ...trusted, Cookie: adminCookie }, body: JSON.stringify(body) });
  assert.equal(response.status, 409, `active black circuit must block ${method} ${pathname}`);
  assert.equal((await response.json()).error.code, 'black_circuit_active');
}
env.DB.activeBlackCircuit = false;
assert.equal((await fetchWorker('/api/trades', {
  method: 'POST', headers: { ...trusted, Cookie: adminCookie }, body: JSON.stringify({
    trade_date: '2026-07-24', ticker: '510300', direction: 'buy', quantity: 1, price: 4.2, position_category: 'broad-index',
  }),
})).status, 409, 'backdated online trades must be rejected');
assert.equal((await fetchWorker('/api/trades', {
  method: 'POST', headers: { ...trusted, Cookie: adminCookie }, body: JSON.stringify({
    trade_date: '2026-02-31', ticker: '510500', direction: 'buy', quantity: 1, price: 5, position_category: 'broad-index',
  }),
})).status, 400, 'calendar-invalid trade dates must be rejected');
assert.equal((await fetchWorker('/api/trades', { headers: { Cookie: adminCookie } }).then((response) => response.json())).trades.length, 1);
assert.equal((await fetchWorker('/api/trades/1', {
  method: 'PATCH', headers: { ...trusted, Cookie: adminCookie }, body: JSON.stringify({
    trade_date: '2026-07-25', ticker: '510300', ticker_name: '沪深300ETF', direction: 'buy', quantity: 120, price: 4.3, position_category: 'broad-index', reason: 'corrected contract',
  }),
})).status, 200, 'the latest standalone online trade can be edited');
assert.equal((await fetchWorker('/api/trades/1', {
  method: 'DELETE', headers: { ...trusted, Cookie: adminCookie }, body: '{}',
})).status, 200, 'the latest standalone online trade can be soft-deleted');
assert.equal((await fetchWorker('/api/trades', { headers: { Cookie: adminCookie } }).then((response) => response.json())).trades.length, 0);
const archive = await fetchWorker('/api/archive?year=2026', { headers: { Cookie: adminCookie } });
assert.equal(archive.status, 200);
assert.match(archive.headers.get('content-type') ?? '', /spreadsheetml/);
assert.deepEqual([...new Uint8Array(await archive.arrayBuffer()).subarray(0, 4)], [0x50, 0x4b, 0x03, 0x04]);
assert.equal((await fetchWorker('/api/access-log?limit=20', { headers: { Cookie: adminCookie } })).status, 200);
assert.equal((await fetchWorker('/api/notifications', { headers: { Cookie: adminCookie } })).status, 200);
const pendingReview = await fetchWorker('/api/import-review?status=pending', { headers: { Cookie: adminCookie } }).then((response) => response.json());
assert.equal(pendingReview.review.length, 1);
assert.deepEqual(pendingReview.review[0].raw, { ticker: 'BAD' });
assert.equal((await fetchWorker('/api/import-review/1', {
  method: 'PATCH',
  headers: { ...trusted, Cookie: adminCookie },
  body: JSON.stringify({ resolution_note: '' }),
})).status, 400);
assert.equal((await fetchWorker('/api/import-review/1', {
  method: 'PATCH',
  headers: { ...trusted, Cookie: adminCookie },
  body: JSON.stringify({ resolution_note: 'Corrected through the online trade form' }),
})).status, 200);
assert.equal((await fetchWorker('/api/import-review/1', {
  method: 'PATCH',
  headers: { ...trusted, Cookie: adminCookie },
  body: JSON.stringify({ resolution_note: 'duplicate resolution' }),
})).status, 409);
assert.equal((await fetchWorker('/api/import-review?status=pending', { headers: { Cookie: adminCookie } }).then((response) => response.json())).review.length, 0);

assert.equal((await fetchWorker('/api/monthly', { headers: { Cookie: viewerCookie } })).status, 200);
assert.equal((await fetchWorker('/api/plan', { headers: { Cookie: viewerCookie } })).status, 200);
assert.equal((await fetchWorker('/api/accounts', { headers: { Cookie: viewerCookie } })).status, 404, 'Account structure is outside the joint-investment product');
assert.equal((await fetchWorker('/api/monthly', {
  method: 'PUT', headers: { ...trusted, Cookie: viewerCookie }, body: JSON.stringify({ year_month: '2026-07' }),
})).status, 403);
assert.equal((await fetchWorker('/api/monthly', {
  method: 'PUT', headers: { ...trusted, Cookie: adminCookie }, body: JSON.stringify({
    year_month: '2026-07', muxia_invest: 5000, cati_invest: 0, end_total: 12600, sse300_pe: 12.5, summary: 'contract monthly record',
  }),
})).status, 200);
assert.equal((await fetchWorker('/api/monthly', { headers: { Cookie: adminCookie } }).then((response) => response.json())).records.length, 1);
assert.equal((await fetchWorker('/api/plan', {
  method: 'PUT', headers: { ...trusted, Cookie: adminCookie }, body: JSON.stringify({
    initial_capital: 100000, monthly_invest: 5000, months_year1: 7, months_year2plus: 12,
    rate_low: .03, rate_base: .06, rate_high: .1, bonus1: 50000, bonus2to4: 35000, start_year: 2026, end_year: 2030,
  }),
})).status, 200);
assert.equal((await fetchWorker('/api/plan', { headers: { Cookie: adminCookie } }).then((response) => response.json())).plan.monthly_invest, 5000);
assert.equal((await fetchWorker('/api/risk-rules', {
  method: 'PUT', headers: { ...trusted, Cookie: adminCookie }, body: JSON.stringify({ rule_key: 'temperature', value: { freeze: 8, low: 12, normal: 18, high: 24 } }),
})).status, 200);
assert.equal(env.DB.rules.get('temperature'), JSON.stringify({ freeze: 8, low: 12, normal: 18, high: 24 }));
assert.equal(env.DB.ruleAudits.at(-1)?.rule_key, 'temperature');
assert.equal((await fetchWorker('/api/risk-rules', {
  method: 'PUT', headers: { ...trusted, Cookie: adminCookie }, body: JSON.stringify({ rule_key: 'temperature', value: { freeze: 12, low: 10, normal: 18, high: 24 } }),
})).status, 400, 'PE temperature boundaries must be strictly increasing');
assert.equal((await fetchWorker('/api/monthly', {
  method: 'PUT', headers: { ...trusted, Cookie: adminCookie }, body: JSON.stringify({
    year_month: '2026-12', muxia_invest: 1000, cati_invest: 500, end_total: 120000, summary: 'year-end record',
  }),
})).status, 200);
const annual = await fetchWorker('/api/review/calculate', {
  method: 'POST', headers: { ...trusted, Cookie: adminCookie }, body: JSON.stringify({
    year: 2026,
    summary: 'derived annual review',
    modifiedDietz: { beginningValue: 1, endingValue: 2, periodDays: 1, cashFlows: [{ amount: 9_999_999, day: 0 }] },
    currentValue: 2,
    historicalMaximumValue: 3,
  }),
});
assert.equal(annual.status, 200);
const annualPayload = await annual.json();
assert.equal(annualPayload.calculation.dietz.beginningValue, 100000, 'annual review must derive beginning value from the Finance plan');
assert.equal(annualPayload.calculation.dietz.endingValue, 120000, 'annual review must derive ending value from the December record');
assert.equal(annualPayload.calculation.dietz.netCashFlow, 6500, 'annual review must ignore browser-provided cash flows');
const incompleteAnnual = await fetchWorker('/api/review/calculate', {
  method: 'POST', headers: { ...trusted, Cookie: adminCookie }, body: JSON.stringify({ year: 2027, summary: 'must not calculate' }),
});
assert.equal(incompleteAnnual.status, 409);
assert.equal((await incompleteAnnual.json()).error.code, 'missing_annual_data');
assert.equal((await fetchWorker('/api/accounts', {
  method: 'POST', headers: { ...trusted, Cookie: adminCookie }, body: JSON.stringify({ name: 'forbidden' }),
})).status, 404);

console.log('Finance HTTP contract passed.');
