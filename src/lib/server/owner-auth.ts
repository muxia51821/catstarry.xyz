import { env } from 'cloudflare:workers';
import type { SessionStatus } from '../../../shared/types';
import { fetchViaFeedBinding, type FeedApiBinding } from './feed-api-transport';

export type OwnerAuthResult =
  | { state: 'authenticated'; session: SessionStatus }
  | { state: 'unauthenticated'; session: SessionStatus }
  | { state: 'unavailable' };

function localFeedOrigin(): string | null {
  const configured = import.meta.env.FEED_API_URL;
  if (!configured) return null;
  try {
    const url = new URL(configured);
    return ['127.0.0.1', 'localhost', '::1'].includes(url.hostname)
      ? url.origin
      : null;
  } catch {
    return null;
  }
}

export async function fetchOwnerApi(incoming: Request, pathname: string): Promise<Response> {
  const localOrigin = localFeedOrigin();
  if (localOrigin) {
    const siteOrigin = new URL(incoming.url).origin;
    const request = new Request(new URL(pathname, localOrigin), incoming);
    if (request.method !== 'GET' && !request.headers.has('Origin')) request.headers.set('Origin', siteOrigin);
    return fetch(request);
  }
  const binding = (env as Cloudflare.Env & { FEED_API?: FeedApiBinding }).FEED_API;
  if (!binding) throw new Error('FEED_API service binding is unavailable');
  return fetchViaFeedBinding(binding, incoming, pathname);
}

export async function readOwnerSession(incoming: Request): Promise<OwnerAuthResult> {
  try {
    const sessionRequest = new Request(incoming.url, { headers: incoming.headers });
    const response = await fetchOwnerApi(sessionRequest, '/api/auth/session');
    if (!response.ok) return { state: 'unavailable' };
    const value = await response.json() as Partial<SessionStatus>;
    if (typeof value.authenticated !== 'boolean') return { state: 'unavailable' };
    const session: SessionStatus = {
      authenticated: value.authenticated,
      username: typeof value.username === 'string' ? value.username : null,
    };
    return session.authenticated
      ? { state: 'authenticated', session }
      : { state: 'unauthenticated', session };
  } catch {
    return { state: 'unavailable' };
  }
}
