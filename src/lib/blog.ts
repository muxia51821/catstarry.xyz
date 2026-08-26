import type { CollectionEntry } from 'astro:content';

import { formatShanghaiLongDate, formatShanghaiShortDate } from '../../shared/shanghai-time';

export const POSTS_PER_PAGE = 10;

export type BlogPost = CollectionEntry<'blog'>;
export type BlogLifecycleState = 'draft' | 'published' | 'withdrawn';

export function getBlogLifecycleState(post: BlogPost): BlogLifecycleState {
  return post.data.state;
}

export function isPublishedBlogPost(post: BlogPost): boolean {
  return getBlogLifecycleState(post) === 'published';
}

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
  return formatShanghaiLongDate(date);
}

export function formatBlogArchiveDate(date: Date): string {
  return formatShanghaiShortDate(date);
}

export function getPageUrl(basePath: string, page: number): string {
  return page === 1 ? `${basePath}/` : `${basePath}/${page}/`;
}
