import { slugifyTitle, uniqueLearnSlug } from './lib/learn-authoring.mjs';

const [title, translation = ''] = process.argv.slice(2);
if (!title) throw new Error('Usage: npm run learn:slug -- "标题" [english-translation]');
const base = slugifyTitle(title, translation);
console.log(await uniqueLearnSlug(base));
