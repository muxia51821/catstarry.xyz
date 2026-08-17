import { readLearnPublicationEntries, assertLearnProductionTransition } from './lib/learn-publications.mjs';

const endpoint = 'https://catstarry.xyz/api/learn/publications';
const response = await fetch(endpoint);
if (!response.ok) {
  throw new Error(`Unable to read production Learn publications: ${response.status}`);
}

const body = await response.json();
if (!body || !Array.isArray(body.entries)) {
  throw new Error('Production Learn publications response is invalid');
}

const publicSlugs = body.entries.map((entry) => {
  const slug = typeof entry?.slug === 'string' ? entry.slug.trim() : '';
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error('Production Learn publications response contains an invalid slug');
  }
  return slug;
});
if (new Set(publicSlugs).size !== publicSlugs.length) {
  throw new Error('Production Learn publications response contains duplicate slugs');
}

const candidateEntries = await readLearnPublicationEntries();
assertLearnProductionTransition(publicSlugs, candidateEntries);

console.log(`Learn production transition check passed (${publicSlugs.length} existing public notes).`);
