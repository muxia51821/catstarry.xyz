import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';

async function applyTwice(directory) {
  const database = new DatabaseSync(':memory:');
  const files = (await readdir(directory)).filter((file) => file.endsWith('.sql')).sort();
  assert.ok(files.length > 0, `${directory} must contain migrations`);
  for (let pass = 0; pass < 2; pass += 1) {
    for (const file of files) database.exec(await readFile(path.join(directory, file), 'utf8'));
  }
  return database;
}

const feed = await applyTwice('workers/feed-api/migrations');
const feedTables = feed.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all().map(({ name }) => name);
for (const table of ['auth_sessions', 'blog_view_visitors', 'blog_views', 'feed_posts', 'learn_publications', 'public_footprints']) {
  assert.ok(feedTables.includes(table), `Feed migration must create ${table}`);
}
assert.ok(feed.prepare("SELECT 1 FROM sqlite_master WHERE type = 'index' AND name = 'idx_blog_view_visitors_created'").get());
for (const eventType of [
  'blog_published',
  'learn_section_completed',
  'learn_note_published',
  'learn_note_revised',
  'project_updated',
]) {
  feed.prepare(`INSERT INTO public_footprints (
    id, source_module, source_ref, source_version, event_type, snapshot_json,
    occurred_at, visibility, idempotency_key, created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(
      `id-${eventType}`,
      eventType.startsWith('learn_') ? 'learn' : eventType === 'blog_published' ? 'blog' : 'projects',
      `ref-${eventType}`,
      'v1',
      eventType,
      JSON.stringify({ title: eventType, link: eventType.startsWith('learn_') ? '/learn/notes/test/' : eventType === 'blog_published' ? '/blog/test/' : '/projects/test/' }),
      '2026-08-12T00:00:00.000Z',
      eventType === 'learn_section_completed' ? 'private' : 'public',
      `key-${eventType}`,
      '2026-08-12T00:00:01.000Z',
    );
}
assert.equal(feed.prepare('SELECT COUNT(*) AS count FROM public_footprints').get().count, 5);
assert.equal(
  feed.prepare('SELECT visibility FROM public_footprints WHERE event_type = ?').get('learn_section_completed').visibility,
  'private',
  'migration must preserve legacy visibility semantics',
);
assert.ok(feed.prepare("SELECT 1 FROM sqlite_master WHERE type = 'index' AND name = 'idx_public_footprints_public'").get());
assert.ok(feed.prepare("SELECT 1 FROM sqlite_master WHERE type = 'index' AND name = 'idx_public_footprints_source'").get());
feed.prepare(`INSERT INTO learn_publications (
  slug, visibility, published_at, last_revised_at, updated_at
) VALUES (?, 'public', ?, NULL, ?)`).run(
  'runtime-publication',
  '2026-08-12T00:00:00.000Z',
  '2026-08-12T00:00:00.000Z',
);
feed.prepare("UPDATE learn_publications SET visibility = 'hidden', updated_at = ? WHERE slug = ?")
  .run('2026-08-12T01:00:00.000Z', 'runtime-publication');
const hiddenPublication = feed.prepare('SELECT visibility, published_at FROM learn_publications WHERE slug = ?').get('runtime-publication');
assert.equal(hiddenPublication.visibility, 'hidden');
assert.equal(hiddenPublication.published_at, '2026-08-12T00:00:00.000Z', 'Hide must preserve first published_at');
feed.prepare(`INSERT INTO blog_view_visitors (slug, view_date, visitor_hash, created_at)
  VALUES (?, ?, ?, ?), (?, ?, ?, ?)`)
  .run(
    'trigger-contract', '2026-07-26', 'visitor-a', '2026-07-26T00:00:00.000Z',
    'trigger-contract', '2026-07-26', 'visitor-b', '2026-07-26T00:00:01.000Z',
  );
feed.prepare(`INSERT OR IGNORE INTO blog_view_visitors (slug, view_date, visitor_hash, created_at)
  VALUES (?, ?, ?, ?)`).run('trigger-contract', '2026-07-26', 'visitor-a', '2026-07-26T00:00:02.000Z');
assert.equal(
  feed.prepare('SELECT count FROM blog_views WHERE slug = ? AND view_date = ?')
    .get('trigger-contract', '2026-07-26').count,
  2,
  'visitor dedupe and view increment must commit through one trigger transaction',
);
assert.match(
  feed.prepare(`EXPLAIN QUERY PLAN SELECT * FROM feed_posts
    WHERE visibility = ? ORDER BY created_at DESC, id DESC LIMIT 21`)
    .all('public').map(({ detail }) => detail).join(' '),
  /idx_feed_posts_public_timeline/,
);
feed.close();

const finance = await applyTwice('workers/finance-api/migrations');
const financeTables = finance.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all().map(({ name }) => name);
for (const table of [
  'annual_reviews',
  'circuit_breaker_log',
  'finance_access_log',
  'finance_asset_snapshots',
  'finance_cash_flows',
  'finance_import_batches',
  'finance_import_review',
  'finance_index_valuation_history',
  'holdings_snapshots',
  'market_data',
  'finance_market_indexes',
  'monthly_confirmations',
  'position_limits',
  'trades',
]) {
  assert.ok(financeTables.includes(table), `Finance migration must create ${table}`);
}
assert.deepEqual(
  finance.prepare('SELECT position_category FROM position_limits ORDER BY position_category').all().map(({ position_category }) => position_category),
  [
    'A股宽基指数底仓',
    'A股总敞口（主动+宽基）',
    '主动操作仓（A股）',
    '机动仓（货币ETF）',
    '美股ETF（A股跨境ETF）',
    '黄金ETF',
  ],
);
const reviewColumns = finance.prepare('PRAGMA table_info(finance_import_review)').all().map(({ name }) => name);
assert.ok(reviewColumns.includes('resolution_note'));
assert.ok(reviewColumns.includes('resolved_at'));
for (const table of ['finance_cash_flows', 'finance_asset_snapshots', 'finance_market_indexes']) {
  assert.ok(financeTables.includes(table), `Finance migration must create ${table}`);
}
assert.match(
  finance.prepare(`EXPLAIN QUERY PLAN SELECT * FROM holdings_snapshots
    WHERE ticker = ? ORDER BY snapshot_date DESC, id DESC LIMIT 1`)
    .all('510300').map(({ detail }) => detail).join(' '),
  /idx_finance_holdings_latest/,
);
assert.match(
  finance.prepare(`EXPLAIN QUERY PLAN SELECT * FROM market_data
    WHERE ticker = ? ORDER BY fetched_at DESC, id DESC LIMIT 1`)
    .all('510300').map(({ detail }) => detail).join(' '),
  /sqlite_autoindex_market_data_1/,
);
finance.prepare(`INSERT INTO finance_index_valuation_history
  (symbol, observation_date, pe_ttm, source, imported_at, imported_by) VALUES (?, ?, ?, ?, ?, ?)`)
  .run('CSI300_PE', '2026-08-14', 12.5, 'CSI', '2026-08-14T16:00:00.000Z', 'migration-contract');
assert.throws(() => finance.prepare(`INSERT INTO finance_index_valuation_history
  (symbol, observation_date, pe_ttm, source, imported_at, imported_by) VALUES (?, ?, ?, ?, ?, ?)`)
  .run('NASDAQ100_PE', '2026-08-14', 12.5, 'CSI', '2026-08-14T16:00:00.000Z', 'migration-contract'), /CHECK constraint failed/);
assert.match(
  finance.prepare('EXPLAIN QUERY PLAN SELECT * FROM trades ORDER BY trade_date DESC, id DESC LIMIT 100')
    .all().map(({ detail }) => detail).join(' '),
  /idx_finance_trades_date/,
);
finance.prepare(`INSERT INTO finance_memos (memo_date, reason, reason_source, created_at, created_by)
  VALUES (?, ?, ?, ?, ?)`)
  .run('2026-08-16', 'Original historical reason', 'original', '2026-08-16T00:00:00.000Z', 'migration-contract');
finance.prepare(`INSERT INTO finance_memos (memo_date, reason, reason_source, created_at, created_by)
  VALUES (?, ?, ?, ?, ?)`)
  .run('2026-08-16', 'Reconstructed historical reason', 'reconstructed_confirmed', '2026-08-16T00:00:00.000Z', 'migration-contract');
assert.throws(() => finance.prepare(`INSERT INTO finance_memos (memo_date, reason, reason_source, created_at, created_by)
  VALUES (?, ?, ?, ?, ?)`)
  .run('2026-08-16', 'Unsupported reason source', 'inferred', '2026-08-16T00:00:00.000Z', 'migration-contract'), /CHECK constraint failed/);
finance.close();

console.log('D1 migration repeat-run contract passed.');
