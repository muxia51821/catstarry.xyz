import { readLearnPublicationEntries } from './lib/learn-publications.mjs';
import { deployedPublicationReleaseIdentity } from './lib/publication-release.mjs';

if (process.env.DEPLOYMENT_ENVIRONMENT !== 'production' || process.env.DEPLOYMENT_STATUS !== 'success') {
  throw new Error('Learn publication manifest sync requires a successful production deployment');
}
const apiBase = new URL(process.env.FEED_API_URL);
if (apiBase.origin !== 'https://catstarry.xyz' || apiBase.pathname !== '/' || apiBase.search || apiBase.hash) {
  throw new Error('FEED_API_URL must be exactly https://catstarry.xyz');
}
if (!process.env.FOOTPRINT_INGEST_TOKEN) throw new Error('FOOTPRINT_INGEST_TOKEN is required');
const release = deployedPublicationReleaseIdentity();
const response = await fetch(`${apiBase.toString().replace(/\/$/, '')}/api/learn/internal/publications`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${process.env.FOOTPRINT_INGEST_TOKEN}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    schema_version: 3,
    release,
    deployed_at: new Date().toISOString(),
    entries: await readLearnPublicationEntries(),
  }),
});
if (!response.ok) throw new Error(`Learn publication manifest sync failed (${response.status}): ${await response.text()}`);
console.log(JSON.stringify(await response.json(), null, 2));
