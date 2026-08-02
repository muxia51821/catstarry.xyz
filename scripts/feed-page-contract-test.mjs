import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { loadPublicTimeline, previewCandidateUrl } from '../src/lib/feed-api.ts';

const [page, app] = await Promise.all([
  readFile('src/pages/feed/index.astro', 'utf8'),
  readFile('src/components/feed/FeedApp.tsx', 'utf8'),
]);

assert.doesNotMatch(page, /loadPublicTimeline|Astro\.url\.origin/, 'Feed page must not fetch the timeline during SSR');
assert.match(page, /<FeedApp client:load apiBase=\{publicFeedApiBase\(\)\} \/>/, 'Feed page must hydrate without an SSR timeline payload');
assert.match(app, /useEffect\(\(\) => \{[\s\S]*loadPublicTimeline\(apiBase\)/, 'FeedApp must load the first timeline page in the browser');
assert.match(app, /const candidate = previewCandidateUrl\(linkUrl\);[\s\S]*if \(!candidate\) return;/, 'Clip preview must ignore invalid URL candidates');

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
} finally {
  globalThis.fetch = originalFetch;
}

for (const value of ['', 'example.com', 'https://', 'javascript:alert(1)', 'https://user:pass@example.com/']) {
  assert.equal(previewCandidateUrl(value), null, `Invalid preview candidate must be ignored: ${value}`);
}
assert.equal(previewCandidateUrl(' https://example.com/article '), 'https://example.com/article');

console.log('Feed page contract passed.');
