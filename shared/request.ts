export type BoundedJsonResult<T> =
  | { ok: true; value: T }
  | { ok: false; reason: 'invalid_json' | 'payload_too_large' };

export async function readBoundedJson<T>(request: Request, maximumBytes: number): Promise<BoundedJsonResult<T>> {
  const contentLength = Number(request.headers.get('Content-Length') ?? '0');
  if (Number.isFinite(contentLength) && contentLength > maximumBytes) return { ok: false, reason: 'payload_too_large' };
  if (!request.body) return { ok: false, reason: 'invalid_json' };

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let text = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maximumBytes) {
        try { await reader.cancel('payload_too_large'); } catch { /* body is already rejected */ }
        return { ok: false, reason: 'payload_too_large' };
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return { ok: true, value: JSON.parse(text) as T };
  } catch {
    return { ok: false, reason: 'invalid_json' };
  } finally {
    reader.releaseLock();
  }
}
