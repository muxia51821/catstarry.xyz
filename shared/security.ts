export async function timingSafeEqualText(actual: string | null, expected: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [actualDigest, expectedDigest] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(actual ?? '')),
    crypto.subtle.digest('SHA-256', encoder.encode(expected)),
  ]);

  const timingSafeEqual = Reflect.get(crypto.subtle, 'timingSafeEqual');
  if (typeof timingSafeEqual === 'function') {
    return timingSafeEqual.call(crypto.subtle, actualDigest, expectedDigest);
  }

  const actualBytes = new Uint8Array(actualDigest);
  const expectedBytes = new Uint8Array(expectedDigest);
  let difference = actualBytes.length ^ expectedBytes.length;
  for (let index = 0; index < actualBytes.length; index += 1) {
    difference |= actualBytes[index] ^ expectedBytes[index];
  }
  return difference === 0;
}
