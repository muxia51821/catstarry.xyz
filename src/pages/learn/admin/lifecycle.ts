import type { APIRoute } from 'astro';
import { fetchOwnerApi } from '../../../lib/server/owner-auth';

export const prerender = false;

export const PATCH: APIRoute = async ({ request }) => {
  try {
    const response = await fetchOwnerApi(request, '/api/learn/admin/publications');
    const headers = new Headers(response.headers);
    headers.set('Cache-Control', 'private, no-store');
    return new Response(response.body, { status: response.status, headers });
  } catch {
    return Response.json({ error: { code: 'auth_unavailable', message: 'Learn lifecycle service is unavailable' } }, {
      status: 503,
      headers: { 'Cache-Control': 'private, no-store' },
    });
  }
};
