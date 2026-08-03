import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

await runLearnImportContract();

console.log('Learn authoring contract passed.');

async function runLearnImportContract() {
  const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'catstarry-learn-import-contract-'));
  let pipelineFixture;
  try {
    const temporaryScripts = path.join(temporaryRoot, 'scripts');
    const temporaryLibrary = path.join(temporaryScripts, 'lib');
    await mkdir(temporaryLibrary, { recursive: true });
    await cp(path.join(repositoryRoot, 'scripts', 'learn-import.mjs'), path.join(temporaryScripts, 'learn-import.mjs'));
    await cp(path.join(repositoryRoot, 'scripts', 'lib', 'learn-authoring.mjs'), path.join(temporaryLibrary, 'learn-authoring.mjs'));

    const input = path.join(temporaryRoot, 'lesson.html');
    await writeFile(input, `
      <html>
        <head><title>Importer Fixture</title></head>
        <body>
          <article>
            <h1>Importer Fixture</h1>
            <p>Generated Markdown draft.</p>
            <pre><code class="language-js">const value = 1 &lt; 2;</code></pre>
            <div data-interactive="quiz">placeholder source</div>
          </article>
        </body>
      </html>
    `, 'utf8');

    const result = await runNode([
      path.join('scripts', 'learn-import.mjs'),
      '--input', input,
      '--track', 'programming',
      '--slug', 'importer-fixture',
      '--title', 'Importer Fixture',
      '--tags', 'web,test',
      '--excerpt', 'Importer contract fixture.',
    ], temporaryRoot);
    assert.equal(result.code, 0, result.stderr);
    assert.equal(result.signal, null);
    assert.match(result.stdout, /"draft": true/);
    assert.match(result.stdout, /importer-fixture\.md/);

    const output = path.join(temporaryRoot, 'src', 'data', 'learn', 'programming', 'importer-fixture.md');
    const legacyOutput = path.join(temporaryRoot, 'src', 'data', 'learn', 'programming', 'importer-fixture.mdx');
    const generated = await readFile(output, 'utf8');
    await assert.rejects(readFile(legacyOutput, 'utf8'), { code: 'ENOENT' });
    assert.match(generated, /^slug: importer-fixture$/m);
    assert.match(generated, /^track: programming$/m);
    assert.match(generated, /^draft: true$/m);
    assert.match(generated, /# Importer Fixture/);
    assert.match(generated, /```js\nconst value = 1 < 2;\n```/);
    assert.match(generated, /<!-- INTERACTIVE: quiz -->/);

    pipelineFixture = path.join(
      repositoryRoot,
      'src',
      'data',
      'learn',
      'programming',
      `learn-import-contract-${process.pid}.md`,
    );
    await cp(output, pipelineFixture);
    const build = await runNode([
      path.join(repositoryRoot, 'node_modules', 'astro', 'bin', 'astro.mjs'),
      'build',
    ], repositoryRoot);
    assert.equal(build.code, 0, `${build.stdout}\n${build.stderr}`);
    assert.equal(build.signal, null);
  } finally {
    if (pipelineFixture) await rm(pipelineFixture, { force: true });
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

function runNode(args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.once('error', reject);
    child.once('exit', (code, signal) => resolve({ code, signal, stdout, stderr }));
  });
}
