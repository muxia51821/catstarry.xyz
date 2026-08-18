import { assertBlogProductionTransition, readBlogPublicationEntries } from './lib/blog-publications.mjs';

const response = await fetch('https://catstarry.xyz/api/blog/publications');
if (!response.ok) {
  throw new Error(`Unable to read production Blog publications: ${response.status}`);
}
const body = await response.json();
if (!body || !Array.isArray(body.slugs)) {
  throw new Error('Production Blog publications response is invalid');
}
const publicSlugs = body.slugs.map((value) => {
  const slug = typeof value === 'string' ? value.trim() : '';
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error('Production Blog publications response contains an invalid slug');
  }
  return slug;
});
if (new Set(publicSlugs).size !== publicSlugs.length) {
  throw new Error('Production Blog publications response contains duplicate slugs');
}

const candidateEntries = await readBlogPublicationEntries();
assertBlogProductionTransition(publicSlugs, candidateEntries);
console.log(`Blog production transition check passed (${publicSlugs.length} existing published posts).`);
