import type { BlogPost } from '../blog';
import { getPostSlug } from '../blog';
import { fetchOwnerApi } from './owner-auth';

export async function filterPublishedBlogPosts(
  request: Request,
  posts: BlogPost[],
): Promise<BlogPost[] | null> {
  try {
    const response = await fetchOwnerApi(request, '/api/blog/publications');
    if (!response.ok) return null;
    const value = await response.json() as { slugs?: unknown };
    if (!Array.isArray(value.slugs)) return null;
    const published = new Set(value.slugs.filter((slug): slug is string => typeof slug === 'string'));
    return posts.filter((post) => published.has(getPostSlug(post)));
  } catch {
    return null;
  }
}
