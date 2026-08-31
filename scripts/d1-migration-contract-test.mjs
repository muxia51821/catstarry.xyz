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

console.log('D1 migration repeat-run contract passed.');
