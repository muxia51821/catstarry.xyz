import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { getPostSlug } from '../../lib/blog';
import { shanghaiParts } from '../../../shared/shanghai-time';
import { filterPublishedBlogPosts } from '../../lib/server/blog-lifecycle';
import { loadPublicLearnNotes } from '../../lib/server/learn-publications';

export const prerender = false;

const SITE_URL = 'https://catstarry.xyz';
const BLOG_TITLE = 'catstarry.xyz · Blog + Learn';
const BLOG_DESC = '木下的博客文章与公开学习笔记。';

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

const RFC822_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const RFC822_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function toRFC822(date: Date): string {
  const parts = shanghaiParts(date);
  const weekday = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day))).getUTCDay();
  return `${RFC822_DAYS[weekday]}, ${parts.day} ${RFC822_MONTHS[Number(parts.month) - 1]} ${parts.year} ${parts.hour}:${parts.minute}:${parts.second} +0800`;
}

function truncateMd(text: string, maxLen: number): string {
  let plain = text
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/^>\s+/gm, '')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/^---[\s\S]*?---/g, '')
    .replace(/\n{2,}/g, '\n')
    .trim();

  if (plain.length <= maxLen) return plain;
  return plain.slice(0, maxLen).replace(/\s+\S*$/, '') + '……';
}

export const GET: APIRoute = async ({ request }) => {
  const [blogEntries, learnEntries] = await Promise.all([
    getCollection('blog'),
    getCollection('learn'),
  ]);
  const [posts, notes] = await Promise.all([
    filterPublishedBlogPosts(request, blogEntries),
    loadPublicLearnNotes(request, learnEntries),
  ]);
  if (!posts || !notes) return new Response('Blog feed unavailable', { status: 503 });
  const entries = [
    ...posts.map((post) => ({
      title: post.data.title,
      description: post.data.description || truncateMd(post.body ?? '', 200),
      date: post.data.date,
      url: `${SITE_URL}/blog/${getPostSlug(post)}/`,
    })),
    ...notes.map((note) => {
      return {
        title: note.title,
        description: note.excerpt,
        date: new Date(note.revisedAt ?? note.publishedAt ?? '1970-01-01'),
        url: `${SITE_URL}/learn/notes/${note.slug}/`,
      };
    }),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  const lastBuildDate = entries.length > 0 ? toRFC822(entries[0].date) : toRFC822(new Date());

  const items = entries.map((entry) => {
    return ''
      + '    <item>\n'
      + '      <title>' + escapeXml(entry.title) + '</title>\n'
      + '      <link>' + escapeXml(entry.url) + '</link>\n'
      + '      <description>' + escapeXml(entry.description) + '</description>\n'
      + '      <pubDate>' + toRFC822(entry.date) + '</pubDate>\n'
      + '      <guid isPermaLink="true">' + escapeXml(entry.url) + '</guid>\n'
      + '    </item>';
  }).join('');

  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
    + '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n'
    + '  <channel>\n'
    + '    <title>' + escapeXml(BLOG_TITLE) + '</title>\n'
    + '    <link>' + escapeXml(SITE_URL + '/blog/') + '</link>\n'
    + '    <description>' + escapeXml(BLOG_DESC) + '</description>\n'
    + '    <lastBuildDate>' + lastBuildDate + '</lastBuildDate>\n'
    + '    <atom:link href="' + escapeXml(SITE_URL) + '/blog/rss.xml" rel="self" type="application/rss+xml"/>\n'
    + items + '\n'
    + '  </channel>\n'
    + '</rss>';

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
    },
  });
};
