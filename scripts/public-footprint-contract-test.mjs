import assert from 'node:assert/strict';

import { assertEligibleSignal, createFootprintCandidate, sendFootprint } from './lib/public-footprint.mjs';

assert.throws(
  () => assertEligibleSignal('blog', { DEPLOYMENT_ENVIRONMENT: 'production', DEPLOYMENT_STATUS: 'failure' }),
  /successful production deployment/,
);
assert.throws(
  () => assertEligibleSignal('blog', { DEPLOYMENT_ENVIRONMENT: 'preview', DEPLOYMENT_STATUS: 'success' }),
  /successful production deployment/,
);
assert.doesNotThrow(() => assertEligibleSignal('blog', {
  DEPLOYMENT_ENVIRONMENT: 'production',
  DEPLOYMENT_STATUS: 'success',
}));
assert.throws(() => assertEligibleSignal('learn', {}), /EXPLICIT_FOOTPRINT_CONFIRMATION/);
assert.doesNotThrow(() => assertEligibleSignal('projects', { EXPLICIT_FOOTPRINT_CONFIRMATION: 'true' }));

const candidate = createFootprintCandidate('blog', {
  source_ref: 'new-post',
  source_version: 'publication-2026-07-25',
  title: 'New post',
  summary: 'Snapshot',
  link: '/blog/new-post/',
  occurred_at: '2026-07-25T12:00:00+08:00',
});
assert.equal(candidate.idempotency_key, 'blog:new-post:publication-2026-07-25');
assert.equal(candidate.occurred_at, '2026-07-25T04:00:00.000Z');
assert.throws(() => createFootprintCandidate('projects', {
  source_ref: 'a'.repeat(80),
  source_version: 'b'.repeat(80),
  title: 'Too long',
  link: '/projects/',
}), /identity must not exceed 128/);

let captured;
const result = await sendFootprint(candidate, {
  apiBase: 'http://127.0.0.1:8787/',
  token: 'isolated-token',
  allowLocalhost: true,
  fetchImpl: async (url, init) => {
    captured = { url, init };
    return Response.json({ created: true, footprint: { id: 'contract' } }, { status: 201 });
  },
});
assert.equal(captured.url, 'http://127.0.0.1:8787/api/feed/internal/footprints');
assert.equal(captured.init.headers.Authorization, 'Bearer isolated-token');
assert.equal(result.created, true);

console.log('Public Footprint signal contract passed.');
