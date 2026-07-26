export function json(data: unknown, status = 200, headers?: HeadersInit): Response {
  const responseHeaders = new Headers(headers);
  responseHeaders.set('Content-Type', 'application/json; charset=utf-8');
  responseHeaders.set('Cache-Control', 'no-store');
  responseHeaders.set('X-Content-Type-Options', 'nosniff');
  return new Response(JSON.stringify(data), { status, headers: responseHeaders });
}

export function apiError(status: number, code: string, message: string): Response {
  return json({ error: { code, message } }, status);
}

export function parseBoundedLimit(value: string | null, defaultLimit = 20, maximum = 50): number | null {
  if (value === null) return defaultLimit;
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return parsed >= 1 && parsed <= maximum ? parsed : null;
}

export function requestIp(request: Request): string {
  return request.headers.get('CF-Connecting-IP') ?? 'unknown';
}

export async function readJson<T extends object>(
  request: Request,
  maximumBytes = 32_768,
): Promise<T | Response> {
  const result = await readBoundedJson<T>(request, maximumBytes);
  if (result.ok) {
    if (result.value && typeof result.value === 'object' && !Array.isArray(result.value)) {
      return result.value;
    }
    return apiError(400, 'invalid_request', 'Request body must be a JSON object');
  }
  return result.reason === 'payload_too_large'
    ? apiError(413, 'payload_too_large', 'Request body is too large')
    : apiError(400, 'invalid_request', 'Request body must be valid JSON');
}
import { readBoundedJson } from '../../../../shared/request';
