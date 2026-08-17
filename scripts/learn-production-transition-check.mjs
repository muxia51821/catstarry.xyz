import { readLearnPublicationEntries, assertLearnProductionTransition } from './lib/learn-publications.mjs';

const endpoint = process.env.LEARN_PRODUCTION_PUBLICATIONS_URL;
if (!endpoint) {
  throw new Error('LEARN_PRODUCTION_PUBLICATIONS_URL is required for Learn production transition check');
}

const response = await fetch(endpoint);
if (!response.ok) {
  throw new Error(`Unable to read production Learn publications: ${response.status}`);
}

const body = await response.json();
const publicSlugs = body.entries?.map((entry) => entry.slug) ?? [];
const candidateEntries = await readLearnPublicationEntries();
assertLearnProductionTransition(publicSlugs, candidateEntries);

console.log(`Learn production transition check passed (${publicSlugs.length} existing public notes).`);
