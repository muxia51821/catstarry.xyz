import { gitPublicationReleaseIdentity } from './lib/publication-release.mjs';

const action = process.argv[2];
if (action !== 'prepare' && action !== 'abort') {
  throw new Error('Usage: node scripts/learn-publication-release-barrier.mjs <prepare|abort>');
}
if (!process.env.FOOTPRINT_INGEST_TOKEN) {
  throw new Error('FOOTPRINT_INGEST_TOKEN is required for the Learn production release barrier');
}

const releaseRef = process.env.PUBLICATION_RELEASE_SHA?.trim() || 'HEAD';
const release = gitPublicationReleaseIdentity(releaseRef);
const response = await fetch(`https://catstarry.xyz/api/learn/internal/release/${action}`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${process.env.FOOTPRINT_INGEST_TOKEN}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ release }),
});
if (!response.ok) {
  throw new Error(`Learn production release ${action} failed (${response.status}): ${await response.text()}`);
}
console.log(JSON.stringify(await response.json(), null, 2));
