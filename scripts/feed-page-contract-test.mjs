import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { groupTimelineByShanghai } from '../src/lib/feed-chronology.ts';
import { loadPublicTimeline, previewCandidateUrl } from '../src/lib/feed-api.ts';
import {
  applyClipCapture,
  createClipDraft,
  editClipField,
  invalidateMachineFieldsForUrlChange,
} from '../src/lib/feed-clip-draft.ts';

const [page, app, admin] = await Promise.all([
  readFile('src/pages/feed/index.astro', 'utf8'),
  readFile('src/components/feed/FeedApp.tsx', 'utf8'),
  readFile('src/components/feed/FeedAdmin.tsx', 'utf8'),
]);

assert.doesNotMatch(page, /loadPublicTimeline|Astro\.url\.origin/, 'Feed page must not fetch the timeline during SSR');
assert.match(page, /<FeedApp client:load apiBase=\{publicFeedApiBase\(\)\} \/>/, 'Feed page must hydrate without an SSR timeline payload');
assert.match(page, /href=\{STAR_MAP_DESTINATION\}[^>]+aria-label="返回星图"/, 'Feed page must provide the canonical return-to-star-map link');
assert.match(page, /碎碎念、剪藏，以及一路积累下来的创作足迹。/, 'Feed opening copy must match the closed product contract');
assert.doesNotMatch(page, /PUBLIC FOOTPRINTS/, 'Feed opening must not expose product jargon');
assert.match(await readFile('shared/shanghai-time.ts', 'utf8'), /timeZone: 'Asia\/Shanghai'/, 'Feed chronology must use Asia/Shanghai');
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
assert.match(app, /response\.status === 401\) onAuthExpired\(\)/, 'authoring 401 responses must clear misleading owner controls');
assert.doesNotMatch(app, /items: \[entry, \.\.\.current\.items\]/, 'publish must not optimistically prepend an activity');
assert.match(app, /window\.location\.reload\(\)/, 'publish success must return to the canonical Feed state');
assert.match(app, /const candidate = previewCandidateUrl\(linkUrl\);[\s\S]*if \(!candidate\) return;/, 'Clip preview must ignore invalid URL candidates');

const grouped = groupTimelineByShanghai([
  { id: 'one', kind: 'native_post', occurred_at: '2026-08-11T16:30:00.000Z', visibility: 'public', payload: {} },
  { id: 'two', kind: 'native_post', occurred_at: '2026-08-11T02:20:00.000Z', visibility: 'public', payload: {} },
  { id: 'three', kind: 'native_post', occurred_at: '2025-12-31T16:01:00.000Z', visibility: 'public', payload: {} },
  { id: 'four', kind: 'native_post', occurred_at: '2025-12-30T15:59:00.000Z', visibility: 'public', payload: {} },
]);
assert.deepEqual(grouped.map((year) => ({
  year: year.year,
  days: year.days.map((day) => ({ date: day.date, times: day.activities.map(({ time }) => time) })),
})), [
  { year: '2026', days: [{ date: '08.12', times: ['00:30'] }, { date: '08.11', times: ['10:20'] }, { date: '01.01', times: ['00:01'] }] },
  { year: '2025', days: [{ date: '12.30', times: ['23:59'] }] },
], 'accumulated entries must preserve ordered Shanghai year/day groups across year boundaries');

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
  await loadPublicTimeline('https://example.test/');
  assert.equal(request.url, 'https://example.test/api/feed?limit=20');
  await loadPublicTimeline('', 'cursor-value');
  assert.equal(request.url, '/api/feed?limit=20&cursor=cursor-value');
} finally {
  globalThis.fetch = originalFetch;
}

for (const value of ['', 'example.com', 'https://', 'javascript:alert(1)', 'https://user:pass@example.com/']) {
  assert.equal(previewCandidateUrl(value), null, `Invalid preview candidate must be ignored: ${value}`);
}
assert.equal(previewCandidateUrl(' https://example.com/article '), 'https://example.com/article');

