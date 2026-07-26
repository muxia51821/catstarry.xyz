import { hash } from 'bcryptjs';

const [username, role] = process.argv.slice(2);
const password = process.env.FINANCE_PASSWORD;
if (!/^[a-z0-9_-]{2,64}$/i.test(username ?? '')) throw new Error('Provide a valid username');
if (role !== 'admin' && role !== 'viewer') throw new Error('Role must be admin or viewer');
const passwordBytes = new TextEncoder().encode(password ?? '').byteLength;
if (!password || passwordBytes < 12 || passwordBytes > 72) {
  throw new Error('FINANCE_PASSWORD must contain 12-72 UTF-8 bytes');
}
console.log(JSON.stringify({ key: `user:${username}`, value: { password_hash: await hash(password, 12), role } }, null, 2));
