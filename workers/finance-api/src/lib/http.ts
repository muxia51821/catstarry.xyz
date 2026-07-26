export function json(value: unknown, status = 200, headers?: HeadersInit): Response {
  const responseHeaders = new Headers(headers);
  responseHeaders.set('Content-Type', 'application/json; charset=utf-8');
  responseHeaders.set('Cache-Control', 'private, no-store');
  responseHeaders.set('X-Content-Type-Options', 'nosniff');
  return Response.json(value, { status, headers: responseHeaders });
}

export function apiError(status: number, code: string, message: string): Response {
  return json({ error: { code, message } }, status);
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
