import type { SessionStatus } from './types';

export interface SessionRecord {
  username: string;
  expires_at: string;
}

export interface MainSiteAuthBindings {
  sessions: KVNamespace;
  database: D1Database;
}

export function getSessionToken(request: Request): string | null {
  const cookies = request.headers.get('Cookie') ?? '';
  const match = cookies.match(/(?:^|;\s*)token=([^;]+)/);
  if (!match) return null;
  try {
    const token = decodeURIComponent(match[1]);
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(token) ? token : null;
  } catch {
    return null;
  }
}

function isCurrentSession(record: Pick<SessionRecord, 'expires_at'>): boolean {
  const expiresAt = Date.parse(record.expires_at);
  return Number.isFinite(expiresAt) && expiresAt > Date.now();
}

function anonymousSession(): SessionStatus {
  return { authenticated: false, username: null };
}

async function readKvSession(
  token: string,
  sessions: KVNamespace,
): Promise<SessionRecord | null> {
  return sessions.get<SessionRecord>(`session:${token}`, 'json');
}

export async function getMainSiteSession(
  request: Request,
  bindings: MainSiteAuthBindings,
): Promise<SessionStatus> {
  const token = getSessionToken(request);
  if (!token) return anonymousSession();

  const cached = await readKvSession(token, bindings.sessions);
  if (cached) {
    return isCurrentSession(cached)
      ? { authenticated: true, username: cached.username }
      : anonymousSession();
  }

  const persisted = await bindings.database
    .prepare('SELECT username, expires_at FROM auth_sessions WHERE token = ?')
    .bind(token)
    .first<Pick<SessionRecord, 'username' | 'expires_at'>>();

  if (!persisted || !isCurrentSession(persisted)) return anonymousSession();

  return { authenticated: true, username: persisted.username };
}
