import { hash } from 'bcryptjs';

const [username] = process.argv.slice(2);
const password = process.env.FEED_PASSWORD;
if (!username || !/^[A-Za-z0-9._-]{1,64}$/.test(username)) {
  throw new Error('Usage: FEED_PASSWORD=<secret> npm run feed:user -- <username>');
}
if (!password || Buffer.byteLength(password, 'utf8') < 12 || Buffer.byteLength(password, 'utf8') > 72) {
  throw new Error('FEED_PASSWORD must contain 12 to 72 UTF-8 bytes');
}
console.log(JSON.stringify({
  key: `user:${username}`,
  value: { password_hash: await hash(password, 10), role: 'admin' },
}, null, 2));
