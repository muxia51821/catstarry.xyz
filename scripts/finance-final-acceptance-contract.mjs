import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { projectRepoAssets } from '../workers/finance-api/src/routes/account-state.ts';
import { normalizeAccountEvent } from '../workers/finance-api/src/routes/records.ts';
import { replayTradeDay } from '../workers/finance-api/src/routes/trades.ts';

// Product invariant: a Trade owns at most one active Investment Memo. Historical
// deleted memos remain auditable and do not block a later replacement memo.
{
  const database = new DatabaseSync(':memory:');
  for (const file of (await readdir('workers/finance-api/migrations')).filter((name) => name.endsWith('.sql')).sort()) {
    database.exec(await readFile(path.join('workers/finance-api/migrations', file), 'utf8'));
  }
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
