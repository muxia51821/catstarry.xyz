export interface CorsOptions {
  allowedOrigins: readonly string[];
  allowedMethods?: readonly string[];
  allowedHeaders?: readonly string[];
}

const DEFAULT_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];
const DEFAULT_HEADERS = ['Content-Type', 'Authorization'];
const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function isTrustedOrigin(request: Request, options: CorsOptions): boolean {
  const origin = request.headers.get('Origin');
  return origin !== null && options.allowedOrigins.includes(origin);
}

export function createCorsHeaders(request: Request, options: CorsOptions): Headers {
  const headers = new Headers({ Vary: 'Origin' });
  const origin = request.headers.get('Origin');

  if (origin && isTrustedOrigin(request, options)) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Credentials', 'true');
    headers.set(
      'Access-Control-Allow-Methods',
      (options.allowedMethods ?? DEFAULT_METHODS).join(', '),
    );
    headers.set(
      'Access-Control-Allow-Headers',
      (options.allowedHeaders ?? DEFAULT_HEADERS).join(', '),
    );
    headers.set('Access-Control-Max-Age', '86400');
  }

  return headers;
}

function forbiddenOriginResponse(): Response {
  return new Response('Forbidden origin', {
    status: 403,
    headers: { Vary: 'Origin' },
  });
}

export function handleCorsPreflight(
  request: Request,
  options: CorsOptions,
): Response | null {
  if (request.method !== 'OPTIONS') return null;
  if (!isTrustedOrigin(request, options)) return forbiddenOriginResponse();

  return new Response(null, {
    status: 204,
    headers: createCorsHeaders(request, options),
  });
}

export function rejectUntrustedStateChange(
  request: Request,
  options: CorsOptions,
): Response | null {
  if (!STATE_CHANGING_METHODS.has(request.method)) return null;
  return isTrustedOrigin(request, options) ? null : forbiddenOriginResponse();
}

export function withCors(
  response: Response,
  request: Request,
  options: CorsOptions,
): Response {
  const headers = new Headers(response.headers);
  for (const [name, value] of createCorsHeaders(request, options)) {
    headers.set(name, value);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
