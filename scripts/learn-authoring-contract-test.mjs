import assert from 'node:assert/strict';

import { lessonHtmlToMarkdown, slugifyTitle } from './lib/learn-authoring.mjs';
import { serializeJsonForInlineScript } from '../src/lib/safe-json.mjs';
import {
  getActiveTracks,
  getPublishedNotes,
  getTreeRows,
} from '../src/components/learn/learn-data.ts';

assert.equal(slugifyTitle('TypeScript 类型体操', 'TypeScript type gymnastics'), 'typescript-type-gymnastics');
assert.match(slugifyTitle('纯中文标题'), /^note-[a-f0-9]{10}$/);
const converted = lessonHtmlToMarkdown(`
  <article>
    <h1>Lesson</h1>
    <p>Read <a href="https://example.com/">the source</a>.</p>
    <pre><code class="language-js">const value = 1 &lt; 2;</code></pre>
    <div data-interactive="quiz">runtime widget</div>
  </article>
`);
assert.match(converted.markdown, /# Lesson/);
assert.match(converted.markdown, /\[the source\]\(https:\/\/example.com\/\)/);
assert.match(converted.markdown, /```js\nconst value = 1 < 2;\n```/);
assert.match(converted.markdown, /<!-- INTERACTIVE: quiz -->/);
assert.equal(converted.interactiveCount, 1);
const inlineJson = serializeJsonForInlineScript({
  title: '</script><script>globalThis.compromised=true</script>',
  separator: '\u2028',
});
assert.doesNotMatch(inlineJson, /<\/script>/i);
assert.match(inlineJson, /\\u003c\/script>/);
assert.deepEqual(JSON.parse(inlineJson), {
  title: '</script><script>globalThis.compromised=true</script>',
  separator: '\u2028',
});
assert.deepEqual(getPublishedNotes([]), []);
assert.deepEqual(getActiveTracks([]), []);
assert.deepEqual(getTreeRows([]), []);
const learnFixture = {
  slug: 'published-note',
  title: 'Published',
  track: 'programming',
  tags: [],
  draft: false,
  publishDate: '2026-01-01T00:00:00.000Z',
  lastModified: '2026-01-02T00:00:00.000Z',
  excerpt: 'fixture',
  links: [],
};
assert.deepEqual(getPublishedNotes([
  { ...learnFixture, slug: 'draft-note', draft: true },
  learnFixture,
]).map((note) => note.slug), ['published-note']);
assert.deepEqual(getActiveTracks([learnFixture]).map((track) => track.slug), ['programming']);

console.log('Learn authoring contract passed.');
