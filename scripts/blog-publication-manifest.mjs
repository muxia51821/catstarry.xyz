import { readBlogPublicationEntries } from './lib/blog-publications.mjs';

if (process.env.DEPLOYMENT_ENVIRONMENT !== 'production' || process.env.DEPLOYMENT_STATUS !== 'success') {
  throw new Error('Blog publication manifest sync requires a successful production deployment');
}
const apiBase = new URL(process.env.FEED_API_URL);
if (apiBase.origin !== 'https://catstarry.xyz' || apiBase.pathname !== '/' || apiBase.search || apiBase.hash) {
  throw new Error('FEED_API_URL must be exactly https://catstarry.xyz');
}
if (!process.env.FOOTPRINT_INGEST_TOKEN) throw new Error('FOOTPRINT_INGEST_TOKEN is required');

const response = await fetch(`${apiBase.toString().replace(/\/$/, '')}/api/blog/internal/publications`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${process.env.FOOTPRINT_INGEST_TOKEN}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    deployed_at: new Date().toISOString(),
    entries: await readBlogPublicationEntries(),
  }),
});
if (!response.ok) throw new Error(`Blog publication manifest sync failed (${response.status}): ${await response.text()}`);
console.log(JSON.stringify(await response.json(), null, 2));
