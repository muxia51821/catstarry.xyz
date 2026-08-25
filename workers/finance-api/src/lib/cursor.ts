export const MAX_CURSOR_LENGTH = 2_048;

export function encodeCursorPayload(value: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function decodeCursorPayload<T>(value: string | null): T {
  if (!value || value.length > MAX_CURSOR_LENGTH) throw new Error('invalid cursor');
  const source = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(source + '='.repeat((4 - source.length % 4) % 4));
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes)) as T;
}
