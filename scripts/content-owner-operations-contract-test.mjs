import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { parseInitialHomeStage, STAR_MAP_DESTINATION } from '../src/lib/home-navigation.ts';
import { fetchViaFeedBinding } from '../src/lib/server/feed-api-transport.ts';

assert.equal(STAR_MAP_DESTINATION, '/?stage=overview');
assert.equal(parseInitialHomeStage('?stage=overview'), 'overview');
assert.equal(parseInitialHomeStage(''), null);
assert.equal(parseInitialHomeStage('?stage=entry'), null);
assert.equal(parseInitialHomeStage('?stage=unknown&x=1'), null);

const forwarded = [];
const binding = {
  async fetch(request) {
    forwarded.push(request);
    return Response.json({ ok: true });
  },
};
const incoming = new Request('https://catstarry.xyz/feed/admin/', {
  headers: { Cookie: 'token=owner-session', Accept: 'text/html' },
});
const response = await fetchViaFeedBinding(binding, incoming, '/api/auth/session');
assert.equal(response.status, 200);
assert.equal(forwarded.length, 1);
assert.equal(new URL(forwarded[0].url).pathname, '/api/auth/session');
assert.equal(forwarded[0].headers.get('cookie'), 'token=owner-session');

const sources = await Promise.all([
  'src/pages/feed/admin.astro',
  'src/pages/learn/admin.astro',
  'src/pages/learn/preview/[slug].astro',
  'src/pages/blog/preview/[slug].astro',
].map((file) => readFile(file, 'utf8')));
for (const source of sources) {
  assert.match(source, /readOwnerSession\(Astro\.request\)/);
  assert.doesNotMatch(source, /fetch\(`\$\{apiBase\}\/api\/auth\/session/);
}
const lifecycleProxy = await readFile('src/pages/blog/admin/lifecycle.ts', 'utf8');
assert.match(lifecycleProxy, /fetchOwnerApi\(request, '\/api\/blog\/admin\/publications'\)/);
const blogPreview = sources.at(-1);
assert.match(blogPreview, /noindex,nofollow,noarchive/);
assert.match(blogPreview, /getCollection\('blog'\)/);
assert.doesNotMatch(blogPreview, /filterPublishedBlogPosts|ViewTracker|ViewCounter|ArticleFooter/);

const blogSchema = await readFile('src/content.config.ts', 'utf8');
assert.match(blogSchema, /state: z\.enum\(\['draft', 'published', 'withdrawn'\]\),/);
const blogManifestReader = await readFile('scripts/lib/blog-publications.mjs', 'utf8');
assert.match(blogManifestReader, /must declare lifecycle state/);
assert.doesNotMatch(blogManifestReader, /state \?\?.*published/);

const feedAdminPage = sources[0];
assert.match(feedAdminPage, /feedInitialError/);
assert.match(feedAdminPage, /blogInitialError/);
assert.match(feedAdminPage, /<BlogLifecycleAdmin[^>]+initialError=\{blogInitialError\}/);
assert.match(feedAdminPage, /href="\/learn\/admin\/"/);
assert.match(sources[1], /href="\/feed\/admin\/"/);
assert.match(sources[1], /mutationEnabled=\{!localPreview\}/);
assert.match(sources[2], /learn\/admin/);
assert.match(blogPreview, /返回 Feed \/ Blog 管理/);

const homeRuntime = await readFile('src/components/home/home-runtime.ts', 'utf8');
assert.match(homeRuntime, /parseInitialHomeStage\(location\.search\)/);
assert.match(homeRuntime, /behavior: "auto"/);
assert.match(homeRuntime, /document\.getElementById\("discover"\)\.onclick = \(\) => jump\("overview"\)/);

const navSources = await Promise.all([
  'src/components/blog/BlogArchive.astro',
  'src/pages/feed/index.astro',
  'src/pages/learn/index.astro',
  'src/pages/projects/index.astro',
].map((file) => readFile(file, 'utf8')));
for (const source of navSources) assert.match(source, /STAR_MAP_DESTINATION/);

const blogRoute = await readFile('workers/feed-api/src/routes/blog.ts', 'utf8');
assert.match(blogRoute, /Only a published Blog entry can be withdrawn/);
assert.match(blogRoute, /ever_published/);
assert.match(blogRoute, /writeBlogLifecycle\(env, entries\)/);
assert.doesNotMatch(blogRoute, /updateFootprintVisibility/);

const feedRoute = await readFile('workers/feed-api/src/routes/feed.ts', 'utf8');
assert.match(feedRoute, /entry\.visibility === 'private'.*projection_state: 'own_private'/s);
assert.match(feedRoute, /source_module === 'blog'.*projection_state: 'source_hidden'/s);
assert.match(feedRoute, /source_module === 'learn'.*source_hidden/s);
assert.doesNotMatch(feedRoute, /source_module === 'projects'.*source_hidden/s);
const learnRoute = await readFile('workers/feed-api/src/routes/learn.ts', 'utf8');
assert.match(learnRoute, /LOCAL_PREVIEW_AUTH === '1'.*local_preview_read_only/s);

const activityStore = await readFile('workers/feed-api/src/adapters/activity-signal-store.ts', 'utf8');
assert.match(activityStore, /source_module != 'blog'/);
assert.match(activityStore, /source_module != 'learn'/);
assert.doesNotMatch(activityStore, /source_module != 'projects'/);

const projectSignal = await readFile('scripts/lib/public-footprint.mjs', 'utf8');
assert.match(projectSignal, /EXPLICIT_FOOTPRINT_CONFIRMATION/);

console.log('Content owner operations contracts passed.');
