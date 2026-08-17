import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { projectRepoAssets } from '../workers/finance-api/src/routes/account-state.ts';
import { normalizeAccountEvent } from '../workers/finance-api/src/routes/records.ts';
import { handleTrades, replayTradeDay, tradeDayFingerprint, tradeEditableAfterReconciliation } from '../workers/finance-api/src/routes/trades.ts';

const SESSION_TOKEN = '33333333-3333-4333-8333-333333333333';

class SqliteD1Statement {
  constructor(database, sql, values = []) { this.database = database; this.sql = sql; this.values = values; }
  bind(...values) { return new SqliteD1Statement(this.database, this.sql, values); }
  async first() { const row = this.database.prepare(this.sql).get(...this.values); return row ? { ...row } : null; }
  async all() { return { results: this.database.prepare(this.sql).all(...this.values).map((row) => ({ ...row })) }; }
  async run() {
    const result = this.database.prepare(this.sql).run(...this.values);
    return { success: true, meta: { changes: Number(result.changes), last_row_id: Number(result.lastInsertRowid ?? 0) } };
  }
}
class SqliteD1 {
  constructor(database) { this.database = database; }
  prepare(sql) { return new SqliteD1Statement(this.database, sql); }
  async batch(statements) {
    this.database.exec('BEGIN');
    try {
      const rows = [];
      for (const statement of statements) rows.push(await statement.run());
      this.database.exec('COMMIT');
      return rows;
    } catch (error) {
      this.database.exec('ROLLBACK');
      throw error;
    }
  }
}
class SessionKv {
  async get(key, type) {
    if (key !== `session:${SESSION_TOKEN}`) return null;
    const session = { username: 'muxia', role: 'admin', expires_at: '2099-01-01T00:00:00.000Z' };
    return type === 'json' ? session : JSON.stringify(session);
  }
  async put() {}
  async delete() {}
}

async function applyMigrations(database) {
  for (const file of (await readdir('workers/finance-api/migrations')).filter((name) => name.endsWith('.sql')).sort()) {
    database.exec(await readFile(path.join('workers/finance-api/migrations', file), 'utf8'));
  }
}

