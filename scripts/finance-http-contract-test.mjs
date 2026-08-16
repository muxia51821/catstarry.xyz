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
  memos = [];
  accountEvents = [];
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
      const [trade_date, trade_time, ticker, ticker_name, direction, quantity, price, fee, net_cash_amount, position_category, reason, , created_at, created_by] = this.values;
      const trade = { id: this.database.trades.length + 1, trade_date, trade_time, ticker, ticker_name, direction, quantity, price, fee, net_cash_amount, position_category, reason, needs_review: 0, created_at, created_by, deleted_at: null };
      this.database.trades.push(trade);
      return { meta: { changes: 1, last_row_id: trade.id } };
    }
    if (this.sql.startsWith('INSERT INTO finance_trade_audit')) return { meta: { changes: 1 } };
    if (this.sql.startsWith('INSERT INTO finance_account_events')) {
      const [event_date, event_time, event_type, ticker, ticker_name, quantity, reference_value, amount, position_category, note, created_at, created_by] = this.values;
      const event = { id: this.database.accountEvents.length + 1, event_date, event_time, event_type, ticker, ticker_name, quantity, reference_value, amount, position_category, note, created_at, created_by, deleted_at: null }; this.database.accountEvents.push(event); return { meta: { changes: 1, last_row_id: event.id } };
    }
    if (this.sql.startsWith('INSERT INTO finance_account_event_audit')) return { meta: { changes: 1 } };
    if (this.sql.startsWith('UPDATE finance_account_events SET event_date')) {
      const [event_date,event_time,event_type,ticker,ticker_name,quantity,reference_value,amount,position_category,note,updated_at,updated_by,id] = this.values; const event = this.database.accountEvents.find((item) => item.id === id && !item.deleted_at); if (!event) return { meta: { changes: 0 } }; Object.assign(event, { event_date,event_time,event_type,ticker,ticker_name,quantity,reference_value,amount,position_category,note,updated_at,updated_by }); return { meta: { changes: 1 } };
    }
    if (this.sql.startsWith('UPDATE finance_account_events SET deleted_at')) { const [deleted_at, deleted_by, id] = this.values; const event = this.database.accountEvents.find((item) => item.id === id && !item.deleted_at); if (!event) return { meta: { changes: 0 } }; Object.assign(event, { deleted_at, deleted_by }); return { meta: { changes: 1 } }; }
    if (this.sql.startsWith('INSERT INTO finance_memos')) {
      const [trade_id, memo_date, ticker, position_category, operation_type, reason, stop_loss_triggered, note, created_at, created_by] = this.values;
      const memo = { id: this.database.memos.length + 1, trade_id, memo_date, ticker, position_category, operation_type, reason, reason_source: 'original', stop_loss_triggered, note, created_at, created_by, deleted_at: null };
      this.database.memos.push(memo);
      return { meta: { changes: 1, last_row_id: memo.id } };
    }
    if (this.sql.startsWith('UPDATE finance_memos SET reason')) {
      const [reason, stop_loss_triggered, note, updated_at, updated_by, id] = this.values;
      const memo = this.database.memos.find((item) => item.id === id && !item.deleted_at);
      if (!memo) return { meta: { changes: 0 } };
      Object.assign(memo, { reason, stop_loss_triggered, note, updated_at, updated_by });
      return { meta: { changes: 1 } };
    }
    if (this.sql.startsWith('UPDATE finance_memos SET deleted_at')) {
      const [deleted_at, deleted_by, id] = this.values;
      const memo = this.database.memos.find((item) => item.id === id && !item.deleted_at);
      if (!memo) return { meta: { changes: 0 } };
      Object.assign(memo, { deleted_at, deleted_by });
      return { meta: { changes: 1 } };
    }
    if (this.sql.startsWith('UPDATE trades SET ticker_name')) {
      const [ticker_name, direction, quantity, price, trade_time, fee, net_cash_amount, position_category, reason, updated_at, updated_by, id] = this.values;
      const row = this.database.trades.find((trade) => trade.id === id && !trade.deleted_at);
      if (!row) return { meta: { changes: 0 } };
      Object.assign(row, { ticker_name, direction, quantity, price, trade_time, fee, net_cash_amount, position_category, reason, updated_at, updated_by });
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
    if (this.sql.startsWith('SELECT trade_date, ticker, position_category, direction FROM trades WHERE id')) {
      const trade = this.database.trades.find((item) => item.id === this.values[0] && !item.deleted_at);
      return trade ? { trade_date: trade.trade_date, ticker: trade.ticker, position_category: trade.position_category, direction: trade.direction } : null;
    }
    if (this.sql.startsWith('SELECT id FROM trades WHERE ticker = ? AND trade_date')) return this.database.trades.find((trade) => trade.ticker === this.values[0] && trade.trade_date === this.values[1] && !trade.deleted_at) ?? null;
    if (this.sql.startsWith('SELECT * FROM trades WHERE id')) return this.database.trades.find((trade) => trade.id === this.values[0] && !trade.deleted_at) ?? null;
    if (this.sql.startsWith('SELECT id FROM finance_memos WHERE trade_id')) return this.database.memos.find((memo) => memo.trade_id === this.values[0] && !memo.deleted_at) ?? null;
    if (this.sql.startsWith('SELECT id, trade_id FROM finance_memos WHERE id')) return this.database.memos.find((memo) => memo.id === this.values[0] && !memo.deleted_at) ?? null;
    if (this.sql.startsWith('SELECT * FROM finance_memos WHERE id')) return this.database.memos.find((memo) => memo.id === this.values[0]) ?? null;
    if (this.sql.startsWith('SELECT * FROM finance_account_events WHERE id')) return this.database.accountEvents.find((event) => event.id === this.values[0] && !event.deleted_at) ?? null;
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
    if (this.sql.startsWith('SELECT * FROM finance_account_events')) return { results: this.database.accountEvents.filter((event) => !event.deleted_at).reverse() };
    if (this.sql.startsWith('SELECT t.*, m.id AS memo_id')) {
      let index = 0;
      const start = this.sql.includes('t.trade_date >= ?') ? this.values[index++] : null;
      const end = this.sql.includes('t.trade_date <= ?') ? this.values[index++] : null;
      const ticker = this.sql.includes('t.ticker = ?') ? this.values[index++] : null;
      const direction = this.sql.includes('t.direction = ?') ? this.values[index++] : null;
      const cursor = this.sql.includes('(t.trade_date < ?') ? { sort: this.values[index], id: this.values[index + 2] } : null;
      const limit = this.values.at(-1);
      const rows = this.database.trades.filter((trade) => !trade.deleted_at && (!start || trade.trade_date >= start) && (!end || trade.trade_date <= end) && (!ticker || trade.ticker === ticker) && (!direction || trade.direction === direction)).sort((left, right) => right.trade_date.localeCompare(left.trade_date) || right.id - left.id).filter((trade) => !cursor || trade.trade_date < cursor.sort || (trade.trade_date === cursor.sort && trade.id < cursor.id)).map((trade) => { const memo = this.database.memos.find((item) => item.trade_id === trade.id && !item.deleted_at); return { ...trade, memo_id: memo?.id ?? null, memo_reason: memo?.reason ?? null, memo_reason_source: memo?.reason_source ?? null }; });
      return { results: rows.slice(0, limit) };
    }
    if (this.sql.startsWith('SELECT year_month, muxia_invest, cati_invest, end_total FROM monthly_records')) {
      return { results: this.database.monthlyRecords.filter((record) => record.year_month >= this.values[0] && record.year_month < this.values[1] && !record.deleted_at) };
    }
    if (this.sql.startsWith('SELECT calculation_json FROM annual_reviews')) return { results: this.database.annualReviews.filter((review) => review.year < this.values[0]) };
    if (this.sql.startsWith('SELECT * FROM annual_reviews')) return { results: [...this.database.annualReviews].reverse() };
    if (this.sql.startsWith('SELECT * FROM trades WHERE')) {
      let index = 0;
      const start = this.sql.includes('trade_date >= ?') ? this.values[index++] : null;
      const end = this.sql.includes('trade_date <= ?') ? this.values[index++] : null;
      const ticker = this.sql.includes('ticker = ?') ? this.values[index++] : null;
      const direction = this.sql.includes('direction = ?') ? this.values[index++] : null;
      const cursor = this.sql.includes('(trade_date < ?') ? { sort: this.values[index], id: this.values[index + 2] } : null;
      const limit = this.values.at(-1);
      const rows = this.database.trades.filter((trade) => !trade.deleted_at && (!start || trade.trade_date >= start) && (!end || trade.trade_date <= end) && (!ticker || trade.ticker === ticker) && (!direction || trade.direction === direction))
        .sort((left, right) => right.trade_date.localeCompare(left.trade_date) || right.id - left.id)
        .filter((trade) => !cursor || trade.trade_date < cursor.sort || (trade.trade_date === cursor.sort && trade.id < cursor.id));
      return { results: rows.slice(0, limit) };
    }
    if (this.sql.startsWith('SELECT * FROM trades')) return { results: [...this.database.trades].filter((trade) => !trade.deleted_at).reverse() };
    if (this.sql.startsWith('SELECT m.*, t.ticker_name')) return { results: [...this.database.memos].filter((memo) => !memo.deleted_at).reverse().map((memo) => {
      const trade = this.database.trades.find((item) => item.id === memo.trade_id);
      return { ...memo, ticker_name: trade?.ticker_name ?? null, trade_quantity: trade?.quantity ?? null, trade_price: trade?.price ?? null };
    }) };
    if (this.sql.startsWith('SELECT * FROM monthly_records')) return { results: [...this.database.monthlyRecords].filter((record) => !record.deleted_at).reverse() };
    if (this.sql.startsWith('SELECT * FROM finance_accounts')) return { results: [...this.database.accounts].filter((account) => !account.archived_at) };
    if (this.sql.startsWith('SELECT id, username, action, occurred_at FROM finance_access_log WHERE')) {
      let index = 0;
      const start = this.sql.includes('occurred_at >= ?') ? this.values[index++] : null;
      const end = this.sql.includes('occurred_at <= ?') ? this.values[index++] : null;
      const username = this.sql.includes('username = ?') ? this.values[index++] : null;
      const action = this.sql.includes('action = ?') ? this.values[index++] : null;
      const cursor = this.sql.includes('(occurred_at < ?') ? { sort: this.values[index], id: this.values[index + 2] } : null;
      const limit = this.values.at(-1);
      const rows = this.database.accessLog.filter((row) => (!start || row.occurred_at >= start) && (!end || row.occurred_at <= end) && (!username || row.username === username) && (!action || row.action === action))
        .sort((left, right) => right.occurred_at.localeCompare(left.occurred_at) || right.id - left.id)
        .filter((row) => !cursor || row.occurred_at < cursor.sort || (row.occurred_at === cursor.sort && row.id < cursor.id));
      return { results: rows.slice(0, limit) };
    }
    if (this.sql.startsWith('SELECT username, action, occurred_at FROM finance_access_log') || this.sql.startsWith('SELECT id, username, action, occurred_at FROM finance_access_log')) return { results: [...this.database.accessLog].reverse() };
    if (this.sql.startsWith('SELECT username FROM monthly_confirmations')) return { results: [] };
    if (this.sql.startsWith('SELECT trade_date, trade_time, ticker, ticker_name')) return { results: [...this.database.trades] };
    if (this.sql.startsWith('SELECT event_date, event_time, event_type') || this.sql.startsWith('SELECT occurred_on, contributor, flow_type') || this.sql.startsWith('SELECT snapshot_at, snapshot_date, holdings_value') || this.sql.startsWith('SELECT trade_id, memo_date, ticker, operation_type') || this.sql.startsWith('SELECT year_month, muxia_invest, cati_invest, end_total, sse300_pe') || this.sql.startsWith('SELECT year, executed_on, adjustments, reason')) return { results: [] };
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
assert.equal((await fetchWorker('/api/account-events', { headers: { Cookie: viewerCookie } })).status, 200, 'viewers can read account events');
assert.equal((await fetchWorker('/api/account-events', { method: 'POST', headers: { ...trusted, Cookie: viewerCookie }, body: '{}' })).status, 403, 'viewers cannot write account events');
const accountEventCreated = await fetchWorker('/api/account-events', { method: 'POST', headers: { ...trusted, Cookie: adminCookie }, body: JSON.stringify({ event_date: '2026-07-25', event_time: '09:30', event_type: 'dividend', ticker: '510300', ticker_name: '沪深300ETF', amount: 10, note: 'contract' }) });
assert.equal(accountEventCreated.status, 201, 'administrator can create an internal account event');
assert.equal((await fetchWorker('/api/account-events/1', { method: 'PATCH', headers: { ...trusted, Cookie: adminCookie }, body: JSON.stringify({ event_date: '2026-07-25', event_type: 'dividend_tax', ticker: '510300', amount: -1, note: 'tax' }) })).status, 200, 'administrator can update an internal account event');
assert.equal((await fetchWorker('/api/account-events/1', { method: 'DELETE', headers: { ...trusted, Cookie: adminCookie }, body: '{}' })).status, 200, 'administrator can soft-delete an internal account event');
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
    trade_time: '09:30',
    fee: 0.12,
    net_cash_amount: -425.12,
    position_category: 'broad-index',
    reason: 'contract',
  }),
});
assert.equal(created.status, 201, await created.clone().text());
assert.deepEqual((await created.clone().json()).trade.fee, 0.12, 'optional online trade fee is persisted');
assert.equal((await fetchWorker('/api/memos', {
  method: 'POST', headers: { ...trusted, Cookie: adminCookie }, body: JSON.stringify({ reason: 'linked investment decision' }),
})).status, 400, 'a memo must select a trade');
assert.equal((await fetchWorker('/api/memos', {
  method: 'POST', headers: { ...trusted, Cookie: adminCookie }, body: JSON.stringify({ trade_id: 999, reason: 'missing trade' }),
})).status, 404, 'a memo trade must exist and remain active');
const memoCreated = await fetchWorker('/api/memos', {
  method: 'POST', headers: { ...trusted, Cookie: adminCookie }, body: JSON.stringify({
    trade_id: 1,
    memo_date: '1999-01-01',
    ticker: 'CLIENT-SUPPLIED',
    position_category: 'client-category',
    operation_type: 'client-operation',
    reason: 'linked investment decision',
    stop_loss_triggered: true,
    note: 'memo note',
  }),
});
assert.equal(memoCreated.status, 201, await memoCreated.clone().text());
const memoSnapshot = (await memoCreated.json()).memo;
assert.deepEqual(
  { trade_id: memoSnapshot.trade_id, memo_date: memoSnapshot.memo_date, ticker: memoSnapshot.ticker, position_category: memoSnapshot.position_category, operation_type: memoSnapshot.operation_type },
  { trade_id: 1, memo_date: '2026-07-25', ticker: '510300', position_category: 'broad-index', operation_type: 'buy' },
  'memo trade fields must be copied from the active trade, not trusted from the client',
);
assert.equal((await fetchWorker('/api/memos/1', {
  method: 'PUT', headers: { ...trusted, Cookie: adminCookie }, body: JSON.stringify({
    trade_id: 1, reason: 'updated investment decision', stop_loss_triggered: false, note: 'updated memo note', ticker: 'untrusted',
  }),
})).status, 200, 'PUT memo updates retain a server-derived snapshot');
assert.equal((await fetchWorker('/api/memos', {
  method: 'POST', headers: { ...trusted, Cookie: adminCookie }, body: JSON.stringify({ trade_id: 1, reason: 'duplicate memo' }),
})).status, 409, 'one active trade must have at most one active memo');
assert.equal((await fetchWorker('/api/memos/1', {
  method: 'PATCH', headers: { ...trusted, Cookie: adminCookie }, body: JSON.stringify({ trade_id: 999, reason: 'reassign memo', stop_loss_triggered: false }),
})).status, 409, 'editing a memo must not reassign its linked trade');
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
const memosAfterTradeDelete = await fetchWorker('/api/memos', { headers: { Cookie: adminCookie } }).then((response) => response.json());
assert.equal(memosAfterTradeDelete.memos.length, 1, 'soft-deleting a trade must not delete its memo');
assert.deepEqual(
  { memo_date: memosAfterTradeDelete.memos[0].memo_date, ticker: memosAfterTradeDelete.memos[0].ticker, position_category: memosAfterTradeDelete.memos[0].position_category, operation_type: memosAfterTradeDelete.memos[0].operation_type },
  { memo_date: '2026-07-25', ticker: '510300', position_category: 'broad-index', operation_type: 'buy' },
  'memo snapshot must remain readable after the source trade is soft-deleted',
);
assert.equal((await fetchWorker('/api/memos', {
  method: 'POST', headers: { ...trusted, Cookie: adminCookie }, body: JSON.stringify({ trade_id: 1, reason: 'deleted trade cannot be linked' }),
})).status, 404, 'new memos cannot select a soft-deleted trade');
assert.equal((await fetchWorker('/api/memos/1', {
  method: 'DELETE', headers: { ...trusted, Cookie: adminCookie }, body: '{}',
})).status, 200, 'an administrator can soft-delete a memo');
assert.equal((await fetchWorker('/api/memos', { headers: { Cookie: adminCookie } }).then((response) => response.json())).memos.length, 0, 'soft-deleted memos must not be listed');
for (let id = 2; id <= 102; id += 1) {
  env.DB.trades.push({ id, trade_date: '2026-07-30', ticker: '510300', ticker_name: '沪深300ETF', direction: 'buy', quantity: 1, price: 4.2, position_category: 'broad-index', reason: null, deleted_at: null });
}
const firstTradePage = await fetchWorker('/api/trades?limit=50&ticker=510300&direction=buy', { headers: { Cookie: adminCookie } }).then((response) => response.json());
assert.equal(firstTradePage.items.length, 50);
assert.ok(firstTradePage.nextCursor, 'trade pagination must return a cursor after the first 50 rows');
const secondTradePage = await fetchWorker(`/api/trades?limit=50&ticker=510300&direction=buy&cursor=${encodeURIComponent(firstTradePage.nextCursor)}`, { headers: { Cookie: adminCookie } }).then((response) => response.json());
assert.equal(secondTradePage.items.length, 50);
assert.equal(new Set([...firstTradePage.items, ...secondTradePage.items].map((trade) => trade.id)).size, 100, 'trade cursor pages must not repeat rows');
assert.equal((await fetchWorker(`/api/trades?limit=50&ticker=510300&direction=sell&cursor=${encodeURIComponent(firstTradePage.nextCursor)}`, { headers: { Cookie: adminCookie } })).status, 400, 'trade cursor must be bound to its filters');
for (let id = 1; id <= 101; id += 1) env.DB.accessLog.push({ id: 10_000 + id, username: 'pagination-admin', action: 'view', occurred_at: `2026-07-30T12:00:${String(id % 60).padStart(2, '0')}.000Z` });
const firstAccessPage = await fetchWorker('/api/access-log?limit=50&start=2026-07-30&end=2026-07-30&username=pagination-admin&action=view', { headers: { Cookie: adminCookie } }).then((response) => response.json());
assert.equal(firstAccessPage.items.length, 50, 'date-only access end filters must include that day');
assert.ok(firstAccessPage.nextCursor, 'access pagination must return a cursor after the first 50 rows');
const secondAccessPage = await fetchWorker(`/api/access-log?limit=50&start=2026-07-30&end=2026-07-30&username=pagination-admin&action=view&cursor=${encodeURIComponent(firstAccessPage.nextCursor)}`, { headers: { Cookie: adminCookie } }).then((response) => response.json());
assert.equal(secondAccessPage.items.length, 50);
assert.equal(new Set([...firstAccessPage.items, ...secondAccessPage.items].map((row) => row.id)).size, 100, 'access cursor pages must not repeat rows');
assert.equal((await fetchWorker(`/api/access-log?limit=50&username=other&cursor=${encodeURIComponent(firstAccessPage.nextCursor)}`, { headers: { Cookie: adminCookie } })).status, 400, 'access cursor must be bound to its filters');
const archive = await fetchWorker('/api/archive?year=2026', { headers: { Cookie: adminCookie } });
assert.equal(archive.status, 200);
assert.match(archive.headers.get('content-type') ?? '', /spreadsheetml/);
const archiveBytes = new Uint8Array(await archive.arrayBuffer());
assert.deepEqual([...archiveBytes.subarray(0, 4)], [0x50, 0x4b, 0x03, 0x04]);
const archiveFiles = readStoredZip(archiveBytes);
for (const [name, columns] of [
  ['Trades', ['trade_time', 'fee', 'net_cash_amount']],
  ['Holding Snapshots', ['snapshot_date', 'avg_cost', 'position_category']],
  ['Account Events', ['event_type', 'reference_value', 'amount']],
  ['Cash Flows', ['flow_type', 'manager_share_offset', 'net_amount']],
  ['Asset Snapshots', ['total_value', 'is_complete', 'incomplete_reason']],
  ['Investment Memos', ['trade_id', 'reason_source', 'stop_loss_triggered']],
]) {
  const sheet = archiveSheet(archiveFiles, name);
  for (const column of columns) assert.match(sheet, new RegExp(`<t xml:space="preserve">${column}</t>`), `${name} must include ${column}`);
}
const sameDayFirst = await fetchWorker('/api/trades', { method: 'POST', headers: { ...trusted, Cookie: adminCookie }, body: JSON.stringify({ trade_date: '2026-08-01', ticker: '159999', direction: 'buy', quantity: 100, price: 1, position_category: 'other' }) });
const sameDaySecond = await fetchWorker('/api/trades', { method: 'POST', headers: { ...trusted, Cookie: adminCookie }, body: JSON.stringify({ trade_date: '2026-08-01', ticker: '159999', direction: 'buy', quantity: 100, price: 2, position_category: 'other' }) });
assert.equal(sameDayFirst.status, 201); assert.equal(sameDaySecond.status, 201, 'same-day same-ticker online trades are allowed');
assert.equal((await sameDaySecond.json()).holding.quantity, 200, 'same-day holdings snapshots accumulate both trades');
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

