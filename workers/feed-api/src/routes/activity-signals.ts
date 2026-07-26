import { apiError } from '../lib/http';

const PROJECTION_KEY = 'activity-signals.json';
const MAX_PROJECTION_AGE_MS = 3 * 60 * 60 * 1000;

function responseHeaders(object: R2Object): Headers {
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('ETag', object.httpEtag);
  headers.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
  headers.set('X-Content-Type-Options', 'nosniff');
  return headers;
}

export async function handleActivitySignals(
  request: Request,
  env: Pick<Env, 'HOME_PROJECTIONS'>,
): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const response = apiError(405, 'method_not_allowed', 'Method not allowed');
    response.headers.set('Allow', 'GET, HEAD');
    return response;
  }

  const object = await env.HOME_PROJECTIONS.get(PROJECTION_KEY);
  if (!object) {
    return apiError(404, 'not_found', 'Activity signals are not available');
  }

  if (Date.now() - object.uploaded.getTime() > MAX_PROJECTION_AGE_MS) {
    const response = apiError(
      503,
      'projection_stale',
      'Activity signals are temporarily unavailable',
    );
    response.headers.set('Retry-After', '300');
    return response;
  }

  const headers = responseHeaders(object);
  return new Response(request.method === 'HEAD' ? null : object.body, { headers });
}
