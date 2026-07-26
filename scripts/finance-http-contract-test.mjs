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
      const [trade_date, ticker, ticker_name, direction, quantity, price, position_category, reason] = this.values;
      const trade = { id: this.database.trades.length + 1, trade_date, ticker, ticker_name, direction, quantity, price, position_category, reason, needs_review: 0 };
      this.database.trades.push(trade);
      return { meta: { changes: 1, last_row_id: trade.id } };
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
    if (this.sql.includes('FROM holdings_snapshots') && this.sql.includes('WHERE ticker = ?')) return this.database.holdings.get(this.values[0]) ?? null;
    if (this.sql.includes('FROM circuit_breaker_log')) return null;
    if (this.sql.includes('FROM monthly_confirmations')) return null;
    throw new Error(`Unhandled D1 first: ${this.sql}`);
  }
  async all() {
    if (this.sql.startsWith('SELECT * FROM trades')) return { results: [...this.database.trades].reverse() };
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
assert.equal((await fetchWorker('/api/circuit/999999999999999999999/resolve', {
  method: 'PATCH',
  headers: { ...trusted, Cookie: adminCookie },
  body: '{}',
})).status, 400);
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

console.log('Finance HTTP contract passed.');
