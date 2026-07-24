import type { CollectionEntry } from 'astro:content';

export const POSTS_PER_PAGE = 10;

export type BlogPost = CollectionEntry<'blog'>;

export function getPostSlug(post: BlogPost): string {
  return post.data.slug ?? post.id;
}

export function getPostUrl(post: BlogPost): string {
  return `/blog/${getPostSlug(post)}/`;
}

export function sortPostsByDate(posts: BlogPost[]): BlogPost[] {
  return [...posts].sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

export function getPageCount(total: number): number {
  return Math.max(1, Math.ceil(total / POSTS_PER_PAGE));
}

export function getPagePosts(posts: BlogPost[], page: number): BlogPost[] {
  const start = (page - 1) * POSTS_PER_PAGE;
  return posts.slice(start, start + POSTS_PER_PAGE);
}

export function formatBlogDate(date: Date): string {
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Shanghai',
  });
}

export function getPageUrl(basePath: string, page: number): string {
  return page === 1 ? `${basePath}/` : `${basePath}/${page}/`;
}
