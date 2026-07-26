import { FeedStore } from '../adapters/feed-store';

const TEMPORARY_MEDIA_AGE_MS = 12 * 60 * 60 * 1000;

export async function cleanUnreferencedMedia(env: Pick<Env, 'DB' | 'MEDIA_BUCKET'>): Promise<void> {
  const store = new FeedStore(env.DB);
  let cursor: string | undefined;
  do {
    const page = await env.MEDIA_BUCKET.list({ prefix: 'feed/', cursor });
    const expired = page.objects.filter((object) => Date.now() - object.uploaded.getTime() >= TEMPORARY_MEDIA_AGE_MS);
    const referenced = await store.findReferencedMedia(expired.map((object) => object.key));
    await Promise.all(expired
      .filter((object) => !referenced.has(object.key))
      .map((object) => env.MEDIA_BUCKET.delete(object.key)));
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
}
