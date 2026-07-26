import assert from 'node:assert/strict';
import { hash } from 'bcryptjs';
import { comparePassword, hasValidBcryptPasswordLength } from '../workers/feed-api/src/modules/passwords.ts';

const password = `isolated-${crypto.randomUUID()}`;
const differentPassword = `different-${crypto.randomUUID()}`;
const hashValue = await hash(password, 10);

assert.equal(await comparePassword(password, hashValue), true, 'bcrypt must accept the original password');
assert.equal(await comparePassword(differentPassword, hashValue), false, 'bcrypt must reject a different password');
assert.equal(hasValidBcryptPasswordLength('密'.repeat(24)), true, '72-byte UTF-8 password must be accepted');
assert.equal(hasValidBcryptPasswordLength('密'.repeat(25)), false, '75-byte UTF-8 password must be rejected');
assert.equal(await comparePassword('密'.repeat(25), hashValue), false, 'overlong passwords must not reach bcrypt comparison');

console.log('Feed bcrypt contract passed');
