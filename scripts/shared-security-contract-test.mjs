import assert from 'node:assert/strict';
import { getSessionToken } from '../shared/auth.ts';
import { timingSafeEqualText } from '../shared/security.ts';
import { readBoundedJson } from '../shared/request.ts';
import { getFinanceSession, getMainSiteSession } from '../shared/auth.ts';
import { summarizeBatchResults } from '../src/lib/batch-results.ts';

assert.equal(getSessionToken(new Request('https://example.test', { headers: { Cookie: 'token=%GG' } })), null);
assert.equal(getSessionToken(new Request('https://example.test', { headers: { Cookie: 'token=not-a-session' } })), null);
const token = crypto.randomUUID();
assert.equal(getSessionToken(new Request('https://example.test', { headers: { Cookie: `other=1; token=${token}` } })), token);
assert.equal(await timingSafeEqualText('Bearer secret', 'Bearer secret'), true);
assert.equal(await timingSafeEqualText('Bearer secret', 'Bearer secreT'), false);
assert.equal(await timingSafeEqualText(null, 'Bearer secret'), false);

assert.deepEqual(await readBoundedJson(new Request('https://example.test', { method: 'POST', body: '{"ok":true}' }), 64), { ok: true, value: { ok: true } });
assert.deepEqual(await readBoundedJson(new Request('https://example.test', { method: 'POST', body: '{' }), 64), { ok: false, reason: 'invalid_json' });
assert.deepEqual(await readBoundedJson(new Request('https://example.test', { method: 'POST', body: 'x'.repeat(65) }), 64), { ok: false, reason: 'payload_too_large' });

const chunkedBody = new ReadableStream({
  start(controller) {
    controller.enqueue(new TextEncoder().encode('{"value":"'));
    controller.enqueue(new TextEncoder().encode('x'.repeat(100)));
    controller.enqueue(new TextEncoder().encode('"}'));
    controller.close();
  },
});
assert.deepEqual(await readBoundedJson(new Request('https://example.test', { method: 'POST', body: chunkedBody, duplex: 'half' }), 32), { ok: false, reason: 'payload_too_large' });

const expiredToken = crypto.randomUUID();
const expiredSessions = {
  async get() {
    return {
      username: 'expired-user',
      role: 'viewer',
      expires_at: new Date(Date.now() - 1_000).toISOString(),
    };
  },
};
assert.deepEqual(
  await getFinanceSession(new Request('https://example.test', {
    headers: { Cookie: `token=${expiredToken}` },
  }), { sessions: expiredSessions }),
  { authenticated: false, username: null },
);
assert.deepEqual(
  await getMainSiteSession(new Request('https://example.test', {
    headers: { Cookie: `token=${expiredToken}` },
  }), {
    sessions: expiredSessions,
    database: { prepare() { throw new Error('expired KV records must not fall back to D1'); } },
  }),
  { authenticated: false, username: null },
);
assert.equal(summarizeBatchResults([
  { status: 'fulfilled', value: undefined },
  { status: 'rejected', reason: new Error('injected') },
  { status: 'fulfilled', value: undefined },
]), '部分操作失败：成功 2 项，失败 1 项');
assert.equal(summarizeBatchResults([
  { status: 'fulfilled', value: undefined },
]), null);

console.log('Shared request and session security contracts passed.');
