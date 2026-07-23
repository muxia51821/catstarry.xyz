import type { SessionStatus } from './types';

export type FinanceRole = 'admin' | 'viewer';

export interface SessionRecord {
  username: string;
  expires_at: string;
  role?: FinanceRole;
}

export interface MainSiteAuthBindings {
  sessions: KVNamespace;
  database: D1Database;
}

export interface FinanceAuthBindings {
  sessions: KVNamespace;
}

export interface FinanceSessionStatus extends SessionStatus {
  role?: FinanceRole;
}

function getSessionToken(request: Request): string | null {
  const cookies = request.headers.get('Cookie') ?? '';
  const match = cookies.match(/(?:^|;\s*)token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
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

export async function getFinanceSession(
  request: Request,
  bindings: FinanceAuthBindings,
): Promise<FinanceSessionStatus> {
  const token = getSessionToken(request);
  if (!token) return anonymousSession();

  const record = await readKvSession(token, bindings.sessions);
  if (!record || !isCurrentSession(record)) return anonymousSession();

  return {
    authenticated: true,
    username: record.username,
    role: record.role,
  };
}

export function hasRole(
  session: FinanceSessionStatus,
  allowedRoles: readonly FinanceRole[],
): boolean {
  return session.authenticated && !!session.role && allowedRoles.includes(session.role);
}
