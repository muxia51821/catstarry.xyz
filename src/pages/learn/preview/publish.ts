import type { APIRoute } from 'astro';
import { readOwnerSession } from '../../../lib/server/owner-auth';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const publisher = localPublisher();
  if (!publisher) return Response.json({ error: 'Not found.' }, { status: 404 });
  const auth = await readOwnerSession(request);
  if (auth.state !== 'authenticated') return Response.json({ error: 'Owner authentication required.' }, { status: 401 });

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: 'Invalid publish request.' }, { status: 400 });
  }
  const response = await fetch(new URL('/publish', publisher.origin), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${publisher.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  return new Response(response.body, {
    status: response.status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
};

function localPublisher() {
  const origin = import.meta.env.LOCAL_LEARN_PUBLISH_URL;
  const token = import.meta.env.LOCAL_LEARN_PUBLISH_TOKEN;
  if (!origin || !token) return null;
  try {
    const url = new URL(origin);
    if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost', '::1'].includes(url.hostname)) return null;
    return { origin: url.origin, token };
  } catch {
    return null;
  }
}
