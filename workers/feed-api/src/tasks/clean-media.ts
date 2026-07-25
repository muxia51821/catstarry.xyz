import { FeedStore } from '../adapters/feed-store';

const TEMPORARY_MEDIA_AGE_MS = 12 * 60 * 60 * 1000;

export async function cleanUnreferencedMedia(env: Pick<Env, 'DB' | 'MEDIA_BUCKET'>): Promise<void> {
  const store = new FeedStore(env.DB);
  let cursor: string | undefined;
  do {
    const page = await env.MEDIA_BUCKET.list({ prefix: 'feed/', cursor });
    for (const object of page.objects) {
      if (Date.now() - object.uploaded.getTime() < TEMPORARY_MEDIA_AGE_MS) continue;
      if (!(await store.isMediaReferenced(object.key))) await env.MEDIA_BUCKET.delete(object.key);
    }
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
}