function tradeRequest(body) {
  return new Request('https://finance.test/api/trades', {
    method: 'POST',
    headers: { Cookie: `token=${SESSION_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
function tradeMutationRequest(id, method, body) {
  return new Request(`https://finance.test/api/trades/${id}`, {
    method,
    headers: { Cookie: `token=${SESSION_TOKEN}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

// Product invariant: a Trade owns at most one active Investment Memo. Historical
// deleted memos remain auditable and do not block a later replacement memo.
{
  const database = new DatabaseSync(':memory:');
  await applyMigrations(database);
  database.prepare(`INSERT INTO trades (
    trade_date, ticker, ticker_name, direction, quantity, price, position_category,
    needs_review, created_at, created_by
  ) VALUES ('2026-08-17', '510300', '沪深300ETF', 'buy', 100, 4.2, 'A股宽基指数底仓', 0, '2026-08-17T01:30:00.000Z', 'contract')`).run();
  database.prepare(`INSERT INTO finance_memos (trade_id, memo_date, reason, created_at, created_by)
    VALUES (1, '2026-08-17', 'first memo', '2026-08-17T02:00:00.000Z', 'contract')`).run();
  assert.throws(() => database.prepare(`INSERT INTO finance_memos (trade_id, memo_date, reason, created_at, created_by)
    VALUES (1, '2026-08-17', 'duplicate memo', '2026-08-17T02:01:00.000Z', 'contract')`).run(), /UNIQUE/);
  database.prepare(`UPDATE finance_memos SET deleted_at='2026-08-17T02:02:00.000Z', deleted_by='contract' WHERE id=1`).run();
  database.prepare(`INSERT INTO finance_memos (trade_id, memo_date, reason, created_at, created_by)
    VALUES (1, '2026-08-17', 'replacement memo', '2026-08-17T02:03:00.000Z', 'contract')`).run();
  assert.equal(database.prepare(`SELECT COUNT(*) AS count FROM finance_memos WHERE trade_id=1 AND deleted_at IS NULL`).get().count, 1);
  database.close();
}

// Same ticker + same day is first-class. Editing or deleting one trade must replay
// the whole mutable day from the immediately previous holding boundary.
{
  const previous = { quantity: 100, avg_cost: 10, snapshot_date: '2026-08-16', position_category: '主动操作仓（A股）' };
  const original = [
    { id: 1, trade_date: '2026-08-17', trade_time: '09:30', direction: 'sell', quantity: 50, price: 12, position_category: '主动操作仓（A股）' },
    { id: 2, trade_date: '2026-08-17', trade_time: '10:30', direction: 'buy', quantity: 50, price: 20, position_category: '主动操作仓（A股）' },
  ];
  const replayed = replayTradeDay(previous, original);
  assert.ok(replayed);
  assert.equal(replayed.quantity, 100);
  assert.equal(replayed.avg_cost, 15);

  const edited = replayTradeDay(previous, [{ ...original[0], quantity: 20 }, original[1]]);
  assert.ok(edited);
  assert.equal(edited.quantity, 130);
  assert.ok(Math.abs(edited.avg_cost - (1800 / 130)) < 1e-10);

  const afterDelete = replayTradeDay(previous, [original[1]]);
  assert.ok(afterDelete);
  assert.equal(afterDelete.quantity, 150);
  assert.ok(Math.abs(afterDelete.avg_cost - (2000 / 150)) < 1e-10);

  const missingTimeFallsBackToRecordedOrder = replayTradeDay(null, [
    { id: 1, trade_date: '2026-08-17', trade_time: null, direction: 'buy', quantity: 100, price: 10, position_category: '其他' },
    { id: 2, trade_date: '2026-08-17', trade_time: '09:00', direction: 'sell', quantity: 50, price: 12, position_category: '其他' },
  ]);
  assert.ok(missingTimeFallsBackToRecordedOrder, 'a missing trade time must not invent a chronological order that creates a negative holding');
  assert.deepEqual({ quantity: missingTimeFallsBackToRecordedOrder.quantity, avg_cost: missingTimeFallsBackToRecordedOrder.avg_cost }, { quantity: 50, avg_cost: 10 });
}

// Create, edit and delete must share one same-day replay contract. A later-recorded
// trade with an earlier explicit time is a same-day backfill, not a reason for
// derived holdings to depend on insertion order. The same endpoint exercise also
// executes the trade-day cohort CAS used by edit/delete replay writes.
{
  const database = new DatabaseSync(':memory:');
  await applyMigrations(database);
  database.prepare(`INSERT INTO holdings_snapshots (snapshot_date, ticker, quantity, avg_cost, position_category)
    VALUES ('2026-08-16', '510300', 100, 10, '主动操作仓（A股）')`).run();
  const env = { DB: new SqliteD1(database), FINANCE_AUTH_KV: new SessionKv() };
  const laterInput = {
    trade_date: '2026-08-17', trade_time: '10:30', ticker: '510300', ticker_name: '沪深300ETF',
    direction: 'buy', quantity: 50, price: 20, net_cash_amount: -1000, position_category: '主动操作仓（A股）',
  };
  const earlierInput = {
    trade_date: '2026-08-17', trade_time: '09:30', ticker: '510300', ticker_name: '沪深300ETF',
    direction: 'sell', quantity: 50, price: 12, net_cash_amount: 600, position_category: '主动操作仓（A股）',
  };

  const later = await handleTrades(tradeRequest(laterInput), env);
  assert.equal(later.status, 201);
  const laterId = Number((await later.json()).trade.id);
  const earlierBackfill = await handleTrades(tradeRequest(earlierInput), env);
  assert.equal(earlierBackfill.status, 201);
  const earlierId = Number((await earlierBackfill.json()).trade.id);

  let holding = { ...database.prepare(`SELECT quantity, avg_cost FROM holdings_snapshots
    WHERE ticker='510300' ORDER BY snapshot_date DESC, id DESC LIMIT 1`).get() };
  assert.equal(holding.quantity, 100);
  assert.equal(holding.avg_cost, 15, 'same facts must produce the chronological holding whether or not a later edit occurs');

  const edit = await handleTrades(tradeMutationRequest(laterId, 'PATCH', { ...laterInput, quantity: 40, net_cash_amount: -800 }), env);
  assert.equal(edit.status, 200);
  holding = { ...database.prepare(`SELECT quantity, avg_cost FROM holdings_snapshots WHERE ticker='510300' ORDER BY snapshot_date DESC, id DESC LIMIT 1`).get() };
  assert.equal(holding.quantity, 90);
  assert.ok(Math.abs(holding.avg_cost - (1300 / 90)) < 1e-10);

  const removeEarlier = await handleTrades(tradeMutationRequest(earlierId, 'DELETE'), env);
  assert.equal(removeEarlier.status, 200);
  holding = { ...database.prepare(`SELECT quantity, avg_cost FROM holdings_snapshots WHERE ticker='510300' ORDER BY snapshot_date DESC, id DESC LIMIT 1`).get() };
  assert.equal(holding.quantity, 140);
  assert.ok(Math.abs(holding.avg_cost - (1800 / 140)) < 1e-10);
  assert.equal(database.prepare(`SELECT COUNT(*) AS count FROM trades WHERE ticker='510300' AND trade_date='2026-08-17' AND deleted_at IS NULL`).get().count, 1);
  assert.equal(database.prepare(`SELECT COUNT(*) AS count FROM finance_trade_audit`).get().count, 4);

  const before = tradeDayFingerprint([
    { id: 1, created_at: '2026-08-17T01:00:00.000Z', updated_at: null },
    { id: 2, created_at: '2026-08-17T02:00:00.000Z', updated_at: null },
  ]);
  const siblingEdited = tradeDayFingerprint([
    { id: 1, created_at: '2026-08-17T01:00:00.000Z', updated_at: '2026-08-17T03:00:00.000Z' },
    { id: 2, created_at: '2026-08-17T02:00:00.000Z', updated_at: null },
  ]);
  assert.notDeepEqual(siblingEdited, before, 'a sibling edit must invalidate the trade-day cohort fingerprint used by replay writes');
  database.close();
}

// Reconciliation is the seal boundary for normal online corrections. Facts before
// the anchor, same-day facts without enough time precision, and the same minute are
// reviewed history; only facts known to be after the anchor stay mutable.
{
  const anchor = { snapshot_at: '2026-08-17T02:29:00.000Z', snapshot_date: '2026-08-17' }; // 10:29 Shanghai
  const trade = (id, trade_date, trade_time) => ({ id, trade_date, trade_time, direction: 'buy', net_cash_amount: -100 });
  assert.equal(tradeEditableAfterReconciliation(trade(1, '2026-08-16', '14:00'), anchor), false);
  assert.equal(tradeEditableAfterReconciliation(trade(2, '2026-08-17', '10:20'), anchor), false);
  assert.equal(tradeEditableAfterReconciliation(trade(3, '2026-08-17', '10:29'), anchor), false, 'same-minute facts stay ambiguous and locked');
  assert.equal(tradeEditableAfterReconciliation(trade(4, '2026-08-17', null), anchor), false, 'date-only same-day facts stay ambiguous and locked');
  assert.equal(tradeEditableAfterReconciliation(trade(5, '2026-08-17', '10:30'), anchor), true);
  assert.equal(tradeEditableAfterReconciliation(trade(6, '2026-08-18', null), anchor), true);
  assert.equal(tradeEditableAfterReconciliation(trade(7, '2026-08-01', null), null), true, 'without a reconciliation the latest online trade day remains correctable');
}

// Reverse repo has two independent facts: amount is Broker Cash movement;
// reference_value is carrying principal. Fees/interest must not enter Other Assets.
{
  const open = projectRepoAssets([
    { id: 1, event_date: '2026-07-29', event_time: '14:37', event_type: 'repo_start', repo_key: 'GC001', reference_value: 36_000, amount: -36_000.04 },
  ]);
  assert.deepEqual(open, { value: 36_000, known_value: 36_000, status: 'open_repo', open_repo_count: 1, problems: [] });

  const matured = projectRepoAssets([
    { id: 1, event_date: '2026-07-29', event_time: '14:37', event_type: 'repo_start', repo_key: 'GC001', reference_value: 36_000, amount: -36_000.04 },
    { id: 2, event_date: '2026-07-30', event_time: null, event_type: 'repo_maturity', repo_key: 'GC001', reference_value: 36_000, amount: 36_001.39 },
  ]);
  assert.deepEqual(matured, { value: 0, known_value: 0, status: 'clear', open_repo_count: 0, problems: [] });

  const legacyOpen = projectRepoAssets([
    { id: 3, event_date: '2026-07-29', event_time: '14:37', event_type: 'repo_start', repo_key: 'GC001', reference_value: -36_000.04, amount: -36_000.04 },
  ]);
  assert.equal(legacyOpen.value, null);
  assert.equal(legacyOpen.known_value, 0);
  assert.equal(legacyOpen.status, 'incomplete');
  assert.match(legacyOpen.problems.join(' '), /缺少明确本金/);

  const legacyClosed = projectRepoAssets([
    { id: 3, event_date: '2026-07-29', event_time: '14:37', event_type: 'repo_start', repo_key: 'GC001', reference_value: -36_000.04, amount: -36_000.04 },
    { id: 4, event_date: '2026-07-30', event_time: null, event_type: 'repo_maturity', repo_key: 'GC001', reference_value: 36_001.39, amount: 36_001.39 },
  ]);
  assert.deepEqual(legacyClosed, { value: 0, known_value: 0, status: 'clear', open_repo_count: 0, problems: [] }, 'closed legacy repo rows need no invented principal for current-state zero');

  const mismatchedPrincipal = projectRepoAssets([
    { id: 5, event_date: '2026-08-01', event_time: '14:30', event_type: 'repo_start', repo_key: 'GC001', reference_value: 8_000, amount: -8_000.01 },
    { id: 6, event_date: '2026-08-02', event_time: null, event_type: 'repo_maturity', repo_key: 'GC001', reference_value: 7_999, amount: 8_000.30 },
  ]);
  assert.equal(mismatchedPrincipal.value, null);
  assert.match(mismatchedPrincipal.problems.join(' '), /本金与发生记录不一致/);
}

// Future online Account Events must carry explicit positive repo principal and the
// actual cash movement with the correct sign. Other event types retain nullable reference_value.
{
  assert.equal(normalizeAccountEvent({ event_date: '2026-08-17', event_type: 'repo_start', amount: -36_000.04 }), null);
  assert.equal(normalizeAccountEvent({ event_date: '2026-08-17', event_type: 'repo_start', reference_value: 36_000, amount: 36_000.04 }), null);
  assert.equal(normalizeAccountEvent({ event_date: '2026-08-18', event_type: 'repo_maturity', reference_value: 36_000, amount: -36_001.39 }), null);
  assert.deepEqual(
    normalizeAccountEvent({ event_date: '2026-08-17', event_type: 'repo_start', ticker: 'GC001', reference_value: 36_000, amount: -36_000.04 }),
    { event_date: '2026-08-17', event_time: null, event_type: 'repo_start', ticker: 'GC001', ticker_name: null, quantity: null, reference_value: 36_000, amount: -36_000.04, position_category: null, note: null },
  );
  assert.ok(normalizeAccountEvent({ event_date: '2026-08-17', event_type: 'dividend', ticker: '510300', amount: 10 }));
}

console.log('Finance final acceptance invariants passed.');
