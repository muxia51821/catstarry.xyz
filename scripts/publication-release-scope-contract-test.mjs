import assert from 'node:assert/strict';

import { classifyPublicationPaths, createPublicationReleaseScope } from './lib/publication-release-scope.mjs';

const base = 'a'.repeat(40);
const deploy = 'b'.repeat(40);

assert.deepEqual(classifyPublicationPaths([
  'src/components/learn/KnowledgeGraph.astro',
  'scripts/local-preview.mjs',
]), {
  changedPublicationPaths: [],
  blogPublicationSyncRequired: false,
  learnPublicationSyncRequired: false,
  learnBarrierRequired: false,
  dispatchRequired: false,
});

assert.deepEqual(classifyPublicationPaths([
  'src/data/blog/release-notes.md',
  'src/components/learn/learn.css',
]), {
  changedPublicationPaths: ['src/data/blog/release-notes.md'],
  blogPublicationSyncRequired: true,
  learnPublicationSyncRequired: false,
  learnBarrierRequired: false,
  dispatchRequired: true,
});

assert.deepEqual(classifyPublicationPaths([
  'src/data/learn/programming/moved-away.md',
]), {
  changedPublicationPaths: ['src/data/learn/programming/moved-away.md'],
  blogPublicationSyncRequired: false,
  learnPublicationSyncRequired: true,
  learnBarrierRequired: true,
  dispatchRequired: true,
});

assert.deepEqual(classifyPublicationPaths([
  'src/data/learn/programming/example.md',
  'src/data/blog/essay.mdx',
  'src/data/learn/programming/example.md',
]), {
  changedPublicationPaths: ['src/data/blog/essay.mdx', 'src/data/learn/programming/example.md'],
  blogPublicationSyncRequired: true,
  learnPublicationSyncRequired: true,
  learnBarrierRequired: true,
  dispatchRequired: true,
});

assert.deepEqual(createPublicationReleaseScope({
  baselineSha: base,
  deploySha: deploy,
  baselineSource: 'environment',
  changedPaths: ['src/data/learn/programming/example.md'],
}), {
  baselineSha: base,
  deploySha: deploy,
  baselineSource: 'environment',
  changedPublicationPaths: ['src/data/learn/programming/example.md'],
  blogPublicationSyncRequired: false,
  learnPublicationSyncRequired: true,
  learnBarrierRequired: true,
  dispatchRequired: true,
});

console.log('Publication release scope contracts passed.');
