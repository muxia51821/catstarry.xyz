import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { groupTimelineByShanghai } from '../src/lib/feed-chronology.ts';
import { loadPublicTimeline, previewCandidateUrl } from '../src/lib/feed-api.ts';

const [page, app, admin] = await Promise.all([
  readFile('src/pages/feed/index.astro', 'utf8'),
  readFile('src/components/feed/FeedApp.tsx', 'utf8'),
  readFile('src/components/feed/FeedAdmin.tsx', 'utf8'),
]);

assert.doesNotMatch(page, /loadPublicTimeline|Astro\.url\.origin/, 'Feed page must not fetch the timeline during SSR');
assert.match(page, /<FeedApp client:load apiBase=\{publicFeedApiBase\(\)\} \/>/, 'Feed page must hydrate without an SSR timeline payload');
assert.match(page, /<a class="page-home-link feed-home-link" href="\/" aria-label="返回星图">[\s\S]*返回星图[\s\S]*<\/a>/, 'Feed page must provide a return-to-star-map link');
assert.match(page, /碎碎念、剪藏，以及一路积累下来的创作足迹。/, 'Feed opening copy must match the closed product contract');
assert.doesNotMatch(page, /PUBLIC FOOTPRINTS/, 'Feed opening must not expose product jargon');
assert.match(await readFile('src/lib/feed-chronology.ts', 'utf8'), /timeZone: 'Asia\/Shanghai'/, 'Feed chronology must use Asia/Shanghai');
assert.match(app, /更早的内容/);
assert.match(app, /止步于此。/);
assert.match(app, /访问来源 ↗/);
assert.match(app, /BLOG · 发布/);
assert.match(app, /LEARN · 更新/);
assert.match(app, /PROJECT · 更新/);
assert.match(app, /post\.type === 'clip' \? 'CLIP' : 'NOTE'/, 'Native Activities must expose NOTE and CLIP identities');
assert.match(app, /<div className="feed-activity-meta">[\s\S]*feed-activity-identity[\s\S]*feed-activity-time[\s\S]*<\/div>/, 'identity and time must share the Activity meta row');
assert.match(app, /blog_published: '阅读文章 →'/);
assert.match(app, /learn_note_published: '查看内容 →'/);
assert.match(app, /project_updated: '查看项目 →'/);
assert.match(admin, /source_hidden[\s\S]*随来源隐藏/, 'Manage must distinguish source-hidden Blog footprints');
assert.match(app, /try \{ duration = await videoDuration\(videoFiles\[0\]\); \}[\s\S]*catch \{ setMessage\('无法读取视频信息，请选择其他视频。'\); return; \}/, 'video metadata failures must become visible authoring errors');
assert.match(app, /!Number\.isFinite\(duration\)/, 'non-finite video duration must be rejected');
assert.doesNotMatch(app, /items: \[entry, \.\.\.current\.items\]/, 'publish must not optimistically prepend an activity');
assert.match(app, /window\.location\.reload\(\)/, 'publish success must return to the canonical Feed state');
assert.match(app, /const candidate = previewCandidateUrl\(linkUrl\);[\s\S]*if \(!candidate\) return;/, 'Clip preview must ignore invalid URL candidates');

const grouped = groupTimelineByShanghai([
  { id: 'one', kind: 'native_post', occurred_at: '2026-08-11T16:30:00.000Z', visibility: 'public', payload: {} },
  { id: 'two', kind: 'native_post', occurred_at: '2026-08-11T02:20:00.000Z', visibility: 'public', payload: {} },
  { id: 'three', kind: 'native_post', occurred_at: '2025-12-31T16:01:00.000Z', visibility: 'public', payload: {} },
]);
assert.deepEqual(grouped.map((year) => ({
  year: year.year,
  days: year.days.map((day) => ({ date: day.date, times: day.activities.map(({ time }) => time) })),
})), [
  { year: '2026', days: [{ date: '08.12', times: ['00:30'] }, { date: '08.11', times: ['10:20'] }, { date: '01.01', times: ['00:01'] }] },
], 'accumulated entries must merge into Shanghai year/day groups');

const originalFetch = globalThis.fetch;
let request;
globalThis.fetch = async (input, init) => {
  request = { url: String(input), init };
  return new Response(JSON.stringify({ items: [], cursor: null, has_more: false }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
try {
  assert.deepEqual(await loadPublicTimeline(''), { items: [], cursor: null, has_more: false });
  assert.equal(request.url, '/api/feed?limit=20');
  assert.equal(request.init.credentials, 'include');
  await loadPublicTimeline('', 'cursor-value');
  assert.equal(request.url, '/api/feed?limit=20&cursor=cursor-value');
} finally {
  globalThis.fetch = originalFetch;
}

for (const value of ['', 'example.com', 'https://', 'javascript:alert(1)', 'https://user:pass@example.com/']) {
  assert.equal(previewCandidateUrl(value), null, `Invalid preview candidate must be ignored: ${value}`);
}
assert.equal(previewCandidateUrl(' https://example.com/article '), 'https://example.com/article');

console.log('Feed page contract passed.');
