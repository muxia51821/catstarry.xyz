import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

if (process.env.DEPLOYMENT_ENVIRONMENT !== 'production' || process.env.DEPLOYMENT_STATUS !== 'success') {
  throw new Error('Learn publication manifest sync requires a successful production deployment');
}
const apiBase = new URL(process.env.FEED_API_URL);
if (apiBase.origin !== 'https://catstarry.xyz' || apiBase.pathname !== '/' || apiBase.search || apiBase.hash) {
  throw new Error('FEED_API_URL must be exactly https://catstarry.xyz');
}
if (!process.env.FOOTPRINT_INGEST_TOKEN) throw new Error('FOOTPRINT_INGEST_TOKEN is required');
const slugs = [];
for (const file of await walk('src/data/learn')) {
  if (!/\.mdx?$/.test(file)) continue;
  const source = await readFile(file, 'utf8');
  if (/^draft:\s*true\s*$/m.test(source)) continue;
  const slug = source.match(/^slug:\s*["']?([a-z0-9-]+)["']?\s*$/m)?.[1];
  if (!slug) throw new Error(`Published Learn file has no valid slug: ${file}`);
  slugs.push(slug);
}
const response = await fetch(`${apiBase.toString().replace(/\/$/, '')}/api/learn/internal/publications`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${process.env.FOOTPRINT_INGEST_TOKEN}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ slugs: slugs.sort() }),
});
if (!response.ok) throw new Error(`Learn publication manifest sync failed (${response.status}): ${await response.text()}`);
console.log(JSON.stringify(await response.json(), null, 2));

async function walk(root) {
  const entries = await readdir(root, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const target = path.join(root, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  }));
  return nested.flat();
}
