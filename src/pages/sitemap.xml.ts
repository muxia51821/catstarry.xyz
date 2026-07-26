import { getCollection } from 'astro:content';
import {
  getActiveTracks,
  getPublishedNotes,
  type LearnEntry,
} from '../components/learn/learn-data';
import { getPostSlug, type BlogPost } from '../lib/blog';

const SITE = 'https://catstarry.xyz';

export async function GET() {
  const [blogEntries, learnEntries]: [BlogPost[], LearnEntry[]] = await Promise.all([
    getCollection('blog', ({ data }: BlogPost) => !data.draft),
    getCollection('learn', ({ data }: LearnEntry) => !data.draft),
  ]);
  const notes = getPublishedNotes(learnEntries);
  const urls = new Set([
    '/',
    '/blog/',
    '/blog/rss.xml',
    '/feed/',
    '/projects/',
    '/learn/',
  ]);

  for (const entry of blogEntries) {
    urls.add(`/blog/${getPostSlug(entry)}/`);
    urls.add(`/blog/category/${encodeURIComponent(entry.data.category)}/`);
    for (const tag of entry.data.tags) urls.add(`/blog/tag/${encodeURIComponent(tag)}/`);
  }
  for (const note of notes) urls.add(`/learn/notes/${encodeURIComponent(note.slug)}/`);
  for (const track of getActiveTracks(notes)) urls.add(`/learn/track/${encodeURIComponent(track.slug)}/`);

  const body = [...urls]
    .map((pathname) => `  <url><loc>${escapeXml(new URL(pathname, SITE).href)}</loc></url>`)
    .join('\n');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}

function escapeXml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&apos;',
  })[character] ?? character);
}
