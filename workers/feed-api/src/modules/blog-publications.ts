import type { BlogLifecycleEntry, BlogLifecycleState } from '../../../../shared/types';
import { logWorkerError } from '../../../../shared/worker-log';

export interface StoredBlogLifecycleEntry extends BlogLifecycleEntry {
  ever_published: boolean;
}

export const BLOG_LIFECYCLE_KEY = 'blog:lifecycle-manifest:v1';
export const BLOG_LEGACY_PUBLISHED_KEY = 'blog:published-manifest';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function readBlogLifecycle(
  env: Pick<Env, 'AUTH_KV'>,
): Promise<StoredBlogLifecycleEntry[] | null> {
  const value = await env.AUTH_KV.get<unknown>(BLOG_LIFECYCLE_KEY, 'json');
  if (value === null) return null;
  if (!Array.isArray(value) || value.some((entry) => !isStoredLifecycleEntry(entry))) {
    throw new Error('Stored Blog lifecycle manifest is invalid');
  }
  return value;
}

export async function readPublishedBlogSlugs(
  env: Pick<Env, 'AUTH_KV'>,
): Promise<string[]> {
  const lifecycle = await readBlogLifecycle(env);
  if (lifecycle !== null) {
    return lifecycle.filter((entry) => entry.state === 'published').map((entry) => entry.slug);
  }
  const legacy = await env.AUTH_KV.get<unknown>(BLOG_LEGACY_PUBLISHED_KEY, 'json');
  return validSlugs(legacy);
}

export async function writeBlogLifecycle(
  env: Pick<Env, 'AUTH_KV'>,
  entries: StoredBlogLifecycleEntry[],
): Promise<void> {
  const ordered = [...entries].sort((a, b) => a.slug.localeCompare(b.slug));
  await env.AUTH_KV.put(BLOG_LIFECYCLE_KEY, JSON.stringify(ordered));

  const published = ordered.filter((entry) => entry.state === 'published').map((entry) => entry.slug);
  try {
    await env.AUTH_KV.put(BLOG_LEGACY_PUBLISHED_KEY, JSON.stringify(published));
  } catch (error) {
    logWorkerError('blog_legacy_published_manifest_mirror_failed', {}, error);
  }
}

function isStoredLifecycleEntry(value: unknown): value is StoredBlogLifecycleEntry {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Partial<StoredBlogLifecycleEntry>;
  return typeof entry.slug === 'string'
    && SLUG_PATTERN.test(entry.slug)
    && typeof entry.title === 'string'
    && entry.title.length > 0
    && typeof entry.summary === 'string'
    && isBlogLifecycleState(entry.state)
    && typeof entry.ever_published === 'boolean';
}

function isBlogLifecycleState(value: unknown): value is BlogLifecycleState {
  return value === 'draft' || value === 'published' || value === 'withdrawn';
}

function validSlugs(value: unknown): string[] {
  return Array.isArray(value)
    ? [...new Set(value.filter((slug): slug is string => typeof slug === 'string' && SLUG_PATTERN.test(slug)))]
    : [];
}