function readStoredZip(source) {
  const view = new DataView(source.buffer, source.byteOffset, source.byteLength);
  const end = findSignature(view, 0x06054b50);
  assert.ok(end >= 0, 'archive ZIP end record is missing');
  const files = new Map();
  let cursor = view.getUint32(end + 16, true);
  for (let index = 0; index < view.getUint16(end + 10, true); index += 1) {
    assert.equal(view.getUint32(cursor, true), 0x02014b50, 'archive ZIP central record is invalid');
    assert.equal(view.getUint16(cursor + 10, true), 0, 'archive ZIP must use stored entries');
    const size = view.getUint32(cursor + 24, true); const nameLength = view.getUint16(cursor + 28, true); const extraLength = view.getUint16(cursor + 30, true); const commentLength = view.getUint16(cursor + 32, true); const local = view.getUint32(cursor + 42, true);
    const name = new TextDecoder().decode(source.subarray(cursor + 46, cursor + 46 + nameLength));
    const localNameLength = view.getUint16(local + 26, true); const localExtraLength = view.getUint16(local + 28, true); const data = local + 30 + localNameLength + localExtraLength;
    files.set(name, source.subarray(data, data + size));
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  return files;
}

function archiveSheet(files, name) {
  const workbook = new TextDecoder().decode(files.get('xl/workbook.xml'));
  const match = new RegExp(`<sheet name="${name}" sheetId="\\d+" r:id="rId(\\d+)"/>`).exec(workbook);
  assert.ok(match, `archive must include ${name}`);
  const sheet = files.get(`xl/worksheets/sheet${match[1]}.xml`);
  assert.ok(sheet, `archive must include ${name} XML`);
  return new TextDecoder().decode(sheet);
}

function findSignature(view, signature) {
  for (let offset = view.byteLength - 22; offset >= 0; offset -= 1) if (view.getUint32(offset, true) === signature) return offset;
  return -1;
}
