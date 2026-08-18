export interface PublicationReleaseIdentity {
  sha: string;
  generation: number;
}

const RELEASE_SHA_PATTERN = /^[0-9a-f]{40}$/;

export function normalizePublicationReleaseIdentity(value: unknown): PublicationReleaseIdentity | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const sha = typeof record.sha === 'string' ? record.sha.trim().toLowerCase() : '';
  const generation = typeof record.generation === 'number' ? record.generation : Number.NaN;
  return RELEASE_SHA_PATTERN.test(sha) && Number.isSafeInteger(generation) && generation > 0
    ? { sha, generation }
    : null;
}

export function samePublicationRelease(
  left: PublicationReleaseIdentity | null | undefined,
  right: PublicationReleaseIdentity | null | undefined,
): boolean {
  return Boolean(left && right && left.sha === right.sha && left.generation === right.generation);
}

export function comparePublicationRelease(
  incoming: PublicationReleaseIdentity,
  current: PublicationReleaseIdentity,
): 'same' | 'newer' | 'stale' | 'conflict' {
  if (incoming.generation > current.generation) return 'newer';
  if (incoming.generation < current.generation) return 'stale';
  return incoming.sha === current.sha ? 'same' : 'conflict';
}