const firstCapture = {
  status: 'article', link_title: 'Machine title', link_summary: 'Machine summary', link_image: 'https://example.com/one.jpg',
};
const machineDraft = applyClipCapture(createClipDraft(), firstCapture);
assert.deepEqual(machineDraft.values, {
  title: 'Machine title', summary: 'Machine summary', image: 'https://example.com/one.jpg',
});
assert.deepEqual(machineDraft.sources, { title: 'machine', summary: 'machine', image: 'machine' });

const invalidatedMachineDraft = invalidateMachineFieldsForUrlChange(machineDraft);
assert.deepEqual(invalidatedMachineDraft.values, {
  title: '', summary: '', image: '',
}, 'URL change must clear every machine-derived field');
assert.deepEqual(invalidatedMachineDraft.sources, machineDraft.sources, 'URL change must preserve machine provenance');

const ownerSummaryDraft = editClipField(machineDraft, 'summary', 'Owner summary');
const invalidatedOwnerSummaryDraft = invalidateMachineFieldsForUrlChange(ownerSummaryDraft);
assert.deepEqual(invalidatedOwnerSummaryDraft.values, {
  title: '', summary: 'Owner summary', image: '',
}, 'URL change must preserve owner-edited fields while clearing machine evidence');
assert.deepEqual(invalidatedOwnerSummaryDraft.sources, ownerSummaryDraft.sources, 'URL change must not reset owner provenance');

const failedAfterUrlChange = applyClipCapture(invalidatedMachineDraft, {
  status: 'failed', link_title: null, link_summary: null, link_image: null,
});
assert.deepEqual(failedAfterUrlChange.values, {
  title: '', summary: '', image: '',
}, 'failed recapture must not restore machine evidence from the previous URL');

const ownerDraft = editClipField(
  editClipField(editClipField(machineDraft, 'title', 'Owner title'), 'summary', 'Owner summary'),
  'image',
  'https://owner.example/cover.jpg',
);
const recapturedOwnerDraft = applyClipCapture(ownerDraft, {
  status: 'article', link_title: 'Replacement title', link_summary: 'Replacement summary', link_image: 'https://example.com/two.jpg',
});
assert.deepEqual(recapturedOwnerDraft.values, ownerDraft.values, 'capture retry must not overwrite owner-edited fields');

const recapturedMachineDraft = applyClipCapture(machineDraft, {
  status: 'article', link_title: 'New URL title', link_summary: 'New URL summary', link_image: 'https://example.com/new.jpg',
});
assert.deepEqual(recapturedMachineDraft.values, {
  title: 'New URL title', summary: 'New URL summary', image: 'https://example.com/new.jpg',
}, 'URL change may replace machine-populated fields');

const failedDraft = applyClipCapture(ownerDraft, {
  status: 'failed', link_title: null, link_summary: null, link_image: null,
});
assert.deepEqual(failedDraft, ownerDraft, 'capture failure must preserve the complete field draft');

const metadataDraft = applyClipCapture(createClipDraft(), {
  status: 'metadata', link_title: 'Metadata title', link_summary: null, link_image: null,
  metadata_description: 'This is evidence, not a summary.',
});
assert.equal(metadataDraft.values.summary, '', 'metadata description must not populate the summary field');

assert.match(app, /onChange=\{\(event\) => \{[\s\S]*previewVersion\.current \+= 1;[\s\S]*invalidateMachineFieldsForUrlChange[\s\S]*setMessage\(''\)[\s\S]*setLinkUrl\(event\.target\.value\)/, 'URL change must invalidate machine evidence and stale capture messaging');
assert.match(app, /const data = await response\.json\(\) as ClipPreview;\s*if \(version !== previewVersion\.current\) return;\s*setClipDraft/, 'late capture responses from a previous URL must be rejected immediately before mutating the draft');
assert.match(app, /已获取基本信息，正文未能可靠读取/);
assert.match(app, /无法自动读取该页面，可继续手动填写/);
assert.match(app, /已读取文章并生成摘要/);
assert.match(app, /自动生成，可编辑/);

console.log('Feed page contract passed.');
