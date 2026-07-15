import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

const SITE_URL = 'https://catstarry.xyz';
const BLOG_TITLE = 'catstarry.xyz · 博客';
const BLOG_DESC = '木下的个人博客，写技术、生活和观点。';

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function toRFC822(date: Date): string {
  const tz = '+0800';
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const pad = (n: number) => String(n).padStart(2, '0');
  return days[date.getUTCDay()] + ', ' + pad(date.getUTCDate()) + ' ' + months[date.getUTCMonth()] + ' ' + date.getUTCFullYear() + ' ' + pad(date.getUTCHours()) + ':' + pad(date.getUTCMinutes()) + ':' + pad(date.getUTCSeconds()) + ' ' + tz;
}

function getSlug(post: { id: string }): string {
  return post.id;
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

export const GET: APIRoute = async () => {
  const posts = await getCollection('blog', ({ data }) => !data.draft);
  posts.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());

  const lastBuildDate = posts.length > 0 ? toRFC822(posts[0].data.date) : toRFC822(new Date());

  const items = posts.map((post) => {
    const slug = getSlug(post);
    const url = SITE_URL + '/blog/' + slug + '/';
    const description = post.data.description || truncateMd(post.body ?? '', 200);

    return ''
      + '    <item>\n'
      + '      <title>' + escapeXml(post.data.title) + '</title>\n'
      + '      <link>' + escapeXml(url) + '</link>\n'
      + '      <description>' + escapeXml(description) + '</description>\n'
      + '      <pubDate>' + toRFC822(post.data.date) + '</pubDate>\n'
      + '      <guid isPermaLink="true">' + escapeXml(url) + '</guid>\n'
      + '    </item>';
  }).join('');

  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
    + '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n'
    + '  <channel>\n'
    + '    <title>' + escapeXml(BLOG_TITLE) + '</title>\n'
    + '    <link>' + escapeXml(SITE_URL) + '</link>\n'
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
